"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useMessages, useTranslations } from "next-intl";
import YappyPaymentButton from "@/components/YappyPaymentButton";
import YappyBalanceButton from "@/components/YappyBalanceButton";
import { getDateLocale } from "@/i18n/format";
import { localizeHref, type AppLocale } from "@/i18n/routing";
import { getCatalogMessages, getLocalizedPackage } from "@/lib/localized-catalog";
import { getSessionSafe } from "@/lib/supabase/client";
import { siteData } from "@/lib/siteData";

type ConfirmationData = {
  id: string | null;
  name: string | null;
  status: string | null;
  adults: number;
  kids: number;
  packageLabel: string | null;
  date: string | null;
  timeSlot: string | null;
  extras: string[];
  cabinCode: string | null;
  totalAmount?: number | string | null;
  depositAmount?: number | string | null;
  paymentMethod?: string | null;
  invoiceStatus?: string | null;
  paidAmount?: number | null;
  balanceDue?: number | null;
};

type ReservationApiItem = {
  id: string;
  reserved_date: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number | string | null;
  deposit_amount?: number | string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_provider_ref?: string | null;
  invoice_status?: string | null;
  paid_amount?: number | null;
  balance_due?: number | null;
  package_id?: string | null;
  adults_count?: number | null;
  kids_count?: number | null;
  packages?: { label?: string | null } | { label?: string | null }[] | null;
};

function parsePanamaDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  return new Date(value);
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return locale === "es" ? "Por confirmar" : "To be confirmed";
  const date = parsePanamaDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(getDateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Panama",
  });
}

function formatCurrency(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  const rounded = Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2);
  return `$${rounded}`;
}

function formatTimeOfDay(value: string | null, locale: AppLocale) {
  if (!value) return locale === "es" ? "Por confirmar" : "To be confirmed";
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const period = hour >= 12 ? "P.M." : "A.M.";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function formatTimeRange12h(value: string | null, locale: AppLocale) {
  if (!value) return locale === "es" ? "Por confirmar" : "To be confirmed";
  const [startRaw, endRaw] = value.split("-");
  const start = formatTimeOfDay(startRaw ?? null, locale);
  const end = formatTimeOfDay(endRaw ?? null, locale);
  return `${start} - ${end}`;
}

function toPanamaTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Panama",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function buildWhatsAppLink(
  data: ConfirmationData | null,
  locale: AppLocale,
  copy: {
    intro: string;
    date: (value: string) => string;
    time: (value: string) => string;
    packageLabel: (value: string) => string;
    status: (value: string) => string;
    people: (total: number, adults: number, kids: number) => string;
    estimatedTotal: (value: string) => string;
    deposit: (value: string) => string;
    method: (value: string) => string;
    final: string;
  },
) {
  const base = siteData.links.whatsapp;
  if (!data) return base;
  const paymentMethodLabel =
    data.paymentMethod === "YAPPY"
      ? "Yappy"
      : data.paymentMethod === "PAYPAL"
        ? "PayPal"
        : data.paymentMethod === "CARD"
          ? locale === "es"
            ? "Tarjeta"
            : "Card"
          : "WhatsApp";
  const depositAmount =
    data.depositAmount != null
      ? Number(data.depositAmount)
      : data.totalAmount != null
        ? Math.round(Number(data.totalAmount) * 0.5 * 100) / 100
        : null;
  const messageLines = [
    copy.intro,
    data.id ? `ID: ${String(data.id).slice(0, 8)}` : null,
    data.date ? copy.date(formatDate(data.date, locale)) : null,
    data.timeSlot ? copy.time(formatTimeRange12h(data.timeSlot, locale)) : null,
    data.packageLabel ? copy.packageLabel(data.packageLabel) : null,
    data.status ? copy.status(data.status) : null,
    copy.people((data.adults ?? 0) + (data.kids ?? 0), data.adults ?? 0, data.kids ?? 0),
    data.totalAmount != null
      ? copy.estimatedTotal(formatCurrency(data.totalAmount))
      : null,
    depositAmount != null
      ? copy.deposit(formatCurrency(depositAmount))
      : null,
    copy.method(paymentMethodLabel),
    copy.final,
  ].filter(Boolean) as string[];
  const message = messageLines.join("\n");
  return `${base}?text=${encodeURIComponent(message)}`;
}

const YAPPY_STATIC_LINK =
  "https://link.yappy.com.pa/stc/GXqG1kCpTLfAbMHmc7E9nxSk16Vdr9BZvaim7nGhYrA%3D";

