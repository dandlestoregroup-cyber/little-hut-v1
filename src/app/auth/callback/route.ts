import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/workspace";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/auth?error=invalid_callback", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth?error=sign_in_failed", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bootstrapEmail = process.env.LH_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (user?.email && bootstrapEmail && user.email.toLowerCase() === bootstrapEmail) {
    try {
      const service = createServiceSupabaseClient();
      const { count } = await service
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((count ?? 0) === 0) {
        await service.from("user_roles").upsert({ user_id: user.id, role: "admin" });
        await service.from("audit_events").insert({
          actor_id: user.id,
          actor_role: "admin",
          entity_type: "user_roles",
          entity_id: user.id,
          event_type: "bootstrap_admin",
          reason: "first_admin_bootstrap",
          payload: {},
        });
      }
    } catch {
      // Authentication still succeeds; bootstrap remains visibly incomplete in the workspace.
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
