import { qualifyMomentEvidence } from "./evidence";
import type { CandidateCase, GuestIntent, MastermindDecision } from "./types";

export const MASTERMIND_ENGINE_VERSION = "mastermind-0.1.0";

function coversRequestedStay(
  startDate: string,
  endDate: string,
  requestedStart: string,
  requestedEnd: string,
): boolean {
  return startDate <= requestedStart && endDate >= requestedEnd;
}

function freshUntil(expiresAt: string, now: Date): boolean {
  return Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now.getTime();
}

export function decideCandidate(
  intent: GuestIntent,
  candidate: CandidateCase,
  now = new Date(),
): MastermindDecision {
  const reasons: string[] = [];
  const evidence = qualifyMomentEvidence(candidate, now);

  if (candidate.property.lifecycle !== "live") reasons.push("property_not_live");
  if (candidate.moment.status !== "active") reasons.push("moment_not_active");
  if (intent.desiredMomentId !== candidate.moment.id) reasons.push("intent_moment_mismatch");
  reasons.push(...evidence.reasons);

  const availability = candidate.availability;
  if (!availability) {
    reasons.push("availability_missing");
  } else {
    if (availability.status !== "verified_available") reasons.push("availability_not_verified_available");
    if (!coversRequestedStay(availability.startDate, availability.endDate, intent.startDate, intent.endDate)) {
      reasons.push("availability_does_not_cover_stay");
    }
    if (!freshUntil(availability.expiresAt, now)) reasons.push("availability_stale");
  }

  const rate = candidate.rate;
  if (!rate) {
    reasons.push("rate_missing");
  } else {
    if (rate.status !== "verified") reasons.push("rate_not_verified");
    if (!coversRequestedStay(rate.startDate, rate.endDate, intent.startDate, intent.endDate)) {
      reasons.push("rate_does_not_cover_stay");
    }
    if (!freshUntil(rate.expiresAt, now)) reasons.push("rate_stale");
  }

  if (!candidate.readiness || candidate.readiness.status !== "ready") {
    reasons.push("operational_readiness_not_ready");
  }

  if (candidate.risks.some((risk) => risk.severity === "high" && !risk.resolved)) {
    reasons.push("unresolved_high_risk");
  }

  const hardBlock = reasons.length > 0;
  const unresolvedMediumRisk = candidate.risks.some(
    (risk) => risk.severity === "medium" && !risk.resolved,
  );

  return {
    action: hardBlock ? "block" : unresolvedMediumRisk ? "escalate" : "recommend",
    propertyId: candidate.property.id,
    momentId: candidate.moment.id,
    reasons: hardBlock ? reasons : unresolvedMediumRisk ? ["unresolved_medium_risk"] : [],
    evidenceIds: evidence.evidenceIds,
    decidedAt: now.toISOString(),
    engineVersion: MASTERMIND_ENGINE_VERSION,
  };
}
