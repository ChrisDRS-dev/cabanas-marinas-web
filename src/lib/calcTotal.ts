import type { Extra, Package } from "@/lib/supabase/catalog";

export type PackageType = string;

export type ReservationTotals = {
  base: number;
  extrasTotal: number;
  total: number;
};

type CalcTotalInput = {
  packageId: PackageType | null;
  adults: number;
  kids: number;
  extras: Record<string, boolean>;
  packages: Package[];
  extrasCatalog: Extra[];
  minPeopleForDate?: number;
};

export function calcTotal({
  packageId,
  adults,
  kids,
  extras,
  packages,
  extrasCatalog,
  minPeopleForDate,
}: CalcTotalInput): ReservationTotals {
  const pkg = packages.find((item) => item.id === packageId);
  if (!pkg) {
    return { base: 0, extrasTotal: 0, total: 0 };
  }

  const kidDiscount = pkg.kidDiscount ?? 0;
  const baseRaw =
    adults * pkg.pricePerAdult + kids * pkg.pricePerAdult * kidDiscount;
  const minPeople = minPeopleForDate ?? 4;
  const minBase = minPeople * pkg.pricePerAdult;
  const base = Math.max(baseRaw, minBase);
  const extrasTotal = extrasCatalog.reduce((sum, extra) => {
    const selected = extras[extra.id] ?? false;
    return sum + (selected ? extra.price : 0);
  }, 0);

  return { base, extrasTotal, total: base + extrasTotal };
}
