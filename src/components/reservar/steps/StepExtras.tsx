"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EXTRAS } from "@/lib/bookingData";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type React from "react";

type StepExtrasProps = {
  state: ReservationState;
  dispatch: React.Dispatch<{ type: "setExtra"; id: string; value: boolean }>;
};

export default function StepExtras({ state, dispatch }: StepExtrasProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">
          Extras para el plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Suma equipamiento si quieres una experiencia más completa.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          {EXTRAS.map((extra) => {
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
                  <p className="text-xs text-muted-foreground">
                    ${extra.price} {extra.unit ?? "por reserva"}
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
                  {selected ? "Agregado" : "Agregar"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
