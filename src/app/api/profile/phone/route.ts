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

  let payload: { phone?: string | null };
  try {
    payload = (await req.json()) as { phone?: string | null };
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const phone = String(payload.phone ?? "").trim();
  if (!phone) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, phone }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

