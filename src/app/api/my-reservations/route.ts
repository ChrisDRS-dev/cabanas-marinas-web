import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function getPanamaTodayYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isReusablePagueloFacilLink(payment: {
  status?: string | null;
  link_status?: string | null;
  link_url?: string | null;
  link_expires_at?: string | null;
  provider_message?: string | null;
}) {
  if (
    payment.status !== "PENDING" ||
    payment.link_status !== "ACTIVE" ||
    !payment.link_url ||
    payment.provider_message
  ) {
    return false;
  }
  if (!payment.link_expires_at) return true;
  const expiresAt = new Date(payment.link_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }

  const today = getPanamaTodayYMD();
  const cleanupBase = supabase
    .from("reservations")
    .update({ status: "CANCELLED" })
    .eq("status", "PENDING_PAYMENT")
    .lt("reserved_date", today)
    .eq("customer_id", user.id);

  await cleanupBase;

  const base = supabase
    .from("reservations")
    .select(
      "id,reserved_date,start_at,end_at,status,total_amount,deposit_amount,payment_method,package_id,adults_count,kids_count,packages(label),invoices(status,payments(id,provider,status,provider_ref,amount,paid_at,created_at,gateway,amount_type,expected_amount,link_url,link_code,link_status,link_expires_at,provider_verified_at,provider_message))"
    );
  const { data, error } = await base
    .eq("customer_id", user.id)
    .order("reserved_date", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ reservations: [] }, { status: 200 });
  }

  const reservations = (data ?? []).map((reservation) => {
    const invoices = Array.isArray(reservation.invoices)
      ? reservation.invoices
      : reservation.invoices
      ? [reservation.invoices]
      : [];
    const invoice = invoices[0] ?? null;
    const payments = Array.isArray(invoice?.payments)
      ? [...invoice.payments].sort((a, b) =>
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
        )
      : [];
    const payment = payments[0] ?? null;
    const paguelofacilPayments = payments.filter(
      (p) =>
        p.provider === "CARD" &&
        (p.gateway === "paguelofacil" || Boolean(p.link_url))
    );
    const paguelofacilPayment =
      paguelofacilPayments.find((p) => isReusablePagueloFacilLink(p)) ??
      paguelofacilPayments[0] ??
      null;
    const exposePagueloFacilLink =
      paguelofacilPayment != null && isReusablePagueloFacilLink(paguelofacilPayment);

    const paidAmount = payments
      .filter((p) => p.status === "SUCCEEDED")
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    const totalAmount = Number(reservation.total_amount ?? 0);
    const balanceDue = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);

    return {
      ...reservation,
      invoice_status: invoice?.status ?? null,
      payment_status: payment?.status ?? null,
      payment_provider_ref: payment?.provider_ref ?? null,
      payment_amount: payment?.amount ?? null,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      paguelofacil_payment: paguelofacilPayment
        ? {
            payment_id: paguelofacilPayment.id ?? null,
            amount: paguelofacilPayment.amount ?? null,
            amount_type: paguelofacilPayment.amount_type ?? null,
            expected_amount: paguelofacilPayment.expected_amount ?? null,
            status: paguelofacilPayment.status ?? null,
            link_url: exposePagueloFacilLink ? paguelofacilPayment.link_url ?? null : null,
            link_code: paguelofacilPayment.link_code ?? null,
            link_status: paguelofacilPayment.link_status ?? null,
            link_expires_at: paguelofacilPayment.link_expires_at ?? null,
            provider_ref: paguelofacilPayment.provider_ref ?? null,
            provider_verified_at: paguelofacilPayment.provider_verified_at ?? null,
          }
        : null,
      paguelofacil_payment_id: paguelofacilPayment?.id ?? null,
      paguelofacil_amount: paguelofacilPayment?.amount ?? null,
      paguelofacil_amount_type: paguelofacilPayment?.amount_type ?? null,
      paguelofacil_link_url: exposePagueloFacilLink ? paguelofacilPayment?.link_url ?? null : null,
      paguelofacil_link_code: paguelofacilPayment?.link_code ?? null,
      paguelofacil_link_status: paguelofacilPayment?.link_status ?? null,
      paguelofacil_link_expires_at: paguelofacilPayment?.link_expires_at ?? null,
      paguelofacil_provider_ref: paguelofacilPayment?.provider_ref ?? null,
      paguelofacil_provider_verified_at: paguelofacilPayment?.provider_verified_at ?? null,
    };
  });

  return NextResponse.json({ reservations });
}
