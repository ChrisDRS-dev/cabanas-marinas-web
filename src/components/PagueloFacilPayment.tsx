"use client";

import { useState } from "react";
import { siteData } from "@/lib/siteData";

type Props = {
  reservationId: string | null;
  depositAmount: number | string | null | undefined;
  disabled?: boolean;
  blockedReason?: string | null;
};

type ModalState = "closed" | "loading" | "ready" | "paid";

function formatCurrency(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(parsed)) return "$0";
  return `$${Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2)}`;
}

function buildWhatsAppLink(reservationId: string | null) {
  const lines = [
    "Hola, realicé mi pago con tarjeta y adjunto el comprobante para confirmar mi reserva.",
    reservationId ? `ID de reserva: ${reservationId.slice(0, 8).toUpperCase()}` : null,
  ].filter(Boolean) as string[];
  return `${siteData.links.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

const TUTORIAL_STEPS = [
  {
    num: "1",
    icon: "🔗",
    text: 'Haz click en "Ir al checkout" para abrir el formulario de pago seguro.',
  },
  {
    num: "2",
    icon: "💳",
    text: "Ingresa los datos de tu tarjeta (Visa, Mastercard o CLAVE) y completa el pago.",
  },
  {
    num: "3",
    icon: "📸",
    text: "Cuando el pago sea aprobado, toma una captura de pantalla del comprobante.",
  },
  {
    num: "4",
    icon: "💬",
    text: "Envíanos la captura por WhatsApp con tu ID de reserva para que confirmemos tu reserva.",
  },
];

export default function PagueloFacilPayment({
  reservationId,
  depositAmount,
  disabled,
  blockedReason,
}: Props) {
  const [modal, setModal] = useState<ModalState>("closed");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (disabled || !reservationId) return;
    setError(null);
    setModal("loading");

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
          data?.detail ?? data?.error ?? "No se pudo generar el link de pago. Intenta de nuevo.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
        setModal("closed");
        return;
      }

      setCheckoutUrl(data.url);
      setModal("ready");
    } catch {
      setError("No se pudo conectar con el sistema de pagos. Intenta de nuevo.");
      setModal("closed");
    }
  };

  const handleClose = () => {
    setModal("closed");
    setCheckoutUrl(null);
  };

  if (blockedReason) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-500">{blockedReason}</p>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Paga el depósito de{" "}
          <span className="font-semibold text-foreground">{formatCurrency(depositAmount)}</span>{" "}
          con Visa, Mastercard o CLAVE a través de PagueloFacil.
        </p>

        <button
          type="button"
          onClick={() => void handleOpen()}
          disabled={modal === "loading" || disabled || !reservationId}
          className="flex w-full items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {modal === "loading" ? "Generando link..." : `Pagar ${formatCurrency(depositAmount)}`}
        </button>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}

        <p className="text-[11px] text-muted-foreground/70">
          Pago procesado por PagueloFacil · TLS 1.3 · No almacenamos datos de tarjeta.
        </p>
      </div>

      {/* Modal — bottom sheet mobile / centered desktop */}
      {(modal === "ready" || modal === "paid") && (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 px-0 pb-0 sm:items-center sm:px-4 sm:py-6"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full max-w-md rounded-t-[2rem] border border-border/70 bg-card px-6 pb-8 pt-6 shadow-2xl sm:rounded-3xl">
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Pago con tarjeta
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">
                  {formatCurrency(depositAmount)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">depósito (50%)</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modal === "ready" && (
              <>
                {/* Tutorial */}
                <div className="mt-5 space-y-3">
                  {TUTORIAL_STEPS.map((step) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-bold text-foreground">
                        {step.num}
                      </span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="mr-1">{step.icon}</span>
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reservation ID */}
                {reservationId && (
                  <div className="mt-4 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">ID de reserva</p>
                    <p className="select-all font-mono text-base font-semibold text-foreground">
                      {reservationId.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Incluye este ID en tu mensaje de WhatsApp.</p>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href={checkoutUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setModal("paid")}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background"
                  >
                    Ir al checkout →
                  </a>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {modal === "paid" && (
              <>
                <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">¿Completaste el pago?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Envíanos la captura de pantalla del comprobante por WhatsApp para que confirmemos tu reserva.
                  </p>
                </div>

                {reservationId && (
                  <div className="mt-3 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">ID de reserva</p>
                    <p className="select-all font-mono text-base font-semibold text-foreground">
                      {reservationId.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href={buildWhatsAppLink(reservationId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
                  >
                    Enviar comprobante por WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setModal("ready")}
                    className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                  >
                    Volver al checkout
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground/60"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
