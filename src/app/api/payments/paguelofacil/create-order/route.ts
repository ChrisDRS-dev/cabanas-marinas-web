import { NextResponse } from "next/server";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import {
  getReservationEmailData,
  notifyPaymentFailed,
  notifyPaymentLinkGenerated,
} from "@/lib/notifications/events";
import {
  createPaymentLink,
  PagueloFacilConfigError,
  PagueloFacilProviderError,
} from "@/lib/paguelofacil/client";
import type { PFAmountType } from "@/lib/paguelofacil/types";
import {
  getReservationPaymentContext,
  insertPaymentEvent,
  objectFromUnknown,
  roundCurrency,
} from "@/lib/paguelofacil/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function getAppUrl(req: Request) {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

function normalizeAmountType(value: unknown): PFAmountType {
  if (value === "seventy_five") return "seventy_five";
  return value === "full" ? "full" : "deposit";
}

function normalizeLocale(value: unknown): AppLocale {
  const maybeLocale = typeof value === "string" ? value : null;
  return isAppLocale(maybeLocale) ? maybeLocale : "es";
}

function paymentMeta(value: unknown) {
  return objectFromUnknown(value);
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000).toISOString();
}

function shouldForceNewLink(value: unknown) {
  return value === true || value === "1" || value === "true";
}

function isPagueloFacilPendingPayment(payment: {
  provider?: string | null;
  status?: string | null;
  gateway?: string | null;
  meta?: unknown;
}) {
  return (
    payment.provider === "CARD" &&
    payment.status === "PENDING" &&
    (payment.gateway === "paguelofacil" || paymentMeta(payment.meta).gateway === "paguelofacil")
  );
}

