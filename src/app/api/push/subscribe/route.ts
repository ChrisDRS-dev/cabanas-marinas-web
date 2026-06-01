import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  reservationId?: string | null;
};

export async function POST(req: Request) {
  const serverSupabase = await supabaseServer();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const payload = (await req.json()) as PushSubscriptionPayload;
  const endpoint = String(payload.endpoint ?? "").trim();
  const p256dh = String(payload.keys?.p256dh ?? "").trim();
  const auth = String(payload.keys?.auth ?? "").trim();
  const reservationId = payload.reservationId ? String(payload.reservationId) : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      reservation_id: reservationId,
      app: "client",
      endpoint,
      p256dh,
      auth,
      user_agent: req.headers.get("user-agent"),
      enabled: true,
      updated_at: now,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("profiles")
    .update({
      push_notifications_opt_in: true,
      push_notifications_consented_at: now,
    })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
