export type UUID = string;

export type AppRole =
  | "guest"
  | "owner"
  | "scout"
  | "assessor"
  | "operator"
  | "community"
  | "admin";

export type EvidenceSource =
  | "owner"
  | "scout"
  | "assessor"
  | "operator"
  | "system"
  | "external_verified";

export interface Provenance {
  source: EvidenceSource;
  sourceRef: string;
  capturedAt: string;
  actorId?: UUID;
  method: "upload" | "site_visit" | "owner_attestation" | "system_check" | "api";
}

export interface Property {
  id: UUID;
  slug: string;
  name: string;
  lifecycle: "draft" | "assessment" | "qualified" | "live" | "suspended" | "retired";
  ownerId: UUID;
}

export interface Moment {
  id: UUID;
  slug: string;
  name: string;
  promise: string;
  status: "draft" | "active" | "retired";
}

export interface PropertyMomentEvidence {
  id: UUID;
  propertyId: UUID;
  momentId: UUID;
  status: "pending" | "verified" | "rejected" | "expired";
  claim: string;
  provenance: Provenance;
  supportingMediaAssetIds: UUID[];
  reviewedBy?: UUID;
  reviewedAt?: string;
  expiresAt?: string;
}

export interface AvailabilityTruth {
  propertyId: UUID;
  startDate: string;
  endDate: string;
  status: "verified_available" | "verified_unavailable" | "unknown";
  checkedAt: string;
  expiresAt: string;
  provenance: Provenance;
}

export interface RateTruth {
  propertyId: UUID;
  startDate: string;
  endDate: string;
  amountMinor: number;
  currency: string;
  status: "verified" | "unknown";
  checkedAt: string;
  expiresAt: string;
  provenance: Provenance;
}

export interface OperationalReadiness {
  propertyId: UUID;
  status: "ready" | "blocked" | "unknown";
  checkedAt: string;
  blockers: string[];
}

export interface GuestIntent {
  desiredMomentId: UUID;
  startDate: string;
  endDate: string;
  partySize: number;
}

export interface RiskSignal {
  code: string;
  severity: "low" | "medium" | "high";
  resolved: boolean;
}

export interface CandidateCase {
  property: Property;
  moment: Moment;
  evidence: PropertyMomentEvidence[];
  availability?: AvailabilityTruth;
  rate?: RateTruth;
  readiness?: OperationalReadiness;
  risks: RiskSignal[];
}

export type MastermindAction = "recommend" | "block" | "escalate";

export interface MastermindDecision {
  action: MastermindAction;
  propertyId: UUID;
  momentId: UUID;
  reasons: string[];
  evidenceIds: UUID[];
  decidedAt: string;
  engineVersion: string;
}
