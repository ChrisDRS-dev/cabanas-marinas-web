"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { ReservationTotals } from "@/lib/calcTotal";
import { EXTRAS, PACKAGES } from "@/lib/bookingData";

type StepSummaryProps = {
  state: ReservationState;
  selectedPackage?: (typeof PACKAGES)[number];
  totals: ReservationTotals;
  showMinWarning: boolean;
  minPeople: number;
  weekend: boolean;
};

function formatCurrency(value: number) {
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${rounded}`;
}

function formatHourRange(value: string) {
  const [start, end] = value.split("-");
  if (!start || !end) return value;
  const format = (time: string) => {
    const [hourText] = time.split(":");
    const hour = Number(hourText);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? "P.M." : "A.M.";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:00 ${period}`;
  };
  return `${format(start)} - ${format(end)}`;
}

export default function StepSummary({
  state,
  selectedPackage,
  totals,
  showMinWarning,
  minPeople,
  weekend,
}: StepSummaryProps) {
  const selectedExtras = EXTRAS.filter(
    (extra) => state.extras[extra.id] ?? false
  )
    .map((extra) => extra.label)
    .join(", ");

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2
          id="reservation-summary-title"
          className="font-display text-2xl font-semibold"
        >
          Resumen
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirma los datos antes de enviar la solicitud.
        </p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-semibold">
              {state.date ?? "Por definir"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Paquete</span>
            <span className="font-semibold">
              {selectedPackage?.label ?? "Sin paquete"}
              {state.couplePackage ? " + Pareja" : ""}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Horario</span>
            <span className="font-semibold">
              {state.timeSlot
                ? state.packageId === "EVENTO"
                  ? formatHourRange(state.timeSlot)
                  : state.timeSlot
                : "Por definir"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Personas</span>
            <span className="font-semibold">
              {state.adults} adultos, {state.kids} niños
            </span>
          </div>
          <Separator />
          <div className="flex items-start justify-between gap-6">
            <span className="text-muted-foreground">Extras</span>
            <span className="text-right font-semibold">
              {selectedExtras || "Sin extras"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-semibold">
              {state.paymentMethod ?? "Por definir"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base</span>
            <span className="font-semibold">{formatCurrency(totals.base)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Extras</span>
            <span className="font-semibold">
              {formatCurrency(totals.extrasTotal)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total estimado</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      {showMinWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {weekend
            ? `Minimo: ${minPeople} personas en fines de semana.`
            : `Minimo: ${minPeople} personas en esta fecha.`}
        </div>
      )}
    </section>
  );
}
