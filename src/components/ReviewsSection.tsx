"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import type { ApprovedReview } from "@/lib/reviews";
import { getReviewDisplayName } from "@/lib/reviews";
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
  const t = useTranslations("reviews");
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
            aria-label={t("starsAria", {
              value,
              plural: value > 1 ? "s" : "",
            })}
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
  const t = useTranslations("reviews");
  const name = getReviewDisplayName(review);
  const meta = review.stay_label
    ? t("visitedOn", { label: review.stay_label })
    : t("visitedBrand");

  return (
    <article className="flex h-full flex-col justify-between rounded-[1.75rem] border border-white/6 bg-[#10171c]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div>
        <ReviewStars rating={review.rating} />
        <blockquote className="mt-4 font-display text-[1.35rem] italic leading-[1.5] tracking-[-0.02em] text-white/74 sm:text-[1.55rem]">
          “{review.comment}”
        </blockquote>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-white/92">
          {name}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
          {meta}
        </p>
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
  const t = useTranslations("reviews");
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
          payload?.error ?? t("submitError"),
        );
      }

      setSuccess(
        payload?.message ?? t("submitSuccess"),
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
          : t("submitError"),
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
                  {t("guestComment")}
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
                  aria-label={t("closeForm")}
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
                  {t("rating")}
                </label>
                <ReviewStars rating={rating} interactive onChange={setRating} />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="review-comment"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                >
                  {t("comment")}
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  placeholder={t("commentPlaceholder")}
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
                  <p className="text-sm font-semibold">{t("showMyName")}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {t("showMyNameDescription")}
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
                  <p className="text-sm font-semibold">{t("anonymous")}</p>
                  <p className="mt-1 text-xs text-white/48">
                    {t("anonymousDescription")}
                  </p>
                </button>
              </div>

              {!isAnonymous ? (
                <div className="space-y-2">
                  <label
                    htmlFor="review-display-name"
                    className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                  >
                    {t("publicName")}
                  </label>
                  <input
                    id="review-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={t("publicNamePlaceholder")}
                    className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="review-stay-label"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                >
                  {t("stayReference")}
                </label>
                <input
                  id="review-stay-label"
                  value={stayLabel}
                  onChange={(event) => setStayLabel(event.target.value)}
                  placeholder={t("stayReferencePlaceholder")}
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
                  {t("consent")}
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
                    {t("closeForm")}
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-[#59f0e8] px-6 py-3 text-sm font-semibold text-[#031215] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t("submitting") : t("submit")}
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
  const t = useTranslations("reviews");
  const { session, openAuth } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [reviews],
  );

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

  const pageCount = Math.max(1, sortedReviews.length - visibleCount + 1);
  const safeActiveIndex = Math.min(activeIndex, pageCount - 1);

  const visibleReviews = useMemo(
    () =>
      sortedReviews.slice(safeActiveIndex, safeActiveIndex + visibleCount),
    [safeActiveIndex, sortedReviews, visibleCount],
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
    <section id="resenas" className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,27,30,0.96),rgba(12,20,23,0.98))] px-5 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-7 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,182,200,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.08),transparent_34%)]" />
        <div className="absolute left-1/2 top-8 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-white/[0.03]" />
        <div className="absolute left-1/2 top-20 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full border border-white/[0.025]" />

        <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] uppercase tracking-[0.38em] text-primary/90">
            {content.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-4xl italic tracking-[-0.04em] text-white/92 sm:text-5xl lg:text-[4.4rem]">
            {content.title}
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-border" />
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/56 sm:text-[15px]">
            {content.subtitle}
          </p>
          <button
            type="button"
            onClick={handleOpenReviewForm}
            className="mt-6 rounded-full border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
          >
            {content.ctaLabel}
          </button>
        </div>

        <div className="mt-10">
          {sortedReviews.length ? (
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
                <div className="mt-7 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={showPrevious}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    aria-label={t("prevAria")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: pageCount }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full transition",
                          index === safeActiveIndex ? "bg-primary" : "bg-border",
                        )}
                        aria-label={t("pageAria", {
                          page: index + 1,
                        })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={showNext}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    aria-label={t("nextAria")}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-white/8 bg-[#10171c]/90 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <p className="font-display text-[2rem] italic text-white/86">
                {content.emptyTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/54">
                {content.emptyDescription}
              </p>
            </div>
          )}
        </div>
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
