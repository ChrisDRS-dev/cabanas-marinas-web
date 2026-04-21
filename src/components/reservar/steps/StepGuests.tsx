"use client";

import { useLocale, useTranslations } from "next-intl";
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
  config?: {
    title?: string;
    subtitle?: string;
    adultsLabel?: string;
    adultsDescription?: string;
    kidsLabel?: string;
    kidsDescription?: string;
    totalLabel?: string;
    totalSuffix?: string;
    minCopy?: string;
    couplePackage?: {
      enabled?: boolean;
      title?: string;
      description?: string;
      bullets?: string[];
      note?: string;
      ctaOn?: string;
      ctaOff?: string;
    };
  };
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
  config,
}: StepGuestsProps) {
  const locale = useLocale();
  const t = useTranslations("booking.guests");
  const totalPeople = state.adults + state.kids;
  const maxReached = totalPeople >= 16;
  const maxKids = 16 - state.adults;

  const localizedConfig = locale === "es" ? config : undefined;
  const title = localizedConfig?.title ?? t("title");
  const subtitle =
    localizedConfig?.subtitle ?? t("subtitle");
  const adultsLabel = localizedConfig?.adultsLabel ?? t("adultsLabel");
  const adultsDescription =
    localizedConfig?.adultsDescription ?? t("adultsDescription");
  const kidsLabel = localizedConfig?.kidsLabel ?? t("kidsLabel");
  const kidsDescription =
    localizedConfig?.kidsDescription ?? t("kidsDescription");
  const totalLabel = localizedConfig?.totalLabel ?? t("totalLabel");
  const totalSuffix = localizedConfig?.totalSuffix ?? t("totalSuffix");
  const minCopy =
    localizedConfig?.minCopy ?? t("minCopy");

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Card className="border-border/70 py-4">
        <CardContent className="space-y-3">
          <CounterRow
            label={adultsLabel}
            description={adultsDescription}
            value={state.adults}
            onChange={(value) =>
              dispatch({
                type: "setAdults",
                value: Math.min(16 - state.kids, Math.max(0, value)),
              })
            }
            disableAdd={maxReached}
            disableSubtract={false}
          />
          <CounterRow
            label={kidsLabel}
            description={kidsDescription}
            value={state.kids}
            onChange={(value) =>
              dispatch({
                type: "setKids",
                value: Math.min(maxKids, Math.max(0, value)),
              })
            }
            disableAdd={maxReached}
            disableSubtract={false}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/70 px-4 py-3 text-sm">
        <span className="text-muted-foreground">{totalLabel}</span>
        <span className="font-semibold">
          {totalPeople} {totalSuffix}
        </span>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
        {minCopy}
      </div>
      {showMinWarning && (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{t("minWarningTitle", { minPeople })}</p>
          <p>{t("minWarningBody")}</p>
        </div>
      )}
    </section>
  );
}
