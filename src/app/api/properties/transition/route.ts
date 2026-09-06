import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  propertyId: z.string().uuid(),
  target: z.enum(["assessment", "qualified", "live", "suspended", "retired"]),
  reason: z.string().trim().min(4).max(800),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    if (!hasAnyRole(auth.roles, ["operator", "admin"])) {
      return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
    }

    const input = schema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

    const call = input.target === "live"
      ? supabase.rpc("activate_property", {
          p_property_id: input.propertyId,
          p_reason: input.reason,
        })
      : supabase.rpc("transition_property", {
          p_property_id: input.propertyId,
          p_target: input.target,
          p_reason: input.reason,
        });

    const { data, error } = await call;
    if (error) return NextResponse.json({ error: `transition_failed:${error.message}` }, { status: 422 });
    return NextResponse.json({ property: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_transition_request" },
      { status: 400 },
    );
  }
}
