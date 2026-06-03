"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/lib/notifications/usePushNotifications";

function dismissedKey() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "missing";
  return `cm_client_push_prompt_dismissed:${publicKey}`;
}

export function PushNotificationPrompt({
  reservationId,
}: {
  reservationId?: string | null;
}) {
  const { state, error, subscribe } = usePushNotifications(reservationId);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(dismissedKey()) === "1",
  );
  const [busy, setBusy] = useState(false);

  if (dismissed || state === "unsupported" || state === "denied" || state === "subscribed") {
    return null;
  }

  const dismiss = () => {
    window.localStorage.setItem(dismissedKey(), "1");
    setDismissed(true);
  };

  const activate = async () => {
    setBusy(true);
    const ok = await subscribe();
    setBusy(false);
    if (ok) dismiss();
  };

  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            Activa las notificaciones de tu reserva
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Te avisaremos sobre pagos, cambios de estado y actualizaciones importantes.
          </p>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={activate}
              disabled={busy}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Activando..." : "Activar notificaciones"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
