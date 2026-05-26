export type EmailAppSource = "admin" | "client";
export type EmailRecipientType = "customer" | "admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string | null | undefined) {
  return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function shouldSkipRecipient(value: string | null | undefined) {
  return !isEmailAddress(value);
}

export function normalizeEmail(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();
  return isEmailAddress(trimmed) ? trimmed : null;
}

export function parseAdminNotificationEmails(value: string | null | undefined) {
  const seen = new Set<string>();
  return String(value ?? "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export function envFlag(value: string | null | undefined, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getEmailConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    enabled: envFlag(env.EMAIL_ENABLED, true),
    dryRun: envFlag(env.EMAIL_DRY_RUN, false),
    apiKey: env.RESEND_API_KEY ?? null,
    from: env.EMAIL_FROM ?? null,
    replyTo: env.EMAIL_REPLY_TO ?? null,
    adminEmails: parseAdminNotificationEmails(env.ADMIN_NOTIFICATION_EMAILS),
    clientAppUrl: (env.NEXT_PUBLIC_CLIENT_APP_URL ?? env.CLIENT_APP_URL ?? "").replace(/\/$/, ""),
    adminAppUrl: (env.NEXT_PUBLIC_ADMIN_APP_URL ?? env.ADMIN_APP_URL ?? "").replace(/\/$/, ""),
  };
}

export function buildEmailIdempotencyKey(args: {
  appSource: EmailAppSource;
  eventKey: string;
  template: string;
  toEmail: string | null | undefined;
  reservationId?: string | null;
  paymentId?: string | null;
}) {
  return [
    args.appSource,
    args.eventKey,
    args.template,
    normalizeEmail(args.toEmail) ?? "no-recipient",
    args.reservationId ?? "no-reservation",
    args.paymentId ?? "no-payment",
  ].join(":");
}
