"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
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
};

type ReservationApiItem = {
  id: string;
  reserved_date: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number | string | null;
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

function formatTime(value: string | null) {
  if (!value) return "Por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-PA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama",
  });
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
  const messageLines = [
    "Hola, quiero confirmar mi reserva con el pago.",
    data.id ? `ID: ${String(data.id).slice(0, 8)}` : null,
    data.date ? `Fecha: ${formatDate(data.date)}` : null,
    data.timeSlot ? `Horario: ${formatTimeRange12h(data.timeSlot)}` : null,
    data.packageLabel ? `Paquete: ${data.packageLabel}` : null,
    data.status ? `Estado: ${STATUS_LABEL[data.status] ?? data.status}` : null,
    `Personas: ${(data.adults ?? 0) + (data.kids ?? 0)} (Adultos: ${
      data.adults ?? 0
    }, Niños: ${data.kids ?? 0})`,
    data.totalAmount != null
      ? `Total estimado: ${formatCurrency(data.totalAmount)}`
      : null,
  ].filter(Boolean) as string[];
  const message = messageLines.join("\n");
  return `${base}?text=${encodeURIComponent(message)}`;
}

export default function PaymentConfirmation() {
  const [data, setData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const sessionResult = await supabase.auth.getSession();
      if (!active) return;
      const userId = sessionResult.data.session?.user?.id ?? null;
      if (userId && typeof window !== "undefined") {
        const raw = window.localStorage.getItem(`cm_last_reservation:${userId}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ConfirmationData;
            setData({
              ...parsed,
              status: parsed.status ?? "PENDING_PAYMENT",
            });
            return;
          } catch {
            setData(null);
          }
        }
      }

      try {
        const response = await fetch("/api/my-reservations");
        const result = await response.json();
        if (!active) return;
        if (response.ok && Array.isArray(result?.reservations)) {
          const list = result.reservations as ReservationApiItem[];
          const activeReservation = list.find(
            (item) => item.status === "PENDING_PAYMENT"
          );
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
    void load();
    return () => {
      active = false;
    };
  }, []);

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
            <span className="font-semibold text-foreground">Total:</span>{" "}
            {formatCurrency(data?.totalAmount ?? null)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-background px-5 py-4 text-sm text-muted-foreground">
          <p className="text-xs uppercase tracking-[0.2em]">Yappy</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            Próximamente
          </p>
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

      <a
        href="/"
        className="w-full rounded-full border border-border/70 px-4 py-2 text-center text-sm font-semibold"
      >
        Volver al inicio
      </a>
    </div>
  );
}
