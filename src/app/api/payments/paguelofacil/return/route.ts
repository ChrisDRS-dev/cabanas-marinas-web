import { NextResponse } from "next/server";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import {
  getReservationEmailData,
  notifyPaymentConfirmed,
  notifyPaymentFailed,
} from "@/lib/notifications/events";
import {
  applyVerifiedPagueloFacilPayment,
  getCodOper,
  getPayloadAmount,
  getPayloadStatus,
  insertPaymentEvent,
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
  const codOper = getCodOper(payload);
  const status = getPayloadStatus(payload);
  const amount = getPayloadAmount(payload);
  const email = String(payload.Email ?? payload.email ?? "").trim();
  const url = new URL(req.url);
  const target = new URL(`/${locale}/reservar/pago/resultado`, url.origin);

  if (reservationId) target.searchParams.set("PARM_1", reservationId);
  if (paymentId) target.searchParams.set("PARM_2", paymentId);
  if (codOper) target.searchParams.set("Oper", codOper);
  if (amount != null) target.searchParams.set("TotalPagado", amount.toFixed(2));
  if (status) target.searchParams.set("Estado", status);
  if (typeof payload.Razon === "string") target.searchParams.set("Razon", payload.Razon);

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
