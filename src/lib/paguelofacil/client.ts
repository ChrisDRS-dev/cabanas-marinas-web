import type {
  PFCreateLinkParams,
  PFCreateLinkResponse,
  PFEnvironment,
  PFMgmtTransaction,
} from "@/lib/paguelofacil/types";

function getEnvironment(): PFEnvironment {
  return process.env.PF_ENV === "prod" ? "prod" : "sandbox";
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required PagueloFacil env var: ${name}`);
  }
  return value;
}

function getLinkUrl() {
  const env = getEnvironment();
  return env === "prod"
    ? requiredEnv("PF_LINK_URL_PROD")
    : requiredEnv("PF_LINK_URL_SANDBOX");
}

function getManagementUrl() {
  const env = getEnvironment();
  return (env === "prod"
    ? requiredEnv("PF_MGMT_URL_PROD")
    : requiredEnv("PF_MGMT_URL_SANDBOX")
  ).replace(/\/$/, "");
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

  const payload = (await response.json().catch(() => null)) as PFCreateLinkResponse | null;
  if (!response.ok || !payload) {
    throw new Error(`PagueloFacil link request failed with HTTP ${response.status}.`);
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
      Authorization: requiredEnv("PF_TOKEN"),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PagueloFacil verify request failed with HTTP ${response.status}.`);
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
