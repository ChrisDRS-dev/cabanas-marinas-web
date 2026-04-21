import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { routing, stripLocaleFromPathname } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default async function proxy(req: NextRequest) {
  const res = handleI18nRouting(req);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = req.nextUrl.pathname;
  const normalizedPathname = stripLocaleFromPathname(pathname);
  const locale = pathname.split("/")[1] || routing.defaultLocale;
  const requiresAuth =
    normalizedPathname === "/reservar/pago" ||
    normalizedPathname.startsWith("/reservar/pago/");

  if (!requiresAuth) {
    return res;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet: Parameters<SetAllCookies>[0]) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL(`/${locale}`, req.url);
      loginUrl.searchParams.set("reservar", "1");
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
