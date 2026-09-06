import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/domain/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AuthContext {
  user: User | null;
  roles: AppRole[];
  configured: boolean;
}

export async function getAuthContext(): Promise<AuthContext> {
  const client = await createServerSupabaseClient();
  if (!client) return { user: null, roles: [], configured: false };

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) return { user: null, roles: [], configured: true };

  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw new Error(`role_lookup_failed:${error.code}`);

  return {
    user,
    roles: (data ?? []).map((row) => row.role as AppRole),
    configured: true,
  };
}

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]): boolean {
  return roles.some((role) => allowed.includes(role));
}

export function primaryRole(roles: AppRole[]): AppRole {
  const priority: AppRole[] = ["admin", "operator", "assessor", "owner", "scout", "community", "guest"];
  return priority.find((role) => roles.includes(role)) ?? "guest";
}
