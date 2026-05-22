import type {
  PFCreateLinkParams,
  PFCreateLinkResponse,
  PFEnvironment,
  PFMgmtTransaction,
} from "@/lib/paguelofacil/types";

function optionalEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function getEnvironment(): PFEnvironment {
  if (process.env.PF_ENV === "prod") return "prod";
  if (process.env.PF_ENV === "sandbox") return "sandbox";

  const configuredUrl = optionalEnv("PF_LINK_URL_PROD", "PF_LINK_URL", "PF_BASE_URL");
  return configuredUrl?.includes("secure.paguelofacil.com") ? "prod" : "sandbox";
}

function requiredEnv(name: string, ...aliases: string[]) {
  const value = optionalEnv(name, ...aliases);
  if (!value) {
    throw new PagueloFacilConfigError(`Missing required PagueloFacil env var: ${name}`);
  }
  return value;
}

function getLinkUrl() {
  const env = getEnvironment();
  if (env === "prod") {
    return (
      optionalEnv("PF_LINK_URL_PROD", "PF_LINK_URL", "PF_BASE_URL") ??
      "https://secure.paguelofacil.com/LinkDeamon.cfm"
    );
  }

  return (
    optionalEnv("PF_LINK_URL_SANDBOX", "PF_LINK_URL", "PF_BASE_URL") ??
    "https://sandbox.paguelofacil.com/LinkDeamon.cfm"
  );
}

function getManagementUrl() {
  const env = getEnvironment();
  const url =
    env === "prod"
      ? optionalEnv("PF_MGMT_URL_PROD", "PF_MGMT_URL") ??
        "https://api.pfserver.net/PFManagementServices/api/v1"
      : optionalEnv("PF_MGMT_URL_SANDBOX", "PF_MGMT_URL") ??
        "https://sandbox.paguelofacil.com/PFManagementServices/api/v1";

  return url.replace(/\/$/, "");
}

function toMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("PagueloFacil amount must be greater than 0.");
  }
  return value.toFixed(2);
}

function normalizeDescription(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 150);
}

function firstTransaction(payload: unknown): PFMgmtTransaction | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = record.data;

  if (Array.isArray(data)) return (data[0] as PFMgmtTransaction | undefined) ?? null;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return (nested.data[0] as PFMgmtTransaction | undefined) ?? null;
    }
    return data as PFMgmtTransaction;
  }

  if (Array.isArray(record.result)) {
    return (record.result[0] as PFMgmtTransaction | undefined) ?? null;
  }

  return null;
}

export class PagueloFacilConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PagueloFacilConfigError";
  }
}

export class PagueloFacilProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PagueloFacilProviderError";
  }
}

export async function createPaymentLink(
  params: PFCreateLinkParams,
): Promise<PFCreateLinkResponse> {
  const body = new URLSearchParams({
    CCLW: requiredEnv("PF_CCLW"),
    CMTN: toMoney(params.amount),
    CDSC: normalizeDescription(params.description),
    RETURN_URL: Buffer.from(params.returnUrl, "utf8").toString("hex").toUpperCase(),
    PARM_1: params.reservationId,
    PARM_2: params.paymentId,
    EXPIRES_IN: String(params.expiresIn ?? 3600),
  });

  if (params.customerEmail) {
    body.set("EMAIL", params.customerEmail);
  }

  const response = await fetch(getLinkUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, */*",
    },
    body: body.toString(),
  });

  const responseBody = await response.text();
  const payload = (() => {
    try {
      return JSON.parse(responseBody) as PFCreateLinkResponse;
    } catch {
      return null;
    }
  })();

  if (!response.ok || !payload) {
    throw new PagueloFacilProviderError(
      `PagueloFacil link request failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  return payload;
}

export async function verifyTransaction(
  codOper: string,
): Promise<PFMgmtTransaction | null> {
  const normalized = codOper.trim();
  if (!normalized) return null;

  const url = new URL(`${getManagementUrl()}/MerchantTransactions`);
  url.searchParams.set("filter", `codOper::${normalized}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: requiredEnv("PF_TOKEN", "PF_API_TOKEN"),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PagueloFacilProviderError(
      `PagueloFacil verify request failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  return firstTransaction(await response.json().catch(() => null));
}

export function isApproved(tx: PFMgmtTransaction | null): tx is PFMgmtTransaction {
  if (!tx) return false;
  return Number(tx.status) === 1 && String(tx.authStatus ?? "") === "00";
}

export function getTransactionAmount(tx: PFMgmtTransaction | null) {
  if (!tx) return null;
  const raw = tx.totalPay ?? tx.requestPayAmount ?? tx.authAmount;
  const amount = Number(raw);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function moneyOrNull(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

function stringOrNull(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function getTransactionFee(tx: PFMgmtTransaction | null) {
  if (!tx) return null;
  return moneyOrNull(tx.fee ?? tx.fees ?? tx.commission);
}

export function getTransactionNetAmount(tx: PFMgmtTransaction | null) {
  if (!tx) return null;
  return moneyOrNull(tx.netAmount ?? tx.netPay);
}

export function getTransactionMessage(tx: PFMgmtTransaction | null) {
  return stringOrNull(tx?.messageSys ?? tx?.message);
}

export function getTransactionEmail(tx: PFMgmtTransaction | null) {
  return stringOrNull(tx?.email);
}

export function getTransactionCardBrand(tx: PFMgmtTransaction | null) {
  return stringOrNull(tx?.cardType ?? tx?.type);
}

export function getTransactionCardLast4(tx: PFMgmtTransaction | null) {
  const display = stringOrNull(tx?.displayNum);
  if (!display) return null;
  const digits = display.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function getTransactionOperationType(tx: PFMgmtTransaction | null) {
  return stringOrNull(tx?.operationType);
}
