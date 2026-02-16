"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { Extra } from "@/lib/supabase/catalog";
import type { ExtrasStepConfig } from "@/lib/supabase/formConfig";
import type React from "react";

type StepExtrasProps = {
  state: ReservationState;
  dispatch: React.Dispatch<{ type: "setExtra"; id: string; value: boolean }>;
  extras: Extra[];
  config?: ExtrasStepConfig;
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
}: StepExtrasProps) {
  const title = config?.title ?? "Extras para el plan";
  const subtitle =
    config?.subtitle ??
    "Suma equipamiento si quieres una experiencia más completa.";
  const emptyLabel = config?.emptyLabel ?? "Cargando extras disponibles...";
  const addLabel = config?.addLabel ?? "Agregar";
  const addedLabel = config?.addedLabel ?? "Agregado";

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          {extras.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          )}
          {extras.map((extra) => {
            const selected = state.extras[extra.id] ?? false;
            return (
              <div
                key={extra.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4"
              >
                <div>
                  <p className="text-base font-semibold">{extra.label}</p>
                  {extra.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {extra.description}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground">
                    ${extra.price} {formatExtraUnit(extra.pricingUnit)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() =>
                    dispatch({
                      type: "setExtra",
                      id: extra.id,
                      value: !selected,
                    })
                  }
                  className="rounded-full px-5"
                >
                  {selected ? addedLabel : addLabel}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
