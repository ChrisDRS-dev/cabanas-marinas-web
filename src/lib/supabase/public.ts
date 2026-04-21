import { createClient } from "@supabase/supabase-js";

let cachedClient:
  | ReturnType<typeof createClient>
  | null = null;

export function supabasePublic() {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return cachedClient;
}
