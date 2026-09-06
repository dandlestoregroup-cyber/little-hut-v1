import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { promoteEvidencePhotos } from "@/services/media";

const schema = z.object({
  evidenceId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  reason: z.string().trim().min(4).max(800),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.configured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    if (!hasAnyRole(auth.roles, ["assessor", "admin"])) {
      return NextResponse.json({ error: "independent_reviewer_required" }, { status: 403 });
    }

    const input = schema.parse(await request.json());
    if (input.status === "verified" && !input.expiresAt) {
      return NextResponse.json({ error: "verified_evidence_requires_expiry" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

    const { data, error } = await supabase.rpc("review_moment_evidence", {
      p_evidence_id: input.evidenceId,
      p_status: input.status,
      p_reason: input.reason,
      p_expires_at: input.status === "verified" ? input.expiresAt : null,
    });

    if (error) {
      return NextResponse.json({ error: `evidence_review_failed:${error.message}` }, { status: 422 });
    }

    if (input.status === "verified") {
      const promotion = await promoteEvidencePhotos(input.evidenceId, `evidence_verified:${input.reason}`);
      if (promotion.failures.length > 0) {
        return NextResponse.json(
          { evidence: data, promotion, warning: "evidence_verified_media_promotion_incomplete" },
          { status: 202 },
        );
      }
      return NextResponse.json({ evidence: data, promotion });
    }

    return NextResponse.json({ evidence: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_review_request" },
      { status: 400 },
    );
  }
}
