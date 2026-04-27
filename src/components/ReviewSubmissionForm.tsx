"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import {
  type ReviewPhotoSelection,
  compressReviewImage,
  validateReviewPhotoFiles,
} from "@/lib/review-images";
import { normalizeInstagramHandle } from "@/lib/instagram-handle";
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

type CreateReviewResponse = {
  ok?: boolean;
  reviewId?: string;
  uploadedPhotos?: number;
  message?: string;
  error?: string;
};

type CreateReviewPhotoResponse = {
  ok?: boolean;
  error?: string;
};

function getPhotoValidationMessage(
  code: "too_many_files" | "invalid_type" | "file_too_large",
  t: ReturnType<typeof useTranslations<"reviews">>,
) {
  switch (code) {
    case "too_many_files":
      return t("invalidImageCount");
    case "invalid_type":
      return t("invalidImageType");
    case "file_too_large":
      return t("invalidImageSize");
  }
}

export default function ReviewSubmissionForm({
  title,
  description,
  eyebrow,
}: ReviewSubmissionFormProps) {
  const t = useTranslations("reviews");
  const { session, openAuth } = useAuth();
  const photoPreviewUrlsRef = useRef<string[]>([]);
  const accountName =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    (session?.user.user_metadata?.name as string | undefined) ??
    session?.user.email?.split("@")[0] ??
    "";

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [consentToPublish, setConsentToPublish] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<ReviewPhotoSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    photoPreviewUrlsRef.current = selectedPhotos.map((photo) => photo.previewUrl);
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function clearSelectedPhotos() {
    photoPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoPreviewUrlsRef.current = [];
    setSelectedPhotos([]);
  }

  function removePhoto(photoId: string) {
    setSelectedPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.id !== photoId);
    });
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    const nextFiles = [...selectedPhotos.map((photo) => photo.file), ...files];
    const validationError = validateReviewPhotoFiles(nextFiles);

    if (validationError) {
      setError(getPhotoValidationMessage(validationError.code, t));
      return;
    }

    const nextSelections = files.map((file, index) => ({
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${file.name}-${file.lastModified}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setError(null);
    setSelectedPhotos((current) => [...current, ...nextSelections]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccess(null);
    setSubmissionStage(null);
    setIsSubmitting(true);

    try {
      const normalizedInstagramHandle =
        normalizeInstagramHandle(instagramHandle);

      if (instagramHandle.trim() && !normalizedInstagramHandle) {
        throw new Error(t("instagramHandleError"));
      }

      setSubmissionStage(t("submitStageReview"));

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          isAnonymous: false,
          instagramHandle: normalizedInstagramHandle || null,
          consentToPublish,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | CreateReviewResponse
        | null;

      if (!response.ok || !payload?.reviewId) {
        throw new Error(payload?.error ?? t("submitError"));
      }

      let uploadedPhotos = 0;

      if (selectedPhotos.length) {
        for (const [index, photo] of selectedPhotos.entries()) {
          try {
            setSubmissionStage(
              t("submitStagePhoto", {
                current: index + 1,
                total: selectedPhotos.length,
              }),
            );

            const compressedFile = await compressReviewImage(photo.file, index);
            const photoFormData = new FormData();
            photoFormData.set("reviewId", payload.reviewId);
            photoFormData.set("sortOrder", String(index));
            photoFormData.set("file", compressedFile);

            const metadataResponse = await fetch("/api/reviews/photos/upload", {
              method: "POST",
              body: photoFormData,
            });

            const metadataPayload =
              (await metadataResponse.json().catch(() => null)) as
                | CreateReviewPhotoResponse
                | null;

            if (!metadataResponse.ok) {
              throw new Error(
                metadataPayload?.error ?? t("imageRegisterError"),
              );
            }

            uploadedPhotos += 1;
          } catch {
            // Keep the review even if one or more images fail to upload.
          }
        }
      }

      setSuccess(
        selectedPhotos.length && uploadedPhotos < selectedPhotos.length
          ? t("submitPartialSuccess", {
              uploaded: uploadedPhotos,
              total: selectedPhotos.length,
            })
          : (payload.message ?? t("submitSuccess")),
      );
      setRating(0);
      setComment("");
      setInstagramHandle("");
      setConsentToPublish(false);
      clearSelectedPhotos();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : t("submitError"),
      );
    } finally {
      setSubmissionStage(null);
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

            <div className="space-y-2">
              <label
                htmlFor="review-instagram-handle-page"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56"
              >
                {t("instagramHandle")}
              </label>
              <input
                id="review-instagram-handle-page"
                value={instagramHandle}
                onChange={(event) => setInstagramHandle(event.target.value)}
                placeholder={t("instagramHandlePlaceholder")}
                className="w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/26 focus:border-[#59f0e8]/45"
              />
              <p className="text-xs leading-5 text-white/45">
                {t("instagramHandleHelp", {
                  name: accountName || t("accountNameFallback"),
                })}
              </p>
            </div>

            <div className="space-y-3 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/56">
                  {t("images")}
                </p>
                <p className="text-sm leading-6 text-white/56">
                  {t("imagesHelp")}
                </p>
              </div>

              <label className="inline-flex cursor-pointer rounded-full border border-white/12 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-[#59f0e8]/35 hover:text-[#59f0e8]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={handlePhotoChange}
                  disabled={isSubmitting}
                />
                {t("addImages")}
              </label>

              {selectedPhotos.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/20"
                    >
                      <img
                        src={photo.previewUrl}
                        alt={t("photoPreviewAlt", { index: index + 1 })}
                        className="h-40 w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-3 px-3 py-3">
                        <p className="min-w-0 truncate text-xs text-white/56">
                          {photo.file.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/74 transition hover:border-rose-300/30 hover:text-rose-200"
                        >
                          {t("removeImage")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {submissionStage ? (
                <p className="text-sm text-white/54">{submissionStage}</p>
              ) : null}
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
