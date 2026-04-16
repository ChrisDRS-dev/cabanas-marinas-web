/**
 * Shared utilities for loading the Yappy btn-yappy web component script.
 * Used by YappyPaymentButton and YappyBalanceButton.
 */

type BtnYappyElement = HTMLElement & {
  eventPayment?: (params: {
    transactionId: string;
    token: string;
    documentName: string;
  }) => void;
};

export function ensureYappyScript(cdnUrl: string): Promise<void> {
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

export function applyYappyDialogCentering(button: BtnYappyElement | null) {
  const root = button?.shadowRoot;
  if (!root) return;
  if (root.querySelector('style[data-cm-yappy-dialog="true"]')) return;

  const style = document.createElement("style");
  style.dataset.cmYappyDialog = "true";
  style.textContent = `
    .yappy-backdrop {
      position: fixed !important;
      inset: 0 !important;
      background:
        radial-gradient(circle at top, rgba(0, 133, 161, 0.18), transparent 46%),
        linear-gradient(135deg, rgba(15, 31, 36, 0.28), rgba(255, 179, 71, 0.14)) !important;
      backdrop-filter: blur(18px) saturate(135%) !important;
      -webkit-backdrop-filter: blur(18px) saturate(135%) !important;
    }
    dialog {
      margin: auto !important;
      inset: 0 !important;
      width: min(90vw, 580px) !important;
      max-width: 580px !important;
      max-height: min(92dvh, 760px) !important;
    }
    dialog[open] { display: block !important; }
    dialog .dialog-container { justify-content: center !important; min-height: auto !important; }
    @media (max-width: 640px) {
      dialog { width: min(92vw, 420px) !important; }
    }
  `;
  root.appendChild(style);
}

export type { BtnYappyElement };
