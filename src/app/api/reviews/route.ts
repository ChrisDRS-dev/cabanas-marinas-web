import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type CreateReviewPayload = {
  rating?: number;
  comment?: string;
  isAnonymous?: boolean;
  displayName?: string;
  stayLabel?: string;
  consentToPublish?: boolean;
};

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildGuestName(args: {
  profileName: string | null;
  metaName: string | null;
  email: string | null;
}) {
  return (
    args.profileName?.trim() ||
    args.metaName?.trim() ||
    args.email?.split("@")[0]?.trim() ||
    "Huésped"
  );
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para enviar una reseña." },
      { status: 401 },
    );
  }

  let payload: CreateReviewPayload | null = null;
  try {
    payload = (await request.json()) as CreateReviewPayload;
  } catch {
    return NextResponse.json(
      { error: "No pudimos procesar la reseña enviada." },
      { status: 400 },
    );
  }

  const rating = Number(payload?.rating ?? 0);
  const comment = sanitizeText(payload?.comment);
  const isAnonymous = Boolean(payload?.isAnonymous);
  const displayName = sanitizeText(payload?.displayName);
  const stayLabel = sanitizeText(payload?.stayLabel) || null;
  const consentToPublish = payload?.consentToPublish === true;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Selecciona una calificación válida entre 1 y 5 estrellas." },
      { status: 400 },
    );
  }

  if (!comment) {
    return NextResponse.json(
      { error: "Escribe un comentario antes de enviar tu reseña." },
      { status: 400 },
    );
  }

  if (!isAnonymous && !displayName) {
    return NextResponse.json(
      { error: "Indica el nombre que quieres mostrar públicamente." },
      { status: 400 },
    );
  }

  if (!consentToPublish) {
    return NextResponse.json(
      { error: "Debes autorizar la publicación de tu reseña." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const guestName = buildGuestName({
    profileName: profile?.full_name ?? null,
    metaName:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null,
    email: user.email ?? null,
  });

  const { error } = await supabase.from("reviews").insert({
    customer_id: user.id,
    guest_name: guestName,
    display_name: isAnonymous ? null : displayName,
    is_anonymous: isAnonymous,
    rating,
    comment,
    stay_label: stayLabel,
    status: "pending",
    consent_to_publish: true,
  });

  if (error) {
    return NextResponse.json(
      { error: "No pudimos guardar tu reseña. Inténtalo de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Gracias. Tu reseña quedó enviada y pasará por revisión antes de publicarse.",
  });
}
