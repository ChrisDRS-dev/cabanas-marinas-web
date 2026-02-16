import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function getPanamaTodayYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }

  const today = getPanamaTodayYMD();
  const cleanupBase = supabase
    .from("reservations")
    .update({ status: "CANCELLED" })
    .eq("status", "PENDING_PAYMENT")
    .lt("reserved_date", today)
    .eq("customer_id", user.id);

  await cleanupBase;

  const base = supabase
    .from("reservations")
    .select(
      "id,reserved_date,start_at,end_at,status,total_amount,package_id,adults_count,kids_count,packages(label)"
    );
  const { data, error } = await base
    .eq("customer_id", user.id)
    .order("reserved_date", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }

  return NextResponse.json({ reservations: data ?? [] });
}
