"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReservationWizard from "@/components/reservar/ReservationWizard";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { siteData } from "@/lib/siteData";

type ReservationItem = {
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

const ACTIVE_STATUS = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Panama",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("es-PA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama",
  });
}

function formatCurrency(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  const rounded = Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2);
  return `$${rounded}`;
}

function toTime(value: string) {
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

function resolvePackageLabel(reservation: ReservationItem) {
  return Array.isArray(reservation.packages)
    ? reservation.packages[0]?.label
    : reservation.packages?.label;
}

export default function ReservationOverlay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [activeReservation, setActiveReservation] =
    useState<ReservationItem | null>(null);
  const stepParam = searchParams.get("step");
  const forceWizard = stepParam === "payment";

  const prefillState = useMemo(() => {
    if (!activeReservation || !forceWizard) return null;
    const start = toTime(activeReservation.start_at);
    const end = toTime(activeReservation.end_at);
    const timeSlot = start && end ? `${start}-${end}` : null;
    return {
      date: activeReservation.reserved_date ?? null,
      packageId: (activeReservation.package_id as string | null) ?? null,
      timeSlot,
      adults: Number(activeReservation.adults_count ?? 0),
      kids: Number(activeReservation.kids_count ?? 0),
      extras: {},
      couplePackage: false,
      paymentMethod: null,
    };
  }, [activeReservation, forceWizard]);
  const show =
    pathname === "/" &&
    (searchParams.get("reservar") === "1" ||
      searchParams.get("reservar") === "true");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckedSession(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!show) return;
    if (checkedSession && !session) {
      window.dispatchEvent(new Event("cm:auth:open"));
      const params = new URLSearchParams(searchParams.toString());
      params.delete("reservar");
      params.delete("package");
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/");
      return;
    }
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [show, session, checkedSession, router, searchParams]);

  useEffect(() => {
    if (!show || !session) return;
    let active = true;
    setLoadingReservation(true);
    const load = async () => {
      try {
        const response = await fetch("/api/my-reservations");
        const result = await response.json();
        if (!active) return;
    if (response.ok && Array.isArray(result?.reservations)) {
      const current = result.reservations.find((item: ReservationItem) =>
        ACTIVE_STATUS.has(item.status)
      );
      setActiveReservation(current ?? null);
      if (!current && session?.user?.id && typeof window !== "undefined") {
        window.localStorage.removeItem(
          `cm_last_reservation:${session.user.id}`
        );
      }
    } else {
      setActiveReservation(null);
    }
      } catch {
        if (!active) return;
        setActiveReservation(null);
      } finally {
        if (active) setLoadingReservation(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [show, session]);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("reservar");
    params.delete("package");
    params.delete("step");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  if (!show || !session) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={handleClose}
    >
      <div
        className="glass-panel relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-none sm:h-[90vh] sm:rounded-[2.25rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-lg font-semibold text-foreground shadow-sm transition hover:brightness-105"
        >
          ×
        </button>
        <div className="h-full overflow-y-auto">
          {loadingReservation ? (
            <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-muted-foreground">
              Cargando reserva...
            </div>
          ) : activeReservation && !forceWizard ? (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Reserva activa
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {resolvePackageLabel(activeReservation) ?? "Paquete"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ya tienes una reserva activa. Para crear otra, primero
                  finaliza la actual o contáctanos por WhatsApp.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background px-6 py-5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {activeReservation.status === "PENDING_PAYMENT"
                        ? "Pago pendiente"
                        : "Confirmada"}
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {formatDate(activeReservation.reserved_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(activeReservation.start_at)} -{" "}
                      {formatTime(activeReservation.end_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(activeReservation.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-full border border-border/70 px-4 py-2 text-sm font-semibold"
                >
                  Volver al inicio
                </button>
                {activeReservation.status === "PENDING_PAYMENT" && (
                  <a
                    href="/reservar/pago"
                    className="w-full rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Pagar reserva
                  </a>
                )}
                <a
                  href={buildWhatsAppLink(activeReservation)}
                  className="w-full rounded-full bg-[#25D366] px-4 py-2 text-center text-sm font-semibold text-white"
                >
                  Contactar por WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <ReservationWizard
              mode="modal"
              prefill={prefillState ?? undefined}
              startStepId={forceWizard ? "payment" : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
function buildWhatsAppLink(reservation: ReservationItem) {
  const base = siteData.links.whatsapp;
  const packageLabel = resolvePackageLabel(reservation);
  const messageLines = [
    "Hola, tengo una reserva pendiente de pago.",
    `ID: ${String(reservation.id).slice(0, 8)}`,
    `Fecha: ${formatDate(reservation.reserved_date)}`,
    `Horario: ${formatTime(reservation.start_at)} - ${formatTime(reservation.end_at)}`,
    packageLabel ? `Paquete: ${packageLabel}` : null,
    `Total estimado: ${formatCurrency(reservation.total_amount)}`,
    "Estado: Pago pendiente (la reserva se confirma al recibir el pago).",
  ].filter(Boolean) as string[];
  const message = messageLines.join("\n");
  return `${base}?text=${encodeURIComponent(message)}`;
}
