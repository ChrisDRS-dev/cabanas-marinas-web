export type ApprovedReviewPhoto = {
  id: string;
  public_url: string;
  sort_order: number;
  created_at: string;
};

export type ApprovedReview = {
  id: string;
  rating: number;
  comment: string;
  stay_label: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  guest_name: string | null;
  created_at: string;
  photos: ApprovedReviewPhoto[];
};

type ApprovedReviewRow = Omit<ApprovedReview, "photos"> & {
  review_photos?: ApprovedReviewPhoto[] | null;
};

export const demoApprovedReviews: ApprovedReview[] = [
  {
    id: "demo-review-1",
    rating: 5,
    comment:
      "Pasamos una tarde tranquila frente al mar. El lugar se sintió privado, limpio y con una vista que de verdad invita a bajar el ritmo.",
    stay_label: "Marzo 2026",
    is_anonymous: false,
    display_name: "María González",
    guest_name: "María González",
    created_at: "2026-03-18T10:00:00.000Z",
    photos: [],
  },
  {
    id: "demo-review-2",
    rating: 5,
    comment:
      "La experiencia del amanecer fue bellísima. Nos gustó mucho que todo se sintiera relajado y bien organizado desde que llegamos.",
    stay_label: "Febrero 2026",
    is_anonymous: false,
    display_name: "Carlos y Elena",
    guest_name: "Carlos y Elena",
    created_at: "2026-02-22T09:15:00.000Z",
    photos: [],
  },
  {
    id: "demo-review-3",
    rating: 4,
    comment:
      "Ideal para compartir con amigos y desconectarse unas horas. El entorno natural y la brisa hacen que uno quiera quedarse más tiempo.",
    stay_label: "Enero 2026",
    is_anonymous: true,
    display_name: null,
    guest_name: "Invitado",
    created_at: "2026-01-10T17:45:00.000Z",
    photos: [],
  },
  {
    id: "demo-review-4",
    rating: 5,
    comment:
      "Nos encantó la vista, el acceso al mar y la sensación de privacidad. El espacio se presta muchísimo para un plan familiar con calma.",
    stay_label: "Diciembre 2025",
    is_anonymous: false,
    display_name: "Ana Rodríguez",
    guest_name: "Ana Rodríguez",
    created_at: "2025-12-14T14:20:00.000Z",
    photos: [],
  },
  {
    id: "demo-review-5",
    rating: 4,
    comment:
      "Muy bonito para una escapada corta. El lugar transmite paz y el traslado se sintió parte de la experiencia, no solo logística.",
    stay_label: "Noviembre 2025",
    is_anonymous: false,
    display_name: "Luis Herrera",
    guest_name: "Luis Herrera",
    created_at: "2025-11-05T12:30:00.000Z",
    photos: [],
  },
];

export function mapApprovedReviews(rows: ApprovedReviewRow[]) {
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    stay_label: row.stay_label,
    is_anonymous: row.is_anonymous,
    display_name: row.display_name,
    guest_name: row.guest_name,
    created_at: row.created_at,
    photos: [...(row.review_photos ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
}

export function getReviewDisplayName(review: {
  is_anonymous: boolean;
  display_name: string | null;
  guest_name: string | null;
}) {
  if (review.is_anonymous) return "Anónimo";
  const preferred = review.display_name?.trim() || review.guest_name?.trim();
  return preferred || "Anónimo";
}

export function getReviewInitials(name: string) {
  const clean = name.trim();
  if (!clean) return "AN";
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
