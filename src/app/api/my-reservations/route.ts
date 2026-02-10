import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const email = user.email?.trim();

  const cleanupBase = supabase
    .from("reservations")
    .update({ status: "CANCELLED" })
    .eq("status", "PENDING_PAYMENT")
    .lt("reserved_date", today);

  const cleanupQuery = email
    ? cleanupBase.or(`customer_id.eq.${user.id},customer_email.ilike.${email}`)
    : cleanupBase.eq("customer_id", user.id);

  await cleanupQuery;

  const base = supabase
    .from("reservations")
    .select(
      "id,reserved_date,start_at,end_at,status,total_amount,cabin_code,package_id,adults_count,kids_count,cabins(name),packages(label)"
    );
  const query = email
    ? base.or(`customer_id.eq.${user.id},customer_email.ilike.${email}`)
    : base.eq("customer_id", user.id);
  const { data, error } = await query
    .order("reserved_date", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ reservations: data ?? [] });
}
