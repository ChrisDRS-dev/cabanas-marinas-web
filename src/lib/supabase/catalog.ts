import { supabase } from "@/lib/supabase/client";

const PERIODS = ["mañana", "tarde", "noche"] as const;

export type Package = {
  id: string;
  label: string;
  note?: string | null;
  durationMinutes: number;
  pricePerAdult: number;
  kidDiscount: number;
  minPeopleWeekday: number;
  minPeopleWeekend: number;
  minPeopleHoliday: number;
};

export type TimeSlot = {
  id: string;
  label: string;
  period: (typeof PERIODS)[number];
  timeOfDay: string;
  packageId: string;
};

export type Extra = {
  id: string;
  label: string;
  description?: string | null;
  price: number;
  pricingUnit: "PER_HOUR" | "PER_PERSON" | "PER_RESERVATION";
};

type Catalog = {
  packages: Package[];
  timeSlotsByPackage: Record<string, TimeSlot[]>;
  extras: Extra[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeTime(value: string | null) {
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function toMinutes(value: string) {
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
}

function toPeriod(value: string | null): TimeSlot["period"] {
  if (value && PERIODS.includes(value as TimeSlot["period"])) {
    return value as TimeSlot["period"];
  }
  return "mañana";
}

export async function fetchCatalog(): Promise<Catalog> {
  const [packagesRes, timeSlotsRes, extrasRes] = await Promise.all([
    supabase
      .from("packages")
      .select(
        "id,label,note,duration_minutes,base_price_per_adult,kid_discount,min_people_weekday,min_people_weekend,min_people_holiday,is_active"
      )
      .eq("is_active", true)
      .order("duration_minutes", { ascending: true }),
    supabase
      .from("package_time_slots")
      .select("package_id,time_of_day,label,period,is_active")
      .eq("is_active", true),
    supabase
      .from("extras")
      .select("id,label,description,price,pricing_unit,is_active")
      .eq("is_active", true)
      .order("price", { ascending: true }),
  ]);

  if (packagesRes.error) throw packagesRes.error;
  if (timeSlotsRes.error) throw timeSlotsRes.error;
  if (extrasRes.error) throw extrasRes.error;

  const packages = (packagesRes.data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    note: row.note,
    durationMinutes: toNumber(row.duration_minutes),
    pricePerAdult: toNumber(row.base_price_per_adult),
    kidDiscount: toNumber(row.kid_discount),
    minPeopleWeekday: toNumber(row.min_people_weekday),
    minPeopleWeekend: toNumber(row.min_people_weekend),
    minPeopleHoliday: toNumber(row.min_people_holiday),
  }));

  const timeSlots = (timeSlotsRes.data ?? []).map((row) => {
    const timeOfDay = normalizeTime(row.time_of_day);
    return {
      id: timeOfDay,
      label: row.label,
      period: toPeriod(row.period),
      timeOfDay,
      packageId: row.package_id,
    };
  });

  const timeSlotsByPackage = timeSlots.reduce<Record<string, TimeSlot[]>>(
    (acc, slot) => {
      const list = acc[slot.packageId] ?? [];
      list.push(slot);
      acc[slot.packageId] = list;
      return acc;
    },
    {}
  );

  Object.values(timeSlotsByPackage).forEach((list) => {
    list.sort((a, b) => toMinutes(a.timeOfDay) - toMinutes(b.timeOfDay));
  });

  const extras = (extrasRes.data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    price: toNumber(row.price),
    pricingUnit: row.pricing_unit,
  }));

  return { packages, timeSlotsByPackage, extras };
}
