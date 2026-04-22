"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { getDateLocale } from "@/i18n/format";
import { localizeHref, type AppLocale } from "@/i18n/routing";
import {
  getCatalogMessages,
  getLocalizedExtra,
  getLocalizedPackage,
} from "@/lib/localized-catalog";
import { siteData } from "@/lib/siteData";
import { fetchCatalog, type Extra } from "@/lib/supabase/catalog";
import { supabase } from "@/lib/supabase/client";

type ReservationItem = {
  id: string;
  reserved_date: string;
  start_at: string;
  end_at: string;
  status: string;
  total_amount: number | string | null;
  adults_count?: number | null;
  kids_count?: number | null;
  package_id?: string | null;
  packages?: { label?: string | null } | { label?: string | null }[] | null;
};

type ChangeRequestPayload = {
  reservationId: string;
  requestedAdults: number;
  requestedKids: number;
  requestedExtras: string[];
  note: string;
};

type HomeReservationNoticeProps = {
  reservations?: ReservationItem[];
  hasDraft?: boolean;
};

const EDITABLE_STATUS = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

function parsePanamaDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  return new Date(value);
}

function formatCurrency(value: number | string | null) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  return `$${Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2)}`;
}

function resolvePackageLabel(reservation: ReservationItem) {
  return Array.isArray(reservation.packages)
    ? reservation.packages[0]?.label
    : reservation.packages?.label;
}

