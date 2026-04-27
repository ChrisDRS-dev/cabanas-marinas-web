import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const REVIEW_PHOTO_BUCKET = "review-photos";
const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const REVIEW_PHOTO_ALLOWED_TYPES = new Set(["image/webp"]);

function sanitizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildStoragePath(reviewId: string, sortOrder: number) {
  return `${reviewId}/${sortOrder + 1}.webp`;
}

async function ensureReviewPhotoBucket(admin: ReturnType<typeof supabaseAdmin>) {
  const { data: bucket } = await admin.storage.getBucket(REVIEW_PHOTO_BUCKET);

  if (!bucket) {
    await admin.storage.createBucket(REVIEW_PHOTO_BUCKET, {
      public: true,
      fileSizeLimit: REVIEW_PHOTO_MAX_BYTES,
      allowedMimeTypes: ["image/webp"],
    });
    return;
  }

  await admin.storage.updateBucket(REVIEW_PHOTO_BUCKET, {
    public: true,
    fileSizeLimit: REVIEW_PHOTO_MAX_BYTES,
    allowedMimeTypes: ["image/webp"],
  });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para subir fotos." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const reviewId = sanitizeText(formData.get("reviewId"));
  const sortOrder = Number(sanitizeText(formData.get("sortOrder")));
  const file = formData.get("file");

  if (!reviewId || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1) {
    return NextResponse.json(
      { error: "La foto enviada no tiene la metadata necesaria." },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No recibimos una imagen válida." },
      { status: 400 },
    );
  }

  if (!REVIEW_PHOTO_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Solo aceptamos fotos WEBP procesadas por el formulario." },
      { status: 400 },
    );
  }

  if (file.size > REVIEW_PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: "La foto procesada pesa más de 5 MB." },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const { data: review, error: reviewError } = await admin
    .from("reviews")
    .select("id, customer_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (reviewError || !review) {
    return NextResponse.json(
      { error: "No encontramos la reseña asociada a esta foto." },
      { status: 404 },
    );
  }

  if (review.customer_id !== user.id) {
    return NextResponse.json(
      { error: "No puedes adjuntar fotos a una reseña que no te pertenece." },
      { status: 403 },
    );
  }

  const { count, error: countError } = await admin
    .from("review_photos")
    .select("id", { count: "exact", head: true })
    .eq("review_id", reviewId);

  if (countError) {
    return NextResponse.json(
      { error: "No pudimos validar el límite de fotos para esta reseña." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= 2) {
    return NextResponse.json(
      { error: "Esta reseña ya alcanzó el máximo de 2 fotos." },
      { status: 409 },
    );
  }

  await ensureReviewPhotoBucket(admin);

  const storagePath = buildStoragePath(reviewId, sortOrder);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(REVIEW_PHOTO_BUCKET)
    .upload(storagePath, fileBuffer, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "No pudimos subir la foto." },
      { status: 400 },
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(REVIEW_PHOTO_BUCKET).getPublicUrl(storagePath);

  const { data: photo, error: insertError } = await admin
    .from("review_photos")
    .insert({
      review_id: reviewId,
      storage_path: storagePath,
      public_url: publicUrl,
      status: "pending",
      sort_order: sortOrder,
    })
    .select("id, review_id, storage_path, public_url, status, sort_order, created_at")
    .single();

  if (insertError || !photo) {
    await admin.storage
      .from(REVIEW_PHOTO_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);

    return NextResponse.json(
      {
        error:
          insertError?.code === "23505"
            ? "Esta posición de foto ya fue registrada para la reseña."
            : "No pudimos guardar la referencia de la foto. Inténtalo de nuevo.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, photo });
}
