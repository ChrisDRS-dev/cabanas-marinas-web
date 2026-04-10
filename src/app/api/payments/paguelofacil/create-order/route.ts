import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reservationId = String(body?.reservationId ?? "").trim();

  if (!reservationId) {
    return NextResponse.json({ error: "missing_reservation" }, { status: 400 });
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id,status,total_amount,deposit_amount,payment_method,customer_id")
    .eq("id", reservationId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!reservation) {
    return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
  }

  if (reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "reservation_not_pending_payment" }, { status: 400 });
  }

  if (String(reservation.payment_method ?? "").toUpperCase() !== "CARD") {
    return NextResponse.json({ error: "invalid_payment_method" }, { status: 400 });
  }

  const totalAmount = Number(reservation.total_amount ?? 0);
  const depositAmount =
    reservation.deposit_amount != null
      ? Number(reservation.deposit_amount)
      : roundCurrency(totalAmount * 0.5);

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return NextResponse.json(
      { error: "invalid_amount", detail: `Monto de depósito inválido: ${depositAmount}` },
      { status: 400 }
    );
  }

  const cclw = process.env.PF_CCLW;
  const baseUrl = process.env.PF_BASE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cabanas-marinas-web.vercel.app";

  if (!cclw || !baseUrl) {
    console.error("[PF] Missing env vars: PF_CCLW or PF_BASE_URL");
    return NextResponse.json({ error: "payment_not_configured" }, { status: 500 });
  }

  const returnUrl = `${appUrl}/reservar/pago/resultado`;
  const returnUrlHex = Buffer.from(returnUrl).toString("hex");
  const description = `Reserva Cabañas Marinas #${reservationId.slice(0, 8)}`;

  const params = new URLSearchParams({
    CCLW: cclw,
    CMTN: depositAmount.toFixed(2),
    CDSC: description,
    RETURN_URL: returnUrlHex,
    PARM_1: reservationId,
    EXPIRES_IN: "3600",
  });

  console.log("[PF] create-order request", {
    reservationId,
    depositAmount,
    description,
    returnUrl,
  });

  let pfData: { success?: boolean; data?: { url?: string } } | null = null;

  try {
    const pfResponse = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    pfData = await pfResponse.json().catch(() => null);

    if (!pfResponse.ok || !pfData?.success) {
      console.error("[PF] create-order failed", { status: pfResponse.status, pfData });
      return NextResponse.json(
        { error: "paguelofacil_error", detail: pfData },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[PF] create-order exception", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "paguelofacil_unreachable" }, { status: 502 });
  }

  const checkoutUrl = pfData?.data?.url;
  if (!checkoutUrl) {
    console.error("[PF] create-order: no url in response", pfData);
    return NextResponse.json({ error: "no_checkout_url" }, { status: 500 });
  }

  console.log("[PF] create-order success", { reservationId, checkoutUrl });
  return NextResponse.json({ url: checkoutUrl });
}
