"use client";

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

export default function StepTime({ packageId, state, dispatch }: StepTimeProps) {
  const timeSlots = buildTimeSlots(packageId);

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
        </CardContent>
      </Card>
    </section>
  );
}
