"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReservationState } from "@/components/reservar/ReservationWizard";
import type { ReservationTotals } from "@/lib/calcTotal";
import type { Extra, Package } from "@/lib/supabase/catalog";

type StepSummaryProps = {
  state: ReservationState;
  selectedPackage?: Package;
  totals: ReservationTotals;
  showMinWarning: boolean;
  minPeople: number;
  weekend: boolean;
  extrasCatalog: Extra[];
};

function formatCurrency(value: number) {
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${rounded}`;
}

const HOURS_IN_DAY = 24;

function formatTimeLabel(hour: number, minute = 0) {
  const normalizedHour = ((hour % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
  const period = normalizedHour >= 12 ? "P.M." : "A.M.";
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  const displayMinute = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function formatTimeRange12h(timeSlot: string, durationMinutes?: number | null) {
  const [startRaw, endRaw] = timeSlot.split("-");
  const [startHourText, startMinuteText = "0"] = startRaw.split(":");
  const startHour = Number(startHourText);
  const startMinute = Number(startMinuteText);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return timeSlot;

  if (endRaw) {
    const [endHourText, endMinuteText = "0"] = endRaw.split(":");
    const endHour = Number(endHourText);
    const endMinute = Number(endMinuteText);
    if (Number.isNaN(endHour) || Number.isNaN(endMinute)) return timeSlot;
    return `${formatTimeLabel(startHour, startMinute)} - ${formatTimeLabel(
      endHour,
      endMinute
    )}`;
  }

  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    const startTotal = startHour * 60 + startMinute;
    const endTotal = (startTotal + durationMinutes) % (HOURS_IN_DAY * 60);
    const endHour = Math.floor(endTotal / 60);
    const endMinute = endTotal % 60;
    return `${formatTimeLabel(startHour, startMinute)} - ${formatTimeLabel(
      endHour,
      endMinute
    )}`;
  }

  return timeSlot;
}

export default function StepSummary({
  state,
  selectedPackage,
  totals,
  showMinWarning,
  minPeople,
  weekend,
  extrasCatalog,
}: StepSummaryProps) {
  const selectedExtras = extrasCatalog
    .map((extra) => ({
      extra,
      quantity: Math.max(0, state.extras[extra.id] ?? 0),
    }))
    .filter(({ quantity }) => quantity > 0)
    .map(({ extra, quantity }) => {
      const unitLabel =
        extra.pricingUnit === "PER_HOUR"
          ? quantity === 1
            ? "hora"
            : "horas"
          : extra.pricingUnit === "PER_PERSON"
            ? quantity === 1
              ? "persona"
              : "personas"
            : quantity === 1
              ? "reserva"
              : "reservas";
      return `${extra.label} x ${quantity} ${unitLabel}`;
    })
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
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Horario</span>
            <span className="font-semibold">
              {state.timeSlot
                ? formatTimeRange12h(
                    state.timeSlot,
                    selectedPackage?.durationMinutes ?? null
                  )
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
            <span>Costo total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>

      {showMinWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {weekend
            ? `El cobro mínimo por esta fecha es de ${minPeople} personas.`
            : `El cobro mínimo por esta fecha es de ${minPeople} personas.`}
        </div>
      )}
    </section>
  );
}
