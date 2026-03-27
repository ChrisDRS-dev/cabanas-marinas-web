import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type ManualLinkPayload = {
  reservationId?: string | null;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
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

  let payload: ManualLinkPayload;
  try {
    payload = (await req.json()) as ManualLinkPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const reservationId = String(payload.reservationId ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id,status,total_amount,deposit_amount,payment_method,customer_id,customer_name,customer_phone,customer_email,reserved_date,invoices(id,status,payments(id,provider,status,amount,meta,created_at))"
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

  const totalAmount = Number(reservation.total_amount ?? 0);
  const depositAmount =
    reservation.deposit_amount != null
      ? Number(reservation.deposit_amount)
      : roundCurrency(totalAmount * 0.5);

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

  const pendingPayments = (Array.isArray(invoice?.payments) ? invoice.payments : [])
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .filter((payment) => payment.provider === "YAPPY" && payment.status === "PENDING");

  if (pendingPayments.length > 0) {
    const pendingIds = pendingPayments.map((payment) => payment.id).filter(Boolean);
    if (pendingIds.length > 0) {
      await admin
        .from("payments")
        .update({
          status: "CANCELLED",
          meta: {
            invalidated_at: new Date().toISOString(),
            invalidation_reason: "switched_to_yappy_manual_link",
          },
        })
        .in("id", pendingIds);
    }
  }

  const { data: payment } = await admin
    .from("payments")
    .insert({
      invoice_id: invoiceId,
      provider: "YAPPY",
      status: "PENDING",
      amount: depositAmount,
      meta: {
        reservation_id: reservation.id,
        customer_id: reservation.customer_id,
        customer_name: reservation.customer_name ?? null,
        customer_phone: reservation.customer_phone ?? null,
        customer_email: reservation.customer_email ?? null,
        reserved_date: reservation.reserved_date,
        expected_amount: depositAmount,
        payment_method: "YAPPY",
        flow: "yappy_manual_link",
        source: "client_manual_link",
        opened_at: new Date().toISOString(),
      },
    })
    .select("id")
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    paymentId: payment?.id ?? null,
  });
}
