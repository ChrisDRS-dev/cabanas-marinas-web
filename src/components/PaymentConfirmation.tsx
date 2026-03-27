"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import YappyPaymentButton from "@/components/YappyPaymentButton";
import { getSessionSafe } from "@/lib/supabase/client";
import { siteData } from "@/lib/siteData";
import { ChevronDown } from "lucide-react";

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

type PaymentMethod = "YAPPY" | "YAPPY_MANUAL" | "CARD" | "WHATSAPP";
const YAPPY_STATIC_LINK =
  "https://link.yappy.com.pa/stc/GXqG1kCpTLfAbMHmc7E9nxSk16Vdr9BZvaim7nGhYrA%3D";

export default function PaymentConfirmation() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [openMethod, setOpenMethod] = useState<PaymentMethod | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [manualLinkBusy, setManualLinkBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const requestedReservationId = searchParams.get("rid");

  function toggleMethod(method: PaymentMethod) {
    setOpenMethod((prev) => (prev === method ? null : method));
  }

  const loadReservation = useCallback(async () => {
      let nextStatus: string | null = null;
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
            });
            nextStatus = activeReservation.status ?? null;
          } else if (userId && typeof window !== "undefined") {
            window.localStorage.removeItem(`cm_last_reservation:${userId}`);
          }
        }
      } catch {
        return null;
      }
      return nextStatus;
  }, [requestedReservationId]);

  useEffect(() => {
    void loadReservation();
  }, [loadReservation]);

  useEffect(() => {
    if (!polling) return;

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void loadReservation().then((status) => {
        if (status === "CONFIRMED" || status === "COMPLETED") {
          setPaymentNotice("Pago confirmado. Tu reserva ya aparece como confirmada.");
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

  const yappyBlockedReason =
    !data?.id
      ? "No encontramos una reserva pendiente para iniciar el pago."
      : data.paymentMethod !== "YAPPY"
        ? "Esta reserva no fue creada con Yappy como método de pago."
        : data.status !== "PENDING_PAYMENT"
          ? "La reserva ya no está pendiente de pago."
          : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
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
          <p className="mt-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-base font-semibold text-primary">
            Depósito a pagar (50%):{" "}
            {formatCurrency(depositAmount)}
          </p>
        </div>
      </div>

      {/* Métodos de pago (acordeón) */}
      <div className="flex flex-col gap-2">

        {/* Yappy (link) */}
        <div className="rounded-3xl border border-border/70 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleMethod("YAPPY")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                Yappy
              </span>
              <span className="rounded-full bg-[#00ADEF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#00ADEF]">
                Recomendado
              </span>
            </div>
            <ChevronDown
              className={[
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                openMethod === "YAPPY" ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: openMethod === "YAPPY" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/50 px-5 pb-5 pt-4">
                <p className="text-xs text-muted-foreground">
                  Ingresa el monto del depósito (
                  <span className="font-semibold text-foreground">
                    {formatCurrency(depositAmount)}
                  </span>
                  ), tu número Yappy y tu nombre como comentario para identificar tu pago.
                </p>
                <div className="mt-4">
                  <YappyPaymentButton
                    reservationId={data?.id ?? null}
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
                <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-500">
                  Si el botón no te funciona, puedes usar el link manual de Yappy o escribirnos por WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Yappy Manual */}
        <div className="rounded-3xl border border-yellow-500/20 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleMethod("YAPPY_MANUAL")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-500">
              Yappy manual – desde la app
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                openMethod === "YAPPY_MANUAL" ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: openMethod === "YAPPY_MANUAL" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-yellow-500/20 px-5 pb-5 pt-4">
                <p className="text-xs text-muted-foreground">
                  Este es el respaldo manual. Abriremos el link estático de Yappy y dejaremos el pago marcado como pendiente manual para que el equipo lo confirme.
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
            </div>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="rounded-3xl border border-border/70 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleMethod("CARD")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
              Tarjeta
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                openMethod === "CARD" ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: openMethod === "CARD" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-border/50 px-5 pb-5 pt-4">
                <p className="text-xs text-muted-foreground">
                  El pago con tarjeta estará disponible muy pronto.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-3xl border border-[#25D366]/30 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleMethod("WHATSAPP")}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#25D366]">
              WhatsApp
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                openMethod === "WHATSAPP" ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: openMethod === "WHATSAPP" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[#25D366]/20 px-5 pb-5 pt-4">
                <p className="text-xs text-muted-foreground">
                  Contáctanos por WhatsApp para coordinar el pago manualmente.
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
          </div>
        </div>
      </div>

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
