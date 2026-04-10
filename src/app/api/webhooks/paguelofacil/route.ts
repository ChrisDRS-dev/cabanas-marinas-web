import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const reservationId = String(body.PARM_1 ?? "").trim();
  const status = Number(body.status ?? body.Status ?? -1);
  const codOper = String(body.codOper ?? body.CodOper ?? "").trim();
  const totalPay = Number(body.totalPay ?? body.TotalPay ?? 0);

  console.log("[PF] webhook received", { reservationId, status, codOper, totalPay });

  if (!reservationId) {
    console.error("[PF] webhook: missing PARM_1");
    return NextResponse.json({ received: true });
  }

  const admin = supabaseAdmin();

  // Verify the reservation exists before doing anything
  const { data: reservation } = await admin
    .from("reservations")
    .select("id,status")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) {
    console.error("[PF] webhook: reservation not found", reservationId);
    return NextResponse.json({ received: true });
  }

  if (status === 1) {
    // Fetch current payment meta to merge codOper into it
    const { data: payment } = await admin
      .from("payments")
      .select("id,meta,status")
      .eq("reservation_id", reservationId)
      .eq("provider", "CARD")
      .maybeSingle();

    if (payment && payment.status !== "SUCCEEDED") {
      const updatedMeta = {
        ...(typeof payment.meta === "object" && payment.meta !== null ? payment.meta : {}),
        codOper,
        pf_total_pay: totalPay,
        confirmed_at: new Date().toISOString(),
      };

      await admin
        .from("payments")
        .update({ status: "SUCCEEDED", meta: updatedMeta })
        .eq("id", payment.id);
    }

    await admin
      .from("invoices")
      .update({ status: "PAID" })
      .eq("reservation_id", reservationId)
      .neq("status", "PAID");

    await admin
      .from("reservations")
      .update({ status: "CONFIRMED" })
      .eq("id", reservationId)
      .neq("status", "CONFIRMED");

    console.log("[PF] webhook: reservation confirmed", { reservationId, codOper });
  } else if (status === 0) {
    await admin
      .from("payments")
      .update({ status: "FAILED" })
      .eq("reservation_id", reservationId)
      .eq("provider", "CARD")
      .neq("status", "FAILED");

    console.log("[PF] webhook: payment failed", { reservationId });
  } else {
    console.warn("[PF] webhook: unknown status value", status);
  }

  // Always return 200 — PagueloFacil retries on non-200
  return NextResponse.json({ received: true });
}
