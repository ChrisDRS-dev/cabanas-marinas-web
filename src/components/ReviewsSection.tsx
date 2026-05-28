"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ApprovedReview } from "@/lib/reviews";
import {
  getReviewDisplayName,
  getReviewInstagramHandle,
} from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { type AppLocale, localizeHref } from "@/i18n/routing";
import ImageLightbox from "@/components/ui/ImageLightbox";

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
  onOpenPhoto: (photoId: string) => void;
};

function ReviewStars({ rating, large = false }: { rating: number; large?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;

        return (
          <Star
            key={value}
            className={cn(
              large ? "h-5 w-5" : "h-4 w-4",
              filled ? "fill-[#59f0e8] text-[#59f0e8]" : "text-white/14",
            )}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({ review, onOpenPhoto }: ReviewCardProps) {
  const t = useTranslations("reviews");
  const name = getReviewDisplayName(review);
  const instagramHandle = getReviewInstagramHandle(review);
  const photos = review.photos ?? [];

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 shadow-[0_24px_72px_rgba(0,0,0,0.15)] transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.05] hover:-translate-y-1 hover:scale-[1.005] hover:shadow-[0_20px_50px_rgba(52,182,200,0.08)] flex flex-col justify-between h-full sm:p-7">
      <div className="flex flex-col justify-between h-full flex-1 gap-5">
        {/* Main Content: Stars + Comment at the top (Prominent) */}
        <div className="space-y-3.5">
          <ReviewStars rating={review.rating} large />
          <blockquote className="font-display text-[1.25rem] italic leading-[1.6] text-white/95 sm:text-[1.45rem] font-medium">
            “{review.comment}”
          </blockquote>
        </div>

        {/* Bottom Section: Photos + Attribution details */}
        <div className="space-y-4">
          {photos.length ? (
            <div className="flex flex-wrap gap-2.5">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onOpenPhoto(photo.id)}
                  className="group relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-all duration-300 hover:scale-105 hover:border-primary/50 cursor-pointer shadow-md"
                >
                  <img
                    src={photo.public_url}
                    alt={t("photoAlt", { index: index + 1, name })}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="border-t border-white/5 pt-3">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-white/40">
              {name}
            </p>
            {instagramHandle ? (
              <p className="mt-0.5 text-[0.65rem] font-normal text-white/30 lowercase">
                {instagramHandle}
              </p>
            ) : null}
          </div>
        </div>
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(
    null,
  );

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [reviews],
  );

  const visibleReviews = showAllReviews
    ? sortedReviews
    : sortedReviews.slice(0, 2);

  const galleryItems = useMemo(
    () =>
      sortedReviews.flatMap((review) => {
        const name = getReviewDisplayName(review);
        return (review.photos ?? []).map((photo) => ({
          id: photo.id,
          image: photo.public_url,
          subtitle: name,
          description: review.comment,
        }));
      }),
    [sortedReviews],
  );

  const galleryIndexByPhotoId = useMemo(
    () => new Map(galleryItems.map((item, index) => [item.id, index])),
    [galleryItems],
  );

  function openPhoto(photoId: string) {
    const index = galleryIndexByPhotoId.get(photoId);
    if (typeof index === "number") {
      setActiveGalleryIndex(index);
    }
  }

  return (
    <section id="resenas" className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,24,28,0.98),rgba(9,16,20,0.98))] px-4 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-6 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,182,200,0.1),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.07),transparent_32%)]" />
        <div className="absolute left-1/2 top-4 h-[16rem] w-[16rem] -translate-x-1/2 rounded-full border border-white/[0.025]" />
        <div className="absolute left-1/2 top-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full border border-white/[0.015]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary/90 sm:text-[11px]">
              {content.eyebrow}
            </p>
            <div className="mx-auto mt-2 h-px w-20 bg-white/10" />
            <h2 className="mt-3 font-display text-[2.25rem] italic tracking-[-0.04em] text-white/94 sm:text-[3rem]">
              {content.title}
            </h2>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 items-stretch">
            {sortedReviews.length ? (
              visibleReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onOpenPhoto={openPhoto}
                />
              ))
            ) : (
              <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-white/8 bg-[#10171c]/90 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:col-span-2">
                <p className="font-display text-[2rem] italic text-white/86">
                  {content.emptyTitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/54">
                  {content.emptyDescription}
                </p>
              </div>
            )}
          </div>

          {sortedReviews.length > 2 ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowAllReviews((current) => !current)}
                className="inline-flex items-center gap-2 text-base font-semibold text-primary transition hover:opacity-80 animate-fade-in"
              >
                {showAllReviews
                  ? t("showLessReviews")
                  : t("viewAllReviews")}
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showAllReviews ? "rotate-90" : "",
                  )}
                />
              </button>
            </div>
          ) : null}

          <div className="pt-5 text-center">
            <Link
              href={localizeHref(locale, "/review")}
              className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-base font-semibold text-primary transition hover:bg-primary/15"
            >
              {content.ctaLabel}
            </Link>
          </div>
        </div>
      </div>

      {activeGalleryIndex !== null && galleryItems.length ? (
        <ImageLightbox
          items={galleryItems}
          activeIndex={activeGalleryIndex}
          onClose={() => setActiveGalleryIndex(null)}
          onChange={setActiveGalleryIndex}
        />
      ) : null}
    </section>
  );
}
