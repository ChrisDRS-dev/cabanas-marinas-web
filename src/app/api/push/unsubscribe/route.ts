import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const serverSupabase = await supabaseServer();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = String(payload.endpoint ?? "").trim();
  const supabase = supabaseAdmin();

  let query = supabase
    .from("push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("app", "client");

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
