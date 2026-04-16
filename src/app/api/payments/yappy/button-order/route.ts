import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createReservationOrderId,
  createYappyButtonOrder,
  getYappyButtonConfig,
  validateYappyMerchant,
  YappyButtonError,
} from "@/lib/yappy-button";

type ButtonOrderPayload = {
  reservationId?: string | null;
  amountOverride?: number | null;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function extractPanamaYappyAlias(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("507") && digits.length === 11) {
    return digits.slice(3);
  }
  if (digits.length === 8) {
    return digits;
  }
  return null;
}

function resolveCustomerYappyAlias(args: {
  reservationPhone?: string | null;
  profilePhone?: string | null;
  metadataPhone?: string | null;
}) {
  return (
    extractPanamaYappyAlias(args.reservationPhone) ??
    extractPanamaYappyAlias(args.profilePhone) ??
    extractPanamaYappyAlias(args.metadataPhone) ??
    null
  );
}

async function syncInvoiceStatus(invoiceId: string) {
  const admin = supabaseAdmin();
  const { data: payments } = await admin
    .from("payments")
    .select("status,amount")
    .eq("invoice_id", invoiceId);

  const { data: invoice } = await admin
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return;

  const paidAmount = (payments ?? [])
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  const invoiceStatus =
    paidAmount <= 0
      ? "DUE"
      : paidAmount >= Number(invoice.total ?? 0)
      ? "PAID"
      : "PARTIALLY_PAID";

  await admin.from("invoices").update({ status: invoiceStatus }).eq("id", invoiceId);
}

