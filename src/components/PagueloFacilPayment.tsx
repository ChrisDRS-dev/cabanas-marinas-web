"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import type { PFAmountType } from "@/lib/paguelofacil/types";
import { siteData } from "@/lib/siteData";

type Props = {
  reservationId: string | null;
  amount: number | string | null | undefined;
  amountType: PFAmountType;
  locale: AppLocale;
  disabled?: boolean;
  blockedReason?: string | null;
  onStarted?: () => void;
  initialCheckoutUrl?: string | null;
  initialExpiresAt?: string | null;
  initialProviderRef?: string | null;
  autoStart?: boolean;
  autoRedirect?: boolean;
  forceNew?: boolean;
};

function formatCurrency(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  return `$${Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2)}`;
}

function buildWhatsAppLink(reservationId: string | null, locale: AppLocale) {
  const lines =
    locale === "es"
      ? [
          "Hola, realicé mi pago con tarjeta y adjunto el comprobante para confirmar mi reserva.",
          reservationId ? `ID de reserva: ${reservationId.slice(0, 8).toUpperCase()}` : null,
        ]
      : [
          "Hi, I completed my card payment and I am attaching the receipt to confirm my booking.",
          reservationId ? `Booking ID: ${reservationId.slice(0, 8).toUpperCase()}` : null,
        ];

  return `${siteData.links.whatsapp}?text=${encodeURIComponent(lines.filter(Boolean).join("\n"))}`;
}

function formatExpires(value: string | null | undefined, locale: AppLocale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === "es" ? "es-PA" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Panama",
  });
}

function getCreateOrderErrorMessage(error: string | undefined, t: ReturnType<typeof useTranslations>) {
  switch (error) {
    case "paguelofacil_config_missing":
      return t("configError");
    case "paguelofacil_provider_unavailable":
      return t("providerError");
    case "unauthorized":
      return t("sessionError");
    case "missing_reservation":
    case "reservation_not_found":
      return t("notFoundError");
    case "reservation_not_pending_payment":
    case "invalid_payment_method":
    case "invoice_not_found":
    case "invalid_amount":
      return t("reservationError");
    default:
      return t("createError");
  }
}

export default function PagueloFacilPayment({
  reservationId,
  amount,
  amountType,
  locale,
  disabled,
  blockedReason,
  onStarted,
  initialCheckoutUrl = null,
  initialExpiresAt = null,
  initialProviderRef = null,
  autoStart = false,
  autoRedirect = false,
  forceNew = false,
}: Props) {
  const t = useTranslations("payment.paguelofacil");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(initialCheckoutUrl);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [providerRef, setProviderRef] = useState<string | null>(initialProviderRef);
  const [opened, setOpened] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!initialCheckoutUrl) return;
    setCheckoutUrl(initialCheckoutUrl);
    setExpiresAt(initialExpiresAt);
    setProviderRef(initialProviderRef);
    setOpened(false);
  }, [initialCheckoutUrl, initialExpiresAt, initialProviderRef]);

  const handleCreateLink = useCallback(async (options?: { forceNew?: boolean }) => {
    if (disabled || !reservationId) return;
    const requestedForceNew = forceNew || options?.forceNew === true;
    setBusy(true);
    setError(null);
    if (requestedForceNew) {
      setCheckoutUrl(null);
      setExpiresAt(null);
      setProviderRef(null);
      setOpened(false);
    }

    try {
      const res = await fetch("/api/payments/paguelofacil/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, amountType, locale, forceNew: requestedForceNew }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string; paymentId?: string; expiresAt?: string; reused?: boolean }
        | null;

      if (!res.ok || !data?.url) {
        setError(getCreateOrderErrorMessage(data?.error, t));
        return;
      }

      setCheckoutUrl(data.url);
      setExpiresAt(data.expiresAt ?? null);
      setProviderRef(null);
      if (autoRedirect) {
        onStarted?.();
        const popup = window.open(data.url, "_blank", "noopener,noreferrer");
        setOpened(true);
        if (!popup) {
          setError(t("popupBlocked"));
        }
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }, [amountType, autoRedirect, disabled, forceNew, locale, onStarted, reservationId, t]);

  useEffect(() => {
    if (
      !autoStart ||
      autoStartedRef.current ||
      (checkoutUrl && !forceNew) ||
      busy ||
      disabled ||
      blockedReason
    ) {
      return;
    }

    autoStartedRef.current = true;
    void handleCreateLink({ forceNew });
  }, [autoStart, blockedReason, busy, checkoutUrl, disabled, forceNew, handleCreateLink]);

  const openCheckout = () => {
    if (!checkoutUrl) return;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    setOpened(true);
    onStarted?.();
  };

  if (blockedReason) {
    return <p className="text-xs text-amber-600 dark:text-amber-500">{blockedReason}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {t("body", { amount: formatCurrency(amount) })}
      </p>

      {!checkoutUrl ? (
        <button
          type="button"
          onClick={() => void handleCreateLink()}
          disabled={busy || disabled || !reservationId}
          className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && autoRedirect
            ? t("redirecting")
            : busy
              ? t("creating")
              : t("createCta", { amount: formatCurrency(amount) })}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={openCheckout}
            disabled={busy}
            className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("openCheckout")}
          </button>
          <button
            type="button"
            onClick={() => void handleCreateLink({ forceNew: true })}
            disabled={busy || disabled || !reservationId}
            className="flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("regenerating") : t("regenerateCta")}
          </button>
        </div>
      )}

      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

      {checkoutUrl ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            {opened ? t("afterOpenTitle") : t("activeLinkTitle")}
          </p>
          <p className="mt-1">{opened ? t("afterOpenBody") : t("activeLinkBody")}</p>
          {expiresAt ? (
            <p className="mt-1">
              {t("expiresAt", { value: formatExpires(expiresAt, locale) ?? expiresAt })}
            </p>
          ) : null}
          {providerRef ? (
            <p className="mt-1">
              {t("operationCode", { value: providerRef })}
            </p>
          ) : null}
          <a
            href={buildWhatsAppLink(reservationId, locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full bg-[#25D366] px-4 py-2 text-xs font-semibold text-white"
          >
            {t("whatsapp")}
          </a>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground/70">
        {t("securityNote")}
      </p>
    </div>
  );
}
