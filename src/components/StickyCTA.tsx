"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSessionSafe, supabase } from "@/lib/supabase/client";

type StickyCTAProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export default function StickyCTA({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: StickyCTAProps) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const initial =
      typeof window !== "undefined"
        ? (window as { __cmAuthDismissed?: boolean }).__cmAuthDismissed
        : false;
    setDismissed(Boolean(initial));
    void getSessionSafe().then((session) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    const handleDismissed = () => {
      const next =
        typeof window !== "undefined"
          ? (window as { __cmAuthDismissed?: boolean }).__cmAuthDismissed
          : false;
      setDismissed(Boolean(next));
    };
    window.addEventListener("cm:auth:dismissed", handleDismissed);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("cm:auth:dismissed", handleDismissed);
    };
  }, []);

  if (pathname?.startsWith("/reservar")) {
    return null;
  }
  if (!session || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur">
        <a
          href={primaryHref}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          {primaryLabel}
        </a>
        <a
          href={secondaryHref}
          className="flex items-center justify-center rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1ebe5b]"
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}
