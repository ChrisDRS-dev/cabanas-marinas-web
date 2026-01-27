"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PACKAGES, TIME_SLOTS } from "@/lib/bookingData";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { PackageType } from "@/lib/calcTotal";
import type React from "react";

type StepDatePackageProps = {
  state: ReservationState;
  dispatch: React.Dispatch<
    | { type: "setDate"; value: string | null }
    | { type: "setPackage"; value: PackageType }
    | { type: "setTimeSlot"; value: string | null }
  >;
  selectedPackage?: (typeof PACKAGES)[number];
};

const EVENTO_PACKAGE_ID: PackageType = "EVENTO";
const HOURS_IN_DAY = 24;

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "P.M." : "A.M.";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

function parseHour(value: string) {
  const hour = Number(value);
  if (Number.isNaN(hour)) return null;
  return hour;
}

function parseTimeToMinutes(value: string) {
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isSameDate(dateValue: string, compareDate: Date) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return (
    year === compareDate.getFullYear() &&
    month - 1 === compareDate.getMonth() &&
    day === compareDate.getDate()
  );
}

function isPastTimeSlot(
  timeValue: string,
  dateValue: string | null,
  now: Date
) {
  if (!dateValue) return false;
  if (!isSameDate(dateValue, now)) return false;
  const startTime = timeValue.split("-")[0];
  if (!startTime) return false;
  const minutes = parseTimeToMinutes(startTime);
  if (minutes === null) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return minutes <= nowMinutes;
}

function getDurationHours(start: string, end: string) {
  const startHour = parseHour(start);
  const endHour = parseHour(end);
  if (startHour === null || endHour === null) return null;
  return (endHour - startHour + HOURS_IN_DAY) % HOURS_IN_DAY;
}

