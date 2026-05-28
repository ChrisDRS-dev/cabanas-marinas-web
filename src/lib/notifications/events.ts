import type { SupabaseClient } from "@supabase/supabase-js";

export type ReservationEmailData = {
  reservationId: string;
  paymentId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  reservedDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  packageName?: string | null;
  cabinName?: string | null;
  cabinCode?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  amount?: number | null;
  reason?: string | null;
  paymentMethod?: string | null;
  paymentUrl?: string | null;
  clientUrl?: string | null;
  adminUrl?: string | null;
  supportUrl?: string | null;
  note?: string | null;
};

type NotifyArgs = {
  supabase: SupabaseClient;
  data: ReservationEmailData;
  actorId?: string | null;
  paymentId?: string | null;
};

type ReservationRow = {
  id: string;
  reserved_date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status?: string | null;
  total_amount?: number | string | null;
  deposit_amount?: number | string | null;
  payment_method?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  cabin_id?: string | null;
  cabin_code?: string | null;
  package_id?: string | null;
};

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ??
    process.env.CLIENT_APP_URL ??
    "https://cabanasmarinas.vercel.app"
  ).replace(/\/$/, "");
}

function adminUrl() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ??
    process.env.ADMIN_APP_URL ??
    "https://admin-cabanas-marinas.vercel.app"
  ).replace(/\/$/, "");
}

function buildIdempotencyKey(args: {
  eventKey: string;
  reservationId?: string | null;
  paymentId?: string | null;
  actorId?: string | null;
  suffix?: string | null;
}) {
  return [
    "client",
    args.eventKey,
    args.reservationId ?? "no-reservation",
    args.paymentId ?? "no-payment",
    args.actorId ?? "system",
    args.suffix ?? "v1",
  ].join(":");
}

function formatTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-PA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama",
  }).format(date);
}

async function triggerAdminProcessor() {
  const baseUrl = process.env.ADMIN_NOTIFICATIONS_API_URL?.replace(/\/$/, "");
  const token = process.env.INTERNAL_NOTIFICATIONS_TOKEN?.trim();
  if (!baseUrl || !token) {
    console.warn("triggerAdminProcessor: missing internal notification env");
    return;
  }

  try {
    const response = await fetch(`${baseUrl}/api/internal/notifications/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      console.error("triggerAdminProcessor: failed", response.status);
    }
  } catch (error) {
    console.error(
      "triggerAdminProcessor: request_failed",
      error instanceof Error ? error.message : error,
    );
  }
}

async function enqueue(args: {
  supabase: SupabaseClient;
  eventKey: string;
  data: ReservationEmailData;
  actorId?: string | null;
  paymentId?: string | null;
  suffix?: string | null;
  message?: string | null;
}) {
  const { error } = await args.supabase.from("notification_events").upsert(
    {
      event_key: args.eventKey,
      source_app: "client",
      reservation_id: args.data.reservationId,
      payment_id: args.paymentId ?? args.data.paymentId ?? null,
      actor_id: args.actorId ?? null,
      payload: {
        data: args.data,
        message: args.message ?? undefined,
        adminUrl: args.data.adminUrl ?? null,
        clientUrl: args.data.clientUrl ?? null,
      },
      status: "PENDING",
      last_error: null,
      idempotency_key: buildIdempotencyKey({
        eventKey: args.eventKey,
        reservationId: args.data.reservationId,
        paymentId: args.paymentId ?? args.data.paymentId,
        actorId: args.actorId,
        suffix: args.suffix,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );

  if (error) {
    console.error("enqueue notification event failed", error.message);
    return;
  }

  await triggerAdminProcessor();
}

export async function getReservationEmailData(
  supabase: SupabaseClient,
  reservationId: string,
  overrides: Partial<ReservationEmailData> = {},
): Promise<ReservationEmailData> {
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  const reservation = data as ReservationRow | null;

  return {
    reservationId,
    customerId: overrides.customerId ?? reservation?.customer_id ?? null,
    customerName: overrides.customerName ?? reservation?.customer_name ?? null,
    customerEmail: overrides.customerEmail ?? reservation?.customer_email ?? null,
    customerPhone: overrides.customerPhone ?? reservation?.customer_phone ?? null,
    reservedDate: overrides.reservedDate ?? reservation?.reserved_date ?? null,
    startTime: overrides.startTime ?? formatTime(reservation?.start_at),
    endTime: overrides.endTime ?? formatTime(reservation?.end_at),
    packageName: overrides.packageName ?? null,
    cabinName: overrides.cabinName ?? null,
    cabinCode: overrides.cabinCode ?? reservation?.cabin_code ?? null,
    status: overrides.status ?? reservation?.status ?? null,
    totalAmount: overrides.totalAmount ?? toNumber(reservation?.total_amount),
    depositAmount: overrides.depositAmount ?? toNumber(reservation?.deposit_amount),
    paymentMethod: overrides.paymentMethod ?? reservation?.payment_method ?? null,
    paymentId: overrides.paymentId ?? null,
    paymentUrl: `${appUrl()}/reservar/pago`,
    clientUrl: `${appUrl()}/reservar/pago`,
    adminUrl: `${adminUrl()}/reservas/${reservationId}`,
    supportUrl: "https://wa.me/",
    note: overrides.note ?? null,
  };
}

export async function notifyReservationPendingPayment(args: NotifyArgs) {
  await enqueue({
    ...args,
    eventKey: "reservation.created.pending_payment",
    message: "Reserva pública creada y pendiente de pago.",
  });
}

export async function notifyPaymentLinkGenerated(args: NotifyArgs) {
  await enqueue({
    ...args,
    eventKey: "payment.link.generated",
    message: "Cliente generó o reutilizó un enlace de pago.",
    suffix: args.paymentId ?? args.data.paymentId ?? "link",
  });
}

export async function notifyPaymentConfirmed(args: NotifyArgs) {
  await enqueue({
    ...args,
    eventKey: "payment.confirmed",
    message: "Pago confirmado desde el flujo público.",
    suffix: args.paymentId ?? args.data.paymentId ?? "confirmed",
  });
}

export async function notifyPaymentFailed(args: NotifyArgs) {
  await enqueue({
    ...args,
    eventKey: "payment.failed",
    message: "Pago fallido desde el flujo público.",
    suffix: args.paymentId ?? args.data.paymentId ?? "failed",
  });
}

export async function notifyChangeRequestCreated(args: NotifyArgs) {
  await enqueue({
    ...args,
    eventKey: "reservation.change_requested",
    message: "Cliente solicitó cambios en una reserva.",
    suffix: `change-request:${Date.now()}`,
  });
}
