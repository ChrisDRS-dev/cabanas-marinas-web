import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL(`/${routing.defaultLocale}`, origin));
}
