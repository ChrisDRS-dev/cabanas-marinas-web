"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { calcTotal, PackageType } from "@/lib/calcTotal";
import StepDatePackage from "@/components/reservar/steps/StepDatePackage";
import StepGuests from "@/components/reservar/steps/StepGuests";
import StepExtras from "@/components/reservar/steps/StepExtras";
import StepSummary from "@/components/reservar/steps/StepSummary";
import { getSessionSafe, supabase } from "@/lib/supabase/client";
import { siteData } from "@/lib/siteData";
import {
  fetchCatalog,
  type Extra,
  type Package,
  type TimeSlot,
} from "@/lib/supabase/catalog";
import {
  fetchFormConfig,
  type FormStepConfig,
  type FormConfig,
} from "@/lib/supabase/formConfig";

export type PaymentMethod = "YAPPY" | "PAYPAL" | "CARD" | "CASH";

const DIAL_COUNTRIES = [
  { code: "PA", flag: "🇵🇦", name: "Panamá",            dial: "+507", min: 8,  max: 8  },
  { code: "US", flag: "🇺🇸", name: "EE. UU. / Canadá", dial: "+1",   min: 10, max: 10 },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica",        dial: "+506", min: 8,  max: 8  },
  { code: "CO", flag: "🇨🇴", name: "Colombia",          dial: "+57",  min: 10, max: 10 },
  { code: "VE", flag: "🇻🇪", name: "Venezuela",         dial: "+58",  min: 10, max: 10 },
  { code: "MX", flag: "🇲🇽", name: "México",            dial: "+52",  min: 10, max: 10 },
  { code: "EC", flag: "🇪🇨", name: "Ecuador",           dial: "+593", min: 9,  max: 9  },
  { code: "DO", flag: "🇩🇴", name: "Rep. Dominicana",   dial: "+1",   min: 10, max: 10 },
  { code: "ES", flag: "🇪🇸", name: "España",            dial: "+34",  min: 9,  max: 9  },
  { code: "AR", flag: "🇦🇷", name: "Argentina",         dial: "+54",  min: 10, max: 10 },
  { code: "CL", flag: "🇨🇱", name: "Chile",             dial: "+56",  min: 9,  max: 9  },
  { code: "PE", flag: "🇵🇪", name: "Perú",              dial: "+51",  min: 9,  max: 9  },
] as const;

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
  | { type: "hydrate"; value: Partial<ReservationState> }
  | { type: "setStep"; value: number; max: number }
  | { type: "nextStep"; max: number }
  | { type: "prevStep" };

const DEFAULT_MIN_PEOPLE = 2;
const DEFAULT_STEPS: FormStepConfig[] = [
  { id: "guests", label: "Personas", summary: "Personas" },
  { id: "date_package", label: "Fecha y hora", summary: "Fecha y hora" },
  { id: "extras", label: "Extras", summary: "Extras" },
  { id: "payment", label: "Resumen", summary: "Resumen" },
];

