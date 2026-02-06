import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type AvailabilityPayload = {
  packageId: string;
  date: string;
  timeSlot: string;
  adults: number;
  kids: number;
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
  if (message.includes("no_cabin_available")) return "CM_NO_CABIN_AVAILABLE";
  if (message.includes("max_people_exceeded")) return "CM_MAX_PEOPLE_EXCEEDED";
  return null;
}

export async function POST(req: Request) {
  let payload: AvailabilityPayload;
  try {
    payload = (await req.json()) as AvailabilityPayload;
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

  const totalPeople = adults + kids;
  if (totalPeople <= 0) {
    return NextResponse.json({ error: "CM_INVALID_PEOPLE_COUNT" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("duration_minutes")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgError || !pkg) {
    return NextResponse.json({ error: "CM_INVALID_PACKAGE" }, { status: 400 });
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
      return NextResponse.json({ error: "CM_INVALID_PACKAGE" }, { status: 400 });
    }
    const startDate = new Date(startAt);
    const endDate = new Date(
      startDate.getTime() + Number(pkg.duration_minutes) * 60 * 1000
    );
    endAt = endDate.toISOString();
  }

  const { data, error } = await supabase.rpc("assign_cabin", {
    p_start_at: startAt,
    p_end_at: endAt,
    p_people: totalPeople,
  });

  if (error) {
    const code = extractErrorCode(error);
    return NextResponse.json(
      {
        available: false,
        error: code ?? "unknown_error",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : (error as { message?: unknown }).message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    available: Boolean(data),
    cabinId: data ?? null,
  });
}
