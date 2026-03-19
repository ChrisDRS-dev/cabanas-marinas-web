import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let payload: { reservationId?: string };
  try {
    payload = (await req.json()) as { reservationId?: string };
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const reservationId = String(payload.reservationId ?? "").trim();
  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, status, customer_id, customer_email")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  const userEmail = user.email?.trim().toLowerCase() ?? null;
  const reservationEmail = reservation.customer_email?.trim().toLowerCase() ?? null;
  const isOwner =
    reservation.customer_id === user.id ||
    (userEmail && reservationEmail && userEmail === reservationEmail);

  if (!isOwner) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }

  if (reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "not_cancellable" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status: "CANCELLED" })
    .eq("id", reservationId);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