const initialState: ReservationState = {
  step: 1,
  date: null,
  packageId: null,
  timeSlot: null,
  adults: 2,
  kids: 0,
  extras: {},
  couplePackage: false,
  paymentMethod: "YAPPY",
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
      return { ...state, adults: Math.max(0, action.value) };
    case "setKids":
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
      };
    case "setPayment":
      return { ...state, paymentMethod: action.value };
    case "hydrate":
      return {
        ...state,
        ...action.value,
        extras: action.value.extras ?? state.extras,
      };
    case "setStep":
      return {
        ...state,
        step: Math.max(1, Math.min(action.max, action.value)),
      };
    case "nextStep":
      return { ...state, step: Math.min(action.max, state.step + 1) };
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
  prefill,
  startStepId,
}: {
  mode?: "page" | "modal";
  prefill?: Partial<ReservationState>;
  startStepId?: string;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isModal = mode === "modal";
  const [packages, setPackages] = useState<Package[]>([]);
  const [timeSlotsByPackage, setTimeSlotsByPackage] = useState<
    Record<string, TimeSlot[]>
  >({});
  const [extrasCatalog, setExtrasCatalog] = useState<Extra[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [formSteps, setFormSteps] = useState<FormStepConfig[]>(DEFAULT_STEPS);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formConfigError, setFormConfigError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneDialCode, setPhoneDialCode] = useState("+507");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    id: string | null;
    name: string | null;
    status: string | null;
    adults: number;
    kids: number;
    packageLabel: string | null;
    date: string | null;
    timeSlot: string | null;
    extras: string[];
    totalAmount?: number | null;
    depositAmount?: number | null;
    paymentMethod?: string | null;
  } | null>(null);
  const [isRepeatConfirmation, setIsRepeatConfirmation] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [whatsAppLink, setWhatsAppLink] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const stepOverrideRef = useRef(false);
  const prefillRef = useRef(false);
  const packagePrefillRef = useRef(false);

  const router = useRouter();

  const formatStatus = (value: string | null | undefined) => {
    switch (value) {
      case "PENDING_PAYMENT":
        return "Pago pendiente";
      case "CONFIRMED":
        return "Confirmada";
      case "CANCELLED":
        return "Cancelada";
      case "COMPLETED":
        return "Completada";
      case "NO_SHOW":
        return "No show";
      default:
        return value ?? "Por confirmar";
    }
  };

  const formatTime = (value: string) =>
    value.includes(":") ? value.slice(0, 5) : value;

  const formatTime12h = (value: string | null) => {
    if (!value) return "Por confirmar";
    const [hourText, minuteText = "0"] = value.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
    const period = hour >= 12 ? "P.M." : "A.M.";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = String(minute).padStart(2, "0");
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const resolveTimeRange = (
    timeSlot: string | null,
    durationMinutes?: number | null
  ) => {
    if (!timeSlot) return null;
    if (timeSlot.includes("-")) {
      const [start, end] = timeSlot.split("-");
      return {
        start: start.replace(":00", "").trim(),
        end: end?.replace(":00", "").trim() ?? "",
      };
    }
    if (durationMinutes) {
      const [hourText, minuteText = "0"] = timeSlot.split(":");
      const startHour = Number(hourText);
      const startMinute = Number(minuteText);
      if (!Number.isNaN(startHour) && !Number.isNaN(startMinute)) {
        const startDate = new Date(0, 0, 0, startHour, startMinute);
        const endDate = new Date(
          startDate.getTime() + durationMinutes * 60 * 1000
        );
        const start = `${String(startDate.getHours()).padStart(2, "0")}:${String(
          startDate.getMinutes()
        ).padStart(2, "0")}`;
        const end = `${String(endDate.getHours()).padStart(2, "0")}:${String(
          endDate.getMinutes()
        ).padStart(2, "0")}`;
        return { start, end };
      }
    }
    return { start: timeSlot, end: "" };
  };

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

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profileUserId) {
      setDraftLoaded(true);
      return;
    }
    const wantsDraft = searchParams.get("draft") === "1";
    if (!wantsDraft) {
      setDraftLoaded(true);
      return;
    }
    let active = true;
    const loadDraft = async () => {
      try {
        const { data } = await supabase
          .from("reservation_drafts")
          .select("state")
          .eq("user_id", profileUserId)
          .maybeSingle();
        if (!active) return;
        if (data?.state) {
          dispatch({ type: "hydrate", value: data.state as Partial<ReservationState> });
          setDraftHydrated(true);
        }
      } catch {
        if (!active) return;
      } finally {
        if (active) setDraftLoaded(true);
      }
    };
    loadDraft();
    return () => {
      active = false;
    };
  }, [profileUserId, searchParams]);

  useEffect(() => {
    if (!profileUserId) return;
    if (!draftLoaded) return;
    if (showConfirmation || showPhonePrompt) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    const payload: Partial<ReservationState> = {
      step: state.step,
      date: state.date,
      packageId: state.packageId,
      timeSlot: state.timeSlot,
      adults: state.adults,
      kids: state.kids,
      extras: state.extras,
      couplePackage: state.couplePackage,
      paymentMethod: state.paymentMethod,
    };
    draftTimerRef.current = setTimeout(async () => {
      await supabase.from("reservation_drafts").upsert(
        {
          user_id: profileUserId,
          state: payload,
        },
        { onConflict: "user_id" }
      );
    }, 1200);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    state.step,
    state.date,
    state.packageId,
    state.timeSlot,
    state.adults,
    state.kids,
    state.extras,
    state.couplePackage,
    state.paymentMethod,
    profileUserId,
    draftLoaded,
    showConfirmation,
    showPhonePrompt,
  ]);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const config = await fetchFormConfig();
        if (!active || !config?.steps?.length) return;
        const filtered = config.steps.filter(
          (step) => step.enabled !== false
        );
        if (filtered.length > 0) {
          setFormSteps(filtered);
        }
        if (config.show_summary === false) {
          setShowSummary(false);
        }
        setFormConfig(config);
      } catch (error) {
        if (!active) return;
        setFormConfigError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el formulario."
        );
      }
    };

    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const user = (await getSessionSafe())?.user;
        if (!user || !active) return;
        setProfileUserId(user.id);
        const { data } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!active) return;
        const nameFromProfile = data?.full_name ?? null;
        const phoneFromProfile = data?.phone ?? null;
        const nameFromMeta =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null;
        const phoneFromMeta =
          (user.user_metadata?.phone as string | undefined) ?? null;
        setProfileName(nameFromProfile ?? nameFromMeta);
        setProfilePhone(phoneFromProfile ?? phoneFromMeta);
      } catch {
        if (!active) return;
        setProfileName(null);
        setProfilePhone(null);
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profileUserId) return;
    const key = `cm_last_reservation:${profileUserId}`;
    const saved = window.localStorage.getItem(key);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        id: string | null;
        name: string | null;
        status?: string | null;
        adults: number;
        kids: number;
        packageLabel: string | null;
        date: string | null;
        timeSlot: string | null;
        extras: string[];
        totalAmount?: number | null;
      };
      if (parsed.date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parsedDate = new Date(parsed.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          parsedDate.setHours(0, 0, 0, 0);
          if (parsedDate < today) {
            window.localStorage.removeItem(key);
            return;
          }
        }
      }
      setIsRepeatConfirmation(true);
      setConfirmationData({
        ...parsed,
        status: parsed.status ?? "PENDING_PAYMENT",
      });
      setConfirmationId(parsed.id ?? null);
      setShowConfirmation(true);
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [profileUserId, searchParams]);

  useEffect(() => {
    const pkg = searchParams.get("package") as PackageType | null;
    const wantsDraft = searchParams.get("draft") === "1";
    if (wantsDraft || prefill) return;
    if (!pkg || packagePrefillRef.current) return;
    const exists = packages.some((item) => item.id === pkg);
    if (!exists) return;

    dispatch({
      type: "hydrate",
      value: {
        step: 1,
        date: null,
        packageId: pkg,
        timeSlot: null,
        adults: initialState.adults,
        kids: initialState.kids,
        extras: {},
        couplePackage: false,
        paymentMethod: initialState.paymentMethod,
      },
    });

    packagePrefillRef.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("package");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, packages, router, pathname, prefill]);

  useEffect(() => {
    if (!prefill || prefillRef.current) return;
    dispatch({ type: "hydrate", value: prefill });
    prefillRef.current = true;
  }, [prefill]);

  useEffect(() => {
    if (formSteps.length === 0) return;
    const targetStep = startStepId ?? searchParams.get("step");
    if (!targetStep || stepOverrideRef.current) return;
    const index = formSteps.findIndex((step) => step.id === targetStep);
    if (index === -1) return;
    const stepsCount = formSteps.length || DEFAULT_STEPS.length;
    stepOverrideRef.current = true;
    dispatch({ type: "setStep", value: index + 1, max: stepsCount });
  }, [searchParams, formSteps, startStepId]);

  const weekend = isWeekend(state.date);
  const selectedPackage = packages.find((item) => item.id === state.packageId);
  const durationHours = selectedPackage
    ? Math.round(selectedPackage.durationMinutes / 60)
    : undefined;
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
        durationHours,
      }),
    [
      state.packageId,
      state.adults,
      state.kids,
      state.extras,
      packages,
      extrasCatalog,
      minPeople,
      durationHours,
    ]
  );
  const totalPeople = state.adults + state.kids;
  const showMinWarning = minPeople > 0 && totalPeople < minPeople;
  const totalSteps = formSteps.length || DEFAULT_STEPS.length;
  const activeStep = formSteps[state.step - 1]?.id ?? "guests";

  useEffect(() => {
    if (state.step > totalSteps) {
      dispatch({ type: "setStep", value: totalSteps, max: totalSteps });
    }
  }, [state.step, totalSteps]);

  const isStepComplete = () => {
    switch (activeStep) {
      case "guests":
        return totalPeople >= 1;
      case "date_package":
        if (!state.date || !state.packageId || !state.timeSlot) return false;
        if (state.packageId === "EVENTO") {
          return totalPeople >= 6;
        }
        return totalPeople >= DEFAULT_MIN_PEOPLE;
      case "extras":
        return true;
      case "payment":
        return true;
      default:
        return false;
    }
  };

  const primaryLabel =
    state.step === totalSteps ? "Solicitar reserva" : "Continuar";

  const submitReservation = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const selectedExtras = Object.entries(state.extras)
        .filter(([, selected]) => selected)
        .map(([id]) => ({ id, quantity: 1 }));

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: state.packageId,
          date: state.date,
          timeSlot: state.timeSlot,
          adults: state.adults,
          kids: state.kids,
          extras: selectedExtras,
          paymentMethod: state.paymentMethod ?? "YAPPY",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        const code = String(result?.error ?? "");
        const message =
          code === "not_authenticated" || code === "CM_NOT_AUTHENTICATED"
            ? "Inicia sesion para completar la reserva."
            : code === "missing_fields"
            ? "Completa todos los campos obligatorios."
            : code === "CM_INVALID_TIME_RANGE"
            ? "El horario seleccionado no es valido."
            : code === "CM_INVALID_PEOPLE_COUNT"
            ? "Indica la cantidad de personas para continuar."
            : code === "CM_MIN_PEOPLE_REQUIRED"
            ? "No cumples con el minimo de personas para esta fecha."
            : code === "CM_NO_CABIN_AVAILABLE"
            ? "No hay cabañas disponibles para ese horario."
            : code === "CM_MAX_PEOPLE_EXCEEDED"
            ? "La capacidad maxima por reserva es de 16 personas."
            : code === "CM_INVALID_PACKAGE" || code === "invalid_package"
            ? "Paquete invalido. Actualiza la pagina."
            : "No se pudo completar la reserva.";
        throw new Error(message);
      }

      setSubmitSuccess("Reserva solicitada. Completa el pago para confirmar.");
      const resolvedExtras = Object.entries(state.extras)
        .filter(([, selected]) => selected)
        .map(
          ([id]) => extrasCatalog.find((extra) => extra.id === id)?.label ?? id
        );
      const totalAmount =
        typeof result?.total === "number" ? result.total : totals.total;
      const depositAmount =
        typeof result?.deposit === "number"
          ? result.deposit
          : Math.round(totalAmount * 0.5 * 100) / 100;
      const payload = {
        id: result?.id ?? null,
        name: profileName ?? null,
        status: "PENDING_PAYMENT",
        adults: state.adults,
        kids: state.kids,
        packageLabel: selectedPackage?.label ?? null,
        date: state.date,
        timeSlot: state.timeSlot,
        extras: resolvedExtras,
        totalAmount,
        depositAmount,
        paymentMethod: state.paymentMethod ?? "YAPPY",
      };
      setConfirmationId(result?.id ?? null);
      setConfirmationData(payload);
      if (typeof window !== "undefined" && profileUserId) {
        window.localStorage.setItem(
          `cm_last_reservation:${profileUserId}`,
          JSON.stringify(payload)
        );
      }
      if (profileUserId) {
        await supabase
          .from("reservation_drafts")
          .delete()
          .eq("user_id", profileUserId);
      }
      const whatsappBase = siteData.links.whatsapp;
      const messageTimeRange = resolveTimeRange(
        payload.timeSlot,
        selectedPackage?.durationMinutes
      );
      const paymentMethodLabel =
        payload.paymentMethod === "YAPPY"
          ? "Yappy"
          : payload.paymentMethod === "PAYPAL"
          ? "PayPal"
          : payload.paymentMethod === "CARD"
          ? "Tarjeta"
          : "WhatsApp";
      const messageLines = [
        "Hola, quiero coordinar el pago de mi reserva.",
        payload.id ? `ID: ${String(payload.id).slice(0, 8)}` : null,
        payload.name ? `Nombre: ${payload.name}` : null,
        payload.packageLabel ? `Paquete: ${payload.packageLabel}` : null,
        payload.date ? `Fecha: ${payload.date}` : null,
        messageTimeRange
          ? `Horario: ${formatTime12h(messageTimeRange.start)} - ${formatTime12h(
              messageTimeRange.end
            )}`
          : null,
        `Personas: ${payload.adults + payload.kids} (Adultos: ${payload.adults}, Niños: ${payload.kids})`,
        payload.extras.length ? `Extras: ${payload.extras.join(", ")}` : "Extras: Ninguno",
        payload.totalAmount != null
          ? `Total estimado: ${formatCurrency(payload.totalAmount)}`
          : null,
        payload.depositAmount != null
          ? `Pago inicial (50%): ${formatCurrency(payload.depositAmount)}`
          : null,
        `Método de pago: ${paymentMethodLabel}`,
        "Para confirmar tu reserva, realiza el pago del 50% por el método indicado.",
      ].filter(Boolean) as string[];
      const message = messageLines.join("\n");
      const whatsappLink = `${whatsappBase}?text=${encodeURIComponent(message)}`;
      setWhatsAppLink(whatsappLink);
      const rid = result?.id ?? null;
      if (!profilePhone) {
        setShowPhonePrompt(true);
      } else {
        router.push(`/reservar/pago?method=${state.paymentMethod ?? "YAPPY"}&rid=${rid ?? ""}`);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo completar la reserva."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmationRange = resolveTimeRange(
    confirmationData?.timeSlot ?? state.timeSlot,
    selectedPackage?.durationMinutes
  );

  const handlePrimaryAction = () => {
    if (!isStepComplete()) return;
    if (showConfirmation || showPhonePrompt || isSubmitting) return;
    if (state.step === totalSteps) {
      void submitReservation();
      return;
    }
    dispatch({ type: "nextStep", max: totalSteps });
  };

  const handleCancelReservation = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      const reservationId = confirmationId ?? confirmationData?.id ?? null;
      if (reservationId) {
        await fetch("/api/reservations/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId }),
        });
      }
      if (typeof window !== "undefined" && profileUserId) {
        window.localStorage.removeItem(`cm_last_reservation:${profileUserId}`);
      }
      setShowConfirmation(false);
      router.push("/");
    } finally {
      setIsCancelling(false);
    }
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
                dispatch({ type: "setStep", value: state.step - 1, max: totalSteps })
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
            {Array.from({ length: totalSteps }).map((_, index) => {
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
        {formConfigError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {formConfigError}
          </div>
        )}
        {activeStep === "guests" && (
          <StepGuests
            state={state}
            dispatch={dispatch}
            minPeople={minPeople}
            showMinWarning={showMinWarning}
            config={formConfig?.guests}
          />
        )}
        {activeStep === "date_package" && (
          <StepDatePackage
            state={state}
            dispatch={dispatch}
            selectedPackage={selectedPackage}
            packages={packages}
            timeSlotsByPackage={timeSlotsByPackage}
            config={formConfig?.date_package}
          />
        )}
        {activeStep === "extras" && (
          <StepExtras
            state={state}
            dispatch={dispatch}
            extras={extrasCatalog}
            config={formConfig?.extras}
            durationHours={durationHours}
          />
        )}
        {activeStep === "payment" && (
          <StepSummary
            state={state}
            selectedPackage={selectedPackage}
            totals={totals}
            showMinWarning={showMinWarning}
            minPeople={minPeople}
            weekend={weekend}
            extrasCatalog={extrasCatalog}
          />
        )}
        {(submitError || submitSuccess) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              submitError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {submitError ?? submitSuccess}
          </div>
        )}
        {showSummary && (
          <section className="mt-2 flex flex-col gap-2">
            {formSteps.map((step, index) => {
              const stepIndex = index + 1;
              const stepId = step.id;
              const summaryTitle = step.summary ?? step.label ?? "Paso";
              const stepValue =
                stepId === "guests"
                  ? `${state.adults} adultos, ${state.kids} niños`
                  : stepId === "date_package"
                  ? state.date
                    ? `${state.date} · ${state.timeSlot ?? "Por definir"}`
                    : "Por definir"
                  : stepId === "extras"
                  ? `${Object.values(state.extras).filter(Boolean).length} extras`
                  : "Revisar y solicitar";
              const stepComplete =
                stepId === "guests"
                  ? totalPeople >= DEFAULT_MIN_PEOPLE
                  : stepId === "date_package"
                  ? Boolean(state.date && state.packageId && state.timeSlot)
                  : true;

              const isActive = state.step === stepIndex;
              const isFuture = state.step < stepIndex;
              const canJump = stepIndex < state.step;
              if (isFuture) return null;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() =>
                    canJump &&
                    dispatch({ type: "setStep", value: stepIndex, max: totalSteps })
                  }
                  className={`glass-panel flex items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left text-xs transition-all duration-300 ${
                    isActive
                      ? "scale-100 opacity-100"
                      : "scale-[0.98] opacity-80"
                  } ${canJump ? "hover:brightness-105" : "cursor-default"}`}
                  disabled={!canJump}
                >
                  <span className="font-semibold">{summaryTitle}</span>
                  <span className="text-muted-foreground">{stepValue}</span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      stepComplete
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {stepComplete ? "OK" : "..."}
                  </span>
                </button>
              );
            })}
          </section>
        )}
      </main>

      {showPhonePrompt && (() => {
        const selectedCountry =
          DIAL_COUNTRIES.find((c) => c.dial === phoneDialCode && c.code === (
            DIAL_COUNTRIES.find((x) => x.dial === phoneDialCode)?.code
          )) ??
          DIAL_COUNTRIES.find((c) => c.dial === phoneDialCode) ??
          DIAL_COUNTRIES[0];
        const localDigits = phoneLocal.replace(/\D/g, "");
        const isLocalValid = localDigits.length >= selectedCountry.min;
        const previewNumber =
          localDigits.length > 0 ? `${phoneDialCode} ${localDigits}` : null;

        const handleSave = async () => {
          if (isSavingPhone) return;
          setPhoneError(null);
          if (!localDigits) {
            setPhoneError("Ingresa tu número de teléfono.");
            return;
          }
          if (localDigits.length < selectedCountry.min) {
            setPhoneError(
              `El número para ${selectedCountry.name} debe tener ${selectedCountry.min} dígitos.`
            );
            return;
          }
          if (localDigits.length > selectedCountry.max) {
            setPhoneError(
              `El número para ${selectedCountry.name} no puede tener más de ${selectedCountry.max} dígitos.`
            );
            return;
          }
          const fullPhone = `${phoneDialCode}${localDigits}`;
          try {
            setIsSavingPhone(true);
            const response = await fetch("/api/profile/phone", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: fullPhone }),
            });
            const result = await response.json();
            if (!response.ok) {
              throw new Error("No se pudo guardar el teléfono. Intenta de nuevo.");
            }
            setProfilePhone(result?.phone ?? fullPhone);
            setShowPhonePrompt(false);
            router.push(`/reservar/pago?method=${state.paymentMethod ?? "YAPPY"}&rid=${confirmationId ?? ""}`);
          } catch (error) {
            setPhoneError(
              error instanceof Error ? error.message : "No se pudo guardar el teléfono."
            );
          } finally {
            setIsSavingPhone(false);
          }
        };

        return (
          <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 px-0 pb-0 sm:items-center sm:px-4 sm:py-6">
            <div className="w-full max-w-md rounded-t-[2rem] border border-border/70 bg-card px-6 pb-8 pt-6 shadow-2xl sm:rounded-3xl">
              {/* Drag handle – mobile */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Número de contacto
              </p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">
                ¿Cuál es tu número?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Lo usaremos para coordinar tu llegada y confirmar la reserva por WhatsApp.
              </p>

              {/* Country selector */}
              <div className="mt-5">
                <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
                  País
                </label>
                <select
                  value={`${selectedCountry.code}|${selectedCountry.dial}`}
                  onChange={(e) => {
                    const [, dial] = e.target.value.split("|");
                    setPhoneDialCode(dial);
                    setPhoneLocal("");
                    setPhoneError(null);
                  }}
                  disabled={isSavingPhone}
                  className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {DIAL_COUNTRIES.map((c) => (
                    <option key={c.code} value={`${c.code}|${c.dial}`}>
                      {c.flag}  {c.name} ({c.dial})
                    </option>
                  ))}
                </select>
              </div>

              {/* Local number input */}
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
                  Número local ({selectedCountry.min} dígitos)
                </label>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-2xl border border-border/70 bg-background/60 px-3 py-3 text-sm font-semibold text-muted-foreground">
                    {phoneDialCode}
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneLocal}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      if (raw.length <= selectedCountry.max) {
                        setPhoneLocal(raw);
                        setPhoneError(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isLocalValid) void handleSave();
                    }}
                    placeholder={"0".repeat(selectedCountry.min)}
                    disabled={isSavingPhone}
                    maxLength={selectedCountry.max}
                    className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-foreground tracking-wider placeholder:font-normal placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Preview */}
              {previewNumber && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Número completo:{" "}
                  <span className="font-semibold text-foreground">{previewNumber}</span>
                  {isLocalValid && (
                    <span className="ml-2 text-emerald-500">✓</span>
                  )}
                </p>
              )}

              {/* Error */}
              {phoneError && (
                <p className="mt-2 text-xs text-rose-600">{phoneError}</p>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full rounded-full"
                  onClick={() => void handleSave()}
                  disabled={isSavingPhone || !isLocalValid}
                >
                  {isSavingPhone ? "Guardando..." : "Continuar al pago"}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showConfirmation && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-6">
          <div className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-border/70 bg-card shadow-2xl sm:rounded-[2rem]">
            {/* Drag handle — mobile only */}
            <div className="mx-auto mt-4 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />

            {/* Scrollable body */}
            <div className="max-h-[88vh] overflow-y-auto px-6 pb-8 pt-4 sm:max-h-[82vh] sm:pt-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-600">
                    Reserva pendiente
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    {confirmationData?.name ?? profileName ?? "Reserva pendiente"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-base font-semibold text-foreground shadow-sm transition hover:brightness-105"
                >
                  ×
                </button>
              </div>

              {/* Notices */}
              <div className="mt-4 space-y-2">
                {isRepeatConfirmation && (
                  <p className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                    Solo puedes tener una reserva activa. Si quieres reservar
                    otra fecha, contáctanos por WhatsApp.
                  </p>
                )}
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  Pago pendiente: la reserva se confirma cuando recibimos el
                  pago. Puedes pagar aquí o acordar el pago por WhatsApp.
                </p>
              </div>

              {/* Details grid */}
              <div className="mt-4 divide-y divide-border/50 rounded-2xl border border-border/60 bg-background px-4 text-sm">
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="max-w-[55%] text-right font-medium text-foreground">
                    {confirmationData?.packageLabel ??
                      selectedPackage?.label ??
                      "Por confirmar"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium text-foreground">
                    {formatStatus(confirmationData?.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium text-foreground">
                    {confirmationData?.date ?? state.date ?? "Por confirmar"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Horario</span>
                  <span className="font-medium text-foreground">
                    {confirmationRange?.start
                      ? formatTime12h(confirmationRange.start)
                      : "Por confirmar"}
                    {confirmationRange?.end
                      ? ` – ${formatTime12h(confirmationRange.end)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Personas</span>
                  <span className="font-medium text-foreground">
                    {(confirmationData?.adults ?? state.adults) +
                      (confirmationData?.kids ?? state.kids)}{" "}
                    ({confirmationData?.adults ?? state.adults} adultos
                    {(confirmationData?.kids ?? state.kids) > 0
                      ? `, ${confirmationData?.kids ?? state.kids} niños`
                      : ""}
                    )
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="shrink-0 text-muted-foreground">Extras</span>
                  <span className="text-right font-medium text-foreground">
                    {confirmationData?.extras?.length
                      ? confirmationData.extras.join(", ")
                      : Object.entries(state.extras)
                          .filter(([, selected]) => selected)
                          .map(
                            ([id]) =>
                              extrasCatalog.find((extra) => extra.id === id)
                                ?.label ?? id
                          )
                          .join(", ") || "Ninguno"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Total estimado</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(
                      confirmationData?.totalAmount ?? totals.total
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="font-semibold text-foreground">
                    Pago inicial (50%)
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(
                      confirmationData?.depositAmount ??
                        Math.round((confirmationData?.totalAmount ?? totals.total) * 0.5 * 100) / 100
                    )}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-col gap-2">
                <a
                  href={`/reservar/pago?method=${confirmationData?.paymentMethod ?? "YAPPY"}&rid=${confirmationId ?? ""}`}
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Pagar aquí
                </a>
                <div className="flex gap-2">
                  {whatsAppLink && (
                    <a
                      href={whatsAppLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-full border border-[#25D366] px-4 py-2.5 text-center text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/5"
                    >
                      WhatsApp
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelReservation}
                    className={`rounded-full text-sm font-semibold ${whatsAppLink ? "flex-1" : "w-full"}`}
                  >
                    {isCancelling ? "Cancelando..." : "Cancelar reserva"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            disabled={!isStepComplete() || isSubmitting || showConfirmation || showPhonePrompt}
          >
            <span className="flex w-full items-center justify-between">
              {isSubmitting ? "Enviando..." : primaryLabel}
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
