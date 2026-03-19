import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

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

  const phone = normalizePhone(String(payload.phone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, phone }, { onConflict: "user_id" });

  if (error) {
    const { error: authError } = await supabase.auth.updateUser({
      data: { phone },
    });

    if (!authError) {
      return NextResponse.json({
        ok: true,
        phone,
        fallback: "auth_metadata",
        warning: "profiles_upsert_failed",
      });
    }

    return NextResponse.json(
      {
        error: "update_failed",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : {
                profiles: String(error.message ?? "unknown_profiles_error"),
                auth: String(authError.message ?? "unknown_auth_error"),
              },
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, phone });
}
