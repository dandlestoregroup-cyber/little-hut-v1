import type { CandidateCase, PropertyMomentEvidence } from "./types";

export interface EvidenceQualification {
  qualified: boolean;
  evidenceIds: string[];
  reasons: string[];
}

function hasValidProvenance(evidence: PropertyMomentEvidence): boolean {
  const captured = Date.parse(evidence.provenance.capturedAt);
  return Boolean(
    evidence.provenance.source &&
      evidence.provenance.sourceRef.trim() &&
      evidence.provenance.method &&
      Number.isFinite(captured),
  );
}

export function qualifyMomentEvidence(
  candidate: CandidateCase,
  now = new Date(),
): EvidenceQualification {
  const reasons: string[] = [];

  const verified = candidate.evidence.filter((evidence) => {
    if (evidence.propertyId !== candidate.property.id) return false;
    if (evidence.momentId !== candidate.moment.id) return false;
    if (evidence.status !== "verified") return false;
    if (!hasValidProvenance(evidence)) return false;
    if (evidence.supportingMediaAssetIds.length === 0) return false;
    if (evidence.expiresAt && Date.parse(evidence.expiresAt) <= now.getTime()) return false;
    return true;
  });

  if (verified.length === 0) {
    reasons.push("moment_evidence_missing_or_unqualified");
  }

  return {
    qualified: verified.length > 0,
    evidenceIds: verified.map((evidence) => evidence.id),
    reasons,
  };
}
