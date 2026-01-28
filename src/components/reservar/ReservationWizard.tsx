"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { calcTotal, PackageType } from "@/lib/calcTotal";
import StepDatePackage from "@/components/reservar/steps/StepDatePackage";
import StepGuests from "@/components/reservar/steps/StepGuests";
import StepExtras from "@/components/reservar/steps/StepExtras";
import StepPayment from "@/components/reservar/steps/StepPayment";
import StepSummary from "@/components/reservar/steps/StepSummary";
import {
  fetchCatalog,
  type Extra,
  type Package,
  type TimeSlot,
} from "@/lib/supabase/catalog";

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
  | { type: "syncExtras"; ids: string[] }
  | { type: "setCouplePackage"; value: boolean }
  | { type: "setPayment"; value: PaymentMethod | null }
  | { type: "setStep"; value: number }
  | { type: "nextStep" }
  | { type: "prevStep" };

const TOTAL_STEPS = 4;
const DEFAULT_MIN_PEOPLE = 4;

const initialState: ReservationState = {
  step: 1,
  date: null,
  packageId: null,
  timeSlot: null,
  adults: 2,
  kids: 0,
  extras: {},
  couplePackage: false,
  paymentMethod: null,
};

function reducer(state: ReservationState, action: Action): ReservationState {
  switch (action.type) {
    case "setDate":
      return { ...state, date: action.value, timeSlot: null };
    case "setPackage":
      return {
        ...state,
        packageId: action.value,
        timeSlot: null,
      };
    case "setTimeSlot":
      return { ...state, timeSlot: action.value };
    case "setAdults":
      if (state.couplePackage) {
        return { ...state, adults: 2 };
      }
      return { ...state, adults: Math.max(0, action.value) };
    case "setKids":
      if (state.couplePackage) {
        return { ...state, kids: Math.min(1, Math.max(0, action.value)) };
      }
      return { ...state, kids: Math.max(0, action.value) };
    case "setExtra":
      return {
        ...state,
        extras: { ...state.extras, [action.id]: action.value },
      };
    case "syncExtras": {
      const next = { ...state.extras };
      const filtered = Object.fromEntries(
        action.ids.map((id) => [id, next[id] ?? false])
      );
      return { ...state, extras: filtered };
    }
    case "setCouplePackage":
      return {
        ...state,
        couplePackage: action.value,
        adults: action.value ? 2 : state.adults,
        kids: action.value ? Math.min(state.kids, 1) : state.kids,
      };
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

export default function ReservationWizard({
  mode = "page",
}: {
  mode?: "page" | "modal";
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const searchParams = useSearchParams();
  const isModal = mode === "modal";
  const [packages, setPackages] = useState<Package[]>([]);
  const [timeSlotsByPackage, setTimeSlotsByPackage] = useState<
    Record<string, TimeSlot[]>
  >({});
  const [extrasCatalog, setExtrasCatalog] = useState<Extra[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const scrollToSummary = () => {
    const summary = document.getElementById("reservation-summary-title");
    if (!summary) return;
    const header = document.getElementById("reservation-header");
    const headerOffset = header?.getBoundingClientRect().height ?? 0;

    let parent = summary.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY)) {
        const parentRect = parent.getBoundingClientRect();
        const summaryRect = summary.getBoundingClientRect();
        const targetTop =
          parent.scrollTop + (summaryRect.top - parentRect.top) - headerOffset;
        parent.scrollTo({ top: targetTop, behavior: "smooth" });
        return;
      }
      parent = parent.parentElement;
    }

    window.scrollTo({
      top: window.scrollY + summary.getBoundingClientRect().top - headerOffset,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const catalog = await fetchCatalog();
        if (!active) return;
        setPackages(catalog.packages);
        setTimeSlotsByPackage(catalog.timeSlotsByPackage);
        setExtrasCatalog(catalog.extras);
        dispatch({
          type: "syncExtras",
          ids: catalog.extras.map((extra) => extra.id),
        });
      } catch (error) {
        if (!active) return;
        setCatalogError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catalogo."
        );
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const pkg = searchParams.get("package") as PackageType | null;
    if (!pkg) return;
    const exists = packages.some((item) => item.id === pkg);
    if (exists && state.packageId !== pkg) {
      dispatch({ type: "setPackage", value: pkg });
    }
  }, [searchParams, state.packageId, packages]);

  const weekend = isWeekend(state.date);
  const selectedPackage = packages.find((item) => item.id === state.packageId);
  const minPeople = selectedPackage
    ? weekend
      ? selectedPackage.minPeopleWeekend
      : selectedPackage.minPeopleWeekday
    : 0;
  const totals = useMemo(
    () =>
      calcTotal({
        packageId: state.packageId,
        adults: state.adults,
        kids: state.kids,
        extras: state.extras,
        packages,
        extrasCatalog,
        minPeopleForDate: minPeople || undefined,
      }),
    [
      state.packageId,
      state.adults,
      state.kids,
      state.extras,
      packages,
      extrasCatalog,
      minPeople,
    ]
  );
  const totalPeople = state.adults + state.kids;
  const showMinWarning = minPeople > 0 && totalPeople < minPeople;

  const isStepComplete = () => {
    switch (state.step) {
      case 1:
        return totalPeople >= DEFAULT_MIN_PEOPLE || state.couplePackage;
      case 2:
        if (!state.date || !state.packageId || !state.timeSlot) return false;
        if (state.packageId === "EVENTO") {
          return totalPeople >= 6;
        }
        return totalPeople >= 4 || state.couplePackage;
      case 3:
        return true;
      case 4:
        return Boolean(state.paymentMethod);
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
    <div
      className={`${
        isModal ? "min-h-full" : "min-h-screen"
      } ${isModal ? "bg-transparent" : "bg-background"} text-foreground`}
    >
      <div
        id="reservation-header"
        className={`sticky top-0 z-40 border-b border-border/60 backdrop-blur ${
          isModal ? "bg-background/70" : "bg-background/90"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          {state.step > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                dispatch({ type: "setStep", value: state.step - 1 })
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
          </div>
          <div className="h-10 w-10" />
        </div>
        <div className="mx-auto max-w-3xl px-6 pb-4">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const stepIndex = index + 1;
              const isActive = state.step === stepIndex;
              const isDone = state.step > stepIndex;
              return (
                <span
                  key={`step-${stepIndex}`}
                  className={`block h-1 flex-1 rounded-full transition ${
                    isActive || isDone ? "bg-primary" : "bg-secondary"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 px-6 pb-32 pt-6">
        {catalogError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {catalogError}
          </div>
        )}
        {state.step === 1 && (
          <StepGuests
            state={state}
            dispatch={dispatch}
            minPeople={minPeople}
            showMinWarning={showMinWarning}
            packageId={state.packageId}
          />
        )}
        {state.step === 2 && (
          <StepDatePackage
            state={state}
            dispatch={dispatch}
            selectedPackage={selectedPackage}
            packages={packages}
            timeSlotsByPackage={timeSlotsByPackage}
          />
        )}
        {state.step === 3 && (
          <StepExtras
            state={state}
            dispatch={dispatch}
            extras={extrasCatalog}
          />
        )}
        {state.step === 4 && (
          <>
            <StepPayment
              state={state}
              dispatch={dispatch}
              onSelected={scrollToSummary}
            />
            <StepSummary
              state={state}
              selectedPackage={selectedPackage}
              totals={totals}
              showMinWarning={showMinWarning}
              minPeople={minPeople}
              weekend={weekend}
              extrasCatalog={extrasCatalog}
            />
          </>
        )}
        <section className="mt-2 flex flex-col gap-2">
          {[
            {
              id: 1,
              title: "Personas",
              value: `${state.adults} adultos, ${state.kids} niños${
                state.couplePackage ? " · Pareja" : ""
              }`,
              complete:
                totalPeople >= DEFAULT_MIN_PEOPLE || state.couplePackage,
            },
            {
              id: 2,
              title: "Fecha y hora",
              value: state.date
                ? `${state.date} · ${state.timeSlot ?? "Por definir"}`
                : "Por definir",
              complete:
                Boolean(state.date && state.packageId && state.timeSlot),
            },
            {
              id: 3,
              title: "Extras",
              value: `${
                Object.values(state.extras).filter(Boolean).length
              } extras`,
              complete: true,
            },
            {
              id: 4,
              title: "Pago",
              value: state.paymentMethod ?? "Por definir",
              complete: Boolean(state.paymentMethod),
            },
          ].map((item) => {
            const isActive = state.step === item.id;
            const isFuture = state.step < item.id;
            const canJump = item.id < state.step;
            if (isFuture) return null;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  canJump && dispatch({ type: "setStep", value: item.id })
                }
                className={`glass-panel flex items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left text-xs transition-all duration-300 ${
                  isActive
                    ? "scale-100 opacity-100"
                    : "scale-[0.98] opacity-80"
                } ${canJump ? "hover:brightness-105" : "cursor-default"}`}
                disabled={!canJump}
              >
                <span className="font-semibold">{item.title}</span>
                <span className="text-muted-foreground">{item.value}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    item.complete
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {item.complete ? "OK" : "..."}
                </span>
              </button>
            );
          })}
        </section>
      </main>

      <div
        className={`${
          isModal ? "sticky bottom-4" : "fixed inset-x-0 bottom-4"
        } z-50 flex justify-center px-4`}
      >
        <div className="flex w-full max-w-3xl items-center gap-3 rounded-full border border-border/70 bg-card/95 p-2 shadow-lg backdrop-blur">
          {state.packageId && (
            <div className="hidden flex-1 flex-col pl-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:flex">
              <span>Costo total</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(totals.total)}
              </span>
            </div>
          )}
          <Button
            className="flex-1 rounded-full text-base font-semibold sm:text-sm"
            size="lg"
            onClick={handlePrimaryAction}
            disabled={!isStepComplete()}
          >
            <span className="flex w-full items-center justify-between">
              {primaryLabel}
              {state.packageId && (
                <span className="text-sm font-medium opacity-80 sm:hidden">
                  {formatCurrency(totals.total)}
                </span>
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
