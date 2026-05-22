"use client";

import { useState } from "react";
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

export default function PagueloFacilPayment({
  reservationId,
  amount,
  amountType,
  locale,
  disabled,
  blockedReason,
  onStarted,
}: Props) {
  const t = useTranslations("payment.paguelofacil");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const handleCreateLink = async () => {
    if (disabled || !reservationId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/paguelofacil/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, amountType, locale }),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string; paymentId?: string }
        | null;

      if (!res.ok || !data?.url) {
        setError(data?.error ?? t("createError"));
        return;
      }

      setCheckoutUrl(data.url);
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  };

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
          {busy ? t("creating") : t("createCta", { amount: formatCurrency(amount) })}
        </button>
      ) : (
        <button
          type="button"
          onClick={openCheckout}
          className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80"
        >
          {t("openCheckout")}
        </button>
      )}

      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

      {opened ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            {t("afterOpenTitle")}
          </p>
          <p className="mt-1">{t("afterOpenBody")}</p>
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
