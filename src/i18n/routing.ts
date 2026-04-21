import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return typeof value === "string" && routing.locales.includes(value as AppLocale);
}

export function stripLocaleFromPathname(pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/");
  const maybeLocale = segments[1];

  if (!isAppLocale(maybeLocale)) {
    return normalized || "/";
  }

  const rest = `/${segments.slice(2).join("/")}`.replace(/\/+/g, "/");
  return rest === "/" ? "/" : rest.replace(/\/$/, "") || "/";
}

export function localizeHref(locale: AppLocale, href: string) {
  if (!href) return `/${locale}`;
  if (/^(https?:)?\/\//.test(href) || href.startsWith("mailto:")) {
    return href;
  }

  const [beforeHash, hash = ""] = href.split("#");
  const [pathnameInput, search = ""] = beforeHash.split("?");
  const pathname = pathnameInput || "/";
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const stripped = stripLocaleFromPathname(normalizedPathname);
  const localizedPath = stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;

  return `${localizedPath}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}
