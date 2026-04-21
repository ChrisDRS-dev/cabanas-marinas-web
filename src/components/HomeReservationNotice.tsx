"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { siteData } from "@/lib/siteData";
import { fetchCatalog, type Extra } from "@/lib/supabase/catalog";
import { getSessionSafe, supabase } from "@/lib/supabase/client";

type ReservationItem = {
  id: string;
  reserved_date: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number | string | null;
  adults_count?: number | null;
  kids_count?: number | null;
  packages?: { label?: string | null } | { label?: string | null }[] | null;
};

type HomeReservationNoticeProps = {
  reservations: ReservationItem[];
  hasDraft: boolean;
};

type ChangeRequestPayload = {
  reservationId: string;
  requestedAdults: number;
  requestedKids: number;
  requestedExtras: string[];
  note: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pago pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No show",
};

const EDITABLE_STATUS = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

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

function buildWhatsAppLink(reservation: ReservationItem) {
  const base = siteData.links.whatsapp;
  const packageLabel = Array.isArray(reservation.packages)
    ? reservation.packages[0]?.label
    : reservation.packages?.label;
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

function resolvePackageLabel(reservation: ReservationItem) {
  return Array.isArray(reservation.packages)
    ? reservation.packages[0]?.label
    : reservation.packages?.label;
}

export default function HomeReservationNotice({
  reservations: initialReservations,
  hasDraft,
}: HomeReservationNoticeProps) {
  const [editingReservation, setEditingReservation] =
    useState<ReservationItem | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [reservations, setReservations] =
    useState<ReservationItem[]>(initialReservations);
  const [reservationsLoaded, setReservationsLoaded] = useState(false);
  const [extrasCatalog, setExtrasCatalog] = useState<Extra[]>([]);
  const [extrasError, setExtrasError] = useState<string | null>(null);
  const [requestedAdults, setRequestedAdults] = useState(0);
  const [requestedKids, setRequestedKids] = useState(0);
  const [requestedExtras, setRequestedExtras] = useState<Record<string, boolean>>(
    {}
  );
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasReservations = reservations.length > 0;
  const pendingReservations = useMemo(
    () => reservations.filter((item) => item.status === "PENDING_PAYMENT"),
    [reservations]
  );

  useEffect(() => {
    let active = true;
    const loadExtras = async () => {
      try {
        const catalog = await fetchCatalog();
        if (!active) return;
        setExtrasCatalog(catalog.extras);
      } catch (error) {
        if (!active) return;
        setExtrasError(
          error instanceof Error ? error.message : "No se pudieron cargar extras."
        );
      }
    };
    loadExtras();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    const loadReservations = async () => {
      try {
        const response = await fetch("/api/my-reservations");
        const result = await response.json();
        if (!active) return;
        if (response.ok && Array.isArray(result?.reservations)) {
          if (result.reservations.length > 0) {
            setReservations(result.reservations);
          } else {
            setReservations(initialReservations);
          }
        }
      } catch {
        if (!active) return;
      } finally {
        if (active) setReservationsLoaded(true);
      }
    };
    void loadReservations();
    return () => {
      active = false;
    };
  }, [session, initialReservations]);

  useEffect(() => {
    if (reservationsLoaded) return;
    setReservations(initialReservations);
  }, [initialReservations, reservationsLoaded]);

  useEffect(() => {
    void getSessionSafe().then((session) => {
      setSession(session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      if (!session?.user) {
        setProfileName(null);
        return;
      }
      const user = session.user;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const nameFromMeta =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;
      setProfileName(data?.full_name ?? nameFromMeta);
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!editingReservation) return;
    const baseAdults = editingReservation.adults_count ?? 0;
    const baseKids = editingReservation.kids_count ?? 0;
    setRequestedAdults(baseAdults);
    setRequestedKids(baseKids);
    setRequestedExtras(
      Object.fromEntries(extrasCatalog.map((extra) => [extra.id, false]))
    );
    setNote("");
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [editingReservation, extrasCatalog]);

  const handleToggleExtra = (id: string) => {
    setRequestedExtras((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmitRequest = async () => {
    if (!editingReservation) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const payload: ChangeRequestPayload = {
        reservationId: editingReservation.id,
        requestedAdults,
        requestedKids,
        requestedExtras: Object.entries(requestedExtras)
          .filter(([, value]) => value)
          .map(([id]) => id),
        note: note.trim(),
      };
      const response = await fetch("/api/reservations/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "No se pudo enviar la solicitud.");
      }
      setSubmitSuccess("Solicitud enviada. Te confirmaremos por WhatsApp.");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo enviar la solicitud."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="rounded-[2.5rem] border border-border/70 bg-card/90 p-4 shadow-xl shadow-black/5">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            Bienvenido{profileName ? `, ${profileName}` : ""}
          </h2>
          {(hasReservations || hasDraft) && (
            <p className="text-sm text-muted-foreground">
              Aquí verás el estado de tu reserva y las opciones disponibles.
            </p>
          )}
        </div>

        {hasDraft && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Hay una reserva en progreso. Continúa donde la dejaste.</span>
            <Link
              href="/reservar?draft=1"
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
            >
              Continuar reserva
            </Link>
          </div>
        )}


        {hasReservations && (
          <div className="mt-5 space-y-3">
            {reservations.map((reservation) => {
              const statusLabel =
                STATUS_LABEL[reservation.status] ?? reservation.status;
              const isPending = reservation.status === "PENDING_PAYMENT";
              const packageLabel = resolvePackageLabel(reservation);
              const isEditable = EDITABLE_STATUS.has(reservation.status);
              return (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Reserva {String(reservation.id).slice(0, 8)}
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        {packageLabel ?? "Paquete"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(reservation.reserved_date)} ·{" "}
                        {formatTime(reservation.start_at)} -{" "}
                        {formatTime(reservation.end_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(reservation.total_amount)}
                      </p>
                      <p
                        className={`text-xs ${
                          isPending ? "text-amber-600" : "text-muted-foreground"
                        }`}
                      >
                        {statusLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingReservation(reservation)}
                      disabled={!isEditable}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isEditable
                          ? "border border-border/70 text-foreground"
                          : "border border-border/30 text-muted-foreground"
                      }`}
                    >
                      Solicitar cambios
                    </button>
                    {isPending && (
                      <a
                        href={buildWhatsAppLink(reservation)}
                        className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                      >
                        Pagar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasReservations && pendingReservations.length === 0 && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            Tus reservas están confirmadas o completadas.
          </div>
        )}
      </div>

      {editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Solicitud de cambio
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  Reserva {String(editingReservation.id).slice(0, 8)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(editingReservation.reserved_date)} ·{" "}
                  {formatTime(editingReservation.start_at)} -{" "}
                  {formatTime(editingReservation.end_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingReservation(null)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <p className="text-xs text-muted-foreground">
                Solo puedes agregar personas o extras. Para cambiar fecha u
                horario contáctanos por WhatsApp.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  Adultos (actual: {editingReservation.adults_count ?? 0})
                  <input
                    type="number"
                    min={editingReservation.adults_count ?? 0}
                    value={requestedAdults}
                    onChange={(event) =>
                      setRequestedAdults(
                        Math.max(
                          editingReservation.adults_count ?? 0,
                          Number(event.target.value || 0)
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  />
                </label>
                <label className="space-y-1">
                  Niños (actual: {editingReservation.kids_count ?? 0})
                  <input
                    type="number"
                    min={editingReservation.kids_count ?? 0}
                    value={requestedKids}
                    onChange={(event) =>
                      setRequestedKids(
                        Math.max(
                          editingReservation.kids_count ?? 0,
                          Number(event.target.value || 0)
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  />
                </label>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Extras adicionales
                </p>
                {extrasError && (
                  <p className="mt-2 text-xs text-rose-600">{extrasError}</p>
                )}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {extrasCatalog.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No hay extras disponibles.
                    </p>
                  ) : (
                    extrasCatalog.map((extra) => (
                      <label
                        key={extra.id}
                        className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={requestedExtras[extra.id] ?? false}
                          onChange={() => handleToggleExtra(extra.id)}
                        />
                        <span className="text-foreground">{extra.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="space-y-1 text-sm text-muted-foreground">
                Nota adicional (opcional)
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Escribe detalles para el equipo."
                />
              </label>
            </div>

            {(submitError || submitSuccess) && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${
                  submitError
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {submitError ?? submitSuccess}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setEditingReservation(null)}
                className="w-full rounded-full border border-border/70 px-4 py-2 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
