"use client";

import Image from "next/image";
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
  const [userOpen, setUserOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setUserName(null);
      setUserPhone(null);
      setUserEmail(null);
      return;
    }

    setUserEmail(session.user.email ?? null);
    const metaName =
      (session.user.user_metadata?.full_name as string | undefined) ??
      (session.user.user_metadata?.name as string | undefined) ??
      null;
    const metaPhone =
      (session.user.user_metadata?.phone as string | undefined) ?? null;

    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setUserName(data?.full_name ?? metaName ?? session.user.email ?? null);
        setUserPhone(data?.phone ?? metaPhone ?? null);
      } catch {
        setUserName(metaName ?? session.user.email ?? null);
        setUserPhone(metaPhone ?? null);
      }
    };
    void loadProfile();
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
              <Image
                src="/logo/navbar-logo.png"
                alt="Logo Cabañas Marinas"
                width={56}
                height={56}
                className="h-14 w-14 max-w-none object-cover object-center"
                priority
              />
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{brand}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <button
                type="button"
                onClick={() => setUserOpen(true)}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold"
              >
                {userName ?? "Usuario"}
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
      {userOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-xl">
            <p className="text-sm font-semibold">Cuenta</p>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <p>
                <span className="text-muted-foreground/70">Nombre:</span>{" "}
                <span className="font-semibold text-foreground">
                  {userName ?? "Usuario"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground/70">Email:</span>{" "}
                <span className="font-semibold text-foreground">
                  {userEmail ?? "-"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground/70">Teléfono:</span>{" "}
                <span className="font-semibold text-foreground">
                  {userPhone ?? "-"}
                </span>
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setUserOpen(false)}
                className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setUserOpen(false);
                }}
                className="flex-1 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
