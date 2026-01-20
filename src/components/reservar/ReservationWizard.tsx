"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EXTRAS, PACKAGES } from "@/lib/bookingData";
import { calcTotal, PackageType } from "@/lib/calcTotal";
import StepDatePackage from "@/components/reservar/steps/StepDatePackage";
import StepTime from "@/components/reservar/steps/StepTime";
import StepGuests from "@/components/reservar/steps/StepGuests";
import StepExtras from "@/components/reservar/steps/StepExtras";
import StepPayment from "@/components/reservar/steps/StepPayment";
import StepSummary from "@/components/reservar/steps/StepSummary";

export type PaymentMethod = "YAPPY" | "PAYPAL" | "CARD" | "CASH";

export type ReservationState = {
  step: number;
  date: string | null;
  packageId: PackageType | null;
  timeSlot: string | null;
  adults: number;
  kids: number;
  extras: Record<string, boolean>;
  couplePackage: boolean;
  paymentMethod: PaymentMethod | null;
};

type Action =
  | { type: "setDate"; value: string | null }
  | { type: "setPackage"; value: PackageType }
  | { type: "setTimeSlot"; value: string | null }
  | { type: "setAdults"; value: number }
  | { type: "setKids"; value: number }
  | { type: "setExtra"; id: string; value: boolean }
  | { type: "setCouplePackage"; value: boolean }
  | { type: "setPayment"; value: PaymentMethod | null }
  | { type: "setStep"; value: number }
  | { type: "nextStep" }
  | { type: "prevStep" };

const TOTAL_STEPS = 6;

const initialExtras = Object.fromEntries(
  EXTRAS.map((extra) => [extra.id, false])
);

const initialState: ReservationState = {
  step: 1,
  date: null,
  packageId: null,
  timeSlot: null,
  adults: 2,
  kids: 0,
  extras: initialExtras,
  couplePackage: false,
  paymentMethod: null,
};

function reducer(state: ReservationState, action: Action): ReservationState {
  switch (action.type) {
    case "setDate":
      return { ...state, date: action.value };
    case "setPackage":
      return {
        ...state,
        packageId: action.value,
        timeSlot: null,
      };
    case "setTimeSlot":
      return { ...state, timeSlot: action.value };
    case "setAdults":
      return { ...state, adults: Math.max(0, action.value) };
    case "setKids":
      return { ...state, kids: Math.max(0, action.value) };
    case "setExtra":
      return {
        ...state,
        extras: { ...state.extras, [action.id]: action.value },
      };
    case "setCouplePackage":
      return { ...state, couplePackage: action.value };
    case "setPayment":
      return { ...state, paymentMethod: action.value };
    case "setStep":
      return {
        ...state,
        step: Math.max(1, Math.min(TOTAL_STEPS, action.value)),
      };
    case "nextStep":
      return { ...state, step: Math.min(TOTAL_STEPS, state.step + 1) };
    case "prevStep":
      return { ...state, step: Math.max(1, state.step - 1) };
    default:
      return state;
  }
}

function formatCurrency(value: number) {
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `$${rounded}`;
}

function isWeekend(dateValue: string | null) {
  if (!dateValue) return false;
  const [year, month, dayOfMonth] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, dayOfMonth);
  const day = date.getDay();
  return day === 0 || day === 6;
}

