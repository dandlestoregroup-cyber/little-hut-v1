"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/domain/types";
import type { WorkspaceRow } from "@/services/workspace";

interface Props {
  roles: AppRole[];
  properties: WorkspaceRow[];
  moments: WorkspaceRow[];
  evidence: WorkspaceRow[];
  assessments: WorkspaceRow[];
  scoutSubmissions: WorkspaceRow[];
  enquiries: WorkspaceRow[];
  risks: WorkspaceRow[];
  profiles: WorkspaceRow[];
  roleRows: WorkspaceRow[];
}

function text(row: WorkspaceRow, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

function hasAny(roles: AppRole[], allowed: AppRole[]) {
  return roles.some((role) => allowed.includes(role));
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(data.error ?? `request_failed_${response.status}`);
  return data;
}

function toNullableNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function WorkspaceActions(props: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [truthKind, setTruthKind] = useState<"availability" | "rate" | "readiness" | "risk">("availability");

  const propertyOptions = props.properties.map((row) => ({ id: text(row, "id"), label: text(row, "name") || text(row, "slug") }));
  const momentOptions = props.moments.filter((row) => text(row, "status") === "active").map((row) => ({ id: text(row, "id"), label: text(row, "name") }));
  const pendingEvidence = props.evidence.filter((row) => text(row, "status") === "pending");
  const draftAssessments = props.assessments.filter((row) => text(row, "status") === "draft");
  const submittedAssessments = props.assessments.filter((row) => text(row, "status") === "submitted");
  const submittedScouts = props.scoutSubmissions.filter((row) => text(row, "status") === "submitted");
  const openRisks = props.risks.filter((row) => text(row, "resolved") !== "true");
  const openEnquiries = props.enquiries.filter((row) => ["submitted", "reviewing"].includes(text(row, "status")));

  const assessorIds = useMemo(() => {
    const ids = new Set(
      props.roleRows
        .filter((row) => text(row, "role") === "assessor")
        .map((row) => text(row, "user_id")),
    );
    return props.profiles
      .filter((row) => ids.has(text(row, "id")))
      .map((row) => ({ id: text(row, "id"), label: text(row, "display_name") || text(row, "id") }));
  }, [props.profiles, props.roleRows]);

  async function run(label: string, work: () => Promise<unknown>) {
    setBusy(true);
    setMessage(`${label}…`);
    try {
      await work();
      setMessage(`${label} complete.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  async function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run("Property creation", () => postJson("/api/operations", {
      action: "createProperty",
      slug: String(form.get("slug")),
      name: String(form.get("name")),
      locationLabel: String(form.get("locationLabel") || "") || null,
      shortDescription: String(form.get("shortDescription") || "") || null,
      maxGuests: toNullableNumber(form.get("maxGuests")),
      bedrooms: toNullableNumber(form.get("bedrooms")),
      bathrooms: toNullableNumber(form.get("bathrooms")),
      ownerUserId: String(form.get("ownerUserId") || "") || null,
    }));
  }

  async function scoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run("Scout submission", () => postJson("/api/operations", {
      action: "scoutSubmit",
      candidateName: String(form.get("candidateName")),
      locationLabel: String(form.get("locationLabel")),
      notes: String(form.get("notes")),
      sourceRef: String(form.get("sourceRef")),
    }));
  }

  async function evidenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1) {
      setMessage("Choose evidence media first.");
      return;
    }

    await run("Evidence submission", async () => {
      const upload = new FormData();
      upload.set("propertyId", String(form.get("propertyId")));
      upload.set("sourceRef", String(form.get("sourceRef")));
      upload.set("capturedAt", String(form.get("capturedAt")));
      upload.set("method", String(form.get("method")));
      upload.set("file", file);
      const uploadResponse = await fetch("/api/media", { method: "POST", body: upload });
      const uploadBody = (await uploadResponse.json()) as { media?: { id?: string }; error?: string };
      if (!uploadResponse.ok || !uploadBody.media?.id) throw new Error(uploadBody.error ?? "media_upload_failed");

      await postJson("/api/evidence", {
        propertyId: String(form.get("propertyId")),
        momentId: String(form.get("momentId")),
        claim: String(form.get("claim")),
        sourceRef: String(form.get("sourceRef")),
        capturedAt: String(form.get("capturedAt")),
        method: String(form.get("method")),
        mediaAssetIds: [uploadBody.media.id],
      });
    });
  }

  async function evidenceReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    await run("Evidence review", () => postJson("/api/evidence/review", {
      evidenceId: String(form.get("evidenceId")),
      status,
      reason: String(form.get("reason")),
      expiresAt: status === "verified" ? new Date(String(form.get("expiresAt"))).toISOString() : null,
    }));
  }

  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run("Lifecycle transition", () => postJson("/api/properties/transition", {
      propertyId: String(form.get("propertyId")),
      target: String(form.get("target")),
      reason: String(form.get("reason")),
    }));
  }

  async function truth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const sourceRef = String(form.get("sourceRef"));
    const capturedAt = String(form.get("capturedAt") || now);
    const propertyId = String(form.get("propertyId"));

    let body: Record<string, unknown>;
    if (truthKind === "availability") {
      body = {
        kind: truthKind,
        propertyId,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
        status: String(form.get("availabilityStatus")),
        checkedAt: now,
        expiresAt: new Date(String(form.get("expiresAt"))).toISOString(),
        provenance: { sourceRef, capturedAt, method: String(form.get("method")) },
      };
    } else if (truthKind === "rate") {
      body = {
        kind: truthKind,
        propertyId,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
        amountMinor: Math.round(Number(form.get("amount")) * 100),
        currency: String(form.get("currency")),
        status: "verified",
        checkedAt: now,
        expiresAt: new Date(String(form.get("expiresAt"))).toISOString(),
        provenance: { sourceRef, capturedAt, method: String(form.get("method")) },
      };
    } else if (truthKind === "readiness") {
      body = {
        kind: truthKind,
        propertyId,
        status: String(form.get("readinessStatus")),
        blockers: String(form.get("blockers") || "").split("\n").map((item) => item.trim()).filter(Boolean),
        checkedAt: now,
        expiresAt: new Date(String(form.get("expiresAt"))).toISOString(),
      };
    } else {
      body = {
        kind: truthKind,
        propertyId,
        momentId: String(form.get("momentId") || "") || null,
        code: String(form.get("riskCode")),
        severity: String(form.get("severity")),
        provenance: { sourceRef, capturedAt, method: String(form.get("method")) },
      };
    }

    await run("Truth record", () => postJson("/api/truth", body));
  }

  async function operation(event: FormEvent<HTMLFormElement>, bodyFactory: (form: FormData) => Record<string, unknown>, label: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(label, () => postJson("/api/operations", bodyFactory(form)));
  }

  async function roleChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run("Role change", () => postJson("/api/admin/roles", {
      userId: String(form.get("userId")),
      role: String(form.get("role")),
      action: String(form.get("roleAction")),
      reason: String(form.get("reason")),
    }));
  }

  return (
    <section className="workspacePanel">
      <h2>Next actions</h2>
      <p className="panelIntro">Only actions allowed by your role appear here. Database policy remains authoritative.</p>
      {message ? <p className="actionMessage" role="status">{message}</p> : null}
      <div className="actionStack">
        {hasAny(props.roles, ["owner", "operator", "admin"]) ? (
          <div className="actionCard">
            <h3>Create a property draft</h3>
            <form className="actionForm" onSubmit={createProperty}>
              <input name="name" required placeholder="Property name" />
              <input name="slug" required placeholder="lowercase-property-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
              <input name="locationLabel" placeholder="Guest-safe location label" />
              <textarea name="shortDescription" placeholder="Short guest-facing description" />
              <div className="inlineFields">
                <input name="maxGuests" type="number" min="1" max="30" placeholder="Guests" />
                <input name="bedrooms" type="number" min="0" placeholder="Bedrooms" />
                <input name="bathrooms" type="number" min="0" step="0.5" placeholder="Bathrooms" />
              </div>
              {hasAny(props.roles, ["operator", "admin"]) ? <input name="ownerUserId" placeholder="Owner user UUID (optional)" /> : null}
              <button disabled={busy}>Create draft</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["scout"]) ? (
          <div className="actionCard">
            <h3>Submit a home for assessment</h3>
            <form className="actionForm" onSubmit={scoutSubmit}>
              <input name="candidateName" required placeholder="Candidate home" />
              <input name="locationLabel" required placeholder="Location" />
              <textarea name="notes" required placeholder="What makes it worth assessing?" />
              <input name="sourceRef" required placeholder="Source / visit reference" />
              <button disabled={busy}>Submit candidate</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["scout", "assessor", "operator", "admin"]) && propertyOptions.length > 0 && momentOptions.length > 0 ? (
          <div className="actionCard">
            <h3>Submit Moment evidence</h3>
            <form className="actionForm" onSubmit={evidenceSubmit}>
              <select name="propertyId" required>{propertyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
              <select name="momentId" required>{momentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
              <textarea name="claim" required placeholder="Specific claim this property can prove" />
              <input name="sourceRef" required placeholder="Evidence source reference" />
              <input name="capturedAt" type="datetime-local" required />
              <select name="method" defaultValue="site_visit"><option value="site_visit">Site visit</option><option value="upload">Upload</option><option value="owner_attestation">Owner attestation</option><option value="api">Verified API</option></select>
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime" required />
              <button disabled={busy}>Upload & submit evidence</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["assessor", "admin"]) && pendingEvidence.length > 0 ? (
          <div className="actionCard">
            <h3>Independently review evidence</h3>
            <form className="actionForm" onSubmit={evidenceReview}>
              <select name="evidenceId" required>{pendingEvidence.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "claim") || text(row, "id")}</option>)}</select>
              <select name="status" defaultValue="verified"><option value="verified">Verify</option><option value="rejected">Reject</option></select>
              <input name="expiresAt" type="datetime-local" />
              <textarea name="reason" required placeholder="Review reason" />
              <button disabled={busy}>Record verdict</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["owner", "operator", "admin"]) && propertyOptions.length > 0 ? (
          <div className="actionCard">
            <h3>Record current truth</h3>
            <form className="actionForm" onSubmit={truth}>
              <select value={truthKind} onChange={(event) => setTruthKind(event.target.value as typeof truthKind)}>
                <option value="availability">Availability</option>
                <option value="rate">Rate</option>
                {hasAny(props.roles, ["operator", "admin"]) ? <option value="readiness">Operational readiness</option> : null}
                {hasAny(props.roles, ["operator", "admin"]) ? <option value="risk">Risk</option> : null}
              </select>
              <select name="propertyId" required>{propertyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
              {truthKind === "availability" || truthKind === "rate" ? <div className="inlineFields"><input name="startDate" type="date" required /><input name="endDate" type="date" required /></div> : null}
              {truthKind === "availability" ? <select name="availabilityStatus"><option value="verified_available">Available</option><option value="verified_unavailable">Unavailable</option><option value="unknown">Unknown</option></select> : null}
              {truthKind === "rate" ? <div className="inlineFields"><input name="amount" type="number" min="0" step="0.01" required placeholder="Amount" /><input name="currency" defaultValue="EGP" required maxLength={3} /></div> : null}
              {truthKind === "readiness" ? <><select name="readinessStatus"><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="unknown">Unknown</option></select><textarea name="blockers" placeholder="One blocker per line" /></> : null}
              {truthKind === "risk" ? <><select name="momentId"><option value="">Whole property</option>{momentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="riskCode" required placeholder="Risk code" /><select name="severity"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></> : null}
              {truthKind !== "risk" ? <input name="expiresAt" type="datetime-local" required /> : null}
              {truthKind !== "readiness" ? <><input name="sourceRef" required placeholder="Authority / source reference" /><input name="capturedAt" type="datetime-local" required /><select name="method" defaultValue="owner_attestation"><option value="owner_attestation">Owner attestation</option><option value="site_visit">Site visit</option><option value="system_check">System check</option><option value="api">Verified API</option></select></> : null}
              <button disabled={busy}>Append truth</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["owner", "admin"]) && propertyOptions.length > 0 ? (
          <div className="actionCard">
            <h3>Owner decision</h3>
            <form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "ownerDecision", propertyId: String(form.get("propertyId")), decision: String(form.get("decision")), reason: String(form.get("reason")) }), "Owner decision") }>
              <select name="propertyId">{propertyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
              <select name="decision"><option value="activate">Approve activation</option><option value="hold">Hold</option><option value="reject">Reject</option><option value="suspend">Suspend</option><option value="retire">Retire</option></select>
              <textarea name="reason" required placeholder="Decision reason" />
              <button disabled={busy}>Record decision</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["assessor"]) && draftAssessments.length > 0 ? (
          <div className="actionCard">
            <h3>Submit assigned assessment</h3>
            <form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "assessmentSubmit", assessmentId: String(form.get("assessmentId")), findings: { summary: String(form.get("findings")) } }), "Assessment submission") }>
              <select name="assessmentId">{draftAssessments.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "property_id")}</option>)}</select>
              <textarea name="findings" required placeholder="Assessment findings" />
              <button disabled={busy}>Submit assessment</button>
            </form>
          </div>
        ) : null}

        {hasAny(props.roles, ["operator", "admin"]) ? (
          <>
            {propertyOptions.length > 0 && assessorIds.length > 0 ? <div className="actionCard"><h3>Assign assessment</h3><form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "assessmentAssign", propertyId: String(form.get("propertyId")), assessorUserId: String(form.get("assessorUserId")) }), "Assessment assignment")}><select name="propertyId">{propertyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><select name="assessorUserId">{assessorIds.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button disabled={busy}>Assign</button></form></div> : null}
            {submittedAssessments.length > 0 ? <div className="actionCard"><h3>Review assessment</h3><form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "assessmentReview", assessmentId: String(form.get("assessmentId")), status: String(form.get("status")), reason: String(form.get("reason")) }), "Assessment review")}><select name="assessmentId">{submittedAssessments.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "property_id")}</option>)}</select><select name="status"><option value="accepted">Accept</option><option value="rejected">Reject</option></select><textarea name="reason" required placeholder="Review reason" /><button disabled={busy}>Record review</button></form></div> : null}
            {submittedScouts.length > 0 ? <div className="actionCard"><h3>Review scout submission</h3><form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "scoutReview", submissionId: String(form.get("submissionId")), decision: String(form.get("decision")), slug: String(form.get("slug") || "") || undefined, name: String(form.get("name") || "") || undefined, reason: String(form.get("reason")) }), "Scout review")}><select name="submissionId">{submittedScouts.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "candidate_name") || text(row, "id")}</option>)}</select><select name="decision"><option value="accept">Accept</option><option value="reject">Reject</option></select><input name="name" placeholder="Accepted property name" /><input name="slug" placeholder="accepted-property-slug" /><textarea name="reason" required placeholder="Review reason" /><button disabled={busy}>Record scout review</button></form></div> : null}
            {propertyOptions.length > 0 ? <div className="actionCard"><h3>Advance property lifecycle</h3><form className="actionForm" onSubmit={transition}><select name="propertyId">{propertyOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><select name="target"><option value="assessment">Assessment</option><option value="qualified">Qualified</option><option value="live">Activate live</option><option value="suspended">Suspend</option><option value="retired">Retire</option></select><textarea name="reason" required placeholder="Why this transition is justified" /><button disabled={busy}>Run gated transition</button></form></div> : null}
            {openRisks.length > 0 ? <div className="actionCard"><h3>Resolve risk</h3><form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "riskResolve", riskId: String(form.get("riskId")), reason: String(form.get("reason")) }), "Risk resolution")}><select name="riskId">{openRisks.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "severity")} · {text(row, "code")}</option>)}</select><textarea name="reason" required placeholder="Resolution evidence / reason" /><button disabled={busy}>Resolve</button></form></div> : null}
            {openEnquiries.length > 0 ? <div className="actionCard"><h3>Resolve booking enquiry</h3><form className="actionForm" onSubmit={(event) => operation(event, (form) => ({ action: "enquiryStatus", enquiryId: String(form.get("enquiryId")), status: String(form.get("status")), reason: String(form.get("reason")) }), "Enquiry decision")}><select name="enquiryId">{openEnquiries.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "status")} · {text(row, "property_id")}</option>)}</select><select name="status"><option value="reviewing">Reviewing</option><option value="accepted">Accept</option><option value="declined">Decline</option><option value="expired">Expire</option></select><textarea name="reason" required placeholder="Decision reason" /><button disabled={busy}>Update enquiry</button></form></div> : null}
          </>
        ) : null}

        {hasAny(props.roles, ["admin"]) && props.profiles.length > 0 ? (
          <div className="actionCard">
            <h3>Role authority</h3>
            <form className="actionForm" onSubmit={roleChange}>
              <select name="userId">{props.profiles.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "display_name") || text(row, "id")}</option>)}</select>
              <select name="role"><option value="owner">Owner</option><option value="scout">Scout</option><option value="assessor">Assessor</option><option value="operator">Operator</option><option value="community">Community</option><option value="admin">Admin</option><option value="guest">Guest</option></select>
              <select name="roleAction"><option value="grant">Grant</option><option value="revoke">Revoke</option></select>
              <textarea name="reason" required placeholder="Why this access change is required" />
              <button disabled={busy}>Apply role change</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
