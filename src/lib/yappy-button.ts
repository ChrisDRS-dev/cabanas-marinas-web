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
};

export type YappyButtonOrderPayload = {
  transactionId: string;
  token: string;
  documentName: string;
};

export class YappyButtonError extends Error {
  code: string;
  detail?: string;

  constructor(code: string, message: string, detail?: string) {
    super(message);
    this.name = "YappyButtonError";
    this.code = code;
    this.detail = detail;
  }
}

function defaultBaseUrl() {
  return "https://api-comecom-uat.yappycloud.com";
}

function defaultCdnUrl() {
  return "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js";
}

function isValidHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function detectYappyEnvironment(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("uat")) return "UAT";
  if (normalized.includes("apipagosbg") || normalized.includes("bt-cdn.yappy")) {
    return "PROD";
  }
  return "UNKNOWN";
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
  if (!merchantId || !secretKey || !domain || !ipnUrl) {
    throw new YappyButtonError(
      "config_missing",
      "Yappy button environment variables are incomplete. Required: YAPPY_BUTTON_MERCHANT_ID, YAPPY_BUTTON_SECRET_KEY, YAPPY_BUTTON_DOMAIN, YAPPY_BUTTON_IPN_URL."
    );
  }

  if (!isValidHttpsUrl(domain)) {
    throw new YappyButtonError(
      "invalid_domain",
      "YAPPY_BUTTON_DOMAIN debe ser una URL HTTPS válida."
    );
  }

  if (!isValidHttpsUrl(ipnUrl)) {
    throw new YappyButtonError(
      "invalid_ipn_url",
      "YAPPY_BUTTON_IPN_URL debe ser una URL HTTPS válida."
    );
  }

  const baseEnv = detectYappyEnvironment(baseUrl);
  const cdnEnv = detectYappyEnvironment(cdnUrl);
  if (baseEnv !== "UNKNOWN" && cdnEnv !== "UNKNOWN" && baseEnv !== cdnEnv) {
    throw new YappyButtonError(
      "environment_mismatch",
      "YAPPY_BUTTON_BASE_URL y YAPPY_BUTTON_CDN_URL apuntan a ambientes distintos."
    );
  }

  return {
    merchantId,
    secretKey,
    baseUrl,
    cdnUrl,
    domain,
    ipnUrl,
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
    const errorPayload = payload as
      | {
          status?: {
            code?: string;
            description?: string;
          };
        }
      | null;
    console.error("[Yappy] request_failed", {
      path,
      httpStatus: response.status,
      yappyStatus: errorPayload?.status,
    });
    throw new YappyButtonError(
      "request_failed",
      errorPayload?.status?.description ||
        `Yappy button request failed (${response.status}).`,
      errorPayload?.status?.code
    );
  }

  const statusPayload = payload as {
    status?: { code?: string; description?: string };
  };
  if (statusPayload.status?.code && statusPayload.status.code !== "0000") {
    console.error("[Yappy] status_error", { path, status: statusPayload.status });
    throw new YappyButtonError(
      "request_failed",
      statusPayload.status.description || "Yappy devolvió un error.",
      statusPayload.status.code
    );
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
    throw new YappyButtonError(
      "merchant_validation_failed",
      payload.status?.description || "Yappy did not return a merchant token.",
      payload.status?.code
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
  const amountFixed = args.amount.toFixed(2);
  const requestBody = {
    merchantId: args.merchantId,
    orderId: args.orderId,
    domain: args.domain,
    paymentDate: Date.now(),
    aliasYappy: args.aliasYappy,
    ipnUrl: args.ipnUrl,
    discount: "0.00",
    taxes: "0.00",
    subtotal: amountFixed,
    total: amountFixed,
  };
  const payload = await yappyButtonRequest<YappyCreateOrderResponse>(
    args.baseUrl,
    "/payments/payment-wc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: args.authorizationToken,
      },
      body: JSON.stringify(requestBody),
    }
  );

  const transactionId = payload.body?.transactionId;
  const token = payload.body?.token;
  const documentName = payload.body?.documentName;

  if (!transactionId || !token || !documentName) {
    throw new YappyButtonError(
      "order_creation_failed",
      payload.status?.description || "Yappy did not return button order data.",
      payload.status?.code
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
  const suffix = Date.now().toString(36).toUpperCase(); // ~8 chars, unique per attempt
  return `Y${suffix}${compact}`.slice(0, 15);
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