function extractPaymentMeta(
  meta: unknown
): {
  flow?: string;
  transactionId?: string;
  token?: string;
  documentName?: string;
} {
  if (!meta || typeof meta !== "object") return {};
  const record = meta as Record<string, unknown>;
  return {
    flow: typeof record.flow === "string" ? record.flow : undefined,
    transactionId:
      typeof record.transactionId === "string" ? record.transactionId : undefined,
    token: typeof record.token === "string" ? record.token : undefined,
    documentName:
      typeof record.documentName === "string" ? record.documentName : undefined,
  };
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let payload: ButtonOrderPayload;
  try {
    payload = (await req.json()) as ButtonOrderPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const reservationId = String(payload.reservationId ?? "").trim();
  const amountOverride =
    typeof payload.amountOverride === "number" && payload.amountOverride > 0
      ? roundCurrency(payload.amountOverride)
      : null;
  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id,status,total_amount,deposit_amount,payment_method,customer_id,customer_phone,invoices(id,status,payments(id,provider,status,amount,meta,created_at))"
    )
    .eq("id", reservationId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  if (reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "reservation_not_pending_payment" },
      { status: 400 }
    );
  }

  if (String(reservation.payment_method ?? "").toUpperCase() !== "YAPPY") {
    return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const metadataPhone =
    typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;
  const customerAlias = resolveCustomerYappyAlias({
    reservationPhone: reservation.customer_phone,
    profilePhone: profile?.phone,
    metadataPhone,
  });

  if (!customerAlias) {
    return NextResponse.json(
      {
        error: "missing_panama_phone",
        detail:
          "Necesitas un número panameño de 8 dígitos, guardado como +507XXXXXXXX o XXXXXXXX, para solicitar el pago por Yappy.",
      },
      { status: 400 }
    );
  }

  const totalAmount = Number(reservation.total_amount ?? 0);
  const depositAmount =
    reservation.deposit_amount != null
      ? Number(reservation.deposit_amount)
      : roundCurrency(totalAmount * 0.5);

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return NextResponse.json(
      { error: "invalid_amount", detail: `Monto de depósito inválido: ${depositAmount}` },
      { status: 400 }
    );
  }

  const invoice = Array.isArray(reservation.invoices)
    ? reservation.invoices[0] ?? null
    : reservation.invoices ?? null;

  const invoiceId =
    invoice?.id ??
    (
      await admin
        .from("invoices")
        .insert({
          reservation_id: reservation.id,
          status: "DUE",
          subtotal: totalAmount,
          total: totalAmount,
        })
        .select("id")
        .maybeSingle()
    ).data?.id ??
    null;

  if (!invoiceId) {
    return NextResponse.json(
      {
        error: "invoice_create_failed",
        detail: "No se pudo preparar la factura local para esta reserva.",
      },
      { status: 400 }
    );
  }

  const existingPendingPayment = (Array.isArray(invoice?.payments)
    ? [...invoice.payments]
    : []
  )
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .find((payment) => payment.provider === "YAPPY" && payment.status === "PENDING");

  const existingMeta = extractPaymentMeta(existingPendingPayment?.meta);
  if (
    existingPendingPayment?.id &&
    existingMeta.flow === "yappy_button_v2" &&
    existingMeta.transactionId &&
    existingMeta.token &&
    existingMeta.documentName
  ) {
    return NextResponse.json({
      ok: true,
      paymentId: existingPendingPayment.id,
      reused: true,
      body: {
        transactionId: existingMeta.transactionId,
        token: existingMeta.token,
        documentName: existingMeta.documentName,
      },
    });
  }

  if (existingPendingPayment?.id) {
    await admin
      .from("payments")
      .update({
        status: "CANCELLED",
        meta: {
          ...(typeof existingPendingPayment.meta === "object" &&
          existingPendingPayment.meta
            ? existingPendingPayment.meta
            : {}),
          invalidated_at: new Date().toISOString(),
          invalidation_reason: "superseded_before_new_button_order",
        },
      })
      .eq("id", existingPendingPayment.id);
  }

  try {
    const url = new URL(req.url);
    const config = getYappyButtonConfig(url.origin);
    let merchant;
    try {
      merchant = await validateYappyMerchant({
        merchantId: config.merchantId,
        domain: config.domain,
        baseUrl: config.baseUrl,
      });
    } catch (error) {
      const detail =
        error instanceof YappyButtonError ? error.message : "Merchant validation failed.";
      return NextResponse.json(
        { error: "merchant_validation_failed", detail },
        { status: 400 }
      );
    }

    const orderId = createReservationOrderId(reservation.id);
    // Use amountOverride if provided (e.g. user chose to pay 100%), otherwise default to deposit
    const effectiveAmount =
      amountOverride != null && amountOverride <= totalAmount
        ? amountOverride
        : depositAmount;
    let yappyOrder;
    try {
      yappyOrder = await createYappyButtonOrder({
        authorizationToken: merchant.token,
        merchantId: config.merchantId,
        domain: config.domain,
        aliasYappy: customerAlias,
        ipnUrl: config.ipnUrl,
        orderId,
        amount: effectiveAmount,
        baseUrl: config.baseUrl,
      });
    } catch (error) {
      console.error("[Yappy] order_creation_failed detail", {
        errorMessage: error instanceof Error ? error.message : String(error),
        yappyCode: error instanceof YappyButtonError ? error.detail : undefined,
        orderId,
        effectiveAmount,
        aliasYappy: customerAlias,
      });
      const detail =
        error instanceof YappyButtonError ? error.message : "Order creation failed.";
      return NextResponse.json(
        { error: "order_creation_failed", detail },
        { status: 400 }
      );
    }

    const { data: payment } = await admin
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        provider: "YAPPY",
        status: "PENDING",
        amount: effectiveAmount,
        meta: {
          reservation_id: reservation.id,
          orderId,
          transactionId: yappyOrder.transactionId,
          token: yappyOrder.token,
          documentName: yappyOrder.documentName,
          merchant_validation: merchant.raw,
          order_response: yappyOrder.raw,
          expected_amount: effectiveAmount,
          flow: "yappy_button_v2",
          requested_alias: customerAlias,
        },
      })
      .select("id")
      .maybeSingle();

    await syncInvoiceStatus(invoiceId);

    return NextResponse.json({
      ok: true,
      paymentId: payment?.id ?? null,
      body: {
        transactionId: yappyOrder.transactionId,
        token: yappyOrder.token,
        documentName: yappyOrder.documentName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "yappy_button_order_failed",
        detail:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar el pago con Yappy.",
      },
      { status: 400 }
    );
  }
}
