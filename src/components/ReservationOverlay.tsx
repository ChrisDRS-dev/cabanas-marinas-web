"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const ReservationWizard = dynamic(
  () => import("@/components/reservar/ReservationWizard"),
  { ssr: false }
);
import type { Session } from "@supabase/supabase-js";
import { getSessionSafe, supabase } from "@/lib/supabase/client";
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

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Pago pendiente", color: "text-amber-600" },
  CONFIRMED: { label: "Confirmada", color: "text-muted-foreground" },
  COMPLETED: { label: "Completada", color: "text-emerald-600" },
  CANCELLED: { label: "Cancelada", color: "text-rose-500" },
  NO_SHOW: { label: "No show", color: "text-muted-foreground" },
};

function getPanamaTodayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Panama" }).format(new Date());
}

function parsePanamaDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  return new Date(value);
}

function formatDate(value: string) {
  const date = parsePanamaDate(value);
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
  const [activeReservations, setActiveReservations] = useState<ReservationItem[]>([]);
  const [pastReservations, setPastReservations] = useState<ReservationItem[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const stepParam = searchParams.get("step");
  const forceWizard = stepParam === "payment";

  const firstActive = activeReservations[0] ?? null;

  const prefillState = useMemo(() => {
    if (!firstActive || !forceWizard) return null;
    const start = toTime(firstActive.start_at);
    const end = toTime(firstActive.end_at);
    const timeSlot = start && end ? `${start}-${end}` : null;
    return {
      date: firstActive.reserved_date ?? null,
      packageId: (firstActive.package_id as string | null) ?? null,
      timeSlot,
      adults: Number(firstActive.adults_count ?? 0),
      kids: Number(firstActive.kids_count ?? 0),
      extras: {},
      couplePackage: false,
      paymentMethod: null,
    };
  }, [firstActive, forceWizard]);

  const show =
    pathname === "/" &&
    (searchParams.get("reservar") === "1" ||
      searchParams.get("reservar") === "true");

  // Reset local state when overlay closes
  useEffect(() => {
    if (!show) {
      setShowWizard(false);
      setSelectedReservation(null);
      setShowHistory(false);
    }
  }, [show]);

  useEffect(() => {
    void getSessionSafe().then((s) => {
      setSession(s);
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
          const todayStr = getPanamaTodayStr();
          const all = result.reservations as ReservationItem[];
          const upcoming = all.filter(
            (item) => ACTIVE_STATUS.has(item.status) && item.reserved_date >= todayStr
          );
          const past = all.filter(
            (item) => !ACTIVE_STATUS.has(item.status) || item.reserved_date < todayStr
          );
          setActiveReservations(upcoming);
          setPastReservations(past);
          if (upcoming.length === 0 && session?.user?.id && typeof window !== "undefined") {
            window.localStorage.removeItem(`cm_last_reservation:${session.user.id}`);
          }
        } else {
          setActiveReservations([]);
          setPastReservations([]);
        }
      } catch {
        if (!active) return;
        setActiveReservations([]);
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

  const hasActive = activeReservations.length > 0;
  const renderWizard = showWizard || forceWizard || !hasActive;

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
              Cargando...
            </div>
          ) : renderWizard ? (
            <ReservationWizard
              mode="modal"
              prefill={prefillState ?? undefined}
              startStepId={forceWizard ? "payment" : undefined}
            />
          ) : (
            /* ── Active reservations list ── */
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Tus reservas
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {activeReservations.length === 1
                    ? "Tienes una reserva activa"
                    : `Tienes ${activeReservations.length} reservas activas`}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Toca una reserva para ver sus detalles o realiza una nueva.
                </p>
              </div>

              <div className="space-y-3">
                {activeReservations.map((reservation) => {
                  const isPending = reservation.status === "PENDING_PAYMENT";
                  const packageLabel = resolvePackageLabel(reservation);
                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => setSelectedReservation(reservation)}
                      className="w-full rounded-3xl border border-border/70 bg-background px-6 py-5 text-left text-sm transition hover:border-primary/40 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p
                            className={`text-xs uppercase tracking-[0.25em] ${
                              isPending ? "text-amber-600" : "text-muted-foreground"
                            }`}
                          >
                            {isPending ? "Pago pendiente" : "Confirmada"}
                          </p>
                          <p className="mt-1 text-base font-semibold">
                            {packageLabel ?? "Paquete"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(reservation.reserved_date)} ·{" "}
                            {formatTime(reservation.start_at)} –{" "}
                            {formatTime(reservation.end_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <p className="text-sm font-semibold">
                              {formatCurrency(reservation.total_amount)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Ver detalles →
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-full border border-border/70 px-4 py-2.5 text-sm font-semibold"
                >
                  Volver al inicio
                </button>
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Hacer otra reserva
                </button>
              </div>
              {pastReservations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="w-full rounded-full border border-border/50 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Ver historial ({pastReservations.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── History popup ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-border/70 bg-card shadow-2xl sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Drag handle — mobile only */}
            <div className="mx-auto mt-4 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />

            {/* Header */}
            <div className="flex shrink-0 items-start justify-between px-6 pb-4 pt-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Historial
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  Reservas anteriores
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Cerrar historial"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-base font-semibold text-foreground shadow-sm transition hover:brightness-105"
              >
                ×
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto px-6 pb-8">
              <div className="space-y-2">
                {pastReservations.map((reservation) => {
                  const statusInfo = STATUS_INFO[reservation.status] ?? {
                    label: reservation.status,
                    color: "text-muted-foreground",
                  };
                  const packageLabel = resolvePackageLabel(reservation);
                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => {
                        setShowHistory(false);
                        setSelectedReservation(reservation);
                      }}
                      className="w-full rounded-2xl border border-border/60 bg-background px-5 py-4 text-left text-sm transition hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            className={`text-xs uppercase tracking-[0.2em] ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold">
                            {packageLabel ?? "Paquete"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(reservation.reserved_date)} ·{" "}
                            {formatTime(reservation.start_at)} –{" "}
                            {formatTime(reservation.end_at)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatCurrency(reservation.total_amount)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reservation detail popup ── */}
      {selectedReservation && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
          onClick={() => setSelectedReservation(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-[2rem] border border-border/70 bg-card px-6 pb-8 pt-6 shadow-2xl sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Drag handle — mobile only */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border sm:hidden" />

            <p
              className={`text-xs uppercase tracking-[0.3em] ${
                STATUS_INFO[selectedReservation.status]?.color ?? "text-muted-foreground"
              }`}
            >
              {STATUS_INFO[selectedReservation.status]?.label ?? selectedReservation.status}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">
              {resolvePackageLabel(selectedReservation) ?? "Paquete"}
            </h3>

            {/* Details grid */}
            <div className="mt-4 divide-y divide-border/50 rounded-2xl border border-border/60 bg-background px-4 text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">
                  {formatDate(selectedReservation.reserved_date)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium">
                  {formatTime(selectedReservation.start_at)} –{" "}
                  {formatTime(selectedReservation.end_at)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Personas</span>
                <span className="font-medium">
                  {selectedReservation.adults_count ?? 0} adultos
                  {(selectedReservation.kids_count ?? 0) > 0
                    ? `, ${selectedReservation.kids_count} niños`
                    : ""}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {formatCurrency(selectedReservation.total_amount)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-full border border-border/70 px-4 py-2.5 text-sm font-semibold"
                >
                  Volver a inicio
                </button>
                <a
                  href={buildWhatsAppLink(selectedReservation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full border border-[#25D366] px-4 py-2.5 text-center text-sm font-semibold text-[#25D366]"
                >
                  WhatsApp
                </a>
              </div>
              {selectedReservation.status === "PENDING_PAYMENT" && (
                <a
                  href="/reservar/pago"
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                >
                  Realizar pago
                </a>
              )}
            </div>
          </div>
        </div>
      )}
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
