"use client";

import { useEffect, useRef, useState } from "react";
import { applyYappyDialogCentering, ensureYappyScript, type BtnYappyElement } from "@/lib/yappy-script";

type BalanceOrderResponse = {
  ok?: boolean;
  body?: {
    transactionId?: string;
    token?: string;
    documentName?: string;
  };
  error?: string;
  detail?: string;
};

type ButtonConfigResponse = {
  enabled: boolean;
  cdnUrl: string;
  reason?: string | null;
  detail?: string | null;
};

type Props = {
  reservationId: string | null;
  balanceDue: number | null;
  disabled?: boolean;
  blockedReason?: string | null;
  onPaymentStarted?: () => void;
};

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "$0";
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}`;
}

function normalizeErrorMessage(error: string | null | undefined, detail: string | null | undefined) {
  if (detail) return detail;
  if (error === "reservation_not_confirmed") return "La reserva aún no está confirmada.";
  if (error === "invoice_not_partially_paid") return detail ?? "El saldo no está disponible para pagar.";
  if (error === "no_balance_due") return "No hay saldo pendiente para esta reserva.";
  if (error === "missing_panama_phone") return detail ?? "Necesitas un número panameño en tu perfil.";
  return "No se pudo iniciar el pago del saldo con Yappy.";
}

export default function YappyBalanceButton({
  reservationId,
  balanceDue,
  disabled = false,
  blockedReason = null,
  onPaymentStarted,
}: Props) {
  const buttonRef = useRef<BtnYappyElement | null>(null);
  const [config, setConfig] = useState<ButtonConfigResponse | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/payments/yappy/button-config", { cache: "no-store" })
      .then((r) => r.json() as Promise<ButtonConfigResponse>)
      .then((result) => { if (active) setConfig(result); })
      .catch(() => {
        if (active) setConfig({ enabled: false, cdnUrl: "", detail: "No se pudo cargar la configuración de Yappy." });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.cdnUrl) return;
    let active = true;
    void ensureYappyScript(config.cdnUrl)
      .then(() => { if (active) setScriptReady(true); })
      .catch((err) => { if (active) setRuntimeError(err instanceof Error ? err.message : "Error al cargar Yappy."); });
    return () => { active = false; };
  }, [config]);

  useEffect(() => {
    if (!scriptReady) return;
    const element = buttonRef.current;
    if (!element) return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      applyYappyDialogCentering(element);
      if (element.shadowRoot || attempts >= 20) window.clearInterval(interval);
    }, 150);
    applyYappyDialogCentering(element);
    return () => window.clearInterval(interval);
  }, [scriptReady]);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || !scriptReady || disabled || blockedReason) return;

    const handleClick = async () => {
      if (!reservationId) {
        setRuntimeError("No hay reserva activa para pagar el saldo.");
        return;
      }
      setBusy(true);
      setRuntimeError(null);
      setHint("Preparando el pago del saldo en Yappy...");

      try {
        const response = await fetch("/api/payments/yappy/balance-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId }),
        });
        const result = (await response.json()) as BalanceOrderResponse;

        if (!response.ok || !result.body?.transactionId || !result.body?.token || !result.body?.documentName) {
          throw new Error(normalizeErrorMessage(result.error, result.detail));
        }

        element.eventPayment?.({
          transactionId: result.body.transactionId,
          token: result.body.token,
          documentName: result.body.documentName,
        });

        setHint("Yappy está abriendo el flujo de pago del saldo.");
        onPaymentStarted?.();
      } catch (err) {
        setRuntimeError(err instanceof Error ? err.message : "No se pudo iniciar el pago del saldo.");
        setHint(null);
      } finally {
        setBusy(false);
      }
    };

    const handleSuccess = () => {
      setHint("Pago del saldo iniciado. Estamos verificando la confirmación.");
      setRuntimeError(null);
      onPaymentStarted?.();
    };

    const handleError = (event: Event) => {
      const detail = "detail" in event ? (event as CustomEvent).detail : null;
      const message =
        typeof detail === "string" ? detail
        : typeof detail?.message === "string" ? detail.message
        : "Yappy reportó un error al procesar el pago.";
      setRuntimeError(message);
      setHint(null);
    };

    element.addEventListener("eventClick", handleClick);
    element.addEventListener("eventSuccess", handleSuccess as EventListener);
    element.addEventListener("eventError", handleError as EventListener);
    return () => {
      element.removeEventListener("eventClick", handleClick);
      element.removeEventListener("eventSuccess", handleSuccess as EventListener);
      element.removeEventListener("eventError", handleError as EventListener);
    };
  }, [blockedReason, disabled, onPaymentStarted, reservationId, scriptReady]);

  const isBlocked = disabled || Boolean(blockedReason);

  if (config && !config.enabled) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
        {config.detail ?? "El botón de Yappy no está disponible en este momento."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {balanceDue != null && (
        <p className="text-sm text-muted-foreground">
          Saldo a pagar:{" "}
          <span className="font-semibold text-foreground">{formatCurrency(balanceDue)}</span>
        </p>
      )}

      {isBlocked && (
        <div className="rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          {blockedReason ?? "No disponible en este momento."}
        </div>
      )}

      <div className={["flex justify-center rounded-full", isBlocked || !scriptReady ? "pointer-events-none opacity-60" : ""].join(" ")}>
        <btn-yappy ref={buttonRef} theme="sky" rounded="true" aria-disabled={isBlocked || !scriptReady} />
      </div>

      {!scriptReady && config?.enabled && (
        <p className="text-center text-xs text-muted-foreground">Cargando botón de Yappy...</p>
      )}
      {busy && <p className="text-center text-xs text-muted-foreground">Creando orden de pago...</p>}
      {hint && <p className="text-center text-xs text-emerald-600 dark:text-emerald-400">{hint}</p>}
      {runtimeError && <p className="text-center text-xs text-rose-600 dark:text-rose-400">{runtimeError}</p>}
    </div>
  );
}
