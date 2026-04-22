"use client";

export const REVIEW_PHOTO_BUCKET = "review-photos";
export const REVIEW_PHOTO_MAX_FILES = 2;
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const REVIEW_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const REVIEW_PHOTO_MAX_WIDTH = 1200;
export const REVIEW_PHOTO_QUALITY = 0.75;

export type ReviewPhotoSelection = {
  id: string;
  file: File;
  previewUrl: string;
};

export function isAllowedReviewPhotoType(type: string) {
  return REVIEW_PHOTO_ALLOWED_TYPES.includes(
    type as (typeof REVIEW_PHOTO_ALLOWED_TYPES)[number],
  );
}

export function validateReviewPhotoFiles(files: File[]) {
  if (files.length > REVIEW_PHOTO_MAX_FILES) {
    return { code: "too_many_files" as const };
  }

  for (const file of files) {
    if (!isAllowedReviewPhotoType(file.type)) {
      return { code: "invalid_type" as const };
    }

    if (file.size > REVIEW_PHOTO_MAX_BYTES) {
      return { code: "file_too_large" as const };
    }
  }

  return null;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image_load_failed"));
    };

    image.src = objectUrl;
  });
}

export async function compressReviewImage(file: File, index: number) {
  const image = await loadImageFromFile(file);
  const scale = Math.min(1, REVIEW_PHOTO_MAX_WIDTH / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas_not_supported");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", REVIEW_PHOTO_QUALITY);
  });

  if (!blob) {
    throw new Error("image_compression_failed");
  }

  return new File([blob], `${index + 1}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export function buildReviewPhotoPath(reviewId: string, sortOrder: number) {
  return `${reviewId}/${sortOrder + 1}.webp`;
}
