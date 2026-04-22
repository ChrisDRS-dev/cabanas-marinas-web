import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type CreateReviewPhotoPayload = {
  reviewId?: string;
  storagePath?: string;
  publicUrl?: string;
  sortOrder?: number;
};

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para registrar fotos en tu reseña." },
      { status: 401 },
    );
  }

  let payload: CreateReviewPhotoPayload | null = null;
  try {
    payload = (await request.json()) as CreateReviewPhotoPayload;
  } catch {
    return NextResponse.json(
      { error: "No pudimos procesar la foto enviada." },
      { status: 400 },
    );
  }

  const reviewId = sanitizeText(payload?.reviewId);
  const storagePath = sanitizeText(payload?.storagePath);
  const publicUrl = sanitizeText(payload?.publicUrl);
  const sortOrder = Number(payload?.sortOrder ?? -1);

  if (!reviewId || !storagePath || !publicUrl) {
    return NextResponse.json(
      { error: "La foto enviada no tiene la metadata necesaria." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1) {
    return NextResponse.json(
      { error: "La posición de la foto no es válida." },
      { status: 400 },
    );
  }

  const { data: review, error: reviewError } = await supabase
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

  const { count, error: countError } = await supabase
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

  const { data: photo, error: insertError } = await supabase
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
    const message =
      insertError?.code === "23505"
        ? "Esta posición de foto ya fue registrada para la reseña."
        : "No pudimos guardar la referencia de la foto. Inténtalo de nuevo.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    photo,
  });
}
