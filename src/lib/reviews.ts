export type ApprovedReview = {
  id: string;
  rating: number;
  comment: string;
  stay_label: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  guest_name: string | null;
  created_at: string;
};

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
