import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";
import {
  buildEmailIdempotencyKey,
  getEmailConfig,
  normalizeEmail,
  type EmailAppSource,
  type EmailRecipientType,
} from "@/lib/email/config";
import { getResendClient } from "@/lib/email/resend";

type EmailStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED" | "DRY_RUN";

type SendTransactionalEmailArgs = {
  supabase: SupabaseClient;
  appSource: EmailAppSource;
  eventKey: string;
  template: string;
  recipientType: EmailRecipientType;
  toEmail: string | null | undefined;
  subject: string;
  react: ReactElement;
  reservationId?: string | null;
  paymentId?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
};

async function insertEmailLog(args: {
  supabase: SupabaseClient;
  appSource: EmailAppSource;
  eventKey: string;
  template: string;
  recipientType: EmailRecipientType;
  toEmail: string | null;
  subject: string;
  reservationId?: string | null;
  paymentId?: string | null;
  actorId?: string | null;
  payload?: Record<string, unknown>;
  status: EmailStatus;
  idempotencyKey: string;
  errorMessage?: string | null;
}) {
  const { data, error } = await args.supabase
    .from("email_delivery_log")
    .insert({
      app_source: args.appSource,
      event_key: args.eventKey,
      template: args.template,
      recipient_type: args.recipientType,
      to_email: args.toEmail,
      subject: args.subject,
      reservation_id: args.reservationId ?? null,
      payment_id: args.paymentId ?? null,
      actor_id: args.actorId ?? null,
      payload: args.payload ?? {},
      status: args.status,
      idempotency_key: args.idempotencyKey,
      error_message: args.errorMessage ?? null,
      sent_at: args.status === "DRY_RUN" ? new Date().toISOString() : null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") {
      console.error("email_delivery_log insert failed", error.message);
    }
    return null;
  }

  return data?.id ?? null;
}

async function updateEmailLog(
  supabase: SupabaseClient,
  id: string | null,
  values: {
    status: EmailStatus;
    resendEmailId?: string | null;
    errorMessage?: string | null;
  },
) {
  if (!id) return;
  const { error } = await supabase
    .from("email_delivery_log")
    .update({
      status: values.status,
      resend_email_id: values.resendEmailId ?? null,
      error_message: values.errorMessage ?? null,
      sent_at: values.status === "SENT" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("email_delivery_log update failed", error.message);
  }
}

export async function sendTransactionalEmail(args: SendTransactionalEmailArgs) {
  const config = getEmailConfig();
  const toEmail = normalizeEmail(args.toEmail);
  const idempotencyKey = buildEmailIdempotencyKey({
    appSource: args.appSource,
    eventKey: args.eventKey,
    template: args.template,
    toEmail,
    reservationId: args.reservationId,
    paymentId: args.paymentId,
  });

  const baseLog = {
    supabase: args.supabase,
    appSource: args.appSource,
    eventKey: args.eventKey,
    template: args.template,
    recipientType: args.recipientType,
    toEmail,
    subject: args.subject,
    reservationId: args.reservationId,
    paymentId: args.paymentId,
    actorId: args.actorId,
    payload: args.payload,
    idempotencyKey,
  };

  try {
    if (!toEmail) {
      await insertEmailLog({
        ...baseLog,
        status: "SKIPPED",
        errorMessage: "missing_or_invalid_recipient",
      });
      return { ok: true as const, skipped: true as const, reason: "missing_or_invalid_recipient" };
    }

    if (!config.enabled) {
      await insertEmailLog({ ...baseLog, status: "SKIPPED", errorMessage: "email_disabled" });
      return { ok: true as const, skipped: true as const, reason: "email_disabled" };
    }

    if (config.dryRun) {
      await insertEmailLog({ ...baseLog, status: "DRY_RUN" });
      return { ok: true as const, dryRun: true as const };
    }

    const logId = await insertEmailLog({ ...baseLog, status: "PENDING" });

    if (!config.apiKey || !config.from) {
      await updateEmailLog(args.supabase, logId, {
        status: "FAILED",
        errorMessage: "email_config_missing",
      });
      return { ok: false as const, error: "email_config_missing" };
    }

    const { data, error } = await getResendClient(config.apiKey).emails.send({
      from: config.from,
      to: toEmail,
      replyTo: config.replyTo ?? undefined,
      subject: args.subject,
      react: args.react,
    });

    if (error) {
      await updateEmailLog(args.supabase, logId, {
        status: "FAILED",
        errorMessage: error.message,
      });
      return { ok: false as const, error: error.message };
    }

    await updateEmailLog(args.supabase, logId, {
      status: "SENT",
      resendEmailId: data?.id ?? null,
    });
    return { ok: true as const, id: data?.id ?? null };
  } catch (error) {
    console.error("sendTransactionalEmail failed", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "unknown_email_error",
    };
  }
}
