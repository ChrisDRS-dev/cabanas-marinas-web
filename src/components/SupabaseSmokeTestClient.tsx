"use client";

import { useEffect } from "react";
import { getSessionSafe } from "@/lib/supabase/client";

export default function SupabaseSmokeTestClient() {
  useEffect(() => {
    const run = async () => {
      try {
        const session = await getSessionSafe();
        console.log("session", { session });
      } catch (err) {
        console.error("supabase smoke test failed", err);
      }
    };

    run();
  }, []);

  return null;
}
