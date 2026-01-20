export const PACKAGES = [
  {
    id: "4H",
    label: "4 horas",
    pricePerAdult: 12,
    minPeopleWeekday: 4,
    minPeopleWeekend: 6,
    note: "Ideal para escapadas cortas.",
  },
  {
    id: "8H",
    label: "8 horas",
    pricePerAdult: 24,
    minPeopleWeekday: 4,
    minPeopleWeekend: 6,
    note: "Día completo frente al mar.",
  },
  {
    id: "AMANECER",
    label: "Amanecer (6-9am)",
    pricePerAdult: 12,
    minPeopleWeekday: 4,
    minPeopleWeekend: 6,
    note: "Luz dorada y mar en calma.",
  },
] as const;

export const TIME_SLOTS: Record<
  string,
  { id: string; label: string; period: "mañana" | "tarde" | "noche" }[]
> = {
  AMANECER: [
    { id: "06:00-09:00", label: "6:00 A.M. - 9:00 A.M.", period: "mañana" },
  ],
  "4H": [
    { id: "08:00-12:00", label: "8:00 A.M. - 12:00 P.M.", period: "mañana" },
    { id: "13:00-16:00", label: "1:00 P.M. - 4:00 P.M.", period: "tarde" },
    { id: "17:00-20:00", label: "5:00 P.M. - 8:00 P.M.", period: "noche" },
  ],
  "8H": [
    { id: "08:00-16:00", label: "8:00 A.M. - 4:00 P.M.", period: "mañana" },
    { id: "12:00-20:00", label: "12:00 P.M. - 8:00 P.M.", period: "tarde" },
    { id: "14:00-22:00", label: "2:00 P.M. - 10:00 P.M.", period: "noche" },
  ],
};

export const EXTRAS = [
  { id: "paddleboard", label: "Paddleboard", price: 10 },
  { id: "kayak_doble", label: "Kayak doble", price: 15 },
  { id: "sofa_marino", label: "Sofa marino", price: 8 },
] as const;

export const KID_DISCOUNT = 0.5;
