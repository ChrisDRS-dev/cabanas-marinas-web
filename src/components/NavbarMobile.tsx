"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase/client";

type NavbarMobileProps = {
  brand: string;
};

export default function NavbarMobile({ brand }: NavbarMobileProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,#0085a1,#ffb347,#0085a1)]" />
            <div>
              <p className="font-display text-lg font-semibold">{brand}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold"
              >
                Cerrar sesion
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
              >
                Iniciar sesion
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
