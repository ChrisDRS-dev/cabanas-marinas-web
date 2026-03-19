import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service role key.
 * Use ONLY in server-side code (API routes, webhooks).
 * Never import this in client components — it bypasses RLS.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
