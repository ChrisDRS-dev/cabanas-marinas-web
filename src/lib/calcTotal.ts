import { EXTRAS, KID_DISCOUNT, PACKAGES } from "@/lib/bookingData";

export type PackageType = (typeof PACKAGES)[number]["id"];

export type ReservationTotals = {
  base: number;
  extrasTotal: number;
  total: number;
};

export function calcTotal(
  packageId: PackageType | null,
  adults: number,
  kids: number,
  extras: Record<string, boolean>
): ReservationTotals {
  const pkg = PACKAGES.find((item) => item.id === packageId);
  if (!pkg) {
    return { base: 0, extrasTotal: 0, total: 0 };
  }

  const baseRaw =
    adults * pkg.pricePerAdult +
    kids * pkg.pricePerAdult * KID_DISCOUNT;
  const minBase = 4 * pkg.pricePerAdult;
  const base = Math.max(baseRaw, minBase);
  const extrasTotal = EXTRAS.reduce((sum, extra) => {
    const selected = extras[extra.id] ?? false;
    return sum + (selected ? extra.price : 0);
  }, 0);

  return { base, extrasTotal, total: base + extrasTotal };
}
