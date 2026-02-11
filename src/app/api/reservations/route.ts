import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type ReservationPayload = {
  packageId: string;
  date: string;
  timeSlot: string;
  adults: number;
  kids: number;
  extras: Array<{ id: string; quantity?: number }>;
  paymentMethod: string;
  specialRequest?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function parseTimeRange(value: string) {
  if (value.includes("-")) {
    const [start, end] = value.split("-");
    if (start && end) {
      return {
        start: start.replace(":00", "").trim(),
        end: end.replace(":00", "").trim(),
      };
    }
  }
  return { start: value.replace(":00", "").trim(), end: "" };
}

function extractErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const message = String((error as { message?: unknown }).message ?? "");
  const directMatch = message.match(/CM_[A-Z_]+/);
  if (directMatch) return directMatch[0];
  if (message.includes("not_authenticated")) return "not_authenticated";
  if (message.includes("missing_fields")) return "missing_fields";
  if (message.includes("invalid_package")) return "invalid_package";
  return null;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let payload: ReservationPayload;
  try {
    payload = (await req.json()) as ReservationPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const packageId = String(payload.packageId ?? "").trim();
  const reservedDate = String(payload.date ?? "").trim();
  const timeSlot = String(payload.timeSlot ?? "").trim();
  const adults = toNumber(payload.adults, 0);
  const kids = toNumber(payload.kids, 0);

  if (!packageId || !reservedDate || !timeSlot) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("duration_minutes")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgError || !pkg) {
    return NextResponse.json({ error: "invalid_package" }, { status: 400 });
  }

  const range = parseTimeRange(timeSlot);
  const startTime = range.start;
  if (!startTime) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const startAt = buildDateTime(reservedDate, startTime);
  let endAt = startAt;

  if (range.end) {
    endAt = buildDateTime(reservedDate, range.end);
  } else {
    if (!pkg.duration_minutes || Number(pkg.duration_minutes) <= 0) {
      return NextResponse.json({ error: "invalid_package" }, { status: 400 });
    }
    const startDate = new Date(startAt);
    const endDate = new Date(
      startDate.getTime() + Number(pkg.duration_minutes) * 60 * 1000
    );
    endAt = endDate.toISOString();
  }

  const extras =
    payload.extras?.map((extra) => ({
      id: String(extra.id ?? "").trim(),
      quantity: toNumber(extra.quantity, 1),
    })) ?? [];

  const rawPayment = String(payload.paymentMethod ?? "CASH").toUpperCase();
  const paymentMethod = rawPayment === "WHATSAPP" ? "CASH" : "CASH";

  const { data, error } = await supabase.rpc("create_reservation_public", {
    p_package_id: packageId,
    p_reserved_date: reservedDate,
    p_start_at: startAt,
    p_end_at: endAt,
    p_adults: adults,
    p_kids: kids,
    p_payment_method: paymentMethod,
    p_extras: extras,
    p_special_request: payload.specialRequest ?? null,
    p_customer_id: user.id,
  });

  if (error) {
    const code = extractErrorCode(error);
    return NextResponse.json(
      {
        error: code ?? "unknown_error",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : (error as { message?: unknown }).message,
      },
      { status: 400 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    id: result?.reservation_id ?? null,
    total: result?.total_amount ?? null,
  });
}
