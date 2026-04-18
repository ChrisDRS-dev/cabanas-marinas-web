"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ApprovedReview } from "@/lib/reviews";
import { getReviewDisplayName, getReviewInitials } from "@/lib/reviews";
import { cn } from "@/lib/utils";

type ReviewsSectionContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  modalTitle: string;
  modalDescription: string;
  emptyTitle: string;
  emptyDescription: string;
};

type ReviewsSectionProps = {
  reviews: ApprovedReview[];
  content: ReviewsSectionContent;
};

type ReviewCardProps = {
  review: ApprovedReview;
};

function ReviewStars({ rating, interactive = false, onChange }: { rating: number; interactive?: boolean; onChange?: (value: number) => void; }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;
        if (!interactive) {
          return (
            <Star
              key={value}
              className={cn(
                "h-4 w-4",
                filled ? "fill-[#59f0e8] text-[#59f0e8]" : "text-white/14",
              )}
            />
          );
        }

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange?.(value)}
            className="transition hover:scale-105"
            aria-label={`${value} estrella${value > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "h-6 w-6",
                filled ? "fill-[#59f0e8] text-[#59f0e8]" : "text-white/20",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewCard({ review }: ReviewCardProps) {
  const name = getReviewDisplayName(review);
  const initials = getReviewInitials(name);
  const meta = review.stay_label ? `Huésped en ${review.stay_label}` : "Huésped de Cabañas Marinas";

  return (
    <article className="flex h-full flex-col justify-between rounded-[2rem] border border-white/6 bg-[#10171c]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div>
        <ReviewStars rating={review.rating} />
        <blockquote className="mt-6 font-display text-2xl italic leading-[1.45] tracking-[-0.02em] text-white/74 sm:text-[2rem]">
          “{review.comment}”
        </blockquote>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/6 text-lg font-semibold text-[#59f0e8]">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/92">
            {name}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
            {meta}
          </p>
        </div>
      </div>
    </article>
  );
}

function ReviewFormDialog({
  open,
  onOpenChange,
  content,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  content: ReviewsSectionContent;
}) {
  const { session } = useAuth();
  const suggestedName =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email?.split("@")[0] ??
    "";

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [stayLabel, setStayLabel] = useState("");
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!displayName && suggestedName) {
      setDisplayName(suggestedName);
    }
  }, [displayName, suggestedName]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          isAnonymous,
          displayName,
          stayLabel,
          consentToPublish,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No pudimos enviar tu reseña. Inténtalo de nuevo.",
        );
      }

      setSuccess(
        payload?.message ??
          "Gracias. Tu reseña quedó enviada y pasará por revisión.",
      );
      setRating(0);
      setComment("");
      setIsAnonymous(false);
      setDisplayName(suggestedName);
      setStayLabel("");
      setConsentToPublish(false);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "No pudimos enviar tu reseña. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#02090c]/70 backdrop-blur-md" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-white/10 bg-[#091317]/96 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(89,240,232,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,180,120,0.08),transparent_36%)]" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#59f0e8]/80">
                  Comentario del huésped
                </p>
                <Dialog.Title className="font-display text-3xl italic tracking-[-0.03em] text-white/92 sm:text-[3.2rem]">
                  {content.modalTitle}
                </Dialog.Title>
                <Dialog.Description className="max-w-xl text-sm leading-6 text-white/58">
                  {content.modalDescription}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar formulario"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
                  Calificación
                </label>
                <ReviewStars rating={rating} interactive onChange={setRating} />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="review-comment"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                >
                  Comentario
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  placeholder="¿Qué fue lo que más disfrutaste de tu visita?"
                  className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(false)}
                  className={cn(
                    "rounded-[1.4rem] border px-4 py-3 text-left transition",
                    !isAnonymous
                      ? "border-[#59f0e8]/45 bg-[#59f0e8]/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]",
                  )}
                >
                  <p className="text-sm font-semibold">Mostrar mi nombre</p>
                  <p className="mt-1 text-xs text-white/48">
                    Se mostrará el nombre público que escribas abajo.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(true)}
                  className={cn(
                    "rounded-[1.4rem] border px-4 py-3 text-left transition",
                    isAnonymous
                      ? "border-[#59f0e8]/45 bg-[#59f0e8]/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]",
                  )}
                >
                  <p className="text-sm font-semibold">Aparecer como anónimo</p>
                  <p className="mt-1 text-xs text-white/48">
                    Publicaremos la reseña sin mostrar tu identidad.
                  </p>
                </button>
              </div>

              {!isAnonymous ? (
                <div className="space-y-2">
                  <label
                    htmlFor="review-display-name"
                    className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                  >
                    Nombre público
                  </label>
                  <input
                    id="review-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Ej. Ana Rodríguez"
                    className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="review-stay-label"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                >
                  Referencia de visita
                </label>
                <input
                  id="review-stay-label"
                  value={stayLabel}
                  onChange={(event) => setStayLabel(event.target.value)}
                  placeholder="Ej. Agosto 2024"
                  className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
                />
              </div>

              <label className="flex items-start gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
                <input
                  type="checkbox"
                  checked={consentToPublish}
                  onChange={(event) => setConsentToPublish(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <span>
                  Autorizo a Cabañas Marinas a publicar esta reseña en el sitio
                  una vez sea aprobada.
                </span>
              </label>

              {error ? (
                <div className="rounded-[1.2rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white/76 transition hover:bg-white/6 hover:text-white"
                  >
                    Cerrar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-[#59f0e8] px-6 py-3 text-sm font-semibold text-[#031215] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Enviando..." : "Enviar reseña"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ReviewsSection({
  reviews,
  content,
}: ReviewsSectionProps) {
  const { session, openAuth } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth >= 1100) {
        setVisibleCount(3);
        return;
      }
      if (window.innerWidth >= 700) {
        setVisibleCount(2);
        return;
      }
      setVisibleCount(1);
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount, { passive: true });
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const pageCount = Math.max(1, reviews.length - visibleCount + 1);
  const safeActiveIndex = Math.min(activeIndex, pageCount - 1);

  const visibleReviews = useMemo(
    () => reviews.slice(safeActiveIndex, safeActiveIndex + visibleCount),
    [reviews, safeActiveIndex, visibleCount],
  );

  function handleOpenReviewForm() {
    if (!session) {
      openAuth();
      return;
    }
    setDialogOpen(true);
  }

  function showPrevious() {
    setActiveIndex((current) => {
      const nextCurrent = Math.min(current, pageCount - 1);
      return nextCurrent === 0 ? pageCount - 1 : nextCurrent - 1;
    });
  }

  function showNext() {
    setActiveIndex((current) => {
      const nextCurrent = Math.min(current, pageCount - 1);
      return nextCurrent === pageCount - 1 ? 0 : nextCurrent + 1;
    });
  }

  return (
    <section
      id="resenas"
      className="relative overflow-hidden bg-[#071114] px-6 py-20 text-white sm:py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,39,44,0.9),transparent_56%)]" />
      <div className="absolute left-1/2 top-8 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-white/[0.03]" />
      <div className="absolute left-1/2 top-24 h-[56rem] w-[56rem] -translate-x-1/2 rounded-full border border-white/[0.025]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#59f0e8]/88">
            {content.eyebrow}
          </p>
          <h2 className="mt-6 font-display text-5xl italic tracking-[-0.04em] text-white/92 sm:text-6xl lg:text-[5.2rem]">
            {content.title}
          </h2>
          <div className="mx-auto mt-6 h-px w-28 bg-white/12" />
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/56 sm:text-base">
            {content.subtitle}
          </p>
          <button
            type="button"
            onClick={handleOpenReviewForm}
            className="mt-8 rounded-full border border-[#59f0e8]/28 bg-[#59f0e8]/10 px-6 py-3 text-sm font-semibold text-[#59f0e8] transition hover:bg-[#59f0e8]/14"
          >
            {content.ctaLabel}
          </button>
        </div>

        <div className="mt-14">
          {reviews.length ? (
            <>
              <div
                className={cn(
                  "grid gap-5",
                  visibleCount === 1
                    ? "grid-cols-1"
                    : visibleCount === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
                )}
              >
                {visibleReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {pageCount > 1 ? (
                <div className="mt-10 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    onClick={showPrevious}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Ver reseñas anteriores"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: pageCount }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full transition",
                          index === safeActiveIndex ? "bg-[#59f0e8]" : "bg-white/12",
                        )}
                        aria-label={`Ir a la página ${index + 1} de reseñas`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={showNext}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Ver siguientes reseñas"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/8 bg-[#10171c]/90 px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <p className="font-display text-3xl italic text-white/86">
                {content.emptyTitle}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/54">
                {content.emptyDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      <ReviewFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        content={content}
      />
    </section>
  );
}
