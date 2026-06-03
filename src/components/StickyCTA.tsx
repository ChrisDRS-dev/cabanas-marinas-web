"use client";

import { Instagram } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("stickyCta");
  const { session, dismissed } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isCheckingReservations, setIsCheckingReservations] = useState(false);

  useEffect(() => {
    if (!session || dismissed) {
      return;
    }

    let ticking = false;

    const updateVisibility = () => {
      const scrollY = window.scrollY;
      const footer = document.querySelector("footer");
      const faq = document.getElementById("faq");

      const footerTop =
        footer?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const faqTop =
        faq?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const viewportHeight = window.innerHeight;
      const nearPageEnd =
        footerTop < viewportHeight - 12 || faqTop < viewportHeight * 0.88;

      setIsVisible(scrollY > 8 && !nearPageEnd);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [dismissed, session]);

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

  const openReservationsOrForm = async () => {
    if (isCheckingReservations) return;
    setIsCheckingReservations(true);
    try {
      const response = await fetch("/api/my-reservations", { cache: "no-store" });
      const result = await response.json();
      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Panama",
      }).format(new Date());
      const reservations = Array.isArray(result?.reservations)
        ? (result.reservations as Array<{ status?: string | null; reserved_date?: string | null }>)
        : [];
      const hasActiveReservation = reservations.some(
        (reservation) =>
          (reservation.status === "PENDING_PAYMENT" || reservation.status === "CONFIRMED") &&
          typeof reservation.reserved_date === "string" &&
          reservation.reserved_date >= todayStr,
      );
      router.push(
        localizeHref(locale, hasActiveReservation ? "/?reservar=1" : primaryHref),
      );
    } catch {
      router.push(localizeHref(locale, "/?reservar=1"));
    } finally {
      setIsCheckingReservations(false);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        className={[
          "flex w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur transition-all duration-300 ease-out",
          isVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-8 opacity-0",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={openReservationsOrForm}
          disabled={isCheckingReservations}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-75"
        >
          {isCheckingReservations ? "Revisando..." : t("myReservations")}
        </button>
        <a
          href={secondaryHref}
          aria-label={t("whatsappAria")}
          className="group flex h-12 w-12 items-center justify-start overflow-hidden rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 ease-out hover:bg-[#1ebe5b] pl-[13px] pr-[13px] hover:w-[136px] focus-visible:w-[136px] active:w-[136px] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-[1.375rem] w-[1.375rem] shrink-0 fill-current" aria-hidden="true">
            <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.52 0 .18 5.33.18 11.88c0 2.1.55 4.16 1.6 5.98L0 24l6.33-1.66a11.78 11.78 0 0 0 5.73 1.47h.01c6.54 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.43-8.45Zm-8.46 18.3h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.75.98 1-3.66-.24-.38a9.82 9.82 0 0 1-1.5-5.25c0-5.43 4.42-9.85 9.87-9.85 2.64 0 5.12 1.02 6.98 2.89a9.8 9.8 0 0 1 2.88 6.97c0 5.44-4.43 9.86-9.87 9.86Zm5.41-7.39c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.08-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.91-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.41.25-.69.25-1.29.17-1.41-.08-.12-.28-.2-.58-.35Z" />
          </svg>
          <span className="ml-2.5 overflow-hidden whitespace-nowrap text-sm font-semibold leading-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
            {t("whatsapp")}
          </span>
        </a>
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("instagramAria")}
          className="group flex h-12 w-12 items-center justify-start overflow-hidden rounded-full bg-[linear-gradient(135deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4)] text-white shadow-lg shadow-[#dd2a7b]/25 transition-all duration-300 ease-out pl-[13px] pr-[13px] hover:w-[142px] focus-visible:w-[142px] active:w-[142px] cursor-pointer"
        >
          <Instagram className="h-[1.375rem] w-[1.375rem] shrink-0" />
          <span className="ml-2.5 overflow-hidden whitespace-nowrap text-sm font-semibold leading-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
            {t("instagram")}
          </span>
        </a>
      </div>
    </div>
  );
}
