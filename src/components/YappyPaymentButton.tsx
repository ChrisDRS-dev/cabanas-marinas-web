"use client";

import { createElement } from "react";
import { useEffect, useRef, useState } from "react";

type YappyButtonElement = HTMLElement & {
  eventPayment?: (params: {
    transactionId: string;
    token: string;
    documentName: string;
  }) => void;
  isButtonLoading?: boolean;
  isYappyOnline?: string | boolean;
};

type Props = {
  reservationId: string | null;
  disabled?: boolean;
  blockedReason?: string | null;
  onPaymentStarted?: () => void;
  onPaymentCompleted?: () => void;
};

type ButtonConfigResponse = {
  enabled?: boolean;
  cdnUrl?: string;
  reason?: string;
  detail?: string;
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

const FALLBACK_CDN_URL =
  "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js";

function loadYappyScript(src: string) {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-yappy-button="true"][src="${src}"]`
  );
  if (existing) {
    if (existing.dataset.loaded === "true") return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("script_load_failed")), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    script.async = true;
    script.dataset.yappyButton = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error("script_load_failed")), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export default function YappyPaymentButton({
  reservationId,
  disabled = false,
  blockedReason = null,
  onPaymentStarted,
  onPaymentCompleted,
}: Props) {
  const buttonRef = useRef<YappyButtonElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [configEnabled, setConfigEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const setup = async () => {
      try {
        const response = await fetch("/api/payments/yappy/button-config", {
          cache: "no-store",
        });
        const config = (await response.json().catch(() => null)) as ButtonConfigResponse | null;
        if (!active) return;

        const enabled = Boolean(config?.enabled);
        setConfigEnabled(enabled);

        if (!enabled) {
          setMessage(
            config?.detail ||
              "Yappy no está configurado todavía en este ambiente. Usa WhatsApp mientras terminamos la activación."
          );
          return;
        }

        const cdnUrl = config?.cdnUrl?.trim() || FALLBACK_CDN_URL;
        await loadYappyScript(cdnUrl);
        if (!active) return;
        setScriptReady(true);
      } catch {
        if (!active) return;
        setConfigEnabled(false);
        setMessage("No se pudo cargar el botón de Yappy en este momento.");
      }
    };

    void setup();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !scriptReady) return;

    const handleClick = async () => {
      if (!reservationId || disabled || loading) {
        if (blockedReason) {
          setMessage(blockedReason);
        }
        return;
      }

      setLoading(true);
      setMessage(null);
      button.isButtonLoading = true;

      try {
        onPaymentStarted?.();

        const response = await fetch("/api/payments/yappy/button-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reservationId }),
        });

        const result = (await response.json().catch(() => null)) as ButtonOrderResponse | null;
        const transactionId = result?.body?.transactionId;
        const token = result?.body?.token;
        const documentName = result?.body?.documentName;

        if (!response.ok || !transactionId || !token || !documentName) {
          setMessage(
            result?.detail ||
              "No se pudo iniciar el pago con Yappy. Revisa la configuración o intenta nuevamente."
          );
          return;
        }

        button.eventPayment?.({ transactionId, token, documentName });
      } catch {
        setMessage("No se pudo conectar con Yappy. Intenta nuevamente.");
      } finally {
        button.isButtonLoading = false;
        setLoading(false);
      }
    };

    const handleSuccess = () => {
      setMessage(
        "Pago enviado a Yappy. Estamos esperando la confirmación automática de la transacción."
      );
      onPaymentCompleted?.();
    };

    const handleError = (event: Event) => {
      const detail =
        "detail" in event && typeof event.detail === "object" && event.detail
          ? (event.detail as { code?: string; description?: string })
          : null;
      setMessage(
        detail?.description ||
          "Yappy reportó un error al procesar la transacción. Puedes intentar de nuevo o continuar por WhatsApp."
      );
    };

    const syncOnlineState = () => {
      const online = button.isYappyOnline;
      if (typeof online === "string") {
        setIsOnline(online === "true");
        return;
      }
      if (typeof online === "boolean") {
        setIsOnline(online);
      }
    };

    button.addEventListener("eventClick", handleClick);
    button.addEventListener("eventSuccess", handleSuccess);
    button.addEventListener("eventError", handleError);
    syncOnlineState();

    const onlineTimer = window.setInterval(syncOnlineState, 1500);

    return () => {
      button.removeEventListener("eventClick", handleClick);
      button.removeEventListener("eventSuccess", handleSuccess);
      button.removeEventListener("eventError", handleError);
      window.clearInterval(onlineTimer);
    };
  }, [disabled, loading, onPaymentCompleted, onPaymentStarted, reservationId, scriptReady]);

  const isDisabled = disabled || loading || !reservationId || !scriptReady || !configEnabled;

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Yappy</p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          Paga con el botón de Yappy.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          El pago tardará un poco en reflejarse y la reserva se confirmará cuando Yappy envíe la notificación.
        </p>
        <div className="mt-4">
          {createElement("btn-yappy", {
            ref: (node: HTMLElement | null) => {
              buttonRef.current = node as YappyButtonElement | null;
            },
            theme: "blue",
            rounded: "true",
            style: {
              display: "block",
              opacity: isDisabled ? 0.6 : 1,
              pointerEvents: isDisabled ? "none" : "auto",
            },
          })}
        </div>
      </div>

      {isOnline === false ? (
        <p className="text-xs text-amber-600">
          Yappy aparece fuera de línea en este momento. Puedes intentar más tarde o usar WhatsApp.
        </p>
      ) : null}

      {!message && blockedReason ? (
        <p className="text-xs text-muted-foreground">{blockedReason}</p>
      ) : null}

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
