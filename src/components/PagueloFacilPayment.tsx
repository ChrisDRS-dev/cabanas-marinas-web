"use client";

import { useState } from "react";

type Props = {
  reservationId: string | null;
  depositAmount: number | string | null | undefined;
  disabled?: boolean;
  blockedReason?: string | null;
};

function formatCurrency(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  return `$${Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2)}`;
}

export default function PagueloFacilPayment({
  reservationId,
  depositAmount,
  disabled,
  blockedReason,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (loading || disabled || !reservationId) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/payments/paguelofacil/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      const data = await res.json().catch(() => null) as
        | { url?: string; error?: string; detail?: string }
        | null;

      if (!res.ok || !data?.url) {
        const message =
          data?.detail ?? data?.error ?? "No se pudo iniciar el pago. Intenta de nuevo.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("No se pudo conectar con el sistema de pagos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (blockedReason) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-500">{blockedReason}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Serás redirigido al checkout seguro de PagueloFacil para pagar{" "}
        <span className="font-semibold text-foreground">
          {formatCurrency(depositAmount)}
        </span>{" "}
        con Visa, Mastercard o CLAVE. Después del pago, envíanos el comprobante por WhatsApp para confirmar tu reserva.
      </p>

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={loading || disabled || !reservationId}
        className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Preparando pago..." : `Pagar ${formatCurrency(depositAmount)}`}
      </button>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <p className="text-[11px] text-muted-foreground/70">
        Pago procesado por PagueloFacil · TLS 1.3 · No almacenamos datos de tarjeta.
      </p>
      <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500">
        La reserva se confirma manualmente tras verificar el comprobante.
      </p>
    </div>
  );
}
