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
              filled
                ? "fill-primary text-primary"
                : "text-foreground/12 dark:text-white/14",
            )}
          />
        );
      })}
    </div>
  );
}

function ReviewPhotoMosaic({
  photos,
  name,
  onOpenPhoto,
  photoAlt,
}: {
  photos: ApprovedReviewPhoto[];
  name: string;
  onOpenPhoto: (photoId: string) => void;
  photoAlt: (index: number, name: string) => string;
}) {
  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 3);

  if (!primaryPhoto) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onOpenPhoto(primaryPhoto.id)}
        className="group block w-full overflow-hidden rounded-[1.85rem] border border-border/70 bg-muted/40 dark:border-white/10 dark:bg-[#0b1418]"
      >
        <img
          src={primaryPhoto.public_url}
          alt={photoAlt(1, name)}
          className="h-60 w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-72"
          loading="lazy"
        />
      </button>

      {secondaryPhotos.length ? (
        <div
          className={cn(
            "grid gap-3",
            secondaryPhotos.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {secondaryPhotos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onOpenPhoto(photo.id)}
              className="group block overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/40 dark:border-white/10 dark:bg-[#0b1418]"
            >
              <img
                src={photo.public_url}
                alt={photoAlt(index + 2, name)}
                className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.02] sm:h-36"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
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
    <article className="rounded-[2rem] border border-border/70 bg-white/76 p-5 shadow-[0_18px_48px_rgba(15,31,36,0.10)] backdrop-blur-sm dark:border-white/8 dark:bg-[#0d1519]/95 dark:shadow-[0_24px_72px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.98rem] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-base dark:text-white/96">
            {name}
          </p>
          {instagramHandle ? (
            <p className="mt-1 lowercase bg-[linear-gradient(90deg,#f4d34c_0%,#ff5d95_100%)] bg-clip-text text-[0.98rem] font-semibold text-transparent sm:text-[1rem]">
              {instagramHandle}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground sm:text-[0.95rem] dark:text-white/42">
            {meta}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-2 text-xs font-semibold text-primary dark:border-[#59f0e8]/14 dark:bg-[#59f0e8]/8 dark:text-[#59f0e8]">
          <Check className="h-3.5 w-3.5" />
          {t("verifiedGuest")}
        </span>
      </div>

      <div
        className={cn(
          "mt-5 grid gap-5",
          photos.length ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]" : "",
        )}
      >
        <div className="space-y-6">
          <ReviewStars rating={review.rating} large />
          <blockquote className="font-display text-[1rem] italic leading-[1.72] tracking-[-0.015em] text-foreground/84 dark:text-white/86 sm:text-[1.18rem]">
            “{review.comment}”
          </blockquote>
        </div>

        {photos.length ? (
          <ReviewPhotoMosaic
            photos={photos}
            name={name}
            onOpenPhoto={onOpenPhoto}
            photoAlt={(index, reviewName) =>
              t("photoAlt", { index, name: reviewName })
            }
          />
        ) : null}
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
      className="fixed inset-0 z-[80] overflow-y-auto bg-[rgba(248,245,239,0.82)] p-4 backdrop-blur-md dark:bg-[#071015]/92 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[calc(100vh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,242,236,0.94))] shadow-[0_30px_120px_rgba(15,31,36,0.18)] dark:border-white/10 dark:bg-[#0b1418]/98 dark:shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex min-h-[48vh] shrink-0 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(0,133,161,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(243,245,246,0.95))] px-4 py-16 dark:bg-[#050b0e] sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("galleryClose")}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/85 text-foreground/72 shadow-sm transition hover:border-primary/35 hover:text-primary dark:border-white/12 dark:bg-black/30 dark:text-white/78 dark:hover:border-white/24 dark:hover:text-white"
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
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/82 text-foreground/72 shadow-sm transition hover:border-primary/35 hover:text-primary dark:border-white/12 dark:bg-black/30 dark:text-white/80 dark:hover:border-white/24 dark:hover:text-white sm:left-5"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1)
                }
                aria-label={t("galleryNext")}
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/82 text-foreground/72 shadow-sm transition hover:border-primary/35 hover:text-primary dark:border-white/12 dark:bg-black/30 dark:text-white/80 dark:hover:border-white/24 dark:hover:text-white sm:right-5"
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

        <div className="gallery-scroll flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border/70 bg-card/72 dark:border-white/8 dark:bg-[#0d1519] lg:border-l lg:border-t-0">
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/92 dark:text-white/92">
                  {activeItem.name}
                </p>
                {activeItem.instagramHandle ? (
                  <p className="mt-1 lowercase bg-[linear-gradient(90deg,#f4d34c_0%,#ff5d95_100%)] bg-clip-text text-sm font-semibold text-transparent">
                    {activeItem.instagramHandle}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground dark:text-white/45">
                  {activeItem.date}
                </p>
              </div>
              <div className="space-y-3 text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-2 text-[11px] font-semibold text-primary dark:border-[#59f0e8]/14 dark:bg-[#59f0e8]/8 dark:text-[#59f0e8]">
                  <Check className="h-3.5 w-3.5" />
                  {t("verifiedGuest")}
                </span>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80 dark:text-white/38">
                  {t("galleryCounter", {
                    current: activeIndex + 1,
                    total: items.length,
                  })}
                </p>
              </div>
            </div>

            <ReviewStars rating={activeItem.review.rating} />

            <blockquote className="font-display text-[1.05rem] italic leading-[1.7] text-foreground/84 dark:text-white/84">
              “{activeItem.review.comment}”
            </blockquote>
          </div>

          <div className="border-t border-border/70 px-4 py-4 dark:border-white/8">
            <div className="grid grid-cols-3 gap-3">
              {items.map((item, index) => (
                <button
                  key={item.photo.id}
                  type="button"
                  onClick={() => onChange(index)}
                  className={cn(
                    "overflow-hidden rounded-[1rem] border transition",
                    index === activeIndex
                      ? "border-primary/45 ring-1 ring-primary/25 dark:border-[#59f0e8]/45 dark:ring-[#59f0e8]/25"
                      : "border-border/70 dark:border-white/10",
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
      <div className="relative overflow-hidden rounded-[2.25rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,242,236,0.92))] px-4 py-5 shadow-[0_24px_80px_rgba(15,31,36,0.10)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(13,24,28,0.98),rgba(9,16,20,0.98))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-6 sm:py-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,133,161,0.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.10),transparent_32%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_36%)] dark:bg-[radial-gradient(circle_at_top,rgba(52,182,200,0.1),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,179,71,0.07),transparent_32%)]" />
        <div className="absolute left-1/2 top-4 h-[16rem] w-[16rem] -translate-x-1/2 rounded-full border border-border/35 dark:border-white/[0.025]" />
        <div className="absolute left-1/2 top-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full border border-border/20 dark:border-white/[0.015]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary/90 sm:text-[11px]">
              {content.eyebrow}
            </p>
            <div className="mx-auto mt-2 h-px w-20 bg-border/80 dark:bg-white/10" />
            <h2 className="mt-3 font-display text-[2.25rem] italic tracking-[-0.04em] text-foreground/92 dark:text-white/94 sm:text-[3rem]">
              {content.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-muted-foreground dark:text-white/58 sm:text-[14px]">
              {content.subtitle}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {sortedReviews.length ? (
              <>
                {visibleReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onOpenPhoto={openPhoto}
                  />
                ))}

                {sortedReviews.length > 2 ? (
                  <div className="pt-1 text-center">
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
              </>
            ) : (
              <div className="mx-auto max-w-2xl rounded-[1.8rem] border border-border/70 bg-card/78 px-6 py-8 text-center shadow-[0_20px_60px_rgba(15,31,36,0.10)] dark:border-white/8 dark:bg-[#10171c]/90 dark:shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                <p className="font-display text-[2rem] italic text-foreground/86 dark:text-white/86">
                  {content.emptyTitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground dark:text-white/54">
                  {content.emptyDescription}
                </p>
              </div>
            )}
          </div>

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
