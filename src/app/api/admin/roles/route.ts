import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole } from "@/lib/auth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["guest", "owner", "scout", "assessor", "operator", "community", "admin"]),
  action: z.enum(["grant", "revoke"]),
  reason: z.string().trim().min(4).max(600),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    if (!hasAnyRole(auth.roles, ["admin"])) {
      return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
    }

    const input = schema.parse(await request.json());
    const service = createServiceSupabaseClient();

    if (input.action === "grant") {
      const { error } = await service.from("user_roles").upsert({ user_id: input.userId, role: input.role });
      if (error) throw new Error(`role_grant_failed:${error.message}`);
    } else {
      const { error } = await service
        .from("user_roles")
        .delete()
        .eq("user_id", input.userId)
        .eq("role", input.role);
      if (error) throw new Error(`role_revoke_failed:${error.message}`);
    }

    const { error: auditError } = await service.from("audit_events").insert({
      actor_id: auth.user.id,
      actor_role: "admin",
      entity_type: "user_roles",
      entity_id: input.userId,
      event_type: input.action === "grant" ? "role_granted" : "role_revoked",
      reason: input.reason,
      payload: { role: input.role },
    });
    if (auditError) throw new Error(`role_audit_failed:${auditError.message}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "role_change_failed" },
      { status: 400 },
    );
  }
}
