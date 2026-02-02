"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) onClose();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onClose();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [open, onClose]);

  if (!open) return null;

  const signInGoogle = async () => {
    try {
      setLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
          <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(0,133,161,0.28),transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,180,120,0.3),transparent_70%)]" />

          <div className="relative text-slate-900 dark:text-slate-100">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              Acceso seguro
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              Iniciar sesion
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Usa Google para continuar con tu reserva.
            </p>

            <button
              type="button"
              onClick={signInGoogle}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {loading ? "Abriendo Google..." : "Continuar con Google"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
