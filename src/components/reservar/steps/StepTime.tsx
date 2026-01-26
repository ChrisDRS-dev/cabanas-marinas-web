"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import { TIME_SLOTS } from "@/lib/bookingData";
import type { PackageType } from "@/lib/calcTotal";
import type React from "react";

type StepTimeProps = {
  packageId: PackageType | null;
  state: ReservationState;
  dispatch: React.Dispatch<{ type: "setTimeSlot"; value: string | null }>;
};

function buildTimeSlots(packageId: PackageType | null) {
  if (!packageId) return [];
  return TIME_SLOTS[packageId] ?? [];
}

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

function getDurationHours(start: string, end: string) {
  const startHour = parseHour(start);
  const endHour = parseHour(end);
  if (startHour === null || endHour === null) return null;
  return (endHour - startHour + HOURS_IN_DAY) % HOURS_IN_DAY;
}

export default function StepTime({ packageId, state, dispatch }: StepTimeProps) {
  const timeSlots = buildTimeSlots(packageId);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
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
  const endHourOptions = useMemo(() => {
    if (!customStart) return [];
    const startHour = parseHour(customStart);
    if (startHour === null) return [];
    const options = [10, 11, 12].map((offset) => {
      const hour = (startHour + offset) % HOURS_IN_DAY;
      return {
        value: String(hour).padStart(2, "0"),
        label: formatHourLabel(hour),
      };
    });
    return options;
  }, [customStart]);

  useEffect(() => {
    if (packageId !== EVENTO_PACKAGE_ID) {
      setCustomStart("");
      setCustomEnd("");
      setCustomError(null);
      return;
    }
    if (!state.timeSlot) return;
    const [start, end] = state.timeSlot.split("-");
    if (start && end) {
      setCustomStart(start.replace(":00", ""));
      setCustomEnd(end.replace(":00", ""));
    }
  }, [packageId, state.timeSlot]);

  useEffect(() => {
    if (packageId !== EVENTO_PACKAGE_ID) return;
    if (!customStart || !customEnd) {
      setCustomError(null);
      if (state.timeSlot) {
        dispatch({ type: "setTimeSlot", value: null });
      }
      return;
    }
    if (!endHourOptions.some((option) => option.value === customEnd)) {
      setCustomEnd("");
      return;
    }
    const duration = getDurationHours(customStart, customEnd);
    if (duration === null || duration < 10 || duration > 12) {
      setCustomError("La salida debe ser 10, 11 o 12 horas después.");
      if (state.timeSlot) {
        dispatch({ type: "setTimeSlot", value: null });
      }
      return;
    }
    setCustomError(null);
    const nextValue = `${customStart}:00-${customEnd}:00`;
    if (state.timeSlot !== nextValue) {
      dispatch({ type: "setTimeSlot", value: nextValue });
    }
  }, [packageId, customStart, customEnd, state.timeSlot, dispatch]);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">
          Elige tu horario
        </h2>
        <p className="text-sm text-muted-foreground">
          Mostramos horarios disponibles según el paquete seleccionado.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="grid gap-3">
          {packageId === EVENTO_PACKAGE_ID ? (
            <div className="space-y-3">
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
                    {startHourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
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
          ) : packageId === "AMANECER" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Horario fijo: 6:00 A.M. a 8:00 A.M.
              </p>
              {timeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold">{slot.label}</span>
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {slot.period}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              {timeSlots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Selecciona un paquete para ver los horarios.
                </p>
              )}
              {timeSlots.map((slot) => {
                const selected = state.timeSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() =>
                      dispatch({ type: "setTimeSlot", value: slot.id })
                    }
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-background hover:border-primary/60"
                    }`}
                  >
                    <span className="text-sm font-semibold">{slot.label}</span>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {slot.period}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
