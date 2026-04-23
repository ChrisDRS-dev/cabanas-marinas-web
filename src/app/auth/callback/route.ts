import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

function isSafeInternalPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const fallbackPath = `/${routing.defaultLocale}`;
  const targetPath = isSafeInternalPath(next) ? next! : fallbackPath;

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      const errorUrl = new URL(targetPath, origin);
      errorUrl.searchParams.set("authError", "1");
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.redirect(new URL(targetPath, origin));
}
