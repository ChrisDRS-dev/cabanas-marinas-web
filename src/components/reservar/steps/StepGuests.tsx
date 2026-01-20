"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type React from "react";

type StepGuestsProps = {
  state: ReservationState;
  dispatch: React.Dispatch<
    | { type: "setAdults"; value: number }
    | { type: "setKids"; value: number }
    | { type: "setCouplePackage"; value: boolean }
  >;
  minPeople: number;
  showMinWarning: boolean;
};

function CounterRow({
  label,
  description,
  value,
  onChange,
  disableAdd,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disableAdd: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
      <div>
        <p className="text-base font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => onChange(value - 1)}
          className="rounded-full"
        >
          -
        </Button>
        <span className="w-8 text-center text-lg font-semibold tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          size="icon-lg"
          onClick={() => onChange(value + 1)}
          className="rounded-full"
          disabled={disableAdd}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export default function StepGuests({
  state,
  dispatch,
  minPeople,
  showMinWarning,
}: StepGuestsProps) {
  const totalPeople = state.adults + state.kids;
  const maxReached = totalPeople >= 16;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">
          Cuantas personas vienen
        </h2>
        <p className="text-sm text-muted-foreground">
          Los ninos pagan 50% del valor por adulto.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          <CounterRow
            label="Adultos"
            description="13 anos en adelante"
            value={state.adults}
            onChange={(value) =>
              dispatch({
                type: "setAdults",
                value: Math.min(16 - state.kids, Math.max(0, value)),
              })
            }
            disableAdd={maxReached}
          />
          <CounterRow
            label="Ninos"
            description="3 a 12 anos"
            value={state.kids}
            onChange={(value) =>
              dispatch({
                type: "setKids",
                value: Math.min(16 - state.adults, Math.max(0, value)),
              })
            }
            disableAdd={maxReached}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/70 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total de personas</span>
        <span className="font-semibold">{totalPeople} / 16</span>
      </div>
      {totalPeople < 4 && (
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Paquete pareja</p>
              <p className="text-xs text-muted-foreground">
                Disponible para grupos pequenos.
              </p>
            </div>
            <Button
              type="button"
              variant={state.couplePackage ? "default" : "outline"}
              onClick={() =>
                dispatch({
                  type: "setCouplePackage",
                  value: !state.couplePackage,
                })
              }
              className="rounded-full px-5"
            >
              {state.couplePackage ? "Seleccionado" : "Seleccionar"}
            </Button>
          </div>
        </div>
      )}
      {showMinWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Minimo recomendado: {minPeople} personas en esta fecha. (Prototipo:
          no aplica al total).
        </div>
      )}
    </section>
  );
}
