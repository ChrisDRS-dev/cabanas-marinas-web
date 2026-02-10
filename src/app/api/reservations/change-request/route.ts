import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type ChangeRequestPayload = {
  reservationId?: string;
  requestedAdults?: number;
  requestedKids?: number;
  requestedExtras?: string[];
  note?: string;
};

const EDITABLE_STATUS = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 }
    );
  }

  let payload: ChangeRequestPayload;
  try {
    payload = (await request.json()) as ChangeRequestPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const reservationId = payload.reservationId?.trim();
  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select(
      "id, customer_id, customer_email, status, adults_count, kids_count"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (reservationError || !reservation) {
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

  if (!EDITABLE_STATUS.has(reservation.status)) {
    return NextResponse.json({ error: "not_editable" }, { status: 400 });
  }

  const currentAdults = reservation.adults_count ?? 0;
  const currentKids = reservation.kids_count ?? 0;
  const rawAdults = Number(payload.requestedAdults);
  const rawKids = Number(payload.requestedKids);
  const requestedAdults = Math.max(
    currentAdults,
    Number.isFinite(rawAdults) ? rawAdults : currentAdults
  );
  const requestedKids = Math.max(
    currentKids,
    Number.isFinite(rawKids) ? rawKids : currentKids
  );

  const extrasList = Array.isArray(payload.requestedExtras)
    ? payload.requestedExtras.filter(Boolean)
    : [];
  const requestedExtras = Array.from(new Set(extrasList)).map((id) => ({
    id,
    quantity: 1,
  }));

  const { data: existingRequest } = await supabase
    .from("reservation_change_requests")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json({ error: "pending_request_exists" }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from("reservation_change_requests")
    .insert({
      reservation_id: reservationId,
      customer_id: reservation.customer_id,
      customer_email: reservation.customer_email ?? user.email ?? null,
      current_adults_count: currentAdults,
      current_kids_count: currentKids,
      requested_adults_count: requestedAdults,
      requested_kids_count: requestedKids,
      requested_extras: requestedExtras,
      note: payload.note?.trim() || null,
      status: "PENDING",
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
