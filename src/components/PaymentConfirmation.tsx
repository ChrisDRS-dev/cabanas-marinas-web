"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import YappyPaymentButton from "@/components/YappyPaymentButton";
import YappyBalanceButton from "@/components/YappyBalanceButton";
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

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No show",
};

function parsePanamaDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  return new Date(value);
}

function formatDate(value: string | null) {
  if (!value) return "Por confirmar";
  const date = parsePanamaDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PA", {
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

function formatTimeOfDay(value: string | null) {
  if (!value) return "Por confirmar";
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const period = hour >= 12 ? "P.M." : "A.M.";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function formatTimeRange12h(value: string | null) {
  if (!value) return "Por confirmar";
  const [startRaw, endRaw] = value.split("-");
  const start = formatTimeOfDay(startRaw ?? null);
  const end = formatTimeOfDay(endRaw ?? null);
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

function buildWhatsAppLink(data: ConfirmationData | null) {
  const base = siteData.links.whatsapp;
  if (!data) return base;
  const paymentMethodLabel =
    data.paymentMethod === "YAPPY"
      ? "Yappy"
      : data.paymentMethod === "PAYPAL"
        ? "PayPal"
        : data.paymentMethod === "CARD"
          ? "Tarjeta"
          : "WhatsApp";
  const depositAmount =
    data.depositAmount != null
      ? Number(data.depositAmount)
      : data.totalAmount != null
        ? Math.round(Number(data.totalAmount) * 0.5 * 100) / 100
        : null;
  const messageLines = [
    "Hola, quiero confirmar mi reserva con el pago.",
    data.id ? `ID: ${String(data.id).slice(0, 8)}` : null,
    data.date ? `Fecha: ${formatDate(data.date)}` : null,
    data.timeSlot ? `Horario: ${formatTimeRange12h(data.timeSlot)}` : null,
    data.packageLabel ? `Paquete: ${data.packageLabel}` : null,
    data.status ? `Estado: ${STATUS_LABEL[data.status] ?? data.status}` : null,
    `Personas: ${(data.adults ?? 0) + (data.kids ?? 0)} (Adultos: ${data.adults ?? 0
    }, Niños: ${data.kids ?? 0})`,
    data.totalAmount != null
      ? `Total estimado: ${formatCurrency(data.totalAmount)}`
      : null,
    depositAmount != null
      ? `Pago inicial (50%): ${formatCurrency(depositAmount)}`
      : null,
    `Método de pago: ${paymentMethodLabel}`,
    "Para confirmar tu reserva, realiza el pago del 50% por el método indicado.",
  ].filter(Boolean) as string[];
  const message = messageLines.join("\n");
  return `${base}?text=${encodeURIComponent(message)}`;
}

const YAPPY_STATIC_LINK =
  "https://link.yappy.com.pa/stc/GXqG1kCpTLfAbMHmc7E9nxSk16Vdr9BZvaim7nGhYrA%3D";

export default function PaymentConfirmation() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ConfirmationData | null>(null);
  type PayStep = "amount" | "pay";
  const [payStep, setPayStep] = useState<PayStep>("amount");
  const [selectedAmountType, setSelectedAmountType] = useState<"deposit" | "full" | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [manualLinkBusy, setManualLinkBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const requestedReservationId = searchParams.get("rid");

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
            const start = toPanamaTime(activeReservation.start_at);
            const end = toPanamaTime(activeReservation.end_at);
            const timeSlot = start && end ? `${start}-${end}` : "";
            setData({
              id: activeReservation.id ?? null,
              name: null,
              status: activeReservation.status ?? null,
              adults: Number(activeReservation.adults_count ?? 0),
              kids: Number(activeReservation.kids_count ?? 0),
              packageLabel,
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
          setPaymentNotice("¡Tu reserva está pagada al 100%! Te esperamos el día de tu visita.");
          setPolling(false);
        } else if (status === "CONFIRMED" && invoiceStatus !== "PAID") {
          setPaymentNotice("Depósito confirmado. Tu reserva ya está confirmada. Ahora puedes pagar el saldo restante.");
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
      setPaymentNotice("No encontramos una reserva pendiente para asociar el pago manual.");
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
          result?.detail ?? "No se pudo preparar la referencia manual de este pago."
        );
      }

      window.open(YAPPY_STATIC_LINK, "_blank", "noopener,noreferrer");
      setPaymentNotice(
        "Abrimos el link de Yappy y dejamos el pago marcado como manual en el sistema. Cuando lo completes, envía el comprobante por WhatsApp."
      );
      setPolling(true);
    } catch (error) {
      setPaymentNotice(
        error instanceof Error
          ? error.message
          : "No se pudo abrir el flujo manual de Yappy."
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
      ? "No encontramos una reserva pendiente para iniciar el pago."
      : data.paymentMethod !== "YAPPY"
        ? "Esta reserva no fue creada con Yappy como método de pago."
        : data.status !== "PENDING_PAYMENT"
          ? "La reserva ya no está pendiente de pago."
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
            Reserva completada
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            ¡Reserva pagada al 100%!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu reserva está confirmada y pagada por completo. ¡Te esperamos!
          </p>
        </div>
      ) : isBalancePending ? (
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span>✓</span>
            <span>Depósito confirmado</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Pago de reserva
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Paga el saldo restante
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El depósito del 50% ya está confirmado. Paga el saldo restante para completar tu reserva.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Pago de reserva
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Elige cómo pagar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona un método para completar el depósito del 50% y confirmar tu reserva.
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 text-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Resumen de reserva
        </p>
        <div className="mt-3 grid gap-2">
          <p>
            <span className="font-semibold text-foreground">Paquete:</span>{" "}
            {data?.packageLabel ?? "Por confirmar"}
          </p>
          <p>
            <span className="font-semibold text-foreground">Estado:</span>{" "}
            {data?.status ? STATUS_LABEL[data.status] ?? data.status : "Por confirmar"}
          </p>
          <p>
            <span className="font-semibold text-foreground">Fecha:</span>{" "}
            {formatDate(data?.date ?? null)}
          </p>
          <p>
            <span className="font-semibold text-foreground">Horario:</span>{" "}
            {formatTimeRange12h(data?.timeSlot ?? null)}
          </p>
          <p>
            <span className="font-semibold text-foreground">Personas:</span>{" "}
            {(data?.adults ?? 0) + (data?.kids ?? 0)} (Adultos:{" "}
            {data?.adults ?? 0}, Niños: {data?.kids ?? 0})
          </p>
          <p>
            <span className="font-semibold text-foreground">Costo total:</span>{" "}
            {formatCurrency(data?.totalAmount ?? null)}
          </p>
          {isBalancePending || isFullyPaid ? (
            <>
              <p>
                <span className="font-semibold text-foreground">Pagado:</span>{" "}
                {formatCurrency(data?.paidAmount ?? null)}
              </p>
              {!isFullyPaid && (
                <p className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-base font-semibold text-amber-700 dark:text-amber-400">
                  Saldo pendiente (50%):{" "}
                  {formatCurrency(data?.balanceDue ?? null)}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-base font-semibold text-primary">
              Depósito a pagar (50%):{" "}
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
            Tu reserva está completamente pagada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nos vemos el {formatDate(data?.date ?? null)}. ¡Que lo disfrutes!
          </p>
        </div>
      ) : isBalancePending ? (
        <div className="rounded-3xl border border-border/70 bg-card px-6 py-5">
          <p className="mb-4 text-xs text-muted-foreground">
            Usa el botón de Yappy para enviar el saldo restante de{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(data?.balanceDue ?? null)}
            </span>{" "}
            directamente a tu número Yappy registrado.
          </p>
          <YappyBalanceButton
            reservationId={data?.id ?? null}
            balanceDue={data?.balanceDue ?? null}
            onPaymentStarted={() => {
              setPaymentNotice(
                "El flujo de pago del saldo fue iniciado. En cuanto Yappy confirme, actualizaremos tu reserva."
              );
              setPolling(true);
            }}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            ¿Tienes dudas? Escríbenos por{" "}
            <a
              href={buildWhatsAppLink(data)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#25D366] underline-offset-2 hover:underline"
            >
              WhatsApp
            </a>{" "}
            y te ayudamos.
          </p>
        </div>
      ) : (
        /* ── 3-step payment flow ── */
        <div className="flex flex-col gap-5">

          {/* Mini step breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className={payStep === "amount" ? "font-semibold text-foreground" : ""}>Monto</span>
            <span>›</span>
            <span className={payStep === "pay" ? "font-semibold text-foreground" : ""}>Pagar</span>
          </div>

          {/* STEP 1 — Amount selector */}
          {payStep === "amount" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                ¿Cuánto quieres pagar ahora?
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
                    <p className="text-base font-semibold text-foreground">Depósito inicial (50%)</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Confirma tu reserva con el mínimo requerido</p>
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
                      <p className="text-base font-semibold text-foreground">Pago completo (100%)</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Saldo total saldado desde el inicio</p>
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
                  Pagando{" "}
                  <span className="font-semibold text-foreground">{formatCurrency(chosenAmount)}</span>
                </p>
              </div>

              {/* Yappy botón (principal) */}
              <div className="rounded-3xl border border-border/70 px-5 py-5">
                <div className="mb-3 flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">Yappy</p>
                  <span className="rounded-full bg-[#00ADEF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00ADEF]">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa tu número Yappy y tu nombre como comentario para identificar tu pago.
                </p>
                <div className="mt-4">
                  <YappyPaymentButton
                    reservationId={data?.id ?? null}
                    amountOverride={chosenAmount}
                    disabled={Boolean(yappyBlockedReason)}
                    blockedReason={yappyBlockedReason}
                    onPaymentStarted={() => {
                      setPaymentNotice(
                        "El flujo de Yappy fue iniciado. En cuanto Yappy confirme el pago, actualizaremos tu reserva."
                      );
                      setPolling(true);
                    }}
                  />
                </div>
              </div>

              {/* Yappy manual (fallback) */}
              <div className="rounded-3xl border border-yellow-500/20 px-5 py-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-500">
                  Yappy manual – desde la app
                </p>
                <p className="text-xs text-muted-foreground">
                  Si el botón no funciona, usa el link estático. El equipo confirmará el pago manualmente.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void handleManualLinkClick()}
                    disabled={manualLinkBusy || Boolean(yappyBlockedReason)}
                    className="flex w-full items-center justify-center rounded-full bg-[#00ADEF] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0099d6] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualLinkBusy ? "Preparando link..." : "Abrir link estático de Yappy"}
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Monto a enviar:</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-semibold text-primary">
                      {formatCurrency(chosenAmount)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Número de teléfono:</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground">
                      {siteData.links.yappy}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">Alias / Directorio:</p>
                    <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground">
                      cabanasmarinas507
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-500">
                  Recuerda enviarnos la captura de pantalla del comprobante por WhatsApp para confirmar tu reserva.
                </p>
              </div>

              {/* WhatsApp (siempre disponible) */}
              <div className="rounded-3xl border border-[#25D366]/30 px-5 py-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#25D366]">
                  WhatsApp
                </p>
                <p className="text-xs text-muted-foreground">
                  Contáctanos para coordinar el pago o si necesitas ayuda.
                </p>
                <a
                  href={buildWhatsAppLink(data)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
                >
                  Abrir WhatsApp
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
        href="/"
        className="w-full rounded-full border border-border/70 px-4 py-2 text-center text-sm font-semibold"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
