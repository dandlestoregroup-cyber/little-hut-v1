import { describe, expect, it } from "vitest";
import { decideCandidate } from "../mastermind";
import type { CandidateCase, GuestIntent } from "../types";

const now = new Date("2026-09-06T12:00:00.000Z");

const intent: GuestIntent = {
  desiredMomentId: "moment-slow-morning",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  partySize: 2,
};

function candidate(): CandidateCase {
  return {
    property: {
      id: "property-1",
      slug: "shore-house",
      name: "Shore House",
      lifecycle: "live",
      ownerId: "owner-1",
    },
    moment: {
      id: "moment-slow-morning",
      slug: "slow-morning",
      name: "Slow Morning",
      promise: "A quiet start shaped by light, privacy and an unhurried breakfast setting.",
      status: "active",
    },
    evidence: [
      {
        id: "evidence-1",
        propertyId: "property-1",
        momentId: "moment-slow-morning",
        status: "verified",
        claim: "Morning light reaches the breakfast terrace during assessor visit.",
        provenance: {
          source: "assessor",
          sourceRef: "visit-2026-09-01",
          capturedAt: "2026-09-01T07:30:00.000Z",
          actorId: "assessor-1",
          method: "site_visit",
        },
        supportingMediaAssetIds: ["media-1"],
        submittedBy: "assessor-1",
        reviewedBy: "assessor-2",
        reviewedAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    availability: {
      propertyId: "property-1",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      status: "verified_available",
      checkedAt: "2026-09-06T11:55:00.000Z",
      expiresAt: "2026-09-06T13:00:00.000Z",
      provenance: {
        source: "owner",
        sourceRef: "availability-1",
        capturedAt: "2026-09-06T11:55:00.000Z",
        actorId: "owner-1",
        method: "owner_attestation",
      },
    },
    rate: {
      propertyId: "property-1",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      amountMinor: 1400000,
      currency: "EGP",
      status: "verified",
      checkedAt: "2026-09-06T11:55:00.000Z",
      expiresAt: "2026-09-06T13:00:00.000Z",
      provenance: {
        source: "owner",
        sourceRef: "rate-1",
        capturedAt: "2026-09-06T11:55:00.000Z",
        actorId: "owner-1",
        method: "owner_attestation",
      },
    },
    readiness: {
      propertyId: "property-1",
      status: "ready",
      checkedAt: "2026-09-06T10:00:00.000Z",
      expiresAt: "2026-09-06T14:00:00.000Z",
      blockers: [],
    },
    risks: [],
  };
}

describe("Mastermind", () => {
  it("recommends only when every mandatory truth gate passes", () => {
    expect(decideCandidate(intent, candidate(), now).action).toBe("recommend");
  });

  it("blocks a Moment claim without qualifying property-specific evidence", () => {
    const input = candidate();
    input.evidence = [];
    const decision = decideCandidate(intent, input, now);
    expect(decision.action).toBe("block");
    expect(decision.reasons).toContain("moment_evidence_missing_or_unqualified");
  });

  it("blocks stale availability even when the property is otherwise qualified", () => {
    const input = candidate();
    input.availability!.expiresAt = "2026-09-06T11:59:59.000Z";
    const decision = decideCandidate(intent, input, now);
    expect(decision.action).toBe("block");
    expect(decision.reasons).toContain("availability_stale");
  });

  it("blocks stale operational readiness", () => {
    const input = candidate();
    input.readiness!.expiresAt = "2026-09-06T11:59:59.000Z";
    const decision = decideCandidate(intent, input, now);
    expect(decision.action).toBe("block");
    expect(decision.reasons).toContain("operational_readiness_stale");
  });

  it("escalates unresolved medium risk after all truth gates pass", () => {
    const input = candidate();
    input.risks = [{ code: "community-approval-uncertain", severity: "medium", resolved: false }];
    const decision = decideCandidate(intent, input, now);
    expect(decision.action).toBe("escalate");
    expect(decision.reasons).toEqual(["unresolved_medium_risk"]);
  });

  it("blocks unresolved high risk", () => {
    const input = candidate();
    input.risks = [{ code: "owner-authority-conflict", severity: "high", resolved: false }];
    const decision = decideCandidate(intent, input, now);
    expect(decision.action).toBe("block");
    expect(decision.reasons).toContain("unresolved_high_risk");
  });
});
