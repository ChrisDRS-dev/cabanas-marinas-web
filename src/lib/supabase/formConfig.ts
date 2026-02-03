import { supabase } from "@/lib/supabase/client";

export type FormStepConfig = {
  id: "guests" | "date_package" | "extras" | "payment";
  label?: string;
  summary?: string;
  enabled?: boolean;
};

export type FormConfig = {
  steps?: FormStepConfig[];
  show_summary?: boolean;
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
