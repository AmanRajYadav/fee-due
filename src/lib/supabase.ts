import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * An unset GitHub Actions variable arrives as an empty string, not as
 * undefined, so `??` would pass "" straight through to createClient, which
 * throws at module load and takes the whole app down. Treat blank as absent.
 */
const configured = (value: unknown): string | undefined => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const url = configured(import.meta.env.VITE_SUPABASE_URL);
const anonKey = configured(import.meta.env.VITE_SUPABASE_ANON_KEY);

/** False when the app was built without Supabase credentials. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder",
  // There is no login, so there is no session to keep.
  { auth: { persistSession: false, autoRefreshToken: false } }
);
