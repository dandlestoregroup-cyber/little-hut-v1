import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole, primaryRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  propertyId: z.string().uuid(),
  momentId: z.string().uuid(),
  claim: z.string().trim().min(8).max(1200),
  sourceRef: z.string().trim().min(2).max(300),
  capturedAt: z.string().datetime(),
  method: z.enum(["upload", "site_visit", "owner_attestation", "system_check", "api"]),
  mediaAssetIds: z.array(z.string().uuid()).min(1).max(20),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.configured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    if (!hasAnyRole(auth.roles, ["scout", "assessor", "operator", "admin"])) {
      return NextResponse.json({ error: "evidence_role_required" }, { status: 403 });
    }

    const input = schema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

    const role = primaryRole(auth.roles);
    const source = role === "admin" ? "operator" : role;
    const { data, error } = await supabase.rpc("submit_moment_evidence", {
      p_property_id: input.propertyId,
      p_moment_id: input.momentId,
      p_claim: input.claim,
      p_provenance: {
        source,
        sourceRef: input.sourceRef,
        capturedAt: input.capturedAt,
        actorId: auth.user.id,
        method: input.method,
      },
      p_media_asset_ids: input.mediaAssetIds,
    });

    if (error) return NextResponse.json({ error: `evidence_submit_failed:${error.message}` }, { status: 422 });
    return NextResponse.json({ evidence: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_evidence_request" },
      { status: 400 },
    );
  }
}
