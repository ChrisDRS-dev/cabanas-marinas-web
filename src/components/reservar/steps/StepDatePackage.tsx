"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PACKAGES } from "@/lib/bookingData";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { PackageType } from "@/lib/calcTotal";
import type React from "react";

type StepDatePackageProps = {
  state: ReservationState;
  dispatch: React.Dispatch<
    | { type: "setDate"; value: string | null }
    | { type: "setPackage"; value: PackageType }
  >;
  selectedPackage?: (typeof PACKAGES)[number];
};

export default function StepDatePackage({
  state,
  dispatch,
  selectedPackage,
}: StepDatePackageProps) {
  const [monthOffset, setMonthOffset] = useState(0);
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

  const formatDate = (day: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">
          Elige fecha y paquete
        </h2>
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
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const formatted = formatDate(day);
                const selected = state.date === formatted;
                const currentDate = new Date(year, month, day);
                const isPast = currentDate < todayMidnight;
                return (
                  <button
                    key={formatted}
                    type="button"
                    onClick={() =>
                      dispatch({ type: "setDate", value: formatted })
                    }
                    disabled={isPast}
                    className={`flex h-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/60 text-foreground hover:bg-secondary"
                    } ${isPast ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
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
                onClick={() =>
                  dispatch({ type: "setPackage", value: pkg.id })
                }
                className={`text-left transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-card hover:border-primary/60"
                } rounded-2xl border px-5 py-4 shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Paquete
                    </p>
                    <h4 className="mt-1 text-lg font-semibold">
                      {pkg.label}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pkg.note}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold">${pkg.pricePerAdult}</p>
                    <p className="text-xs text-muted-foreground">
                      por adulto
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
