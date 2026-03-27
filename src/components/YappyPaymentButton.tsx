"use client";

import { useEffect, useRef, useState } from "react";

type ButtonConfigResponse = {
  enabled: boolean;
  cdnUrl: string;
  reason?: string | null;
  detail?: string | null;
};

type ButtonOrderResponse = {
  ok?: boolean;
  body?: {
    transactionId?: string;
    token?: string;
    documentName?: string;
  };
  error?: string;
  detail?: string;
};

type BtnYappyElement = HTMLElement & {
  eventPayment?: (params: {
    transactionId: string;
    token: string;
    documentName: string;
  }) => void;
};

type Props = {
  reservationId?: string | null;
  disabled?: boolean;
  blockedReason?: string | null;
  onPaymentStarted?: () => void;
};

function normalizeErrorMessage(error: string | null | undefined, detail: string | null | undefined) {
  if (detail) return detail;
  if (error === "merchant_validation_failed") {
    return "Yappy rechazó la validación del comercio. Revisa el dominio y las credenciales.";
  }
  if (error === "order_creation_failed") {
    return "Yappy no pudo crear la orden de pago para esta reserva.";
  }
  if (error === "reservation_not_pending_payment") {
    return "Esta reserva ya no está disponible para pago.";
  }
  return "No se pudo iniciar el pago con Yappy.";
}

function ensureYappyScript(cdnUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-yappy-button-script="true"]'
    );

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar el script de Yappy.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = cdnUrl;
    script.async = true;
    script.dataset.yappyButtonScript = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => reject(new Error("No se pudo cargar el script de Yappy.")),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export default function YappyPaymentButton({
  reservationId = null,
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

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/payments/yappy/button-config", {
          cache: "no-store",
        });
        const result = (await response.json()) as ButtonConfigResponse;
        if (!active) return;
        setConfig(result);
      } catch {
        if (!active) return;
        setConfig({
          enabled: false,
          cdnUrl: "",
          reason: "configuration_error",
          detail: "No se pudo cargar la configuración del botón de Yappy.",
        });
      }
    };

    void loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.cdnUrl) return;

    let active = true;
    void ensureYappyScript(config.cdnUrl)
      .then(() => {
        if (active) setScriptReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setRuntimeError(error instanceof Error ? error.message : "No se pudo preparar el botón.");
      });

    return () => {
      active = false;
    };
  }, [config]);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || !scriptReady || disabled || blockedReason) return;

    const handleClick = async () => {
      if (!reservationId) {
        setRuntimeError("No encontramos una reserva pendiente para pagar.");
        return;
      }

      setBusy(true);
      setRuntimeError(null);
      setHint("Preparando tu pago en Yappy...");

      try {
        const response = await fetch("/api/payments/yappy/button-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId }),
        });
        const result = (await response.json()) as ButtonOrderResponse;
        if (!response.ok || !result.body?.transactionId || !result.body?.token || !result.body?.documentName) {
          throw new Error(normalizeErrorMessage(result.error, result.detail));
        }

        element.eventPayment?.({
          transactionId: result.body.transactionId,
          token: result.body.token,
          documentName: result.body.documentName,
        });

        setHint("Yappy está abriendo el flujo de pago.");
        onPaymentStarted?.();
      } catch (error) {
        setRuntimeError(
          error instanceof Error ? error.message : "No se pudo iniciar el pago con Yappy."
        );
        setHint(null);
      } finally {
        setBusy(false);
      }
    };

    const handleSuccess = () => {
      setHint("Pago iniciado. Estamos verificando la confirmación de Yappy.");
      setRuntimeError(null);
      onPaymentStarted?.();
    };

    const handleError = (event: Event) => {
      const detail = "detail" in event ? (event as CustomEvent).detail : null;
      const message =
        typeof detail === "string"
          ? detail
          : typeof detail?.message === "string"
            ? detail.message
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
  const configBlocked = config && !config.enabled;

  if (configBlocked) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          {config?.detail ?? "El botón de Yappy no está disponible en este momento."}
        </div>
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center rounded-full bg-muted px-6 py-3 text-sm font-semibold text-muted-foreground opacity-70"
        >
          Botón Yappy no disponible
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isBlocked ? (
        <div className="rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          {blockedReason ?? "Esta reserva no está disponible para pago ahora mismo."}
        </div>
      ) : null}

      <div
        className={[
          "rounded-full",
          isBlocked || !scriptReady ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <btn-yappy
          ref={buttonRef}
          theme="sky"
          rounded="true"
          aria-disabled={isBlocked || !scriptReady}
        />
      </div>

      {!scriptReady && !configBlocked ? (
        <p className="text-xs text-muted-foreground">Cargando botón oficial de Yappy...</p>
      ) : null}
      {busy ? (
        <p className="text-xs text-muted-foreground">Creando orden de pago...</p>
      ) : null}
      {hint ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{hint}</p> : null}
      {runtimeError ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{runtimeError}</p>
      ) : null}
    </div>
  );
}
