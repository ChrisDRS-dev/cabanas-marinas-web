"use client";

import { Card, CardContent } from "@/components/ui/card";
import type {
  ReservationState,
  PaymentMethod,
} from "@/components/reservar/ReservationWizard";
import type { PaymentMethodConfig } from "@/lib/supabase/formConfig";
import { siteData } from "@/lib/siteData";
import type React from "react";

const METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
  hidden?: boolean;
}[] = [
  {
    id: "YAPPY",
    label: "Yappy",
    description: "Pago rapido desde el celular.",
    enabled: true,
  },
  {
    id: "PAYPAL",
    label: "PayPal",
    description: "Pago seguro en linea.",
    enabled: false,
  },
  {
    id: "CARD",
    label: "Tarjeta / CLAVE",
    description: "Visa, Mastercard, CLAVE, Nequi.",
    enabled: false,
    hidden: true,
  },
  {
    id: "CASH",
    label: "WhatsApp",
    description: "Ver opciones de pago por WhatsApp.",
    enabled: true,
  },
];

function formatCurrency(value: number) {
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${rounded}`;
}

type StepPaymentProps = {
  state: ReservationState;
  dispatch: React.Dispatch<{ type: "setPayment"; value: PaymentMethod | null }>;
  onSelected?: () => void;
  depositAmount?: number;
  config?: {
    title?: string;
    subtitle?: string;
    methods?: PaymentMethodConfig[];
  };
};

export default function StepPayment({
  state,
  dispatch,
  onSelected,
  depositAmount,
  config,
}: StepPaymentProps) {
  const title = config?.title ?? "Metodo de pago";
  const subtitle =
    config?.subtitle ?? "Selecciona como prefieres confirmar tu reserva.";
  const methods = (
    config?.methods && config.methods.length > 0
      ? config.methods.map((method) => ({
          id: method.id,
          label:
            method.id === "CASH"
              ? "WhatsApp"
              : method.label ?? method.id,
          description:
            method.id === "CASH"
              ? "Ver opciones de pago por WhatsApp."
              : method.description ?? "",
          enabled:
            method.id === "CASH" || method.id === "YAPPY"
              ? true
              : method.enabled ?? false,
          hidden: method.id === "CARD",
        }))
      : METHODS
  ).filter((m) => !m.hidden);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="grid gap-3">
          {methods.map((method) => {
            const selected = state.paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() =>
                  method.enabled &&
                  (() => {
                    dispatch({ type: "setPayment", value: method.id as PaymentMethod });
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

      {state.paymentMethod === "YAPPY" && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm">
          <p className="font-semibold text-foreground">Instrucciones Yappy</p>
          <p className="mt-1 text-muted-foreground">
            Envía el pago inicial al número Yappy:
          </p>
          <p className="mt-2 text-xl font-bold tracking-wide text-foreground">
            {siteData.links.yappy}
          </p>
          {depositAmount != null && (
            <p className="mt-2 text-sm text-muted-foreground">
              Monto a enviar:{" "}
              <span className="font-semibold text-primary">
                {formatCurrency(depositAmount)}
              </span>{" "}
              <span className="text-xs">(50% del total)</span>
            </p>
          )}
          <div className="mt-4 flex h-24 w-24 items-center justify-center rounded-xl border border-border/70 bg-muted text-xs text-muted-foreground">
            QR próximamente
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Después de realizar el pago, escríbenos por WhatsApp con el comprobante para confirmar tu reserva.
          </p>
        </div>
      )}
    </section>
  );
}
