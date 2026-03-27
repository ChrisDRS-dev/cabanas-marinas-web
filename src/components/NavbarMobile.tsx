"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import AuthModal from "@/components/AuthModal";
import PhoneDialog from "@/components/PhoneDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { getSessionSafe, supabase } from "@/lib/supabase/client";

type NavbarMobileProps = {
  brand: string;
};

export default function NavbarMobile({ brand }: NavbarMobileProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [profile, setProfile] = useState<{
    fullName: string | null;
    phone: string | null;
  }>({ fullName: null, phone: null });

  useEffect(() => {
    void getSessionSafe().then((session) => setSession(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next?.user?.id) {
        setProfile({ fullName: null, phone: null });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
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
        setProfile({
          fullName: data?.full_name ?? metaName ?? session.user.email ?? null,
          phone: data?.phone ?? metaPhone ?? null,
        });
      } catch {
        setProfile({
          fullName: metaName ?? session.user.email ?? null,
          phone: metaPhone ?? null,
        });
      }
    };
    void loadProfile();
  }, [session]);

  const userName = profile.fullName ?? session?.user?.email ?? null;
  const userEmail = session?.user?.email ?? null;
  const userPhone = profile.phone;

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
      <PhoneDialog
        open={phoneDialogOpen}
        onClose={() => setPhoneDialogOpen(false)}
        onSaved={(phone) => setProfile((prev) => ({ ...prev, phone }))}
      />
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
              <div className="flex items-center justify-between gap-2">
                <p>
                  <span className="text-muted-foreground/70">Teléfono:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {userPhone ?? "-"}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setPhoneDialogOpen(true)}
                  className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  {userPhone ? "Cambiar" : "Agregar"}
                </button>
              </div>
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
