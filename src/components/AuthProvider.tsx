"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  openAuth: () => void;
  requireAuthFor: (redirectTo: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PENDING_REDIRECT_KEY = "post_auth_redirect";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedPending = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    if (storedPending) {
      setPendingRedirect(storedPending);
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !pendingRedirect) return;
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    setPendingRedirect(null);
    router.replace(pendingRedirect);
  }, [pendingRedirect, router, session]);

  const openAuth = () => setAuthOpen(true);

  const requireAuthFor = async (redirectTo: string) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    sessionStorage.setItem(PENDING_REDIRECT_KEY, redirectTo);
    setPendingRedirect(redirectTo);
    setAuthOpen(true);
    return false;
  };

  const value = useMemo<AuthContextValue>(
    () => ({ session, openAuth, requireAuthFor }),
    [openAuth, requireAuthFor, session]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
