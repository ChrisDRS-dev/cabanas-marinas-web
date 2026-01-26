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
    label: "Ver el amanecer",
    pricePerAdult: 12,
    minPeopleWeekday: 4,
    minPeopleWeekend: 6,
    note: "Madruga en grupo para ver el amanecer.",
  },
  {
    id: "EVENTO",
    label: "Evento especial",
    pricePerAdult: 89,
    minPeopleWeekday: 6,
    minPeopleWeekend: 6,
    note: "Horario personalizado de 10 a 12 horas.",
  },
] as const;

export const TIME_SLOTS: Record<
  string,
  { id: string; label: string; period: "mañana" | "tarde" | "noche" }[]
> = {
  AMANECER: [
    { id: "06:00", label: "6:00 A.M.", period: "mañana" },
  ],
  "4H": [
    { id: "08:00", label: "8:00 A.M.", period: "mañana" },
    { id: "09:00", label: "9:00 A.M.", period: "mañana" },
    { id: "09:30", label: "9:30 A.M.", period: "mañana" },
    { id: "10:00", label: "10:00 A.M.", period: "mañana" },
    { id: "14:00", label: "2:00 P.M.", period: "tarde" },
    { id: "15:00", label: "3:00 P.M.", period: "tarde" },
    { id: "15:30", label: "3:30 P.M.", period: "tarde" },
    { id: "16:00", label: "4:00 P.M.", period: "tarde" },
  ],
  "8H": [
    { id: "08:00", label: "8:00 A.M.", period: "mañana" },
    { id: "09:00", label: "9:00 A.M.", period: "mañana" },
    { id: "09:30", label: "9:30 A.M.", period: "mañana" },
    { id: "10:00", label: "10:00 A.M.", period: "mañana" },
    { id: "14:00", label: "2:00 P.M.", period: "tarde" },
    { id: "15:00", label: "3:00 P.M.", period: "tarde" },
    { id: "15:30", label: "3:30 P.M.", period: "tarde" },
    { id: "16:00", label: "4:00 P.M.", period: "tarde" },
  ],
  EVENTO: [],
};

export const EXTRAS = [
  { id: "paddleboard", label: "Paddleboard", price: 10, unit: "por hora" },
  { id: "kayak", label: "Kayak", price: 10, unit: "por hora" },
  {
    id: "mascara_bucear",
    label: "Mascara de bucear",
    price: 10,
    unit: "por hora",
  },
  { id: "cana_pesca", label: "Cana de pesca", price: 10, unit: "por hora" },
  { id: "sofa_marino", label: "Sofa marino", price: 4, unit: "por persona" },
  {
    id: "wakeboarding",
    label: "Wakeboarding",
    price: 19,
    unit: "por persona (7 intentos)",
  },
] as const;

export const KID_DISCOUNT = 0.5;
