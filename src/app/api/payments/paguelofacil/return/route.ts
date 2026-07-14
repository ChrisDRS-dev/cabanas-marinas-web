import { NextResponse } from "next/server";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
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
  markManualPaymentLinkFailed,
  objectFromUnknown,
} from "@/lib/paguelofacil/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeLocale(value: string | null): AppLocale {
  return isAppLocale(value) ? value : "es";
}

function toPayload(searchParams: URLSearchParams) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of searchParams.entries()) {
    payload[key] = value;
  }
  return payload;
}

function getFailureReason(payload: Record<string, unknown>) {
  const raw =
    payload.Razon ??
    payload.razon ??
    payload.reason ??
    payload.Reason ??
    payload.error ??
    payload.Error ??
    payload.message ??
    payload.Message ??
    "";
  const reason = String(raw).trim();
  return reason.slice(0, 300);
}

function isDeniedStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return ["denegada", "denegado", "declined", "denied", "rechazada", "rechazado"].includes(
    normalized,
  );
}

function hasProviderFailureSignal(payload: Record<string, unknown>, status: string) {
  const reason = getFailureReason(payload).toLowerCase();
  return (
    isDeniedStatus(status) ||
    reason.includes("300") ||
    reason.includes("error") ||
    reason.includes("deneg") ||
    reason.includes("declin") ||
    reason.includes("rechaz")
  );
}

async function markPaymentLinkFailed(args: {
  paymentId: string;
  reason: string;
  payload: Record<string, unknown>;
}) {
  const providerMessage = args.reason || "paguelofacil_return_failed";
  await supabaseAdmin()
    .from("payments")
    .update({
      status: "FAILED",
      link_status: "FAILED",
      provider_message: providerMessage,
      meta: {
        failure_reason: "paguelofacil_return_failed",
        failure_message: providerMessage,
        failure_payload: args.payload,
        failed_at: new Date().toISOString(),
      },
    })
    .eq("id", args.paymentId)
    .eq("status", "PENDING");
}

async function parseRequest(req: Request) {
  const url = new URL(req.url);
  const payload = toPayload(url.searchParams);

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      Object.assign(payload, objectFromUnknown(await req.json().catch(() => null)));
    } else {
      const form = await req.formData().catch(() => null);
      form?.forEach((value, key) => {
        payload[key] = typeof value === "string" ? value : value.name;
      });
    }
  }

  return {
    locale: normalizeLocale(String(payload.locale ?? url.searchParams.get("locale") ?? "")),
    payload,
  };
}

async function handleReturn(req: Request) {
  const admin = supabaseAdmin();
  const { locale, payload } = await parseRequest(req);
  const reservationId = String(payload.PARM_1 ?? payload.parm_1 ?? "").trim();
  const paymentId = String(payload.PARM_2 ?? payload.parm_2 ?? "").trim();
  const isManualPaymentLink = isManualPaymentLinkMarker(reservationId);
  const codOper = getCodOper(payload);
  const status = getPayloadStatus(payload);
  const amount = getPayloadAmount(payload);
  const email = String(payload.Email ?? payload.email ?? "").trim();
  const failureReason = getFailureReason(payload);
  const url = new URL(req.url);
  const target = new URL(`/${locale}/reservar/pago/resultado`, url.origin);

  if (isManualPaymentLink) {
    target.searchParams.set("manual", "1");
    if (paymentId) target.searchParams.set("manualLinkId", paymentId);
  } else if (reservationId) {
    target.searchParams.set("PARM_1", reservationId);
  }
  if (paymentId) target.searchParams.set("PARM_2", paymentId);
  if (codOper) target.searchParams.set("Oper", codOper);
  if (amount != null) target.searchParams.set("TotalPagado", amount.toFixed(2));
  if (status) target.searchParams.set("Estado", status);
  if (typeof payload.Razon === "string") target.searchParams.set("Razon", payload.Razon);
  else if (failureReason) target.searchParams.set("Razon", failureReason);

  if (isManualPaymentLink) {
    if (!paymentId) {
      target.searchParams.set("verified", "0");
      target.searchParams.set("reason", "missing_manual_link");
      return NextResponse.redirect(target);
    }

    await insertManualPaymentLinkEvent(admin, {
      manualPaymentLinkId: paymentId,
      eventType: "RETURN",
      providerRef: codOper || null,
      status: status || null,
      amount,
      payload,
    });

    if (hasProviderFailureSignal(payload, status)) {
      await markManualPaymentLinkFailed({
        admin,
        manualPaymentLinkId: paymentId,
        reason: failureReason || status || "paguelofacil_return_failed",
        payload,
      });
    }

    if (codOper) {
      try {
        const result = await applyVerifiedManualPagueloFacilPayment({
          admin,
          manualPaymentLinkId: paymentId,
          codOper,
          source: "return",
          rawPayload: payload,
        });
        target.searchParams.set("verified", result.ok ? "1" : "0");
        if (!result.ok) target.searchParams.set("reason", result.reason);
      } catch {
        target.searchParams.set("verified", "0");
        target.searchParams.set("reason", "verify_failed");
      }
    } else {
      target.searchParams.set("verified", "0");
      target.searchParams.set("reason", "missing_operation");
    }

    return NextResponse.redirect(target);
  }

  if (!reservationId) {
    target.searchParams.set("verified", "0");
    target.searchParams.set("reason", "missing_reservation");
    return NextResponse.redirect(target);
  }

  await insertPaymentEvent(admin, {
    paymentId: paymentId || null,
    reservationId,
    eventType: "RETURN",
    providerRef: codOper || null,
    status: status || null,
    amount,
    customerEmail: email || null,
    payload,
  });

  if (paymentId && hasProviderFailureSignal(payload, status)) {
    await markPaymentLinkFailed({
      paymentId,
      reason: failureReason || status || "paguelofacil_return_failed",
      payload,
    });
  }

  if (codOper) {
    try {
      const result = await applyVerifiedPagueloFacilPayment({
        admin,
        reservationId,
        paymentId: paymentId || null,
        codOper,
        expectedAmount: null,
        source: "return",
        rawPayload: payload,
      });
      target.searchParams.set("verified", result.ok ? "1" : "0");
      if (result.ok) {
        await notifyPaymentConfirmed({
          supabase: admin,
          paymentId: paymentId || null,
          data: await getReservationEmailData(admin, reservationId, {
            amount: result.verifiedAmount,
          }),
        });
      } else {
        target.searchParams.set("reason", result.reason);
        await notifyPaymentFailed({
          supabase: admin,
          paymentId: paymentId || null,
          data: await getReservationEmailData(admin, reservationId, {
            amount,
            reason: result.reason,
          }),
        });
      }
    } catch {
      target.searchParams.set("verified", "0");
      target.searchParams.set("reason", "verify_failed");
      await notifyPaymentFailed({
        supabase: admin,
        paymentId: paymentId || null,
        data: await getReservationEmailData(admin, reservationId, {
          amount,
          reason: "verify_failed",
        }),
      });
    }
  } else {
    target.searchParams.set("verified", "0");
    target.searchParams.set("reason", "missing_operation");
  }

  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  return handleReturn(req);
}

export async function POST(req: Request) {
  return handleReturn(req);
}
