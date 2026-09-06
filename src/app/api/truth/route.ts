import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, primaryRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const provenance = z.object({
  sourceRef: z.string().trim().min(2).max(300),
  capturedAt: z.string().datetime(),
  method: z.enum(["site_visit", "owner_attestation", "system_check", "api"]),
});

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("availability"),
    propertyId: z.string().uuid(),
    startDate: date,
    endDate: date,
    status: z.enum(["verified_available", "verified_unavailable", "unknown"]),
    checkedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    provenance,
  }),
  z.object({
    kind: z.literal("rate"),
    propertyId: z.string().uuid(),
    startDate: date,
    endDate: date,
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().length(3).transform((value) => value.toUpperCase()),
    status: z.enum(["verified", "unknown"]),
    checkedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    provenance,
  }),
  z.object({
    kind: z.literal("readiness"),
    propertyId: z.string().uuid(),
    status: z.enum(["ready", "blocked", "unknown"]),
    blockers: z.array(z.string().trim().min(1).max(240)).max(30),
    checkedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
  z.object({
    kind: z.literal("risk"),
    propertyId: z.string().uuid(),
    momentId: z.string().uuid().nullable().optional(),
    code: z.string().trim().min(2).max(120),
    severity: z.enum(["low", "medium", "high"]),
    provenance,
  }),
]);

function sourceForRole(role: string) {
  if (role === "owner" || role === "scout" || role === "assessor" || role === "operator") return role;
  if (role === "admin") return "operator";
  return "system";
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.configured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    const input = schema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    const source = sourceForRole(primaryRole(auth.roles));

    if (input.kind === "availability") {
      const { data, error } = await supabase
        .from("availability_windows")
        .insert({
          property_id: input.propertyId,
          start_date: input.startDate,
          end_date: input.endDate,
          status: input.status,
          checked_at: input.checkedAt,
          expires_at: input.expiresAt,
          provenance: { ...input.provenance, source, actorId: auth.user.id },
        })
        .select("id")
        .single();
      if (error) throw new Error(`availability_write_failed:${error.message}`);
      return NextResponse.json({ id: data.id }, { status: 201 });
    }

    if (input.kind === "rate") {
      const { data, error } = await supabase
        .from("rates")
        .insert({
          property_id: input.propertyId,
          start_date: input.startDate,
          end_date: input.endDate,
          amount_minor: input.amountMinor,
          currency: input.currency,
          status: input.status,
          checked_at: input.checkedAt,
          expires_at: input.expiresAt,
          provenance: { ...input.provenance, source, actorId: auth.user.id },
        })
        .select("id")
        .single();
      if (error) throw new Error(`rate_write_failed:${error.message}`);
      return NextResponse.json({ id: data.id }, { status: 201 });
    }

    if (input.kind === "readiness") {
      const { data, error } = await supabase
        .from("operational_readiness")
        .insert({
          property_id: input.propertyId,
          status: input.status,
          blockers: input.blockers,
          checked_at: input.checkedAt,
          expires_at: input.expiresAt,
        })
        .select("id")
        .single();
      if (error) throw new Error(`readiness_write_failed:${error.message}`);
      return NextResponse.json({ id: data.id }, { status: 201 });
    }

    const { data, error } = await supabase
      .from("risk_signals")
      .insert({
        property_id: input.propertyId,
        moment_id: input.momentId ?? null,
        code: input.code,
        severity: input.severity,
        provenance: { ...input.provenance, source, actorId: auth.user.id },
      })
      .select("id")
      .single();
    if (error) throw new Error(`risk_write_failed:${error.message}`);
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_truth_request" },
      { status: 400 },
    );
  }
}
