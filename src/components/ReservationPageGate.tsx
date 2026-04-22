"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import HomeReservationNotice from "@/components/HomeReservationNotice";
import ReservationWizard from "@/components/reservar/ReservationWizard";

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

const ACTIVE_STATUS = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

export default function ReservationPageGate() {
  const t = useTranslations("booking.page");
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);

  useEffect(() => {
    if (!session) {
      setReservations([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const loadReservations = async () => {
      try {
        const response = await fetch("/api/my-reservations", { cache: "no-store" });
        const result = await response.json();
        if (!active) return;

        if (response.ok && Array.isArray(result?.reservations)) {
          setReservations(result.reservations as ReservationItem[]);
        } else {
          setReservations([]);
        }
      } catch {
        if (!active) return;
        setReservations([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadReservations();

    return () => {
      active = false;
    };
  }, [session]);

  const activeReservations = useMemo(
    () => reservations.filter((item) => ACTIVE_STATUS.has(item.status)),
    [reservations],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (session && activeReservations.length > 0) {
    return <HomeReservationNotice reservations={activeReservations} />;
  }

  return <ReservationWizard mode="page" />;
}

