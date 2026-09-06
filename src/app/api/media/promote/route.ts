import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { promoteEvidencePhotos } from "@/services/media";

const schema = z.object({
  evidenceId: z.string().uuid(),
  reason: z.string().trim().min(4).max(500),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    if (!hasAnyRole(auth.roles, ["assessor", "operator", "admin"])) {
      return NextResponse.json({ error: "promotion_role_required" }, { status: 403 });
    }

    const input = schema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

    const { data: evidence, error } = await supabase
      .from("property_moment_evidence")
      .select("id,status,property_id")
      .eq("id", input.evidenceId)
      .maybeSingle();

    if (error || !evidence) return NextResponse.json({ error: "evidence_not_accessible" }, { status: 404 });
    if (evidence.status !== "verified") {
      return NextResponse.json({ error: "only_verified_evidence_can_be_promoted" }, { status: 409 });
    }

    const promotion = await promoteEvidencePhotos(input.evidenceId, `promotion_retry:${input.reason}`);
    return NextResponse.json({ promotion }, { status: promotion.failures.length ? 202 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "promotion_failed" },
      { status: 400 },
    );
  }
}
