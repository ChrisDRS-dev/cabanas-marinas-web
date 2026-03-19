import "server-only";

import crypto from "node:crypto";

type YappyValidateMerchantResponse = {
  body?: {
    token?: string;
    epochTime?: number | string;
  };
  status?: {
    code?: string;
    description?: string;
  };
};

type YappyCreateOrderResponse = {
  body?: {
    transactionId?: string;
    token?: string;
    documentName?: string;
  };
  status?: {
    code?: string;
    description?: string;
  };
};

type YappyButtonConfig = {
  merchantId: string;
  secretKey: string;
  baseUrl: string;
  cdnUrl: string;
  domain: string;
  ipnUrl: string;
  alias: string;
};

export type YappyButtonOrderPayload = {
  transactionId: string;
  token: string;
  documentName: string;
};

function defaultBaseUrl() {
  return "https://api-comecom-uat.yappycloud.com";
}

function defaultCdnUrl() {
  return "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js";
}

export function getYappyButtonConfig(origin?: string): YappyButtonConfig {
  const merchantId = process.env.YAPPY_BUTTON_MERCHANT_ID?.trim() ?? "";
  const secretKey = process.env.YAPPY_BUTTON_SECRET_KEY?.trim() ?? "";
  const baseUrl = (
    process.env.YAPPY_BUTTON_BASE_URL?.trim() || defaultBaseUrl()
  ).replace(/\/$/, "");
  const cdnUrl = process.env.YAPPY_BUTTON_CDN_URL?.trim() || defaultCdnUrl();
  const domain = (process.env.YAPPY_BUTTON_DOMAIN?.trim() || origin || "").replace(
    /\/$/,
    ""
  );
  const ipnUrl = (
    process.env.YAPPY_BUTTON_IPN_URL?.trim() ||
    (origin ? `${origin}/api/payments/yappy/ipn` : "")
  ).replace(/\/$/, "");
  const alias = (process.env.YAPPY_BUTTON_ALIAS?.trim() || "").replace(/\D/g, "");

  if (!merchantId || !secretKey || !domain || !ipnUrl || !alias) {
    throw new Error(
      "Yappy button environment variables are incomplete. Required: YAPPY_BUTTON_MERCHANT_ID, YAPPY_BUTTON_SECRET_KEY, YAPPY_BUTTON_DOMAIN, YAPPY_BUTTON_IPN_URL, YAPPY_BUTTON_ALIAS."
    );
  }

  return {
    merchantId,
    secretKey,
    baseUrl,
    cdnUrl,
    domain,
    ipnUrl,
    alias,
  };
}

async function yappyButtonRequest<T>(
  baseUrl: string,
  path: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw new Error(`Yappy button request failed (${response.status}).`);
  }

  return payload;
}

export async function validateYappyMerchant(args: {
  merchantId: string;
  domain: string;
  baseUrl: string;
}) {
  const payload = await yappyButtonRequest<YappyValidateMerchantResponse>(
    args.baseUrl,
    "/payments/validate/merchant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: args.merchantId,
        urlDomain: args.domain,
      }),
    }
  );

  const token = payload.body?.token;
  if (!token) {
    throw new Error(
      payload.status?.description || "Yappy did not return a merchant token."
    );
  }

  return {
    token,
    epochTime: payload.body?.epochTime ?? null,
    raw: payload,
  };
}

export async function createYappyButtonOrder(args: {
  authorizationToken: string;
  merchantId: string;
  domain: string;
  aliasYappy: string;
  ipnUrl: string;
  orderId: string;
  amount: number;
  baseUrl: string;
}) {
  const amount = args.amount.toFixed(2);
  const payload = await yappyButtonRequest<YappyCreateOrderResponse>(
    args.baseUrl,
    "/payments/payment-wc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: args.authorizationToken,
      },
      body: JSON.stringify({
        merchantId: args.merchantId,
        orderId: args.orderId,
        domain: args.domain,
        paymentDate: Date.now(),
        aliasYappy: args.aliasYappy,
        ipnUrl: args.ipnUrl,
        discount: "0.00",
        taxes: "0.00",
        subtotal: amount,
        total: amount,
      }),
    }
  );

  const transactionId = payload.body?.transactionId;
  const token = payload.body?.token;
  const documentName = payload.body?.documentName;

  if (!transactionId || !token || !documentName) {
    throw new Error(
      payload.status?.description || "Yappy did not return button order data."
    );
  }

  return {
    transactionId,
    token,
    documentName,
    raw: payload,
  };
}

export function createReservationOrderId(reservationId: string) {
  const compact = reservationId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = Date.now().toString(36).toUpperCase();
  return `Y${compact}${suffix}`.slice(0, 15);
}

export function verifyYappyIpnHash(args: {
  orderId: string;
  status: string;
  domain: string;
  hash: string;
  secretKeyBase64: string;
}) {
  try {
    const secret = Buffer.from(args.secretKeyBase64, "base64").toString("utf-8");
    const [hmacSecret = ""] = secret.split(".");
    if (!hmacSecret) return false;

    const signature = crypto
      .createHmac("sha256", hmacSecret)
      .update(`${args.orderId}${args.status}${args.domain}`)
      .digest("hex");

    const left = Buffer.from(signature);
    const right = Buffer.from(String(args.hash).toLowerCase());

    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function mapYappyIpnStatus(status: string) {
  switch (status) {
    case "E":
      return { paymentStatus: "SUCCEEDED", reservationStatus: "CONFIRMED" };
    case "R":
      return { paymentStatus: "FAILED", reservationStatus: null };
    case "C":
      return { paymentStatus: "CANCELLED", reservationStatus: null };
    case "X":
      return { paymentStatus: "CANCELLED", reservationStatus: null };
    default:
      return { paymentStatus: null, reservationStatus: null };
  }
}
