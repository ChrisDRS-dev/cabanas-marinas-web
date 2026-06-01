"use client";

import { useCallback, useState } from "react";

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribed"
  | "error";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications(reservationId?: string | null) {
  const [state, setState] = useState<PushPermissionState>("default");
  const [error, setError] = useState<string | null>(null);

  const supported = () =>
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const subscribe = useCallback(async () => {
    setError(null);
    if (!supported()) {
      setState("unsupported");
      return false;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState("error");
      setError("vapid_public_key_missing");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission);
      return false;
    }

    const registration = await navigator.serviceWorker.register("/push-sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subscription.toJSON(),
        reservationId: reservationId ?? null,
      }),
    });

    if (!response.ok) {
      setState("error");
      setError("subscribe_failed");
      return false;
    }

    setState("subscribed");
    return true;
  }, [reservationId]);

  const unsubscribe = useCallback(async () => {
    if (!supported()) return false;
    const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription?.endpoint ?? null }),
    });
    await subscription?.unsubscribe();
    setState(Notification.permission);
    return true;
  }, []);

  return { state, error, subscribe, unsubscribe };
}
