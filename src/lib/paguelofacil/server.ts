import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTransactionCardBrand,
  getTransactionCardLast4,
  getTransactionAmount,
  getTransactionEmail,
  getTransactionFee,
  getTransactionMessage,
  getTransactionNetAmount,
  getTransactionOperationType,
  isApproved,
  verifyTransaction,
} from "@/lib/paguelofacil/client";

type AdminClient = SupabaseClient;

type PaymentRow = {
  id: string;
  invoice_id: string;
  provider: string;
  status: string;
  amount: number | string;
  provider_ref: string | null;
  meta: Record<string, unknown> | null;
  gateway?: string | null;
  gateway_flow?: string | null;
  amount_type?: string | null;
  expected_amount?: number | string | null;
  link_url?: string | null;
  link_code?: string | null;
  link_created_at?: string | null;
  link_expires_at?: string | null;
  link_status?: string | null;
  customer_email_snapshot?: string | null;
  customer_name_snapshot?: string | null;
  customer_phone_snapshot?: string | null;
  provider_status?: string | null;
  provider_auth_status?: string | null;
  provider_message?: string | null;
  provider_amount?: number | string | null;
  provider_fee?: number | string | null;
  provider_net_amount?: number | string | null;
  provider_verified_at?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  provider_operation_type?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type InvoiceRow = {
  id: string;
  status: string;
  total: number | string;
  payments: PaymentRow[] | PaymentRow | null;
};

type ReservationPaymentContext = {
  reservation: {
    id: string;
    status: string;
    total_amount: number | string | null;
    deposit_amount?: number | string | null;
    payment_method?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
  };
  invoice: InvoiceRow | null;
  payments: PaymentRow[];
};

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function objectFromUnknown(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function paymentAmountMatches(expected: number, actual: number | null) {
  return actual != null && Math.abs(roundCurrency(expected) - roundCurrency(actual)) <= 0.01;
}

function normalizeProviderStatus(value: unknown) {
  return value == null ? null : String(value).trim() || null;
}

function buildVerifiedPaymentFields(args: {
  tx: Awaited<ReturnType<typeof verifyTransaction>>;
  verifiedAmount: number | null;
  verifiedAt: string;
  linkStatus: "PAID" | "ACTIVE" | "FAILED";
}) {
  return {
    provider_status: normalizeProviderStatus(args.tx?.status),
    provider_auth_status: normalizeProviderStatus(args.tx?.authStatus),
    provider_message: getTransactionMessage(args.tx),
    provider_amount: args.verifiedAmount,
    provider_fee: getTransactionFee(args.tx),
    provider_net_amount: getTransactionNetAmount(args.tx),
    provider_verified_at: args.verifiedAt,
    card_brand: getTransactionCardBrand(args.tx),
    card_last4: getTransactionCardLast4(args.tx),
    provider_operation_type: getTransactionOperationType(args.tx),
    customer_email_snapshot: getTransactionEmail(args.tx),
    link_status: args.linkStatus,
  };
}

export async function getReservationPaymentContext(
  admin: AdminClient,
  reservationId: string,
): Promise<ReservationPaymentContext | null> {
  const { data: reservation } = await admin
    .from("reservations")
    .select(
      "id,status,total_amount,deposit_amount,payment_method,customer_id,customer_name,customer_email,customer_phone,invoices(id,status,total,payments(id,invoice_id,provider,status,amount,provider_ref,meta,gateway,gateway_flow,amount_type,expected_amount,link_url,link_code,link_created_at,link_expires_at,link_status,customer_email_snapshot,customer_name_snapshot,customer_phone_snapshot,provider_status,provider_auth_status,provider_message,provider_amount,provider_fee,provider_net_amount,provider_verified_at,card_brand,card_last4,provider_operation_type,paid_at,created_at))",
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return null;

  const rawInvoices = reservation.invoices;
  const invoice = Array.isArray(rawInvoices)
    ? (rawInvoices[0] as InvoiceRow | undefined) ?? null
    : (rawInvoices as InvoiceRow | null);
  const rawPayments = invoice?.payments;
  const payments = Array.isArray(rawPayments)
    ? [...rawPayments]
    : rawPayments
      ? [rawPayments]
      : [];

  payments.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  return {
    reservation: {
      id: reservation.id,
      status: reservation.status,
      total_amount: reservation.total_amount,
      deposit_amount: reservation.deposit_amount,
      payment_method: reservation.payment_method,
      customer_id: reservation.customer_id,
      customer_name: reservation.customer_name,
      customer_email: reservation.customer_email,
      customer_phone: reservation.customer_phone,
    },
    invoice,
    payments,
  };
}

export async function insertPaymentEvent(
  admin: AdminClient,
  event: {
    paymentId?: string | null;
    reservationId: string;
    provider?: "CARD" | "YAPPY";
    eventType: "CREATE_LINK" | "RETURN" | "WEBHOOK" | "VERIFY" | "RECONCILE";
    providerRef?: string | null;
    status?: string | null;
    amount?: number | null;
    customerEmail?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  await admin.from("payment_provider_events").insert({
    payment_id: event.paymentId ?? null,
    reservation_id: event.reservationId,
    provider: event.provider ?? "CARD",
    event_type: event.eventType,
    provider_ref: event.providerRef ?? null,
    status: event.status ?? null,
    amount: event.amount ?? null,
    customer_email: event.customerEmail ?? null,
    payload: event.payload ?? {},
  });
}

export async function syncInvoiceStatus(admin: AdminClient, invoiceId: string) {
  const { data: payments } = await admin
    .from("payments")
    .select("status,amount")
    .eq("invoice_id", invoiceId);

  const { data: invoice } = await admin
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return null;

  const paidAmount = (payments ?? [])
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const total = Number(invoice.total ?? 0);
  const status = paidAmount <= 0 ? "DUE" : paidAmount >= total ? "PAID" : "PARTIALLY_PAID";

  await admin.from("invoices").update({ status }).eq("id", invoiceId);
  return status;
}

export async function applyVerifiedPagueloFacilPayment(args: {
  admin: AdminClient;
  reservationId: string;
  paymentId?: string | null;
  codOper: string;
  expectedAmount?: number | null;
  source: "return" | "webhook" | "admin";
  rawPayload: Record<string, unknown>;
}) {
  const tx = await verifyTransaction(args.codOper);
  const verifiedAmount = getTransactionAmount(tx);
  const approved = isApproved(tx);
  const verifiedAt = new Date().toISOString();

  await insertPaymentEvent(args.admin, {
    paymentId: args.paymentId ?? null,
    reservationId: args.reservationId,
    eventType: "VERIFY",
    providerRef: args.codOper,
    status: approved ? "APPROVED" : "DECLINED",
    amount: verifiedAmount,
    customerEmail: getTransactionEmail(tx),
    payload: {
      source: args.source,
      transaction: tx ?? null,
    },
  });

  const context = await getReservationPaymentContext(args.admin, args.reservationId);
  if (!context?.invoice?.id) {
    return { ok: false as const, reason: "payment_context_not_found", tx, verifiedAmount };
  }

  const existingSucceeded = context.payments.find(
    (payment) =>
      payment.provider === "CARD" &&
      payment.status === "SUCCEEDED" &&
      payment.provider_ref === args.codOper,
  );

  if (existingSucceeded?.id) {
    await args.admin
      .from("payments")
      .update(
        buildVerifiedPaymentFields({
          tx,
          verifiedAmount,
          verifiedAt,
          linkStatus: "PAID",
        }),
      )
      .eq("id", existingSucceeded.id);

    const invoiceStatus = await syncInvoiceStatus(args.admin, context.invoice.id);
    return { ok: true as const, invoiceStatus, tx, verifiedAmount, idempotent: true };
  }

  const targetPayment =
    (args.paymentId
      ? context.payments.find((payment) => payment.id === args.paymentId)
      : null) ??
    context.payments.find(
      (payment) =>
        payment.provider === "CARD" &&
        (payment.provider_ref === args.codOper ||
          (payment.status === "PENDING" && payment.gateway === "paguelofacil")),
    ) ??
    null;

  const telemetryFields = buildVerifiedPaymentFields({
    tx,
    verifiedAmount,
    verifiedAt,
    linkStatus: approved ? "PAID" : "FAILED",
  });

  if (targetPayment?.id) {
    await args.admin.from("payments").update(telemetryFields).eq("id", targetPayment.id);
  }

  if (!approved) {
    return { ok: false as const, reason: "not_approved", tx, verifiedAmount };
  }

  const expectedAmount =
    args.expectedAmount ??
    (targetPayment?.expected_amount != null ? Number(targetPayment.expected_amount) : null) ??
    (targetPayment ? Number(targetPayment.amount ?? 0) : null);

  if (
    expectedAmount == null ||
    !Number.isFinite(expectedAmount) ||
    !paymentAmountMatches(expectedAmount, verifiedAmount)
  ) {
    return { ok: false as const, reason: "amount_mismatch", tx, verifiedAmount };
  }

  const meta = {
    ...objectFromUnknown(targetPayment?.meta),
    gateway: "paguelofacil",
    flow: "paguelofacil_link",
    codOper: args.codOper,
    verified_at: verifiedAt,
    verified_source: args.source,
    verified_amount: verifiedAmount,
    pf_transaction: tx,
    pf_payload: args.rawPayload,
  };

  if (targetPayment?.id) {
    await args.admin
      .from("payments")
      .update({
        status: "SUCCEEDED",
        provider_ref: args.codOper,
        paid_at: verifiedAt,
        meta,
        gateway: "paguelofacil",
        gateway_flow: "paguelofacil_link",
        expected_amount: expectedAmount,
        provider_status: telemetryFields.provider_status,
        provider_auth_status: telemetryFields.provider_auth_status,
        provider_message: telemetryFields.provider_message,
        provider_amount: telemetryFields.provider_amount,
        provider_fee: telemetryFields.provider_fee,
        provider_net_amount: telemetryFields.provider_net_amount,
        provider_verified_at: telemetryFields.provider_verified_at,
        card_brand: telemetryFields.card_brand,
        card_last4: telemetryFields.card_last4,
        provider_operation_type: telemetryFields.provider_operation_type,
        customer_email_snapshot:
          telemetryFields.customer_email_snapshot ?? targetPayment.customer_email_snapshot ?? null,
        link_status: "PAID",
      })
      .eq("id", targetPayment.id);
  } else {
    await args.admin.from("payments").insert({
      invoice_id: context.invoice.id,
      provider: "CARD",
      status: "SUCCEEDED",
      amount: expectedAmount,
      provider_ref: args.codOper,
      paid_at: verifiedAt,
      meta,
      gateway: "paguelofacil",
      gateway_flow: "paguelofacil_link",
      amount_type: "manual",
      expected_amount: expectedAmount,
      provider_status: telemetryFields.provider_status,
      provider_auth_status: telemetryFields.provider_auth_status,
      provider_message: telemetryFields.provider_message,
      provider_amount: telemetryFields.provider_amount,
      provider_fee: telemetryFields.provider_fee,
      provider_net_amount: telemetryFields.provider_net_amount,
      provider_verified_at: telemetryFields.provider_verified_at,
      card_brand: telemetryFields.card_brand,
      card_last4: telemetryFields.card_last4,
      provider_operation_type: telemetryFields.provider_operation_type,
      customer_email_snapshot: telemetryFields.customer_email_snapshot,
      link_status: "PAID",
    });
  }

  const invoiceStatus = await syncInvoiceStatus(args.admin, context.invoice.id);
  await args.admin
    .from("reservations")
    .update({ status: "CONFIRMED" })
    .eq("id", args.reservationId)
    .neq("status", "CONFIRMED");

  return { ok: true as const, invoiceStatus, tx, verifiedAmount };
}

export function getCodOper(payload: Record<string, unknown>) {
  return String(payload.codOper ?? payload.CodOper ?? payload.Oper ?? payload.oper ?? "").trim();
}

export function getPayloadStatus(payload: Record<string, unknown>) {
  return String(payload.Estado ?? payload.estado ?? payload.status ?? payload.Status ?? "").trim();
}

export function getPayloadAmount(payload: Record<string, unknown>) {
  const raw = payload.TotalPagado ?? payload.totalPagado ?? payload.totalPay ?? payload.TotalPay;
  const amount = Number(raw);
  return Number.isFinite(amount) ? roundCurrency(amount) : null;
}
