import { NextResponse } from "next/server";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { createPaymentLink } from "@/lib/paguelofacil/client";
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
  return value === "full" ? "full" : "deposit";
}

function normalizeLocale(value: unknown): AppLocale {
  const maybeLocale = typeof value === "string" ? value : null;
  return isAppLocale(maybeLocale) ? maybeLocale : "es";
}

function paymentMeta(value: unknown) {
  return objectFromUnknown(value);
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
    return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
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
  const amount = amountType === "full" ? balanceDue : depositAmount;

  if (!Number.isFinite(amount) || amount <= 0 || amount > balanceDue + 0.01) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const pendingIds = context.payments
    .filter(
      (payment) =>
        payment.provider === "CARD" &&
        payment.status === "PENDING" &&
        paymentMeta(payment.meta).gateway === "paguelofacil",
    )
    .map((payment) => payment.id);

  if (pendingIds.length > 0) {
    await admin
      .from("payments")
      .update({
        status: "CANCELLED",
        meta: {
          invalidation_reason: "replaced_by_new_paguelofacil_link",
          invalidated_at: new Date().toISOString(),
        },
      })
      .in("id", pendingIds);
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      invoice_id: context.invoice.id,
      provider: "CARD",
      status: "PENDING",
      amount,
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

  try {
    const pfData = await createPaymentLink({
      amount,
      description,
      returnUrl,
      reservationId,
      paymentId: payment.id,
      customerEmail: context.reservation.customer_email ?? user.email ?? null,
      expiresIn: 3600,
    });

    const checkoutUrl = pfData.data?.url;
    if (!pfData.success || !checkoutUrl) {
      throw new Error(pfData.message ?? "PagueloFacil did not return a checkout URL.");
    }

    await admin
      .from("payments")
      .update({
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
          link_created_at: new Date().toISOString(),
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
        return_url: returnUrl,
      },
    });

    return NextResponse.json({ url: checkoutUrl, paymentId: payment.id });
  } catch (error) {
    await admin
      .from("payments")
      .update({
        status: "FAILED",
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

    return NextResponse.json({ error: "paguelofacil_link_failed" }, { status: 502 });
  }
}
