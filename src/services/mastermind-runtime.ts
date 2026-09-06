import { z } from "zod";
import { decideCandidate } from "@/domain/mastermind";
import type {
  AvailabilityTruth,
  CandidateCase,
  GuestIntent,
  OperationalReadiness,
  PropertyMomentEvidence,
  Provenance,
  RateTruth,
  RiskSignal,
} from "@/domain/types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const bookingRequestSchema = z.object({
  propertyId: z.string().uuid(),
  momentId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  partySize: z.number().int().min(1).max(30),
  idempotencyKey: z.string().min(8).max(160),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

function asProvenance(value: unknown): Provenance {
  return value as Provenance;
}

export async function evaluateAndPersistBooking(userId: string, request: BookingRequest) {
  const service = createServiceSupabaseClient();
  const now = new Date();

  const [{ data: property, error: propertyError }, { data: moment, error: momentError }] = await Promise.all([
    service
      .from("properties")
      .select("id,slug,name,lifecycle,owner_user_id")
      .eq("id", request.propertyId)
      .maybeSingle(),
    service
      .from("moments")
      .select("id,slug,name,promise,status")
      .eq("id", request.momentId)
      .maybeSingle(),
  ]);

  if (propertyError) throw new Error(`property_lookup_failed:${propertyError.code}`);
  if (momentError) throw new Error(`moment_lookup_failed:${momentError.code}`);
  if (!property || !moment) throw new Error("candidate_not_found");

  const [evidenceResult, availabilityResult, rateResult, readinessResult, risksResult] = await Promise.all([
    service
      .from("property_moment_evidence")
      .select("id,property_id,moment_id,status,claim,provenance,submitted_by,reviewed_by,reviewed_at,expires_at")
      .eq("property_id", request.propertyId)
      .eq("moment_id", request.momentId)
      .eq("status", "verified"),
    service
      .from("availability_windows")
      .select("property_id,start_date,end_date,status,checked_at,expires_at,provenance")
      .eq("property_id", request.propertyId)
      .lte("start_date", request.startDate)
      .gte("end_date", request.endDate)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from("rates")
      .select("property_id,start_date,end_date,amount_minor,currency,status,checked_at,expires_at,provenance")
      .eq("property_id", request.propertyId)
      .lte("start_date", request.startDate)
      .gte("end_date", request.endDate)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from("operational_readiness")
      .select("property_id,status,checked_at,expires_at,blockers")
      .eq("property_id", request.propertyId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    service
      .from("risk_signals")
      .select("code,severity,resolved,moment_id")
      .eq("property_id", request.propertyId)
      .eq("resolved", false),
  ]);

  for (const result of [evidenceResult, availabilityResult, rateResult, readinessResult, risksResult]) {
    if (result.error) throw new Error(`truth_lookup_failed:${result.error.code}`);
  }

  const evidenceRows = evidenceResult.data ?? [];
  const evidenceIds = evidenceRows.map((row) => row.id);
  const mediaByEvidence = new Map<string, string[]>();

  if (evidenceIds.length > 0) {
    const { data: links, error: linksError } = await service
      .from("evidence_media")
      .select("evidence_id,media_asset_id")
      .in("evidence_id", evidenceIds);
    if (linksError) throw new Error(`evidence_media_lookup_failed:${linksError.code}`);
    for (const link of links ?? []) {
      const current = mediaByEvidence.get(link.evidence_id) ?? [];
      current.push(link.media_asset_id);
      mediaByEvidence.set(link.evidence_id, current);
    }
  }

  const evidence: PropertyMomentEvidence[] = evidenceRows.map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    momentId: row.moment_id,
    status: row.status as PropertyMomentEvidence["status"],
    claim: row.claim,
    provenance: asProvenance(row.provenance),
    supportingMediaAssetIds: mediaByEvidence.get(row.id) ?? [],
    submittedBy: row.submitted_by ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  }));

  const availabilityRow = availabilityResult.data;
  const availability: AvailabilityTruth | undefined = availabilityRow
    ? {
        propertyId: availabilityRow.property_id,
        startDate: availabilityRow.start_date,
        endDate: availabilityRow.end_date,
        status: availabilityRow.status as AvailabilityTruth["status"],
        checkedAt: availabilityRow.checked_at,
        expiresAt: availabilityRow.expires_at,
        provenance: asProvenance(availabilityRow.provenance),
      }
    : undefined;

  const rateRow = rateResult.data;
  const rate: RateTruth | undefined = rateRow
    ? {
        propertyId: rateRow.property_id,
        startDate: rateRow.start_date,
        endDate: rateRow.end_date,
        amountMinor: Number(rateRow.amount_minor),
        currency: rateRow.currency,
        status: rateRow.status as RateTruth["status"],
        checkedAt: rateRow.checked_at,
        expiresAt: rateRow.expires_at,
        provenance: asProvenance(rateRow.provenance),
      }
    : undefined;

  const readinessRow = readinessResult.data;
  const readiness: OperationalReadiness | undefined = readinessRow
    ? {
        propertyId: readinessRow.property_id,
        status: readinessRow.status as OperationalReadiness["status"],
        checkedAt: readinessRow.checked_at,
        expiresAt: readinessRow.expires_at,
        blockers: Array.isArray(readinessRow.blockers) ? (readinessRow.blockers as string[]) : [],
      }
    : undefined;

  const risks: RiskSignal[] = (risksResult.data ?? [])
    .filter((row) => row.moment_id === null || row.moment_id === request.momentId)
    .map((row) => ({
      code: row.code,
      severity: row.severity as RiskSignal["severity"],
      resolved: row.resolved,
    }));

  const candidate: CandidateCase = {
    property: {
      id: property.id,
      slug: property.slug,
      name: property.name,
      lifecycle: property.lifecycle as CandidateCase["property"]["lifecycle"],
      ownerId: property.owner_user_id ?? "unassigned",
    },
    moment: {
      id: moment.id,
      slug: moment.slug,
      name: moment.name,
      promise: moment.promise,
      status: moment.status as CandidateCase["moment"]["status"],
    },
    evidence,
    availability,
    rate,
    readiness,
    risks,
  };

  const intent: GuestIntent = {
    desiredMomentId: request.momentId,
    startDate: request.startDate,
    endDate: request.endDate,
    partySize: request.partySize,
  };

  const decision = decideCandidate(intent, candidate, now);
  const { data: receipt, error: persistError } = await service.rpc("finalize_guest_decision", {
    p_user_id: userId,
    p_property_id: request.propertyId,
    p_moment_id: request.momentId,
    p_start_date: request.startDate,
    p_end_date: request.endDate,
    p_party_size: request.partySize,
    p_action: decision.action,
    p_reasons: decision.reasons,
    p_evidence_ids: decision.evidenceIds,
    p_engine_version: decision.engineVersion,
    p_request_key: request.idempotencyKey,
  });

  if (persistError) throw new Error(`decision_persist_failed:${persistError.code}`);

  return { decision, receipt, rate };
}
