"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizeHref, type AppLocale } from "@/i18n/routing";
import { siteData } from "@/lib/siteData";

function buildWhatsAppConfirmLink(
  reservationId: string,
  oper: string,
  totalPagado: string,
  t: ReturnType<typeof useTranslations>,
) {
  const lines = [
    t("confirmWhatsapp.intro"),
    reservationId ? t("confirmWhatsapp.reservationId", { value: reservationId }) : null,
    oper ? t("confirmWhatsapp.operationCode", { value: oper }) : null,
    totalPagado ? t("confirmWhatsapp.paidAmount", { value: totalPagado }) : null,
  ].filter(Boolean) as string[];

  return `${siteData.links.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export default function ResultadoContent() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("payment");
  const searchParams = useSearchParams();

  const estado = searchParams.get("Estado") ?? searchParams.get("estado") ?? "";
  const totalPagado = searchParams.get("TotalPagado") ?? searchParams.get("totalPagado") ?? "";
  const oper = searchParams.get("Oper") ?? searchParams.get("oper") ?? "";
  const reservationId = searchParams.get("PARM_1") ?? searchParams.get("parm_1") ?? "";
  const razon = searchParams.get("Razon") ?? searchParams.get("razon") ?? "";

  const isApproved = estado === "Aprobada";
  const isDenied = estado === "Denegada";

  if (!estado) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {t("noResult")}
        </p>
        <a
          href={siteData.links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white"
        >
          {t("writeWhatsapp")}
        </a>
        <Link
          href={localizeHref(locale, "/")}
          className="rounded-full border border-border px-6 py-2 text-sm font-semibold"
        >
          {t("cta.backHome")}
        </Link>
      </div>
    );
  }

  if (isApproved) {
    const whatsappLink = buildWhatsAppConfirmLink(reservationId, oper, totalPagado, t);

    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-16">
        {/* Estado del pago */}
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-6 text-center">
          <p className="text-3xl">✓</p>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {t("processed")}
          </h1>
          {totalPagado && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("amount")} <span className="font-semibold text-foreground">${totalPagado}</span>
            </p>
          )}
          {oper && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("operationCode")} <span className="font-mono">{oper}</span>
            </p>
          )}
        </div>

        {/* ID de reserva */}
        {reservationId && (
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("reservationId")}</p>
            <p className="mt-1 select-all font-mono text-lg font-semibold text-foreground">
              {reservationId.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("saveCode")}
            </p>
          </div>
        )}

        {/* Instrucciones de confirmación manual */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            {t("finalStep")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("finalStepBody")}
          </p>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
        >
          {t("sendProof")}
        </a>

        <Link
          href={localizeHref(locale, "/")}
          className="w-full rounded-full border border-border px-4 py-2 text-center text-sm font-semibold"
        >
          {t("cta.backHome")}
        </Link>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-16">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-6 text-center">
          <p className="text-3xl">✗</p>
          <h1 className="mt-2 text-2xl font-semibold text-rose-700 dark:text-rose-400">
            {t("notProcessed")}
          </h1>
          {razon && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("reason")} <span className="font-medium text-foreground">{razon}</span>
            </p>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("tryAgainBody")}
        </p>

        <div className="flex flex-col gap-2">
          {reservationId && (
            <Link
              href={localizeHref(locale, `/reservar/pago?method=CARD&rid=${reservationId}`)}
              className="w-full rounded-full bg-foreground px-4 py-2 text-center text-sm font-semibold text-background"
            >
              {t("retry")}
            </Link>
          )}
          <a
            href={siteData.links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white"
          >
            {t("contactWhatsapp")}
          </a>
          <Link
            href={localizeHref(locale, "/")}
            className="w-full rounded-full border border-border px-4 py-2 text-center text-sm font-semibold"
          >
            {t("cta.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
