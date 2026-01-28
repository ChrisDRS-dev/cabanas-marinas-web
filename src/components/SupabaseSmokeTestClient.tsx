"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SupabaseSmokeTestClient() {
  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("session", { data, error });
      } catch (err) {
        console.error("supabase smoke test failed", err);
      }
    };

    run();
  }, []);

  return null;
}
