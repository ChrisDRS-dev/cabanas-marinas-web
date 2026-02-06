import { supabase } from "@/lib/supabase/client";

export type FormStepConfig = {
  id: "guests" | "date_package" | "extras" | "payment";
  label?: string;
  summary?: string;
  enabled?: boolean;
};

export type PaymentMethodConfig = {
  id: "YAPPY" | "PAYPAL" | "CARD" | "CASH";
  label?: string;
  description?: string;
  enabled?: boolean;
};

export type GuestsStepConfig = {
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

export type PaymentStepConfig = {
  title?: string;
  subtitle?: string;
  methods?: PaymentMethodConfig[];
};

export type DatePackageStepConfig = {
  title?: string;
  packagesTitle?: string;
  packagesEmpty?: string;
  selectedLabel?: string;
  calendarTitle?: string;
  calendarEmpty?: string;
  calendarSelectedPrefix?: string;
  calendarHint?: string;
  changeTimeLabel?: string;
  modalKicker?: string;
  modalTitle?: string;
  modalSubtitle?: string;
  morningLabel?: string;
  afternoonLabel?: string;
  noMorningLabel?: string;
  noAfternoonLabel?: string;
  modalCancelLabel?: string;
  modalConfirmLabel?: string;
  customHelp?: string;
  customStartLabel?: string;
  customEndLabel?: string;
  customError?: string;
};

export type ExtrasStepConfig = {
  title?: string;
  subtitle?: string;
  emptyLabel?: string;
  addLabel?: string;
  addedLabel?: string;
};

export type FormConfig = {
  steps?: FormStepConfig[];
  show_summary?: boolean;
  guests?: GuestsStepConfig;
  payment?: PaymentStepConfig;
  date_package?: DatePackageStepConfig;
  extras?: ExtrasStepConfig;
};

export async function fetchFormConfig(): Promise<FormConfig | null> {
  const { data, error } = await supabase
    .from("form_config")
    .select("schema")
    .eq("key", "public_wizard")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.schema) return null;
  return data.schema as FormConfig;
}
