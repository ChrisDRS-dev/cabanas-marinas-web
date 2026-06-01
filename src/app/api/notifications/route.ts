import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ notifications: [] });
  }

  const { data, error } = await supabase
    .from("notification_delivery_log")
    .select("id,title,body,status,target_url,reservation_id,read_at,created_at")
    .eq("recipient_user_id", user.id)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}