export default function StepDatePackage({
  state,
  dispatch,
  selectedPackage,
}: StepDatePackageProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [pendingTimeSlot, setPendingTimeSlot] = useState<string | null>(
    state.timeSlot
  );
  const [pendingDate, setPendingDate] = useState<string | null>(state.date);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const lastPackageRef = useRef<PackageType | null>(null);
  const now = new Date();

  const today = new Date();
  const displayDate = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1
  );
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = displayDate.toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });
  const activeDate = pendingDate ?? state.date;

  const timeSlots = useMemo(() => {
    if (!state.packageId) return [];
    return TIME_SLOTS[state.packageId] ?? [];
  }, [state.packageId]);

  const morningSlots = timeSlots.filter((slot) => slot.period === "mañana");
  const afternoonSlots = timeSlots.filter((slot) => slot.period !== "mañana");

  const startHourOptions = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const hour = 8 + index;
        return {
          value: String(hour).padStart(2, "0"),
          label: formatHourLabel(hour),
        };
      }),
    []
  );

  const startHourOptionsWithAvailability = useMemo(
    () =>
      startHourOptions.map((option) => ({
        ...option,
        disabled: isPastTimeSlot(`${option.value}:00`, activeDate, now),
      })),
    [startHourOptions, activeDate, now]
  );

  const endHourOptions = useMemo(() => {
    if (!customStart) return [];
    const startHour = parseHour(customStart);
    if (startHour === null) return [];
    return [10, 11, 12].map((offset) => {
      const hour = (startHour + offset) % HOURS_IN_DAY;
      return {
        value: String(hour).padStart(2, "0"),
        label: formatHourLabel(hour),
      };
    });
  }, [customStart]);

  const formatDate = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const formatDisplayDate = (dateValue: string) => {
    const [yearValue, monthValue, dayValue] = dateValue.split("-").map(Number);
    const date = new Date(yearValue, monthValue - 1, dayValue);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  useEffect(() => {
    if (!showTimeModal) return;
    setPendingTimeSlot(state.timeSlot);
    setPendingDate(state.date);
  }, [showTimeModal, state.timeSlot, state.date]);

  useEffect(() => {
    if (!state.packageId) return;
    if (lastPackageRef.current === state.packageId) return;
    lastPackageRef.current = state.packageId;
    requestAnimationFrame(() => {
      calendarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [state.packageId]);

  useEffect(() => {
    if (state.packageId !== EVENTO_PACKAGE_ID) {
      setCustomStart("");
      setCustomEnd("");
      setCustomError(null);
      return;
    }
    if (!showTimeModal) return;
    if (!state.timeSlot) return;
    const [start, end] = state.timeSlot.split("-");
    if (start && end) {
      setCustomStart(start.replace(":00", ""));
      setCustomEnd(end.replace(":00", ""));
    }
  }, [state.packageId, state.timeSlot, showTimeModal]);

  useEffect(() => {
    if (state.packageId !== EVENTO_PACKAGE_ID) return;
    if (!customStart || !customEnd) {
      setCustomError(null);
      setPendingTimeSlot(null);
      return;
    }
    if (!endHourOptions.some((option) => option.value === customEnd)) {
      setCustomEnd("");
      return;
    }
    const duration = getDurationHours(customStart, customEnd);
    if (duration === null || duration < 10 || duration > 12) {
      setCustomError("La salida debe ser 10, 11 o 12 horas después.");
      setPendingTimeSlot(null);
      return;
    }
    setCustomError(null);
    setPendingTimeSlot(`${customStart}:00-${customEnd}:00`);
  }, [
    state.packageId,
    customStart,
    customEnd,
    endHourOptions,
    showTimeModal,
  ]);

  const handleDateClick = (formatted: string) => {
    if (!state.packageId) return;
    dispatch({ type: "setDate", value: formatted });
    setPendingDate(formatted);
    setPendingTimeSlot(null);
    setShowTimeModal(true);
  };

  const handleConfirmTime = () => {
    if (!pendingTimeSlot) return;
    if (isPastTimeSlot(pendingTimeSlot, activeDate, now)) return;
    dispatch({ type: "setTimeSlot", value: pendingTimeSlot });
    setShowTimeModal(false);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Elige tu paquete primero
        </h2>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Paquetes disponibles</h3>
          {selectedPackage && (
            <Badge variant="secondary">{selectedPackage.label}</Badge>
          )}
        </div>
        <div className="grid gap-3">
          {PACKAGES.map((pkg) => {
            const selected = state.packageId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => {
                  dispatch({ type: "setPackage", value: pkg.id });
                }}
                className={`text-left transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-card hover:border-primary/60"
                } rounded-2xl border px-5 py-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Paquete
                    </p>
                    <h4 className="mt-1 text-lg font-semibold">{pkg.label}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pkg.note}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">${pkg.pricePerAdult}</p>
                    <p className="text-xs text-muted-foreground">por adulto</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" ref={calendarRef}>
        <h3 className="text-lg font-semibold">Selecciona fecha y hora</h3>
        {!state.packageId && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Primero elige un paquete para desbloquear el calendario.
          </div>
        )}
        <Card className="border-border/70 py-4">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                Calendario
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setMonthOffset((value) => value - 1)}
                  className="rounded-full"
                  aria-label="Mes anterior"
                  disabled={!state.packageId}
                >
                  ←
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setMonthOffset((value) => value + 1)}
                  className="rounded-full"
                  aria-label="Mes siguiente"
                  disabled={!state.packageId}
                >
                  →
                </Button>
              </div>
            </div>
            <div>
              <p className="text-base font-semibold capitalize">{monthLabel}</p>
              {state.date && (
                <p className="text-xs text-muted-foreground">
                  Seleccionado: {state.date}
                </p>
              )}
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
              {["DO", "LU", "MA", "MI", "JU", "VI", "SA"].map((label) => (
                <span key={label} className="text-center">
                  {label}
                </span>
              ))}
            </div>
            <div
              className={`grid grid-cols-7 gap-2 ${
                !state.packageId ? "opacity-50" : ""
              }`}
            >
              {Array.from({ length: firstDay }).map((_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const formatted = formatDate(day);
                const selected = state.date === formatted;
                const currentDate = new Date(year, month, day);
                const isPast = currentDate < todayMidnight;
                const disabled = isPast || !state.packageId;
                return (
                  <button
                    key={formatted}
                    type="button"
                    onClick={() => handleDateClick(formatted)}
                    disabled={disabled}
                    className={`flex h-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/60 text-foreground hover:bg-secondary"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          {state.date ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Horario seleccionado:{" "}
                <span className="font-semibold text-foreground">
                  {state.timeSlot ?? "Por definir"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowTimeModal(true)}
                className="text-sm font-semibold text-primary transition hover:brightness-110"
              >
                Cambiar horario
              </button>
            </div>
          ) : (
            "Selecciona una fecha para elegir el horario."
          )}
        </div>
      </section>

      {showTimeModal && (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-full w-full flex-col rounded-none bg-background shadow-xl sm:h-auto sm:max-w-lg sm:rounded-3xl">
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Horarios
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                Selecciona tu hora de entrada
              </h3>
              {pendingDate && (
                <p className="mt-1 text-sm text-muted-foreground capitalize">
                  {formatDisplayDate(pendingDate)}
                </p>
              )}
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {!state.packageId && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  Selecciona un paquete para ver los horarios disponibles.
                </div>
              )}
              {state.packageId === EVENTO_PACKAGE_ID ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hora de entrada entre 8:00 A.M. y 12:00 P.M.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold">
                      Hora de entrada
                      <select
                        value={customStart}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold"
                      >
                        <option value="">Selecciona</option>
                        {startHourOptionsWithAvailability.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-semibold">
                      Hora de salida
                      <select
                        value={customEnd}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        disabled={!customStart}
                        className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold"
                      >
                        <option value="">Selecciona</option>
                        {endHourOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {customError && (
                    <p className="text-sm text-amber-600">{customError}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Mañana
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {morningSlots.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          Sin horarios en la mañana.
                        </span>
                      )}
                      {morningSlots.map((slot) => {
                        const selected = pendingTimeSlot === slot.id;
                        const disabled = isPastTimeSlot(
                          slot.id,
                          activeDate,
                          now
                        );
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() =>
                              !disabled && setPendingTimeSlot(slot.id)
                            }
                            disabled={disabled}
                            className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/70 bg-secondary/40 hover:border-primary/60"
                            } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Tarde
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {afternoonSlots.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          Sin horarios en la tarde.
                        </span>
                      )}
                      {afternoonSlots.map((slot) => {
                        const selected = pendingTimeSlot === slot.id;
                        const disabled = isPastTimeSlot(
                          slot.id,
                          activeDate,
                          now
                        );
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() =>
                              !disabled && setPendingTimeSlot(slot.id)
                            }
                            disabled={disabled}
                            className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/70 bg-secondary/40 hover:border-primary/60"
                            } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTimeModal(false)}
                className="rounded-full"
              >
                Cancelar / Volver
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTime}
                className="rounded-full"
                disabled={
                  !pendingTimeSlot ||
                  isPastTimeSlot(pendingTimeSlot, activeDate, now)
                }
              >
                Confirmar horario
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