export default function PaymentConfirmation() {
  const locale = useLocale() as AppLocale;
  const messages = useMessages();
  const t = useTranslations("payment");
  const catalog = getCatalogMessages(
    (messages as { booking?: { catalog?: unknown } }).booking?.catalog,
  );
  const searchParams = useSearchParams();
  const [data, setData] = useState<ConfirmationData | null>(null);
  type PayStep = "amount" | "pay";
  const [payStep, setPayStep] = useState<PayStep>("amount");
  const [selectedAmountType, setSelectedAmountType] = useState<"deposit" | "full" | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [manualLinkBusy, setManualLinkBusy] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);
  const [polling, setPolling] = useState(false);
  const requestedReservationId = searchParams.get("rid");
  const whatsappLink = buildWhatsAppLink(data, locale, {
    intro: t("reservationWhatsapp.intro"),
    date: (value) => t("reservationWhatsapp.date", { value }),
    time: (value) => t("reservationWhatsapp.time", { value }),
    packageLabel: (value) => t("reservationWhatsapp.package", { value }),
    status: (value) => t("reservationWhatsapp.status", { value: formatStatus(value) }),
    people: (total, adults, kids) =>
      t("reservationWhatsapp.people", { total, adults, kids }),
    estimatedTotal: (value) => t("reservationWhatsapp.estimatedTotal", { value }),
    deposit: (value) => t("reservationWhatsapp.deposit", { value }),
    method: (value) => t("reservationWhatsapp.method", { value }),
    final: t("reservationWhatsapp.final"),
  });
  const formatStatus = (status: string | null | undefined) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return t("statusPending");
      case "CONFIRMED":
        return t("statusConfirmed");
      case "CANCELLED":
        return t("statusCancelled");
      case "COMPLETED":
        return t("statusCompleted");
      case "NO_SHOW":
        return t("statusNoShow");
      default:
        return t("pending");
    }
  };

  const loadReservation = useCallback(async () => {
      let nextStatus: string | null = null;
      let nextInvoiceStatus: string | null = null;
      const session = await getSessionSafe();
      const userId = session?.user?.id ?? null;

      if (userId && typeof window !== "undefined") {
        const raw = window.localStorage.getItem(`cm_last_reservation:${userId}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ConfirmationData;
            setData((current) =>
              current?.id
                ? current
                : {
                    ...parsed,
                    status: parsed.status ?? "PENDING_PAYMENT",
                  }
            );
          } catch {
            setData(null);
          }
        }
      }

      try {
        const response = await fetch("/api/my-reservations", {
          cache: "no-store",
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result?.reservations)) {
          const list = result.reservations as ReservationApiItem[];
          const activeReservation =
            (requestedReservationId
              ? list.find((item) => item.id === requestedReservationId) ?? null
              : null) ??
            list.find((item) => item.status === "PENDING_PAYMENT") ??
            list.find((item) => item.status === "CONFIRMED") ??
            null;

          if (activeReservation) {
            const packageLabel = Array.isArray(activeReservation.packages)
              ? activeReservation.packages[0]?.label ?? null
              : activeReservation.packages?.label ?? null;
            const localizedPackageLabel = activeReservation.package_id
              ? getLocalizedPackage(
                  {
                    id: activeReservation.package_id,
                    label: packageLabel ?? activeReservation.package_id,
                    note: null,
                    durationMinutes: 0,
                    pricePerAdult: 0,
                    kidDiscount: 0,
                    minPeopleWeekday: 0,
                    minPeopleWeekend: 0,
                    minPeopleHoliday: 0,
                  },
                  catalog,
                )?.label ?? packageLabel
              : packageLabel;
            const start = toPanamaTime(activeReservation.start_at);
            const end = toPanamaTime(activeReservation.end_at);
            const timeSlot = start && end ? `${start}-${end}` : "";
            setData({
              id: activeReservation.id ?? null,
              name: null,
              status: activeReservation.status ?? null,
              adults: Number(activeReservation.adults_count ?? 0),
              kids: Number(activeReservation.kids_count ?? 0),
              packageLabel: localizedPackageLabel,
              date: activeReservation.reserved_date ?? null,
              timeSlot: timeSlot || null,
              extras: [],
              cabinCode: null,
              totalAmount: activeReservation.total_amount ?? null,
              depositAmount: activeReservation.deposit_amount ?? null,
              paymentMethod: activeReservation.payment_method ?? null,
              invoiceStatus: activeReservation.invoice_status ?? null,
              paidAmount: typeof activeReservation.paid_amount === "number" ? activeReservation.paid_amount : null,
              balanceDue: typeof activeReservation.balance_due === "number" ? activeReservation.balance_due : null,
            });
            nextStatus = activeReservation.status ?? null;
            nextInvoiceStatus = activeReservation.invoice_status ?? null;
          } else if (userId && typeof window !== "undefined") {
            window.localStorage.removeItem(`cm_last_reservation:${userId}`);
          }
        }
      } catch {
        return null;
      }
      return { status: nextStatus, invoiceStatus: nextInvoiceStatus };
  }, [requestedReservationId]);

  useEffect(() => {
    void loadReservation();
  }, [loadReservation]);

  useEffect(() => {
    if (!polling) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void loadReservation().then((result) => {
        const status = result?.status ?? null;
        const invoiceStatus = result?.invoiceStatus ?? null;
        if (status === "COMPLETED" || (status === "CONFIRMED" && invoiceStatus === "PAID")) {
          setPaymentNotice(t("polling.fullyPaid"));
          setPolling(false);
        } else if (status === "CONFIRMED" && invoiceStatus !== "PAID") {
          setPaymentNotice(t("polling.depositConfirmed"));
          setPolling(false);
        } else if (attempts >= 18) {
          setPolling(false);
        }
      });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadReservation, polling]);

  async function handleManualLinkClick() {
    if (!data?.id) {
      setPaymentNotice(t("manual.noReservation"));
      return;
    }

    setManualLinkBusy(true);
    setPaymentNotice(null);

    try {
      const response = await fetch("/api/payments/yappy/manual-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: data.id }),
      });
      const result = (await response.json().catch(() => null)) as
        | { detail?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.detail ?? t("manual.prepareError")
        );
      }

      window.open(YAPPY_STATIC_LINK, "_blank", "noopener,noreferrer");
      setPaymentNotice(t("manual.opened"));
      setPolling(true);
    } catch (error) {
      setPaymentNotice(
        error instanceof Error
          ? error.message
          : t("manual.openError")
      );
    } finally {
      setManualLinkBusy(false);
    }
  }


  const depositAmount =
    data?.depositAmount != null
      ? data.depositAmount
      : data?.totalAmount != null
        ? Math.round(Number(data.totalAmount) * 0.5 * 100) / 100
        : null;

  const chosenAmount: number | null =
    selectedAmountType === "full"
      ? (data?.totalAmount != null ? Number(data.totalAmount) : null)
      : depositAmount != null ? Number(depositAmount) : null;

  const yappyBlockedReason =
    !data?.id
      ? t("yappyBlocked.noReservation")
      : data.paymentMethod !== "YAPPY"
        ? t("yappyBlocked.notYappy")
        : data.status !== "PENDING_PAYMENT"
          ? t("yappyBlocked.notPending")
          : null;

  const isFullyPaid =
    data?.status === "CONFIRMED" && data?.invoiceStatus === "PAID";
  const isBalancePending =
    data?.status === "CONFIRMED" && data?.invoiceStatus === "PARTIALLY_PAID";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">

      {/* Header — adapts to payment state */}
      {isFullyPaid ? (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("header.completedEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {t("header.completedTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("header.completedBody")}
          </p>
        </div>
      ) : isBalancePending ? (
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>✓</span>
            <span>{t("header.depositBadge")}</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("header.paymentEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {t("header.balanceTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("header.balanceBody")}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("header.paymentEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {t("header.chooseTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("header.chooseBody")}
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 text-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("summary.eyebrow")}
        </p>
        <div className="mt-3 grid gap-2">
          <p>
            <span className="font-semibold text-foreground">{t("summary.package")}</span>{" "}
            {data?.packageLabel ?? t("pending")}
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("summary.status")}</span>{" "}
            {data?.status ? formatStatus(data.status) : t("pending")}
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("summary.date")}</span>{" "}
            {formatDate(data?.date ?? null, locale)}
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("summary.time")}</span>{" "}
            {formatTimeRange12h(data?.timeSlot ?? null, locale)}
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("summary.people")}</span>{" "}
            {t("summary.peopleValue", {
              total: (data?.adults ?? 0) + (data?.kids ?? 0),
              adults: data?.adults ?? 0,
              kids: data?.kids ?? 0,
            })}
          </p>
          <p>
            <span className="font-semibold text-foreground">{t("summary.total")}</span>{" "}
            {formatCurrency(data?.totalAmount ?? null)}
          </p>
          {isBalancePending || isFullyPaid ? (
            <>
              <p>
                <span className="font-semibold text-foreground">{t("summary.paid")}</span>{" "}
                {formatCurrency(data?.paidAmount ?? null)}
              </p>
              {!isFullyPaid && (
                <p className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-base font-semibold text-amber-700 dark:text-amber-400">
                  {t("summary.balanceDue")}{" "}
                  {formatCurrency(data?.balanceDue ?? null)}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-base font-semibold text-primary">
              {t("summary.deposit")}{" "}
              {formatCurrency(depositAmount)}
            </p>
          )}
        </div>
      </div>

      {/* Contenido principal — varía según el estado de pago */}
      {isFullyPaid ? (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-8 text-center">
          <p className="text-4xl">🌊</p>
          <p className="mt-3 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {t("states.fullyPaidTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("states.fullyPaidBody", { date: formatDate(data?.date ?? null, locale) })}
          </p>
        </div>
      ) : isBalancePending ? (
        <div className="rounded-3xl border border-border/70 bg-card px-6 py-5">
          <p className="mb-4 text-xs text-muted-foreground">
            {t("states.balanceBodyPrefix")}{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(data?.balanceDue ?? null)}
            </span>{" "}
            {t("states.balanceBodySuffix")}
          </p>
          <YappyBalanceButton
            reservationId={data?.id ?? null}
            balanceDue={data?.balanceDue ?? null}
            onPaymentStarted={() => {
              setPaymentNotice(
                t("states.balancePolling")
              );
              setPolling(true);
            }}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            {t("states.helpPrefix")}{" "}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#25D366] underline-offset-2 hover:underline"
            >
              {t("cta.whatsapp")}
            </a>{" "}
            {t("states.helpSuffix")}
          </p>
        </div>
      ) : (
        /* ── 3-step payment flow ── */
        <div className="flex flex-col gap-5">

          {/* Mini step breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className={payStep === "amount" ? "font-semibold text-foreground" : ""}>{t("steps.amount")}</span>
            <span>›</span>
            <span className={payStep === "pay" ? "font-semibold text-foreground" : ""}>{t("steps.pay")}</span>
          </div>

          {/* STEP 1 — Amount selector */}
          {payStep === "amount" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("amountSelector.question")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedAmountType("deposit");
                  setPayStep("pay");
                }}
                className="w-full rounded-3xl border border-border/70 bg-background px-6 py-5 text-left transition hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{t("amountSelector.depositTitle")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("amountSelector.depositBody")}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(depositAmount)}</p>
                </div>
              </button>
              {data?.totalAmount != null && Number(data.totalAmount) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAmountType("full");
                    setPayStep("pay");
                  }}
                  className="w-full rounded-3xl border border-border/70 bg-background px-6 py-5 text-left transition hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{t("amountSelector.fullTitle")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("amountSelector.fullBody")}</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(data.totalAmount)}</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* STEP 2 — Pay (all Yappy options together) */}
          {payStep === "pay" && (
            <div className="flex flex-col gap-4">
              {/* Header with back button + chosen amount */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPayStep("amount")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-sm text-foreground transition hover:border-primary/50"
                >
                  ←
                </button>
                <p className="text-sm text-muted-foreground">
                  {t("paying")}{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(chosenAmount)}</span>
                </p>
              </div>

              {/* Yappy botón (principal) */}
              <div className="rounded-3xl border border-border/70 px-5 py-5">
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">Yappy</p>
                  <span className="rounded-full bg-[#00ADEF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00ADEF]">
                    {t("recommended")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("officialButtonBody")}
                </p>
                <div className="mt-4">
                  <YappyPaymentButton
                    reservationId={data?.id ?? null}
                    amountOverride={chosenAmount}
                    disabled={Boolean(yappyBlockedReason)}
                    blockedReason={yappyBlockedReason}
                    onPaymentStarted={() => {
                      setPaymentNotice(
                        t("officialButtonPolling")
                      );
                      setPolling(true);
                    }}
                  />
                </div>
              </div>

              {/* Yappy manual (fallback) */}
              <div className="rounded-3xl border border-yellow-500/20 px-5 py-5">
                <button
                  type="button"
                  onClick={() => setManualExpanded((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-500">
                      {t("manual.title")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("manual.subtitle")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {manualExpanded ? t("manual.hide") : t("manual.show")}
                  </span>
                </button>
                {manualExpanded ? <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void handleManualLinkClick()}
                    disabled={manualLinkBusy || Boolean(yappyBlockedReason)}
                    className="flex w-full items-center justify-center rounded-full bg-[#00ADEF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0099d6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualLinkBusy ? t("manual.preparing") : t("manual.openLink")}
                  </button>
                </div> : null}
                {manualExpanded ? <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">{t("manual.amount")}</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                      {formatCurrency(chosenAmount)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">{t("manual.phone")}</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground">
                      {siteData.links.yappy}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">{t("manual.alias")}</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground">
                      cabanasmarinas507
                    </div>
                  </div>
                </div> : null}
                {manualExpanded ? <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-500">
                  {t("manual.reminder")}
                </p> : null}
              </div>

              {/* WhatsApp (siempre disponible) */}
              <div className="rounded-3xl border border-[#25D366]/30 px-5 py-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#25D366]">
                  WhatsApp
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("whatsappCard.body")}
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
                >
                  {t("whatsappCard.cta")}
                </a>
              </div>
            </div>
          )}

        </div>
      )}

      {paymentNotice ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {paymentNotice}
        </div>
      ) : null}

      <Link
        href={localizeHref(locale, "/")}
        className="w-full rounded-full border border-border/70 px-4 py-2 text-center text-sm font-semibold"
      >
        {t("cta.backHome")}
      </Link>
    </div>
  );
}
