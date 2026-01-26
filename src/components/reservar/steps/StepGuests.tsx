"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { PackageType } from "@/lib/calcTotal";
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
  packageId: PackageType | null;
};

function CounterRow({
  label,
  description,
  value,
  onChange,
  disableAdd,
  disableSubtract,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disableAdd: boolean;
  disableSubtract: boolean;
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
          disabled={disableSubtract}
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
  packageId,
}: StepGuestsProps) {
  const totalPeople = state.adults + state.kids;
  const maxReached = totalPeople >= 16;
  const showCouplePackage = totalPeople < 4 && packageId !== "EVENTO";
  const adultsLocked = state.couplePackage;
  const maxKids = state.couplePackage ? 1 : 16 - state.adults;

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">
          Cuantas personas vienen
        </h2>
        <p className="text-sm text-muted-foreground">
          Los niños pagan 50% del valor por adulto.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          <CounterRow
            label="Adultos"
            description="13 años en adelante"
            value={state.adults}
            onChange={(value) =>
              dispatch({
                type: "setAdults",
                value: adultsLocked
                  ? 2
                  : Math.min(16 - state.kids, Math.max(0, value)),
              })
            }
            disableAdd={maxReached || adultsLocked}
            disableSubtract={adultsLocked}
          />
          <CounterRow
            label="Ninos"
            description="3 a 12 años"
            value={state.kids}
            onChange={(value) =>
              dispatch({
                type: "setKids",
                value: Math.min(maxKids, Math.max(0, value)),
              })
            }
            disableAdd={maxReached || (state.couplePackage && state.kids >= 1)}
            disableSubtract={false}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/70 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total de personas</span>
        <span className="font-semibold">{totalPeople} / 16</span>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
        Cobro mínimo: 4 personas por cabaña.
      </div>
      {showCouplePackage && (
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Paquete pareja</p>
              <p className="text-xs text-muted-foreground">
                Reservar una cabaña solo para dos.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Sofá marino incluido.</li>
                <li>Traslado en lancha ida y vuelta.</li>
                <li>Juegos de mesa.</li>
                <li>Utensilios para asador.</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Plan exclusivo para parejas.
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
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Minimo: {minPeople} personas en esta fecha.</p>
          <p>
            El precio minimo cubre costos de mantenimiento, transporte y
            facilidades.
          </p>
        </div>
      )}
    </section>
  );
}
