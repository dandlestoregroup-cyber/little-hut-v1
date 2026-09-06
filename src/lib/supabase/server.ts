import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRuntimeConfig } from "@/lib/env";

export async function createServerSupabaseClient() {
  const config = getRuntimeConfig();
  if (!config.supabaseConfigured || !config.supabaseUrl || !config.supabasePublishableKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.supabaseUrl, config.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies. Route handlers can.
        }
      },
    },
  });
}
