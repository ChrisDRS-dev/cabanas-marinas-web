"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ApprovedReview, ApprovedReviewPhoto } from "@/lib/reviews";
import {
  getReviewDisplayName,
  getReviewInstagramHandle,
} from "@/lib/reviews";
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
  onOpenPhoto: (photoId: string) => void;
};

type GalleryItem = {
  photo: ApprovedReviewPhoto;
  review: ApprovedReview;
  name: string;
  instagramHandle: string;
  date: string;
};

function formatReviewDate(value: string, locale: AppLocale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "es" ? "es-PA" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

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
  const locale = useLocale() as AppLocale;
  const name = getReviewDisplayName(review);
  const instagramHandle = getReviewInstagramHandle(review);
  const reviewDate = formatReviewDate(review.created_at, locale);
  const meta = reviewDate
    ? t("commentedOn", { date: reviewDate })
    : t("commentedRecently");
  const photos = review.photos ?? [];

  return (
    <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 shadow-[0_24px_72px_rgba(0,0,0,0.15)] transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.05] hover:-translate-y-1 hover:scale-[1.005] hover:shadow-[0_20px_50px_rgba(52,182,200,0.08)] flex flex-col justify-between h-full sm:p-6">
      <div className="flex flex-col justify-between h-full flex-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.98rem] font-semibold uppercase tracking-[0.12em] text-white/96 sm:text-base">
              {name}
            </p>
            {instagramHandle ? (
              <p className="mt-1 lowercase bg-[linear-gradient(90deg,#f4d34c_0%,#ff5d95_100%)] bg-clip-text text-[0.98rem] font-semibold text-transparent sm:text-[1rem]">
                {instagramHandle}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-white/42 sm:text-[0.95rem]">
              {meta}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#59f0e8]/14 bg-[#59f0e8]/8 px-3.5 py-2 text-xs font-semibold text-[#59f0e8] h-fit">
            <Check className="h-3.5 w-3.5" />
            {t("verifiedGuest")}
          </span>
        </div>

        <div className="mt-5 flex flex-col flex-1 gap-4 justify-between">
          <div className="space-y-4">
            <ReviewStars rating={review.rating} large />
            <blockquote className="font-display text-[1rem] italic leading-[1.65] text-white/86 sm:text-[1.1rem]">
              “{review.comment}”
            </blockquote>
          </div>

          {photos.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => onOpenPhoto(photo.id)}
                  className="group relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-all duration-300 hover:scale-105 hover:border-primary/50 cursor-pointer shadow-md"
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
        </div>
      </div>
    </article>
  );
}

function ReviewGallery({
  items,
  activeIndex,
  onClose,
  onChange,
}: {
  items: GalleryItem[];
  activeIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const t = useTranslations("reviews");
  const activeItem = items[activeIndex];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        onChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1);
      }
      if (event.key === "ArrowRight") {
        onChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, items.length, onChange, onClose]);

  if (!activeItem) return null;

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#071015]/92 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto my-4 flex max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1418]/98 shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:max-h-[calc(100vh-3rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[44vh] shrink-0 items-center justify-center bg-[#050b0e] px-4 py-16 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("galleryClose")}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white/78 transition hover:border-white/24 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() =>
                  onChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1)
                }
                aria-label={t("galleryPrev")}
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white/80 transition hover:border-white/24 hover:text-white sm:left-5"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1)
                }
                aria-label={t("galleryNext")}
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white/80 transition hover:border-white/24 hover:text-white sm:right-5"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <img
            src={activeItem.photo.public_url}
            alt={t("photoAlt", { index: activeIndex + 1, name: activeItem.name })}
            className="max-h-full max-w-full rounded-[1.5rem] object-contain"
          />
        </div>

        <div className="gallery-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain border-t border-white/8 bg-[#0d1519] lg:border-l lg:border-t-0">
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/92">
                  {activeItem.name}
                </p>
                {activeItem.instagramHandle ? (
                  <p className="mt-1 lowercase bg-[linear-gradient(90deg,#f4d34c_0%,#ff5d95_100%)] bg-clip-text text-sm font-semibold text-transparent">
                    {activeItem.instagramHandle}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-white/45">
                  {activeItem.date}
                </p>
              </div>
              <div className="space-y-3 text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#59f0e8]/14 bg-[#59f0e8]/8 px-3 py-2 text-[11px] font-semibold text-[#59f0e8]">
                  <Check className="h-3.5 w-3.5" />
                  {t("verifiedGuest")}
                </span>
                <p className="text-xs uppercase tracking-[0.16em] text-white/38">
                  {t("galleryCounter", {
                    current: activeIndex + 1,
                    total: items.length,
                  })}
                </p>
              </div>
            </div>

            <ReviewStars rating={activeItem.review.rating} />

            <blockquote className="font-display text-[1.05rem] italic leading-[1.7] text-white/84">
              “{activeItem.review.comment}”
            </blockquote>
          </div>

          <div className="border-t border-white/8 px-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              {items.map((item, index) => (
                <button
                  key={item.photo.id}
                  type="button"
                  onClick={() => onChange(index)}
                  className={cn(
                    "overflow-hidden rounded-[1rem] border transition",
                    index === activeIndex
                      ? "border-[#59f0e8]/45 ring-1 ring-[#59f0e8]/25"
                      : "border-white/10",
                  )}
                >
                  <img
                    src={item.photo.public_url}
                    alt={t("photoAlt", { index: index + 1, name: item.name })}
                    className="h-20 w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
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
        const instagramHandle = getReviewInstagramHandle(review);
        const date = formatReviewDate(review.created_at, locale);

        return (review.photos ?? []).map((photo) => ({
          photo,
          review,
          name,
          instagramHandle,
          date: date
            ? t("commentedOn", { date })
            : t("commentedRecently"),
        }));
      }),
    [locale, sortedReviews, t],
  );

  const galleryIndexByPhotoId = useMemo(
    () => new Map(galleryItems.map((item, index) => [item.photo.id, index])),
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
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-white/58 sm:text-[14px]">
              {content.subtitle}
            </p>
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
                className="inline-flex items-center gap-2 text-base font-semibold text-primary transition hover:opacity-80"
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
        <ReviewGallery
          items={galleryItems}
          activeIndex={activeGalleryIndex}
          onClose={() => setActiveGalleryIndex(null)}
          onChange={setActiveGalleryIndex}
        />
      ) : null}
    </section>
  );
}
