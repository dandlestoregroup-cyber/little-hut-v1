import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getRuntimeConfig, requireServiceRoleKey } from "@/lib/env";

export function createServiceSupabaseClient() {
  const config = getRuntimeConfig();
  if (!config.supabaseConfigured || !config.supabaseUrl) {
    throw new Error("supabase_not_configured");
  }

  return createClient(config.supabaseUrl, requireServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
