import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, hasAnyRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const base = z.object({ action: z.string() });
const uuid = z.string().uuid();

const schemas = {
  createProperty: z.object({
    action: z.literal("createProperty"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(2).max(160),
    locationLabel: z.string().trim().max(160).nullable().optional(),
    shortDescription: z.string().trim().max(600).nullable().optional(),
    maxGuests: z.number().int().min(1).max(30).nullable().optional(),
    bedrooms: z.number().int().min(0).max(30).nullable().optional(),
    bathrooms: z.number().min(0).max(30).nullable().optional(),
    ownerUserId: uuid.nullable().optional(),
  }),
  updateProperty: z.object({
    action: z.literal("updateProperty"),
    propertyId: uuid,
    name: z.string().trim().min(2).max(160),
    locationLabel: z.string().trim().max(160).nullable(),
    shortDescription: z.string().trim().max(600).nullable(),
    maxGuests: z.number().int().min(1).max(30).nullable(),
    bedrooms: z.number().int().min(0).max(30).nullable(),
    bathrooms: z.number().min(0).max(30).nullable(),
    reason: z.string().trim().min(4).max(600),
  }),
  scoutSubmit: z.object({
    action: z.literal("scoutSubmit"),
    candidateName: z.string().trim().min(2).max(160),
    locationLabel: z.string().trim().min(2).max(160),
    notes: z.string().trim().min(4).max(1200),
    sourceRef: z.string().trim().min(2).max(300),
  }),
  scoutReview: z.object({
    action: z.literal("scoutReview"),
    submissionId: uuid,
    decision: z.enum(["accept", "reject"]),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    reason: z.string().trim().min(4).max(600),
  }),
  ownerDecision: z.object({
    action: z.literal("ownerDecision"),
    propertyId: uuid,
    decision: z.enum(["activate", "hold", "reject", "suspend", "retire"]),
    reason: z.string().trim().min(4).max(800),
  }),
  assessmentAssign: z.object({
    action: z.literal("assessmentAssign"),
    propertyId: uuid,
    assessorUserId: uuid,
  }),
  assessmentSubmit: z.object({
    action: z.literal("assessmentSubmit"),
    assessmentId: uuid,
    findings: z.record(z.string(), z.unknown()),
  }),
  assessmentReview: z.object({
    action: z.literal("assessmentReview"),
    assessmentId: uuid,
    status: z.enum(["accepted", "rejected"]),
    reason: z.string().trim().min(4).max(800),
  }),
  riskResolve: z.object({
    action: z.literal("riskResolve"),
    riskId: uuid,
    reason: z.string().trim().min(4).max(800),
  }),
  enquiryStatus: z.object({
    action: z.literal("enquiryStatus"),
    enquiryId: uuid,
    status: z.enum(["reviewing", "accepted", "declined", "expired"]),
    reason: z.string().trim().min(4).max(800),
  }),
} as const;

type ActionName = keyof typeof schemas;

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.configured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

    const raw = await request.json();
    const actionName = base.parse(raw).action as ActionName;
    const schema = schemas[actionName];
    if (!schema) return NextResponse.json({ error: "unsupported_operation" }, { status: 400 });
    const input = schema.parse(raw) as any;
    const supabase = await createServerSupabaseClient();
    if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

    if (actionName === "createProperty") {
      if (!hasAnyRole(auth.roles, ["owner", "operator", "admin"])) return NextResponse.json({ error: "property_create_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("create_property", {
        p_slug: input.slug,
        p_name: input.name,
        p_location_label: input.locationLabel ?? null,
        p_short_description: input.shortDescription ?? null,
        p_max_guests: input.maxGuests ?? null,
        p_bedrooms: input.bedrooms ?? null,
        p_bathrooms: input.bathrooms ?? null,
        p_owner_user_id: input.ownerUserId ?? null,
      });
      if (error) throw new Error(`property_create_failed:${error.message}`);
      return NextResponse.json({ property: data }, { status: 201 });
    }

    if (actionName === "updateProperty") {
      if (!hasAnyRole(auth.roles, ["owner", "operator", "admin"])) return NextResponse.json({ error: "property_update_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("update_property_details", {
        p_property_id: input.propertyId,
        p_name: input.name,
        p_location_label: input.locationLabel,
        p_short_description: input.shortDescription,
        p_max_guests: input.maxGuests,
        p_bedrooms: input.bedrooms,
        p_bathrooms: input.bathrooms,
        p_reason: input.reason,
      });
      if (error) throw new Error(`property_update_failed:${error.message}`);
      return NextResponse.json({ property: data });
    }

    if (actionName === "scoutSubmit") {
      if (!hasAnyRole(auth.roles, ["scout"])) return NextResponse.json({ error: "scout_role_required" }, { status: 403 });
      const { data, error } = await supabase
        .from("scout_submissions")
        .insert({
          scout_user_id: auth.user.id,
          candidate_name: input.candidateName,
          location_label: input.locationLabel,
          notes: input.notes,
          provenance: {
            source: "scout",
            sourceRef: input.sourceRef,
            capturedAt: new Date().toISOString(),
            actorId: auth.user.id,
            method: "site_visit",
          },
        })
        .select("id,status")
        .single();
      if (error) throw new Error(`scout_submit_failed:${error.message}`);
      return NextResponse.json({ submission: data }, { status: 201 });
    }

    if (actionName === "scoutReview") {
      if (!hasAnyRole(auth.roles, ["operator", "admin"])) return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
      if (input.decision === "accept") {
        if (!input.slug || !input.name) return NextResponse.json({ error: "accepted_scout_requires_slug_and_name" }, { status: 400 });
        const { data, error } = await supabase.rpc("accept_scout_submission", {
          p_submission_id: input.submissionId,
          p_slug: input.slug,
          p_name: input.name,
          p_reason: input.reason,
        });
        if (error) throw new Error(`scout_accept_failed:${error.message}`);
        return NextResponse.json({ property: data });
      }
      const { data, error } = await supabase.rpc("reject_scout_submission", {
        p_submission_id: input.submissionId,
        p_reason: input.reason,
      });
      if (error) throw new Error(`scout_reject_failed:${error.message}`);
      return NextResponse.json({ submission: data });
    }

    if (actionName === "ownerDecision") {
      if (!hasAnyRole(auth.roles, ["owner", "admin"])) return NextResponse.json({ error: "owner_role_required" }, { status: 403 });
      const { data, error } = await supabase
        .from("owner_decisions")
        .insert({
          property_id: input.propertyId,
          owner_user_id: auth.user.id,
          decision: input.decision,
          reason: input.reason,
        })
        .select("id,decision,decided_at")
        .single();
      if (error) throw new Error(`owner_decision_failed:${error.message}`);
      return NextResponse.json({ decision: data }, { status: 201 });
    }

    if (actionName === "assessmentAssign") {
      if (!hasAnyRole(auth.roles, ["operator", "admin"])) return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("assign_assessment", {
        p_property_id: input.propertyId,
        p_assessor_user_id: input.assessorUserId,
      });
      if (error) throw new Error(`assessment_assign_failed:${error.message}`);
      return NextResponse.json({ assessment: data }, { status: 201 });
    }

    if (actionName === "assessmentSubmit") {
      if (!hasAnyRole(auth.roles, ["assessor"])) return NextResponse.json({ error: "assessor_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("submit_assessment", {
        p_assessment_id: input.assessmentId,
        p_findings: input.findings,
      });
      if (error) throw new Error(`assessment_submit_failed:${error.message}`);
      return NextResponse.json({ assessment: data });
    }

    if (actionName === "assessmentReview") {
      if (!hasAnyRole(auth.roles, ["operator", "admin"])) return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("review_assessment", {
        p_assessment_id: input.assessmentId,
        p_status: input.status,
        p_reason: input.reason,
      });
      if (error) throw new Error(`assessment_review_failed:${error.message}`);
      return NextResponse.json({ assessment: data });
    }

    if (actionName === "riskResolve") {
      if (!hasAnyRole(auth.roles, ["operator", "admin"])) return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
      const { data, error } = await supabase.rpc("resolve_risk", {
        p_risk_id: input.riskId,
        p_reason: input.reason,
      });
      if (error) throw new Error(`risk_resolve_failed:${error.message}`);
      return NextResponse.json({ risk: data });
    }

    if (!hasAnyRole(auth.roles, ["operator", "admin"])) return NextResponse.json({ error: "operator_role_required" }, { status: 403 });
    const { data: current, error: lookupError } = await supabase
      .from("booking_enquiries")
      .select("id,status")
      .eq("id", input.enquiryId)
      .maybeSingle();
    if (lookupError || !current) return NextResponse.json({ error: "enquiry_not_found" }, { status: 404 });

    const { data, error } = await supabase
      .from("booking_enquiries")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.enquiryId)
      .select("id,status")
      .single();
    if (error) throw new Error(`enquiry_status_failed:${error.message}`);

    const { error: auditError } = await supabase.from("audit_events").insert({
      actor_id: auth.user.id,
      actor_role: hasAnyRole(auth.roles, ["admin"]) ? "admin" : "operator",
      entity_type: "booking_enquiries",
      entity_id: input.enquiryId,
      event_type: "status_reason",
      reason: input.reason,
      payload: { from: current.status, to: input.status },
    });
    if (auditError) throw new Error(`enquiry_audit_failed:${auditError.message}`);
    return NextResponse.json({ enquiry: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "operation_failed" },
      { status: 400 },
    );
  }
}
