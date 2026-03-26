"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { Extra } from "@/lib/supabase/catalog";
import type { ExtrasStepConfig } from "@/lib/supabase/formConfig";
import type React from "react";

type StepExtrasProps = {
  state: ReservationState;
  dispatch: React.Dispatch<{
    type: "setExtraQuantity";
    id: string;
    value: number;
  }>;
  extras: Extra[];
  config?: ExtrasStepConfig;
  durationHours?: number;
  totalPeople: number;
};

function formatExtraUnit(value: Extra["pricingUnit"]) {
  switch (value) {
    case "PER_HOUR":
      return "por hora";
    case "PER_PERSON":
      return "por persona";
    default:
      return "por reserva";
  }
}

export default function StepExtras({
  state,
  dispatch,
  extras,
  config,
  durationHours,
  totalPeople,
}: StepExtrasProps) {
  const titleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const title = config?.title ?? "Extras para el plan";
  const subtitle =
    config?.subtitle ??
    "Suma equipamiento si quieres una experiencia más completa.";
  const emptyLabel = config?.emptyLabel ?? "Cargando extras disponibles...";

  const getMaxQuantity = (extra: Extra) => {
    const functionalLimit =
      extra.pricingUnit === "PER_HOUR"
        ? Math.max(0, durationHours ?? 1)
        : extra.pricingUnit === "PER_PERSON"
          ? Math.max(0, totalPeople)
          : 1;

    if (typeof extra.stock === "number" && extra.stock >= 0) {
      return Math.min(extra.stock, functionalLimit);
    }

    return functionalLimit;
  };

  const getUnitLabel = (extra: Extra, quantity: number) => {
    if (extra.pricingUnit === "PER_HOUR") {
      return quantity === 1 ? "hora" : "horas";
    }
    if (extra.pricingUnit === "PER_PERSON") {
      return quantity === 1 ? "persona" : "personas";
    }
    return quantity === 1 ? "reserva" : "reservas";
  };

  return (
    <section ref={titleRef} className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        También puedes agregar extras al llegar.
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          {extras.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          )}
          {extras.map((extra) => {
            const quantity = Math.max(0, state.extras[extra.id] ?? 0);
            const maxQuantity = getMaxQuantity(extra);
            const canDecrease = quantity > 0;
            const canIncrease = quantity < maxQuantity;
            const priceLabel =
              extra.pricingUnit === "PER_HOUR"
                ? `$${extra.price}/hr`
                : `$${extra.price} ${formatExtraUnit(extra.pricingUnit)}`;
            return (
              <div
                key={extra.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold">{extra.label}</p>
                  {extra.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {extra.description}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground">
                    {priceLabel}
                  </p>
                  {extra.stock != null && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Disponibles: {extra.stock}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-secondary/50 shadow-sm">
                    <div className="flex w-[4.25rem] flex-col items-stretch">
                      <button
                        type="button"
                        onClick={() =>
                          canIncrease &&
                          dispatch({
                            type: "setExtraQuantity",
                            id: extra.id,
                            value: quantity + 1,
                          })
                        }
                        disabled={!canIncrease}
                        aria-label={`Sumar ${extra.label}`}
                        className="flex h-9 w-full items-center justify-center text-lg font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        +
                      </button>
                      <div className="flex min-h-16 items-center justify-center border-y border-border/70 bg-background px-2 py-2 text-center transition-all duration-300">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {quantity}
                          </p>
                          <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                            {quantity > 0
                              ? getUnitLabel(extra, quantity)
                              : "Agregar"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          canDecrease &&
                          dispatch({
                            type: "setExtraQuantity",
                            id: extra.id,
                            value: quantity - 1,
                          })
                        }
                        disabled={!canDecrease}
                        aria-label={`Restar ${extra.label}`}
                        className="flex h-9 w-full items-center justify-center text-lg font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        −
                      </button>
                    </div>
                  </div>
                  <p className="min-h-4 max-w-24 text-center text-[11px] text-muted-foreground">
                    {maxQuantity > 0
                      ? `Máximo ${maxQuantity} ${getUnitLabel(extra, maxQuantity)}`
                      : "No disponible para esta reserva"}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
