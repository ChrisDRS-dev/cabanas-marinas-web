"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ApprovedReview } from "@/lib/reviews";
import { getReviewDisplayName } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { type AppLocale, localizeHref } from "@/i18n/routing";

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

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;

        return (
          <Star
            key={value}
            className={cn(
              "h-4 w-4",
              filled ? "fill-[#59f0e8] text-[#59f0e8]" : "text-white/14",
            )}
          />
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
  const photos = review.photos ?? [];

  return (
    <article className="flex h-full flex-col justify-between rounded-[1.75rem] border border-white/6 bg-[#10171c]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div>
        <ReviewStars rating={review.rating} />
        <blockquote className="mt-4 font-display text-[1.35rem] italic leading-[1.5] tracking-[-0.02em] text-white/74 sm:text-[1.55rem]">
          “{review.comment}”
        </blockquote>
        {photos.length ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <img
                key={photo.id}
                src={photo.public_url}
                alt={t("photoAlt", { index: index + 1, name })}
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-[0_16px_30px_rgba(0,0,0,0.18)]"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
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

export default function ReviewsSection({
  reviews,
  content,
}: ReviewsSectionProps) {
  const t = useTranslations("reviews");
  const locale = useLocale() as AppLocale;
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
            <Link
              href={localizeHref(locale, "/review")}
              className="mt-6 inline-flex rounded-full border border-primary/25 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
            >
              {content.ctaLabel}
            </Link>
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
    </section>
  );
}
