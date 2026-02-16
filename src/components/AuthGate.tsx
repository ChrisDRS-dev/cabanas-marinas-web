"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase/client";

const setDismissed = (value: boolean) => {
  if (typeof window === "undefined") return;
  (window as { __cmAuthDismissed?: boolean }).__cmAuthDismissed = value;
  window.dispatchEvent(new Event("cm:auth:dismissed"));
};

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) {
        setAuthOpen(true);
      } else {
        setDismissed(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        setDismissed(false);
        setAuthOpen(false);
      } else {
        setAuthOpen(true);
      }
    });

    const handleOpen = () => {
      setAuthOpen(true);
    };

    window.addEventListener("cm:auth:open", handleOpen);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("cm:auth:open", handleOpen);
    };
  }, []);

  const handleClose = () => {
    if (!session) {
      setDismissed(true);
    }
    setAuthOpen(false);
  };

  return <AuthModal open={authOpen} onClose={handleClose} />;
}