export default function ReservationWizard() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const searchParams = useSearchParams();

  useEffect(() => {
    const pkg = searchParams.get("package") as PackageType | null;
    if (!pkg) return;
    const exists = PACKAGES.some((item) => item.id === pkg);
    if (exists && state.packageId !== pkg) {
      dispatch({ type: "setPackage", value: pkg });
    }
  }, [searchParams, state.packageId]);

  useEffect(() => {
    if (state.step !== 2) return;
    if (state.packageId !== "AMANECER") return;
    if (state.timeSlot !== "06:00-09:00") {
      dispatch({ type: "setTimeSlot", value: "06:00-09:00" });
    }
    dispatch({ type: "nextStep" });
  }, [state.step, state.packageId, state.timeSlot]);
  const selectedPackage = PACKAGES.find((item) => item.id === state.packageId);
  const totals = useMemo(
    () => calcTotal(state.packageId, state.adults, state.kids, state.extras),
    [state.packageId, state.adults, state.kids, state.extras]
  );
  const weekend = isWeekend(state.date);
  const minPeople = selectedPackage
    ? weekend
      ? selectedPackage.minPeopleWeekend
      : selectedPackage.minPeopleWeekday
    : 0;
  const totalPeople = state.adults + state.kids;
  const showMinWarning = minPeople > 0 && totalPeople < minPeople;
  const progress = Math.round((state.step / TOTAL_STEPS) * 100);

  const isStepComplete = () => {
    switch (state.step) {
      case 1:
        return Boolean(state.date && state.packageId);
      case 2:
        return Boolean(state.timeSlot);
      case 3:
        return totalPeople >= 4 || state.couplePackage;
      case 4:
        return true;
      case 5:
        return Boolean(state.paymentMethod);
      case 6:
        return true;
      default:
        return false;
    }
  };

  const primaryLabel = state.step === TOTAL_STEPS ? "Finalizar" : "Continuar";

  const handlePrimaryAction = () => {
    if (!isStepComplete()) return;
    if (state.step === TOTAL_STEPS) {
      window.alert("Solicitud enviada. Te contactaremos pronto.");
      return;
    }
    dispatch({ type: "nextStep" });
  };

  return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            {state.step > 1 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  dispatch({
                    type: "setStep",
                    value:
                      state.packageId === "AMANECER" && state.step === 3
                        ? 1
                        : state.step - 1,
                  })
                }
                aria-label="Volver"
                className="rounded-full"
              >
                ←
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="rounded-full"
              >
                <a href="/" aria-label="Volver al inicio">
                  ←
                </a>
              </Button>
            )}
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Reserva tu cabaña
              </p>
              <p className="font-display text-lg font-semibold">
                Paso {state.step} de {TOTAL_STEPS}
              </p>
            </div>
            <div className="h-10 w-10" />
          </div>
          <div className="mx-auto max-w-3xl px-6 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
          <div className="mt-2 h-2 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 px-6 pb-32 pt-6">
        {state.step === 1 && (
          <StepDatePackage
            state={state}
            dispatch={dispatch}
            selectedPackage={selectedPackage}
          />
        )}
        {state.step === 2 && (
          <StepTime
            packageId={state.packageId}
            state={state}
            dispatch={dispatch}
          />
        )}
        {state.step === 3 && (
          <StepGuests
            state={state}
            dispatch={dispatch}
            minPeople={minPeople}
            showMinWarning={showMinWarning}
          />
        )}
        {state.step === 4 && (
          <StepExtras state={state} dispatch={dispatch} />
        )}
        {state.step === 5 && (
          <StepPayment state={state} dispatch={dispatch} />
        )}
        {state.step === 6 && (
          <StepSummary
            state={state}
            selectedPackage={selectedPackage}
            totals={totals}
            showMinWarning={showMinWarning}
            minPeople={minPeople}
            weekend={weekend}
          />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex w-full max-w-3xl items-center gap-3 rounded-full border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur">
            <div className="hidden flex-1 flex-col pl-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:flex">
            <span>Total estimado</span>
            <span className="text-lg font-semibold text-foreground">
              {formatCurrency(totals.total)}
            </span>
          </div>
          <Button
            className="flex-1 rounded-full text-base font-semibold sm:text-sm"
            size="lg"
            onClick={handlePrimaryAction}
            disabled={!isStepComplete()}
          >
            <span className="flex w-full items-center justify-between">
              {primaryLabel}
              <span className="text-sm font-medium opacity-80 sm:hidden">
                {formatCurrency(totals.total)}
              </span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
