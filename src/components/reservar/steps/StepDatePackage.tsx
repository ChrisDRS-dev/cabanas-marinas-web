"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { PackageType } from "@/lib/calcTotal";
import type { Package, TimeSlot } from "@/lib/supabase/catalog";
import type { DatePackageStepConfig } from "@/lib/supabase/formConfig";
import type React from "react";

type StepDatePackageProps = {
  state: ReservationState;
  dispatch: React.Dispatch<
    | { type: "setDate"; value: string | null }
    | { type: "setPackage"; value: PackageType }
    | { type: "setTimeSlot"; value: string | null }
  >;
  selectedPackage?: Package;
  packages: Package[];
  timeSlotsByPackage: Record<string, TimeSlot[]>;
  config?: DatePackageStepConfig;
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

function formatTimeLabel(hour: number, minute = 0) {
  const normalizedHour = ((hour % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
  const period = normalizedHour >= 12 ? "P.M." : "A.M.";
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  const displayMinute = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function formatTimeRange12h(timeSlot: string, durationMinutes?: number | null) {
  const [startRaw, endRaw] = timeSlot.split("-");
  const [startHourText, startMinuteText = "0"] = startRaw.split(":");
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return timeSlot;

  if (endRaw) {
    const [endHourText, endMinuteText = "0"] = endRaw.split(":");
    const endHour = Number(endHourText);
    const endMinute = Number(endMinuteText);
    if (Number.isNaN(endHour) || Number.isNaN(endMinute)) return timeSlot;
    return `${formatTimeLabel(startHour, startMinute)} - ${formatTimeLabel(
      endHour,
      endMinute
    )}`;
  }

  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    const startTotal = startHour * 60 + startMinute;
    const endTotal = (startTotal + durationMinutes) % (HOURS_IN_DAY * 60);
    const endHour = Math.floor(endTotal / 60);
    const endMinute = endTotal % 60;
    return `${formatTimeLabel(startHour, startMinute)} - ${formatTimeLabel(
      endHour,
      endMinute
    )}`;
  }

  return timeSlot;
}

function resolveTimeRange(timeSlot: string, durationMinutes?: number | null) {
  const [startRaw, endRaw] = timeSlot.split("-");
  const [startHourText, startMinuteText = "0"] = startRaw.split(":");
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return null;

  if (endRaw) {
    const [endHourText, endMinuteText = "0"] = endRaw.split(":");
    const endHour = Number(endHourText);
    const endMinute = Number(endMinuteText);
    if (Number.isNaN(endHour) || Number.isNaN(endMinute)) return null;
    return {
      start: { hour: startHour, minute: startMinute },
      end: { hour: endHour, minute: endMinute },
    };
  }

  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    const startTotal = startHour * 60 + startMinute;
    const endTotal = (startTotal + durationMinutes) % (HOURS_IN_DAY * 60);
    return {
      start: { hour: startHour, minute: startMinute },
      end: {
        hour: Math.floor(endTotal / 60),
        minute: endTotal % 60,
      },
    };
  }

  return null;
}

function toTotalMinutes(hour: number, minute = 0) {
  return hour * 60 + minute;
}

function classifySlotGroup(timeSlot: string, durationMinutes?: number | null) {
  const range = resolveTimeRange(timeSlot, durationMinutes);
  if (!range) return "tarde-noche";
  const start = toTotalMinutes(range.start.hour, range.start.minute);
  if (start < 10 * 60) return "mañana";
  if (start < 12 * 60) return "mañana-tarde";
  return "tarde-noche";
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
  packages,
  timeSlotsByPackage,
  config,
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
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const lastPackageRef = useRef<PackageType | null>(null);
  const now = useMemo(() => new Date(), []);

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

  const title = config?.title ?? "Elige tu paquete primero";
  const packagesTitle = config?.packagesTitle ?? "Paquetes disponibles";
  const packagesEmpty =
    config?.packagesEmpty ?? "Cargando paquetes disponibles...";
  const selectedLabel = config?.selectedLabel ?? "Seleccionado";
  const calendarTitle = config?.calendarTitle ?? "Selecciona fecha y hora";
  const calendarEmpty =
    config?.calendarEmpty ??
    "Primero elige un paquete para desbloquear el calendario.";
  const calendarSelectedPrefix =
    config?.calendarSelectedPrefix ?? "Seleccionado:";
  const calendarHint =
    config?.calendarHint ?? "Selecciona una fecha para elegir el horario.";
  const changeTimeLabel = config?.changeTimeLabel ?? "Cambiar horario";
  const modalKicker = config?.modalKicker ?? "Horarios";
  const modalTitle = config?.modalTitle ?? "Selecciona tu hora de entrada";
  const modalSubtitle = config?.modalSubtitle ?? "Horario seleccionado";
  const morningLabel = config?.morningLabel ?? "Mañana";
  const afternoonLabel = config?.afternoonLabel ?? "Mañana - Tarde";
  const eveningLabel = "Tarde - Noche";
  const noMorningLabel =
    config?.noMorningLabel ?? "Sin horarios en la mañana.";
  const noAfternoonLabel =
    config?.noAfternoonLabel ?? "Sin horarios en esta franja.";
  const modalCancelLabel = config?.modalCancelLabel ?? "Cancelar / Volver";
  const modalConfirmLabel = config?.modalConfirmLabel ?? "Confirmar horario";
  const customHelp =
    config?.customHelp ?? "Hora de entrada entre 8:00 A.M. y 12:00 P.M.";
  const customStartLabel = config?.customStartLabel ?? "Hora de entrada";
  const customEndLabel = config?.customEndLabel ?? "Hora de salida";
  const customErrorCopy =
    config?.customError ?? "La salida debe ser 10, 11 o 12 horas después.";

  const timeSlots = useMemo(() => {
    if (!state.packageId) return [];
    return timeSlotsByPackage[state.packageId] ?? [];
  }, [state.packageId, timeSlotsByPackage]);

  const groupedSlots = useMemo(() => {
    const groups = {
      "mañana": [] as TimeSlot[],
      "mañana-tarde": [] as TimeSlot[],
      "tarde-noche": [] as TimeSlot[],
    };
    timeSlots.forEach((slot) => {
      groups[classifySlotGroup(slot.id, selectedPackage?.durationMinutes)].push(slot);
    });
    return groups;
  }, [timeSlots, selectedPackage?.durationMinutes]);

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
    setAvailabilityError(null);
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
    setAvailabilityError(null);
  }, [pendingTimeSlot]);

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
      setAvailabilityError(null);
      return;
    }
    if (!endHourOptions.some((option) => option.value === customEnd)) {
      setCustomEnd("");
      return;
    }
    const duration = getDurationHours(customStart, customEnd);
    if (duration === null || duration < 10 || duration > 12) {
      setCustomError(customErrorCopy);
      setPendingTimeSlot(null);
      return;
    }
    setCustomError(null);
    setPendingTimeSlot(`${customStart}:00-${customEnd}:00`);
    setAvailabilityError(null);
  }, [
    state.packageId,
    customStart,
    customEnd,
    endHourOptions,
    showTimeModal,
    customErrorCopy,
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
    if (!activeDate || !state.packageId) return;
    setAvailabilityError(null);
    setIsCheckingAvailability(true);
    void (async () => {
      try {
        const response = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId: state.packageId,
            date: activeDate,
            timeSlot: pendingTimeSlot,
            adults: state.adults,
            kids: state.kids,
          }),
        });
        const result = await response.json();
        if (!result?.available) {
          const code = String(result?.error ?? "");
          const message =
            code === "CM_NO_CABIN_AVAILABLE"
              ? "No hay cabañas disponibles para ese horario."
              : code === "CM_MAX_PEOPLE_EXCEEDED"
              ? "La capacidad maxima por reserva es de 16 personas."
              : code === "CM_INVALID_PEOPLE_COUNT"
              ? "Indica la cantidad de personas para continuar."
              : code === "CM_INVALID_TIME_RANGE"
              ? "El horario seleccionado no es valido."
              : "No hay disponibilidad para ese horario.";
          setAvailabilityError(message);
          return;
        }
        dispatch({ type: "setTimeSlot", value: pendingTimeSlot });
        setShowTimeModal(false);
      } catch {
        setAvailabilityError("No se pudo validar la disponibilidad.");
      } finally {
        setIsCheckingAvailability(false);
      }
    })();
  };

  const formattedTimeSlot =
    state.timeSlot && selectedPackage
      ? formatTimeRange12h(state.timeSlot, selectedPackage.durationMinutes)
      : state.timeSlot;

  const renderSlotCard = (slot: TimeSlot) => {
    const selected = pendingTimeSlot === slot.id;
    const disabled = isPastTimeSlot(slot.id, activeDate, now);
    const range = resolveTimeRange(slot.id, selectedPackage?.durationMinutes);
    const startLabel = range
      ? formatTimeLabel(range.start.hour, range.start.minute)
      : slot.label;
    const endLabel = range
      ? formatTimeLabel(range.end.hour, range.end.minute)
      : "Por definir";

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => !disabled && setPendingTimeSlot(slot.id)}
        disabled={disabled}
        className={`min-w-36 shrink-0 rounded-[1.75rem] border p-4 text-left transition-all duration-300 ${
          selected
            ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "border-border/70 bg-card hover:-translate-y-0.5 hover:border-primary/50"
        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
      >
        <div className="space-y-3">
          <div>
            <p
              className={`text-[11px] uppercase tracking-[0.26em] ${
                selected ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              Entrada
            </p>
            <p className="mt-1 text-base font-semibold">{startLabel}</p>
          </div>
          <div
            className={`h-px ${
              selected ? "bg-primary-foreground/20" : "bg-border/70"
            }`}
          />
          <div>
            <p
              className={`text-[11px] uppercase tracking-[0.26em] ${
                selected ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              Salida
            </p>
            <p className="mt-1 text-base font-semibold">{endLabel}</p>
          </div>
        </div>
      </button>
    );
  };

  const renderSlotGroup = ({
    title,
    emptyLabel,
    slots,
    accentClasses,
  }: {
    title: string;
    emptyLabel: string;
    slots: TimeSlot[];
    accentClasses: string;
  }) => (
    <div className={`space-y-3 rounded-[1.75rem] border px-4 py-4 ${accentClasses}`}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="gallery-scroll flex gap-3 overflow-x-auto pb-2">
        {slots.length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        ) : (
          slots.map(renderSlotCard)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{packagesTitle}</h3>
          {selectedPackage && (
            <Badge variant="secondary">
              {selectedLabel}: {selectedPackage.label}
            </Badge>
          )}
        </div>
        <div className="grid gap-3">
          {packages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              {packagesEmpty}
            </div>
          )}
          {packages.map((pkg) => {
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
        <h3 className="text-lg font-semibold">{calendarTitle}</h3>
        {!state.packageId && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            {calendarEmpty}
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
                  {calendarSelectedPrefix} {state.date}
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
                  {formattedTimeSlot ?? "Por definir"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowTimeModal(true)}
                className="text-sm font-semibold text-primary transition hover:brightness-110"
              >
                {changeTimeLabel}
              </button>
            </div>
          ) : (
            calendarHint
          )}
        </div>
      </section>

      {showTimeModal && (
        <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex h-full w-full flex-col rounded-none bg-background shadow-xl sm:h-auto sm:max-w-lg sm:rounded-3xl">
            <div className="border-b border-border/70 px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {modalKicker}
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                {modalTitle}
              </h3>
              {pendingDate && (
                <p className="mt-1 text-sm text-muted-foreground capitalize">
                  {modalSubtitle}: {formatDisplayDate(pendingDate)}
                </p>
              )}
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {!state.packageId && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  {calendarEmpty}
                </div>
              )}
              {state.packageId === EVENTO_PACKAGE_ID ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{customHelp}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold">
                      {customStartLabel}
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
                      {customEndLabel}
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
                  {availabilityError && (
                    <p className="text-sm text-rose-600">{availabilityError}</p>
                  )}
                </div>
              ) : (
                <>
                  {renderSlotGroup({
                    title: morningLabel,
                    emptyLabel: noMorningLabel,
                    slots: groupedSlots["mañana"],
                    accentClasses:
                      "border-yellow-300/50 bg-gradient-to-br from-yellow-100/70 via-background to-amber-100/30",
                  })}
                  {renderSlotGroup({
                    title: afternoonLabel,
                    emptyLabel: noAfternoonLabel,
                    slots: groupedSlots["mañana-tarde"],
                    accentClasses:
                      "border-orange-300/50 bg-gradient-to-br from-orange-100/70 via-background to-amber-100/30",
                  })}
                  {renderSlotGroup({
                    title: eveningLabel,
                    emptyLabel: noAfternoonLabel,
                    slots: groupedSlots["tarde-noche"],
                    accentClasses:
                      "border-sky-400/40 bg-gradient-to-br from-sky-100/60 via-background to-blue-200/30 dark:from-sky-950/40 dark:to-blue-950/40",
                  })}
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
                {modalCancelLabel}
              </Button>
              {availabilityError && (
                <p className="text-sm text-rose-600">{availabilityError}</p>
              )}
              <Button
                type="button"
                onClick={handleConfirmTime}
                className="rounded-full"
                disabled={
                  !pendingTimeSlot ||
                  isPastTimeSlot(pendingTimeSlot, activeDate, now) ||
                  isCheckingAvailability
                }
              >
                {isCheckingAvailability ? "Verificando..." : modalConfirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
