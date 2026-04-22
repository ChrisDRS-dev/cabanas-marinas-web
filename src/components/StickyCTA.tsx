"use client";

import Link from "next/link";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { localizeHref, stripLocaleFromPathname, type AppLocale } from "@/i18n/routing";

type StickyCTAProps = {
  primaryHref: string;
  secondaryHref: string;
  instagramHref: string;
};

export default function StickyCTA({
  primaryHref,
  secondaryHref,
  instagramHref,
}: StickyCTAProps) {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("stickyCta");
  const { session, dismissed } = useAuth();

  if (
    pathname &&
    ["/reservar", "/review"].some((route) =>
      stripLocaleFromPathname(pathname).startsWith(route),
    )
  ) {
    return null;
  }
  if (!session || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur">
        <Link
          href={localizeHref(locale, primaryHref)}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          {t("reserve")}
        </Link>
        <a
          href={secondaryHref}
          aria-label={t("whatsappAria")}
          className="group flex h-12 items-center justify-center overflow-hidden rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 ease-out hover:bg-[#1ebe5b] focus-visible:w-36 focus-visible:px-5 active:w-36 active:px-5 sm:hover:w-36 sm:hover:px-5 w-12"
        >
          <span className="flex w-12 shrink-0 items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-[1.375rem] w-[1.375rem] fill-current" aria-hidden="true">
              <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.52 0 .18 5.33.18 11.88c0 2.1.55 4.16 1.6 5.98L0 24l6.33-1.66a11.78 11.78 0 0 0 5.73 1.47h.01c6.54 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.43-8.45Zm-8.46 18.3h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.75.98 1-3.66-.24-.38a9.82 9.82 0 0 1-1.5-5.25c0-5.43 4.42-9.85 9.87-9.85 2.64 0 5.12 1.02 6.98 2.89a9.8 9.8 0 0 1 2.88 6.97c0 5.44-4.43 9.86-9.87 9.86Zm5.41-7.39c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.91-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.41.25-.69.25-1.29.17-1.41-.08-.12-.28-.2-.58-.35Z" />
            </svg>
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 ease-out group-focus-visible:max-w-24 group-focus-visible:pr-1 group-focus-visible:opacity-100 group-active:max-w-24 group-active:pr-1 group-active:opacity-100 sm:group-hover:max-w-24 sm:group-hover:pr-1 sm:group-hover:opacity-100">
            {t("whatsapp")}
          </span>
        </a>
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("instagramAria")}
          className="group flex h-12 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4)] text-white shadow-lg shadow-[#dd2a7b]/25 transition-all duration-300 ease-out focus-visible:w-36 focus-visible:px-5 active:w-36 active:px-5 sm:hover:w-36 sm:hover:px-5 w-12"
        >
          <span className="flex w-12 shrink-0 items-center justify-center">
            <Instagram className="h-[1.375rem] w-[1.375rem]" />
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 ease-out group-focus-visible:max-w-24 group-focus-visible:pr-1 group-focus-visible:opacity-100 group-active:max-w-24 group-active:pr-1 group-active:opacity-100 sm:group-hover:max-w-24 sm:group-hover:pr-1 sm:group-hover:opacity-100">
            {t("instagram")}
          </span>
        </a>
      </div>
    </div>
  );
}
