"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

function ReviewStars({
  rating,
  interactive = false,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  const t = useTranslations("reviews");

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;

        return interactive ? (
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
            <StarIcon filled={filled} interactive />
          </button>
        ) : (
          <StarIcon key={value} filled={filled} />
        );
      })}
    </div>
  );
}

function StarIcon({
  filled,
  interactive = false,
}: {
  filled: boolean;
  interactive?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        interactive ? "h-6 w-6" : "h-4 w-4",
        filled ? "text-[#59f0e8]" : interactive ? "text-white/20" : "text-white/14",
      )}
    >
      <path d="m12 3.6 2.57 5.2 5.74.84-4.16 4.06.98 5.72L12 16.74l-5.13 2.68.98-5.72L3.69 9.64l5.74-.84L12 3.6Z" />
    </svg>
  );
}

type ReviewSubmissionFormProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export default function ReviewSubmissionForm({
  title,
  description,
  eyebrow,
}: ReviewSubmissionFormProps) {
  const t = useTranslations("reviews");
  const { session, openAuth } = useAuth();
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
        throw new Error(payload?.error ?? t("submitError"));
      }

      setSuccess(payload?.message ?? t("submitSuccess"));
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

  if (!session) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#091317]/96 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(89,240,232,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,180,120,0.08),transparent_36%)]" />
        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#59f0e8]/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-3xl italic tracking-[-0.03em] text-white/92 sm:text-[3.2rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/58">
              {description}
            </p>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 text-white/76">
            <p className="text-base font-semibold text-white">
              {t("loginRequiredTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {t("loginRequiredDescription")}
            </p>
            <button
              type="button"
              onClick={openAuth}
              className="mt-5 rounded-full bg-[#59f0e8] px-6 py-3 text-sm font-semibold text-[#031215] transition hover:brightness-105"
            >
              {t("loginRequiredCta")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#091317]/96 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(89,240,232,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,180,120,0.08),transparent_36%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="border-b border-white/8 px-5 py-5 sm:px-8 sm:py-6">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#59f0e8]/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-display text-3xl italic tracking-[-0.03em] text-white/92 sm:text-[3.2rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/58">
              {description}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-8 sm:py-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
                {t("rating")}
              </label>
              <ReviewStars rating={rating} interactive onChange={setRating} />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="review-comment-page"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
              >
                {t("comment")}
              </label>
              <textarea
                id="review-comment-page"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={6}
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
                  htmlFor="review-display-name-page"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
                >
                  {t("publicName")}
                </label>
                <input
                  id="review-display-name-page"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={t("publicNamePlaceholder")}
                  className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="review-stay-label-page"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
              >
                {t("stayReference")}
              </label>
              <input
                id="review-stay-label-page"
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
              <span>{t("consent")}</span>
            </label>

            <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/56">
              {t("imagesComingSoon")}
            </div>

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
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[#59f0e8] px-6 py-3 text-sm font-semibold text-[#031215] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t("submitting") : t("submit")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