export default function HomeReservationNotice({
  reservations: initialReservations = [],
  hasDraft: initialHasDraft = false,
}: HomeReservationNoticeProps) {
  const locale = useLocale() as AppLocale;
  const messages = useMessages();
  const t = useTranslations("account");
  const paymentT = useTranslations("payment");
  const { session } = useAuth();
  const catalog = getCatalogMessages(
    (messages as { booking?: { catalog?: unknown } }).booking?.catalog,
  );

  const [editingReservation, setEditingReservation] = useState<ReservationItem | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [extrasCatalog, setExtrasCatalog] = useState<Extra[]>([]);
  const [extrasError, setExtrasError] = useState<string | null>(null);
  const [requestedAdults, setRequestedAdults] = useState(0);
  const [requestedKids, setRequestedKids] = useState(0);
  const [requestedExtras, setRequestedExtras] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const localizedExtrasCatalog = useMemo(
    () => extrasCatalog.map((extra) => getLocalizedExtra(extra, catalog) ?? extra),
    [catalog, extrasCatalog],
  );

  const formatDate = (value: string) => {
    const date = parsePanamaDate(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(getDateLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/Panama",
    });
  };

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString(getDateLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Panama",
    });
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return paymentT("statusPending");
      case "CONFIRMED":
        return paymentT("statusConfirmed");
      case "CANCELLED":
        return paymentT("statusCancelled");
      case "COMPLETED":
        return paymentT("statusCompleted");
      case "NO_SHOW":
        return paymentT("statusNoShow");
      default:
        return status;
    }
  };

  const buildWhatsAppLink = (reservation: ReservationItem) => {
    const base = siteData.links.whatsapp;
    const rawLabel = reservation.package_id
      ? getLocalizedPackage(
          {
            id: reservation.package_id,
            label: resolvePackageLabel(reservation) ?? reservation.package_id,
            note: null,
            durationMinutes: 0,
            pricePerAdult: 0,
            kidDiscount: 0,
            minPeopleWeekday: 0,
            minPeopleWeekend: 0,
            minPeopleHoliday: 0,
          },
          catalog,
        )?.label
      : resolvePackageLabel(reservation);
    const message = [
      t("whatsapp.intro"),
      t("whatsapp.id", { value: String(reservation.id).slice(0, 8) }),
      t("whatsapp.date", { value: formatDate(reservation.reserved_date) }),
      t("whatsapp.time", {
        value: `${formatTime(reservation.start_at)} - ${formatTime(reservation.end_at)}`,
      }),
      rawLabel ? t("whatsapp.package", { value: rawLabel }) : null,
      t("whatsapp.total", { value: formatCurrency(reservation.total_amount) }),
      t("whatsapp.status", { value: paymentT("statusPending") }),
    ]
      .filter(Boolean)
      .join("\n");

    return `${base}?text=${encodeURIComponent(message)}`;
  };

  useEffect(() => {
    let active = true;

    const loadExtras = async () => {
      try {
        const catalogData = await fetchCatalog();
        if (!active) return;
        setExtrasCatalog(catalogData.extras);
      } catch (error) {
        if (!active) return;
        setExtrasError(
          error instanceof Error ? error.message : t("errors.loadExtras"),
        );
      }
    };

    void loadExtras();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;

    const loadProfileAndReservations = async () => {
      const user = session.user;
      const [profileResult, reservationsResponse, draftResult] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        fetch("/api/my-reservations", { cache: "no-store" }).then((response) =>
          response.json().then((data) => ({ ok: response.ok, data })),
        ),
        supabase.from("reservation_drafts").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      if (!active) return;

      const nameFromMeta =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;
      setProfileName(profileResult.data?.full_name ?? nameFromMeta);

      if (reservationsResponse.ok && Array.isArray(reservationsResponse.data?.reservations)) {
        setReservations(reservationsResponse.data.reservations as ReservationItem[]);
      }

      setHasDraft(Boolean(draftResult.data?.user_id));
    };

    void loadProfileAndReservations();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!editingReservation) return;
    setRequestedAdults(editingReservation.adults_count ?? 0);
    setRequestedKids(editingReservation.kids_count ?? 0);
    setRequestedExtras(
      Object.fromEntries(localizedExtrasCatalog.map((extra) => [extra.id, false])),
    );
    setNote("");
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [editingReservation, localizedExtrasCatalog]);

  const pendingReservations = useMemo(
    () => reservations.filter((item) => item.status === "PENDING_PAYMENT"),
    [reservations],
  );

  const handleToggleExtra = (id: string) => {
    setRequestedExtras((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmitRequest = async () => {
    if (!editingReservation) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload: ChangeRequestPayload = {
        reservationId: editingReservation.id,
        requestedAdults,
        requestedKids,
        requestedExtras: Object.entries(requestedExtras)
          .filter(([, value]) => value)
          .map(([id]) => id),
        note: note.trim(),
      };

      const response = await fetch("/api/reservations/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? t("errors.submitRequest"));
      }

      setSubmitSuccess(t("changeRequest.success"));
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : t("errors.submitRequest"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 pt-8">
      <div className="rounded-[2.5rem] border border-border/70 bg-card/90 p-5 shadow-xl shadow-black/5">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {profileName ? t("welcomeNamed", { name: profileName }) : t("welcome")}
          </h2>
          {(reservations.length > 0 || hasDraft) && (
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          )}
        </div>

        {hasDraft && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{t("draft.message")}</span>
            <Link
              href={localizeHref(locale, "/reservar?draft=1")}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
            >
              {t("draft.cta")}
            </Link>
          </div>
        )}

        {reservations.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {t("reservations.eyebrow")}
              </p>
              <Link
                href={localizeHref(locale, "/reservar")}
                className="text-xs font-semibold text-primary"
              >
                {t("reservations.manage")}
              </Link>
            </div>

            {reservations.map((reservation) => {
              const rawLabel = reservation.package_id
                ? getLocalizedPackage(
                    {
                      id: reservation.package_id,
                      label: resolvePackageLabel(reservation) ?? reservation.package_id,
                      note: null,
                      durationMinutes: 0,
                      pricePerAdult: 0,
                      kidDiscount: 0,
                      minPeopleWeekday: 0,
                      minPeopleWeekend: 0,
                      minPeopleHoliday: 0,
                    },
                    catalog,
                  )?.label
                : resolvePackageLabel(reservation);
              const isEditable = EDITABLE_STATUS.has(reservation.status);
              const isPending = reservation.status === "PENDING_PAYMENT";

              return (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        {t("reservations.id", { value: String(reservation.id).slice(0, 8) })}
                      </p>
                      <p className="mt-1 text-base font-semibold">
                        {rawLabel ?? t("reservations.fallbackPackage")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(reservation.reserved_date)} · {formatTime(reservation.start_at)} -{" "}
                        {formatTime(reservation.end_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(reservation.total_amount)}
                      </p>
                      <p
                        className={`text-xs ${
                          isPending ? "text-amber-600" : "text-muted-foreground"
                        }`}
                      >
                        {formatStatus(reservation.status)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingReservation(reservation)}
                      disabled={!isEditable}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isEditable
                          ? "border border-border/70 text-foreground"
                          : "border border-border/30 text-muted-foreground"
                      }`}
                    >
                      {t("reservations.requestChanges")}
                    </button>
                    {isPending && (
                      <Link
                        href={localizeHref(locale, `/reservar/pago?rid=${reservation.id}`)}
                        className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                      >
                        {t("reservations.pay")}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reservations.length > 0 && pendingReservations.length === 0 && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            {t("reservations.allConfirmed")}
          </div>
        )}
      </div>

      {editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t("changeRequest.eyebrow")}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  {t("reservations.id", { value: String(editingReservation.id).slice(0, 8) })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(editingReservation.reserved_date)} · {formatTime(editingReservation.start_at)} -{" "}
                  {formatTime(editingReservation.end_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingReservation(null)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs font-semibold"
              >
                {t("changeRequest.close")}
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <p className="text-xs text-muted-foreground">{t("changeRequest.help")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  {t("changeRequest.adults", {
                    count: editingReservation.adults_count ?? 0,
                  })}
                  <input
                    type="number"
                    min={editingReservation.adults_count ?? 0}
                    value={requestedAdults}
                    onChange={(event) =>
                      setRequestedAdults(
                        Math.max(
                          editingReservation.adults_count ?? 0,
                          Number(event.target.value || 0),
                        ),
                      )
                    }
                    className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  />
                </label>
                <label className="space-y-1">
                  {t("changeRequest.kids", {
                    count: editingReservation.kids_count ?? 0,
                  })}
                  <input
                    type="number"
                    min={editingReservation.kids_count ?? 0}
                    value={requestedKids}
                    onChange={(event) =>
                      setRequestedKids(
                        Math.max(
                          editingReservation.kids_count ?? 0,
                          Number(event.target.value || 0),
                        ),
                      )
                    }
                    className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-foreground"
                  />
                </label>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t("changeRequest.extras")}
                </p>
                {extrasError && <p className="mt-2 text-xs text-rose-600">{extrasError}</p>}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {localizedExtrasCatalog.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("changeRequest.noExtras")}</p>
                  ) : (
                    localizedExtrasCatalog.map((extra) => (
                      <label
                        key={extra.id}
                        className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={requestedExtras[extra.id] ?? false}
                          onChange={() => handleToggleExtra(extra.id)}
                        />
                        <span className="text-foreground">{extra.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <label className="space-y-1 text-sm text-muted-foreground">
                {t("changeRequest.note")}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
                  placeholder={t("changeRequest.notePlaceholder")}
                />
              </label>
            </div>

            {(submitError || submitSuccess) && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${
                  submitError
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {submitError ?? submitSuccess}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setEditingReservation(null)}
                className="w-full rounded-full border border-border/70 px-4 py-2 text-xs font-semibold"
              >
                {t("changeRequest.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
                className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                {isSubmitting ? t("changeRequest.sending") : t("changeRequest.submit")}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 px-4 py-3 text-xs text-muted-foreground">
              <a
                href={buildWhatsAppLink(editingReservation)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#25D366]"
              >
                {t("changeRequest.whatsapp")}
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

