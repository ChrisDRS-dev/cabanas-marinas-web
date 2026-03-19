"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import YappyPaymentButton from "@/components/YappyPaymentButton";
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

export default function PaymentConfirmation() {
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReservation = async () => {
      const session = await getSessionSafe();
      if (!active) return;
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
        if (!active) return;
        if (response.ok && Array.isArray(result?.reservations)) {
          const list = result.reservations as ReservationApiItem[];
          const activeReservation =
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
            return;
          }

          if (userId && typeof window !== "undefined") {
            window.localStorage.removeItem(`cm_last_reservation:${userId}`);
          }
        }
      } catch {
        if (!active) return;
      }
    };

    void loadReservation();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (data?.paymentMethod !== "YAPPY" || data?.status !== "PENDING_PAYMENT") {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        setIsRefreshingStatus(true);
        const response = await fetch("/api/my-reservations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result?.reservations)) return;
        const reservations = result.reservations as ReservationApiItem[];
        const current = reservations.find((item) => item.id === data.id);
        if (!current) return;
        const packageLabel = Array.isArray(current.packages)
          ? current.packages[0]?.label ?? null
          : current.packages?.label ?? null;
        const start = toPanamaTime(current.start_at);
        const end = toPanamaTime(current.end_at);
        setData((previous) => ({
          id: current.id ?? previous?.id ?? null,
          name: previous?.name ?? null,
          status: current.status ?? previous?.status ?? null,
          adults: Number(current.adults_count ?? previous?.adults ?? 0),
          kids: Number(current.kids_count ?? previous?.kids ?? 0),
          packageLabel: packageLabel ?? previous?.packageLabel ?? null,
          date: current.reserved_date ?? previous?.date ?? null,
          timeSlot: start && end ? `${start}-${end}` : previous?.timeSlot ?? null,
          extras: previous?.extras ?? [],
          cabinCode: previous?.cabinCode ?? null,
          totalAmount: current.total_amount ?? previous?.totalAmount ?? null,
          depositAmount: current.deposit_amount ?? previous?.depositAmount ?? null,
          paymentMethod: current.payment_method ?? previous?.paymentMethod ?? null,
        }));
      } catch {
        return;
      } finally {
        setIsRefreshingStatus(false);
      }
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [data?.id, data?.paymentMethod, data?.status]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Confirmar reserva
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">
          Completa el pago
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Para confirmar tu reserva necesitamos el pago. Elige un método para
          continuar.
        </p>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 text-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Resumen de reserva
        </p>
        <div className="mt-3 grid gap-2">
          <p>
            <span className="font-semibold text-foreground">Nombre:</span>{" "}
            {data?.name ?? "Reserva solicitada"}
          </p>
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
            <span className="font-semibold text-foreground">Total estimado:</span>{" "}
            {formatCurrency(data?.totalAmount ?? null)}
          </p>
          <p className="mt-1 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-base font-semibold text-primary">
            Pago inicial (50%):{" "}
            {formatCurrency(
              data?.depositAmount != null
                ? data.depositAmount
                : data?.totalAmount != null
                  ? Math.round(Number(data.totalAmount) * 0.5 * 100) / 100
                  : null
            )}
          </p>
          <p>
            <span className="font-semibold text-foreground">Método:</span>{" "}
            {data?.paymentMethod === "YAPPY"
              ? "Yappy"
              : data?.paymentMethod === "PAYPAL"
                ? "PayPal"
                : data?.paymentMethod === "CARD"
                  ? "Tarjeta"
                  : "WhatsApp"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <YappyPaymentButton
            reservationId={data?.id ?? null}
            disabled={data?.paymentMethod !== "YAPPY" || data?.status !== "PENDING_PAYMENT"}
            onPaymentCompleted={() => {
              setIsRefreshingStatus(true);
            }}
          />
          <div className="mt-3 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-4 text-sm text-muted-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-500">
              Desde la app Yappy
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              También puedes buscarnos en el directorio de Yappy. Puedes hacer el pago manualmente, compártenos el comprobante por WhatsApp.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Número de teléfono:</p>
                <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-background/80">
                  {siteData.links.yappy}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">Alias / Directorio:</p>
                <div className="mt-1 w-fit cursor-text select-all rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-background/80">
                  cabanasmarinas507
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-border/70 bg-background px-5 py-4 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-[0.2em]">Tarjeta</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Próximamente
          </p>
        </div>
        <a
          href={buildWhatsAppLink(data)}
          className="flex flex-col justify-between rounded-3xl bg-[#25D366] px-5 py-4 text-sm font-semibold text-white"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">
            WhatsApp
          </p>
          <p className="mt-2 text-base">Contactar por WhatsApp</p>
        </a>
      </div>

      {isRefreshingStatus && data?.status === "PENDING_PAYMENT" ? (
        <p className="text-center text-xs text-muted-foreground">
          Verificando confirmación de pago...
        </p>
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
