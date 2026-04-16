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

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function extractPanamaYappyAlias(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("507") && digits.length === 11) return digits.slice(3);
  if (digits.length === 8) return digits;
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
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const invoiceStatus =
    paidAmount <= 0
      ? "DUE"
      : paidAmount >= Number(invoice.total ?? 0)
      ? "PAID"
      : "PARTIALLY_PAID";

  await admin.from("invoices").update({ status: invoiceStatus }).eq("id", invoiceId);
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

  let reservationId: string;
  try {
    const body = await req.json();
    reservationId = String(body?.reservationId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  // Load reservation + invoice + payments (must belong to this user)
  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id,status,total_amount,payment_method,customer_id,customer_phone,invoices(id,status,total,payments(id,status,amount,created_at))"
    )
    .eq("id", reservationId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  // Must be CONFIRMED — not PENDING_PAYMENT (that's for the deposit)
  if (reservation.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "reservation_not_confirmed", detail: "Solo se puede pagar el saldo de una reserva confirmada." },
      { status: 400 }
    );
  }

  if (String(reservation.payment_method ?? "").toUpperCase() !== "YAPPY") {
    return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
  }

  const invoice = Array.isArray(reservation.invoices)
    ? reservation.invoices[0] ?? null
    : reservation.invoices ?? null;

  if (!invoice?.id) {
    return NextResponse.json(
      { error: "invoice_not_found", detail: "No se encontró una factura asociada a esta reserva." },
      { status: 400 }
    );
  }

  // Invoice must be PARTIALLY_PAID — not DUE (no deposit) or PAID (already done)
  if (invoice.status !== "PARTIALLY_PAID") {
    return NextResponse.json(
      {
        error: "invoice_not_partially_paid",
        detail:
          invoice.status === "PAID"
            ? "Esta reserva ya tiene el saldo pagado al 100%."
            : "El depósito inicial aún no ha sido confirmado.",
      },
      { status: 400 }
    );
  }

  // Calculate balance server-side — never trust client amount
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  const paidAmount = payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const totalAmount = Number(reservation.total_amount ?? 0);
  const balanceDue = roundCurrency(Math.max(0, totalAmount - paidAmount));

  if (balanceDue <= 0) {
    return NextResponse.json(
      { error: "no_balance_due", detail: "No hay saldo pendiente por pagar." },
      { status: 400 }
    );
  }

  // Resolve customer Panama phone
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
          "Necesitas un número panameño de 8 dígitos guardado en tu perfil para recibir la solicitud de pago por Yappy.",
      },
      { status: 400 }
    );
  }

  // Call Yappy
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
      return NextResponse.json({ error: "merchant_validation_failed", detail }, { status: 400 });
    }

    const orderId = createReservationOrderId(reservation.id);
    let yappyOrder;
    try {
      yappyOrder = await createYappyButtonOrder({
        authorizationToken: merchant.token,
        merchantId: config.merchantId,
        domain: config.domain,
        aliasYappy: customerAlias,
        ipnUrl: config.ipnUrl,
        orderId,
        amount: balanceDue,
        baseUrl: config.baseUrl,
      });
    } catch (error) {
      console.error("[Yappy balance] order_creation_failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        yappyCode: error instanceof YappyButtonError ? error.detail : undefined,
        orderId,
        balanceDue,
        aliasYappy: customerAlias,
      });
      const detail =
        error instanceof YappyButtonError ? error.message : "Order creation failed.";
      return NextResponse.json({ error: "order_creation_failed", detail }, { status: 400 });
    }

    const { data: payment } = await admin
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        provider: "YAPPY",
        status: "PENDING",
        amount: balanceDue,
        meta: {
          reservation_id: reservation.id,
          orderId,
          transactionId: yappyOrder.transactionId,
          token: yappyOrder.token,
          documentName: yappyOrder.documentName,
          merchant_validation: merchant.raw,
          order_response: yappyOrder.raw,
          expected_amount: balanceDue,
          flow: "yappy_balance",
          requested_alias: customerAlias,
        },
      })
      .select("id")
      .maybeSingle();

    await syncInvoiceStatus(invoice.id);

    console.log("[Yappy balance] order created", { reservationId, balanceDue, orderId });

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
        error: "yappy_balance_order_failed",
        detail:
          error instanceof Error ? error.message : "No se pudo iniciar el pago del saldo con Yappy.",
      },
      { status: 400 }
    );
  }
}
