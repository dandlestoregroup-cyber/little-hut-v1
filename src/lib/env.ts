export type LittleHutEnvironment = "DEMO" | "LIVE";

export interface RuntimeConfig {
  environment: LittleHutEnvironment;
  supabaseConfigured: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseProjectRef?: string;
}

function projectRefFromUrl(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname;
    const suffix = ".supabase.co";
    if (!hostname.endsWith(suffix)) return undefined;
    return hostname.slice(0, -suffix.length);
  } catch {
    return undefined;
  }
}

export function getRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): RuntimeConfig {
  const environment: LittleHutEnvironment = env.LH_ENVIRONMENT === "LIVE" ? "LIVE" : "DEMO";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
  const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || undefined;
  const expectedProjectRef = env.LH_SUPABASE_PROJECT_REF?.trim() || undefined;

  if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
    throw new Error("supabase_configuration_partial");
  }

  const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

  if (environment === "LIVE" && !supabaseConfigured) {
    throw new Error("live_requires_supabase");
  }

  if (supabaseUrl && expectedProjectRef) {
    const actualProjectRef = projectRefFromUrl(supabaseUrl);
    if (!actualProjectRef || actualProjectRef !== expectedProjectRef) {
      throw new Error("supabase_project_ref_mismatch");
    }
  }

  return {
    environment,
    supabaseConfigured,
    supabaseUrl,
    supabasePublishableKey,
    supabaseProjectRef: expectedProjectRef ?? (supabaseUrl ? projectRefFromUrl(supabaseUrl) : undefined),
  };
}

export function requireServiceRoleKey(
  env: Record<string, string | undefined> = process.env,
): string {
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("service_role_key_missing");
  return key;
}
