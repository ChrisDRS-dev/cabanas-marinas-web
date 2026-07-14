import { NextResponse } from "next/server";
import {
  getReservationEmailData,
  notifyPaymentConfirmed,
  notifyPaymentFailed,
} from "@/lib/notifications/events";
import {
  applyVerifiedManualPagueloFacilPayment,
  applyVerifiedPagueloFacilPayment,
  getCodOper,
  getPayloadAmount,
  getPayloadStatus,
  insertPaymentEvent,
  insertManualPaymentLinkEvent,
  isManualPaymentLinkMarker,
  objectFromUnknown,
} from "@/lib/paguelofacil/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function parseWebhookPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return objectFromUnknown(await req.json().catch(() => null));
  }

  const form = await req.formData().catch(() => null);
  const payload: Record<string, unknown> = {};
  form?.forEach((value, key) => {
    payload[key] = typeof value === "string" ? value : value.name;
  });
  return payload;
}

export async function POST(req: Request) {
  const payload = await parseWebhookPayload(req);
  const reservationId = String(payload.PARM_1 ?? payload.parm_1 ?? "").trim();
  const paymentId = String(payload.PARM_2 ?? payload.parm_2 ?? "").trim();
  const isManualPaymentLink = isManualPaymentLinkMarker(reservationId);
  const codOper = getCodOper(payload);
  const status = getPayloadStatus(payload);
  const amount = getPayloadAmount(payload);
  const email = String(payload.email ?? payload.Email ?? "").trim();
  const admin = supabaseAdmin();

  if (isManualPaymentLink) {
    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: "missing_manual_link" });
    }

    await insertManualPaymentLinkEvent(admin, {
      manualPaymentLinkId: paymentId,
      eventType: "WEBHOOK",
      providerRef: codOper || null,
      status: status || null,
      amount,
      payload,
    });

    if (!codOper) {
      return NextResponse.json({ received: true, ignored: "missing_operation" });
    }

    try {
      const result = await applyVerifiedManualPagueloFacilPayment({
        admin,
        manualPaymentLinkId: paymentId,
        codOper,
        source: "webhook",
        rawPayload: payload,
      });

      return NextResponse.json({
        received: true,
        manual: true,
        verified: result.ok,
        reason: result.ok ? null : result.reason,
      });
    } catch (error) {
      await insertManualPaymentLinkEvent(admin, {
        manualPaymentLinkId: paymentId,
        eventType: "VERIFY",
        providerRef: codOper,
        status: "ERROR",
        amount,
        payload: {
          source: "webhook",
          error: error instanceof Error ? error.message : "Unknown verify error",
        },
      });

      return NextResponse.json({
        received: true,
        manual: true,
        verified: false,
        reason: "verify_failed",
      });
    }
  }

  if (!reservationId) {
    return NextResponse.json({ received: true, ignored: "missing_reservation" });
  }

  await insertPaymentEvent(admin, {
    paymentId: paymentId || null,
    reservationId,
    eventType: "WEBHOOK",
    providerRef: codOper || null,
    status: status || null,
    amount,
    customerEmail: email || null,
    payload,
  });

  if (!codOper) {
    return NextResponse.json({ received: true, ignored: "missing_operation" });
  }

  try {
    const result = await applyVerifiedPagueloFacilPayment({
      admin,
      reservationId,
      paymentId: paymentId || null,
      codOper,
      expectedAmount: null,
      source: "webhook",
      rawPayload: payload,
    });

    if (result.ok) {
      await notifyPaymentConfirmed({
        supabase: admin,
        paymentId: paymentId || null,
        data: await getReservationEmailData(admin, reservationId, {
          amount: result.verifiedAmount,
        }),
      });
    } else {
      await notifyPaymentFailed({
        supabase: admin,
        paymentId: paymentId || null,
        data: await getReservationEmailData(admin, reservationId, {
          amount,
          reason: result.reason,
        }),
      });
    }

    return NextResponse.json({
      received: true,
      verified: result.ok,
      reason: result.ok ? null : result.reason,
    });
  } catch (error) {
    await insertPaymentEvent(admin, {
      paymentId: paymentId || null,
      reservationId,
      eventType: "VERIFY",
      providerRef: codOper,
      status: "ERROR",
      amount,
      customerEmail: email || null,
      payload: {
        source: "webhook",
        error: error instanceof Error ? error.message : "Unknown verify error",
      },
    });

    await notifyPaymentFailed({
      supabase: admin,
      paymentId: paymentId || null,
      data: await getReservationEmailData(admin, reservationId, {
        amount,
        reason: "verify_failed",
      }),
    });

    return NextResponse.json({ received: true, verified: false, reason: "verify_failed" });
  }
}
