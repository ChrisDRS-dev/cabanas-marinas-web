"use client";

import { Card, CardContent } from "@/components/ui/card";
import type {
  ReservationState,
  PaymentMethod,
} from "@/components/reservar/ReservationWizard";
import type React from "react";

const METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    id: "YAPPY",
    label: "Yappy",
    description: "Pago rapido desde el celular.",
    enabled: false,
  },
  {
    id: "PAYPAL",
    label: "PayPal",
    description: "Pago seguro en linea.",
    enabled: false,
  },
  {
    id: "CARD",
    label: "Tarjeta",
    description: "Credito o debito.",
    enabled: false,
  },
  { id: "CASH", label: "Efectivo", description: "Paga al llegar.", enabled: true },
];

type StepPaymentProps = {
  state: ReservationState;
  dispatch: React.Dispatch<{ type: "setPayment"; value: PaymentMethod | null }>;
  onSelected?: () => void;
};

export default function StepPayment({
  state,
  dispatch,
  onSelected,
}: StepPaymentProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">
          Metodo de pago
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecciona como prefieres confirmar tu reserva.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="grid gap-3">
          {METHODS.map((method) => {
            const selected = state.paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() =>
                  method.enabled &&
                  (() => {
                    dispatch({ type: "setPayment", value: method.id });
                    requestAnimationFrame(() => onSelected?.());
                  })()
                }
                disabled={!method.enabled}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border/70 bg-background"
                } ${
                  method.enabled
                    ? "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
                    : "opacity-60"
                } `}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold">{method.label}</p>
                  {!method.enabled && (
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Proximamente
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {method.description}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
