"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { getSessionSafe, supabase } from "@/lib/supabase/client";

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
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem(PENDING_REDIRECT_KEY)
  );
  const pendingRedirectRef = useRef<string | null>(pendingRedirect);
  const router = useRouter();

  useEffect(() => {
    const flushPendingRedirect = (nextSession: Session | null) => {
      if (!nextSession || !pendingRedirectRef.current) return;
      const redirectTo = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
      setPendingRedirect(null);
      router.replace(redirectTo);
    };

    void getSessionSafe().then((nextSession) => {
      setSession(nextSession);
      flushPendingRedirect(nextSession);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      flushPendingRedirect(next);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const openAuth = useCallback(() => setAuthOpen(true), []);

  const handleClose = useCallback(() => {
    setAuthOpen(false);
    if (!pendingRedirect) return;
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    pendingRedirectRef.current = null;
    setPendingRedirect(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("reservar") || url.searchParams.has("package")) {
      url.searchParams.delete("reservar");
      url.searchParams.delete("package");
      const query = url.searchParams.toString();
      router.replace(query ? `${url.pathname}?${query}` : url.pathname);
    }
  }, [pendingRedirect, router]);

  const requireAuthFor = useCallback(async (redirectTo: string) => {
    const session = await getSessionSafe();
    if (session) return true;
    sessionStorage.setItem(PENDING_REDIRECT_KEY, redirectTo);
    pendingRedirectRef.current = redirectTo;
    setPendingRedirect(redirectTo);
    setAuthOpen(true);
    return false;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, openAuth, requireAuthFor }),
    [openAuth, requireAuthFor, session]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal open={authOpen} onClose={handleClose} />
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