function errorResponse(error: unknown) {
  if (error instanceof PagueloFacilConfigError) {
    return NextResponse.json(
      {
        error: "paguelofacil_config_missing",
      },
      { status: 503 },
    );
  }

  if (error instanceof PagueloFacilProviderError) {
    return NextResponse.json(
      {
        error: "paguelofacil_provider_unavailable",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ error: "paguelofacil_link_failed" }, { status: 502 });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reservationId = String(body?.reservationId ?? "").trim();
  const amountType = normalizeAmountType(body?.amountType);
  const locale = normalizeLocale(body?.locale);
  const forceNew = shouldForceNewLink(body?.forceNew);

  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const context = await getReservationPaymentContext(admin, reservationId);

  if (!context?.reservation || context.reservation.customer_id !== user.id) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  if (context.reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "reservation_not_pending_payment" }, { status: 400 });
  }

  if (String(context.reservation.payment_method ?? "").toUpperCase() !== "CARD") {
    await admin
      .from("reservations")
      .update({ payment_method: "CARD" })
      .eq("id", context.reservation.id);
  }

  if (!context.invoice?.id) {
    return NextResponse.json({ error: "invoice_not_found" }, { status: 400 });
  }

  const totalAmount = Number(context.reservation.total_amount ?? 0);
  const depositAmount =
    context.reservation.deposit_amount != null
      ? Number(context.reservation.deposit_amount)
      : roundCurrency(totalAmount * 0.5);
  const paidAmount = context.payments
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const balanceDue = roundCurrency(Math.max(totalAmount - paidAmount, 0));
  const seventyFiveAmount = roundCurrency(totalAmount * 0.75);
  const targetPaidAmount =
    amountType === "full"
      ? totalAmount
      : amountType === "seventy_five"
        ? seventyFiveAmount
        : depositAmount;
  const amount =
    amountType === "full"
      ? balanceDue
      : amountType === "seventy_five"
        ? Math.min(roundCurrency(Math.max(seventyFiveAmount - paidAmount, 0)), balanceDue)
        : Math.min(roundCurrency(Math.max(targetPaidAmount - paidAmount, 0)), balanceDue);

  if (!Number.isFinite(amount) || amount <= 0 || amount > balanceDue + 0.01) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const now = new Date();
  const nowTime = now.getTime();
  const expiredPayments = context.payments.filter((payment) => {
    const expiresAt = payment.link_expires_at ? new Date(payment.link_expires_at).getTime() : 0;
    return (
      isPagueloFacilPendingPayment(payment) &&
      payment.link_status === "ACTIVE" &&
      Boolean(expiresAt) &&
      expiresAt <= nowTime
    );
  });

  if (expiredPayments.length > 0) {
    await admin
      .from("payments")
      .update({
        link_status: "EXPIRED",
        provider_message: "paguelofacil_link_expired",
      })
      .in(
        "id",
        expiredPayments.map((payment) => payment.id),
      );

    await Promise.all(
      expiredPayments.map((payment) =>
        insertPaymentEvent(admin, {
          paymentId: payment.id,
          reservationId,
          eventType: "CREATE_LINK",
          status: "EXPIRED",
          amount: Number(payment.expected_amount ?? payment.amount ?? amount),
          customerEmail: context.reservation.customer_email ?? user.email ?? null,
          payload: {
            amount_type: payment.amount_type ?? amountType,
            link_code: payment.link_code ?? null,
            link_expires_at: payment.link_expires_at ?? null,
            reason: "local_expiration_elapsed",
          },
        }),
      ),
    );
  }

  const reusablePayment = context.payments.find((payment) => {
    const meta = paymentMeta(payment.meta);
    const gateway = payment.gateway ?? meta.gateway;
    const expected = payment.expected_amount != null ? Number(payment.expected_amount) : Number(payment.amount);
    const expiresAt = payment.link_expires_at ? new Date(payment.link_expires_at).getTime() : 0;

    return (
      !forceNew &&
      payment.provider === "CARD" &&
      payment.status === "PENDING" &&
      gateway === "paguelofacil" &&
      payment.link_status === "ACTIVE" &&
      Boolean(payment.link_url) &&
      !payment.provider_message &&
      Math.abs(expected - amount) <= 0.01 &&
      expiresAt > nowTime
    );
  });

  if (reusablePayment?.id && reusablePayment.link_url) {
    await insertPaymentEvent(admin, {
      paymentId: reusablePayment.id,
      reservationId,
      eventType: "CREATE_LINK",
      status: "REUSED",
      amount,
      customerEmail: context.reservation.customer_email ?? user.email ?? null,
      payload: {
        amount_type: amountType,
        link_code: reusablePayment.link_code ?? null,
        link_expires_at: reusablePayment.link_expires_at ?? null,
      },
    });

    await notifyPaymentLinkGenerated({
      supabase: admin,
      paymentId: reusablePayment.id,
      actorId: user.id,
      data: await getReservationEmailData(admin, reservationId, {
        amount,
        paymentUrl: reusablePayment.link_url,
        customerEmail: context.reservation.customer_email ?? user.email ?? null,
      }),
    });

    return NextResponse.json({
      url: reusablePayment.link_url,
      paymentId: reusablePayment.id,
      reused: true,
      expiresAt: reusablePayment.link_expires_at ?? null,
    });
  }

  const pendingIds = context.payments
    .filter(
      (payment) =>
        isPagueloFacilPendingPayment(payment) &&
        !expiredPayments.some((expiredPayment) => expiredPayment.id === payment.id) &&
        payment.link_status !== "EXPIRED" &&
        payment.link_status !== "FAILED",
    )
    .map((payment) => payment.id);

  if (pendingIds.length > 0) {
    const invalidatedAt = new Date().toISOString();
    const invalidationReason = forceNew
      ? "replaced_by_customer_retry"
      : "replaced_by_new_paguelofacil_link";
    await admin
      .from("payments")
      .update({
        status: "CANCELLED",
        link_status: "CANCELLED",
        provider_message: invalidationReason,
        meta: {
          invalidation_reason: invalidationReason,
          invalidated_at: invalidatedAt,
        },
      })
      .in("id", pendingIds);

    await Promise.all(
      context.payments
        .filter((payment) => pendingIds.includes(payment.id))
        .map((payment) =>
          insertPaymentEvent(admin, {
            paymentId: payment.id,
            reservationId,
            eventType: "CREATE_LINK",
            status: "CANCELLED",
            amount: Number(payment.expected_amount ?? payment.amount ?? amount),
            customerEmail: context.reservation.customer_email ?? user.email ?? null,
            payload: {
              amount_type: payment.amount_type ?? amountType,
              link_code: payment.link_code ?? null,
              reason: invalidationReason,
              invalidated_at: invalidatedAt,
            },
          }),
        ),
    );
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      invoice_id: context.invoice.id,
      provider: "CARD",
      status: "PENDING",
      amount,
      gateway: "paguelofacil",
      gateway_flow: "paguelofacil_link",
      amount_type: amountType,
      expected_amount: amount,
      link_status: "PENDING",
      customer_email_snapshot: context.reservation.customer_email ?? user.email ?? null,
      customer_name_snapshot: context.reservation.customer_name ?? null,
      customer_phone_snapshot: context.reservation.customer_phone ?? null,
      meta: {
        reservation_id: reservationId,
        customer_id: user.id,
        customer_name: context.reservation.customer_name ?? null,
        customer_phone: context.reservation.customer_phone ?? null,
        customer_email: context.reservation.customer_email ?? user.email ?? null,
        gateway: "paguelofacil",
        flow: "paguelofacil_link",
        amount_type: amountType,
        expected_amount: amount,
      },
    })
    .select("id")
    .maybeSingle();

  if (paymentError || !payment?.id) {
    return NextResponse.json({ error: "payment_create_failed" }, { status: 500 });
  }

  const appUrl = getAppUrl(req);
  const returnUrl = `${appUrl}/api/payments/paguelofacil/return?locale=${locale}`;
  const description = `Reserva Cabañas Marinas #${reservationId.slice(0, 8).toUpperCase()}`;
  const expiresIn = 3600;

  try {
    const pfData = await createPaymentLink({
      amount,
      description,
      returnUrl,
      reservationId,
      paymentId: payment.id,
      customerEmail: context.reservation.customer_email ?? user.email ?? null,
      expiresIn,
    });

    const checkoutUrl = pfData.data?.url;
    if (!pfData.success || !checkoutUrl) {
      throw new PagueloFacilProviderError(
        pfData.message ?? "PagueloFacil did not return a checkout URL.",
      );
    }

    const linkCreatedAt = new Date();
    const linkExpiresAt = addSeconds(linkCreatedAt, expiresIn);

    await admin
      .from("payments")
      .update({
        link_url: checkoutUrl,
        link_code: pfData.data?.code ?? null,
        link_created_at: linkCreatedAt.toISOString(),
        link_expires_at: linkExpiresAt,
        link_status: "ACTIVE",
        provider_message: null,
        meta: {
          reservation_id: reservationId,
          customer_id: user.id,
          customer_name: context.reservation.customer_name ?? null,
          customer_phone: context.reservation.customer_phone ?? null,
          customer_email: context.reservation.customer_email ?? user.email ?? null,
          gateway: "paguelofacil",
          flow: "paguelofacil_link",
          amount_type: amountType,
          expected_amount: amount,
          link_code: pfData.data?.code ?? null,
          checkout_url: checkoutUrl,
          link_created_at: linkCreatedAt.toISOString(),
          link_expires_at: linkExpiresAt,
        },
      })
      .eq("id", payment.id);

    await insertPaymentEvent(admin, {
      paymentId: payment.id,
      reservationId,
      eventType: "CREATE_LINK",
      status: "PENDING",
      amount,
      customerEmail: context.reservation.customer_email ?? user.email ?? null,
      payload: {
        amount_type: amountType,
        link_code: pfData.data?.code ?? null,
        link_expires_at: linkExpiresAt,
        return_url: returnUrl,
      },
    });

    await notifyPaymentLinkGenerated({
      supabase: admin,
      paymentId: payment.id,
      actorId: user.id,
      data: await getReservationEmailData(admin, reservationId, {
        amount,
        paymentUrl: checkoutUrl,
        customerEmail: context.reservation.customer_email ?? user.email ?? null,
      }),
    });

    return NextResponse.json({
      url: checkoutUrl,
      paymentId: payment.id,
      expiresAt: linkExpiresAt,
      reused: false,
    });
  } catch (error) {
    await admin
      .from("payments")
      .update({
        status: "FAILED",
        link_status: "FAILED",
        provider_message: error instanceof Error ? error.message : "Unknown error",
        meta: {
          reservation_id: reservationId,
          customer_id: user.id,
          gateway: "paguelofacil",
          flow: "paguelofacil_link",
          amount_type: amountType,
          expected_amount: amount,
          failure_reason: "link_creation_failed",
          failure_message: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .eq("id", payment.id);

    await insertPaymentEvent(admin, {
      paymentId: payment.id,
      reservationId,
      eventType: "CREATE_LINK",
      status: "FAILED",
      amount,
      customerEmail: context.reservation.customer_email ?? user.email ?? null,
      payload: {
        amount_type: amountType,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    await notifyPaymentFailed({
      supabase: admin,
      paymentId: payment.id,
      actorId: user.id,
      data: await getReservationEmailData(admin, reservationId, {
        amount,
        reason: error instanceof Error ? error.message : "No se pudo generar el enlace de pago.",
        customerEmail: context.reservation.customer_email ?? user.email ?? null,
      }),
    });

    return errorResponse(error);
  }
}
