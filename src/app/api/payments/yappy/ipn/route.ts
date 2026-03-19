import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getYappyButtonConfig,
  mapYappyIpnStatus,
  verifyYappyIpnHash,
} from "@/lib/yappy-button";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const hash = url.searchParams.get("hash")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const domain = url.searchParams.get("domain")?.trim() ?? "";
  const confirmationNumber =
    url.searchParams.get("confirmationNumber")?.trim() ?? null;

  if (!orderId || !hash || !status || !domain) {
    return NextResponse.json({ success: false, error: "missing_params" }, { status: 400 });
  }

  const config = getYappyButtonConfig(url.origin);
  const isValid = verifyYappyIpnHash({
    orderId,
    status,
    domain,
    hash,
    secretKeyBase64: config.secretKey,
  });

  if (!isValid) {
    return NextResponse.json({ success: false, error: "invalid_hash" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: payments } = await admin
    .from("payments")
    .select("id,invoice_id,status,provider_ref,meta")
    .eq("provider", "YAPPY")
    .contains("meta", { orderId });

  const payment = (payments ?? [])[0] ?? null;
  if (!payment) {
    return NextResponse.json({ success: false, error: "payment_not_found" }, { status: 404 });
  }

  const state = mapYappyIpnStatus(status);
  if (!state.paymentStatus) {
    return NextResponse.json({ success: false, error: "unsupported_status" }, { status: 400 });
  }

  await admin
    .from("payments")
    .update({
      status: state.paymentStatus,
      provider_ref: confirmationNumber ?? payment.provider_ref ?? orderId,
      paid_at: state.paymentStatus === "SUCCEEDED" ? new Date().toISOString() : null,
      meta: {
        ...(typeof payment.meta === "object" && payment.meta ? payment.meta : {}),
        ipn: {
          orderId,
          status,
          domain,
          hash,
          confirmationNumber,
          receivedAt: new Date().toISOString(),
        },
      },
    })
    .eq("id", payment.id);

  await syncInvoiceStatus(payment.invoice_id);

  if (state.reservationStatus) {
    const reservationId =
      typeof (payment.meta as Record<string, unknown> | null)?.reservation_id === "string"
        ? ((payment.meta as Record<string, unknown>).reservation_id as string)
        : null;

    if (reservationId) {
      await admin
        .from("reservations")
        .update({ status: state.reservationStatus })
        .eq("id", reservationId);
    }
  }

  return NextResponse.json({
    success: true,
    paymentStatus: state.paymentStatus,
    reservationStatus: state.reservationStatus,
  });
}
