# Architecture — Little Hut Mastermind Rebuild

## 1. Product contract

Little Hut sells a **Moment first** and reveals a home only after the system can prove that the home can deliver that Moment for the requested stay.

The canonical chain is:

`Guest intent → verified property evidence → Moment qualification → availability truth → rate truth → operational readiness → risk/conflict resolution → recommendation or booking action`

The system must fail closed. Missing, stale, conflicting or unverified truth blocks a recommendation or escalates it; it never becomes marketing copy by inference.

## 2. System boundaries

### Guest surface

Responsible only for:
- expressing intent;
- discovering qualified Moments;
- revealing eligible homes;
- requesting a stay;
- showing guest-safe booking state.

It never receives raw provenance, assessor notes, evidence source references, internal readiness blockers, owner identifiers or Mastermind reasoning internals.

### Operational surface

Authenticated role-specific tools for Owner, Scout, Assessor, Operator, Community and Admin. Authorization is enforced in Postgres RLS and repeated in service-layer checks for sensitive transitions.

### Mastermind

A deterministic decision service over verified records. It does not browse, guess or rely on chat memory. Any LLM layer is optional and explanatory only; it cannot create evidence, availability, rates, readiness or authority.

### Data plane

Supabase Postgres + Auth + Storage. Browser state may cache presentation data but never owns lifecycle, evidence, availability, rates, decisions or booking state.

## 3. Canonical entities

- `Property`: home identity and lifecycle.
- `Moment`: editorial promise, independent from any property.
- `PropertyMomentEvidence`: property-specific proof that a Moment is defensible.
- `MediaAsset`: captured media with provenance and explicit public-safety status.
- `AvailabilityWindow`: time-bounded availability truth with expiry.
- `Rate`: time-bounded price truth in integer minor currency units.
- `OperationalReadiness`: current ability to host safely and operationally.
- `GuestIntent`: Moment/date/party request.
- `BookingEnquiry`: durable guest request state.
- `Partner`, `ScoutSubmission`, `Assessment`, `OwnerDecision`: operating workflow.
- `MastermindDecision`: persisted output with engine version, reasons and evidence IDs.
- `AuditEvent`: append-only material system action/event record.

## 4. Moment evidence contract

A property may be shown under a Moment only when all are true:

1. The property is `live`.
2. The Moment is `active`.
3. At least one property-specific evidence record is `verified`.
4. Evidence provenance has a source, source reference, capture time and method.
5. Evidence has supporting media.
6. Evidence has not expired.
7. Guest-visible media has been explicitly approved as public-safe.

Generic descriptors such as “sea view”, “luxury”, “terrace” or “family home” are never sufficient by themselves to assert a Moment.

## 5. Mastermind conflict policy

The engine evaluates mandatory gates before preference scoring.

**Hard block:** non-live property, inactive Moment, evidence failure, stale/missing availability, stale/missing rate, readiness failure, unresolved high risk.

**Escalate:** all mandatory truth gates pass but a material medium-risk conflict remains.

**Recommend:** every mandatory gate passes and no unresolved material risk remains.

Strategic lenses—emotional memory, luxury, adventure, comfort, family suitability, behavioral intent and commercial value—may rank already-qualified candidates. They may never override a failed truth gate.

Mourad remains final authority for policy/brand conflicts. A human override must create an explicit decision/audit record; it cannot silently mutate evidence.

## 6. Authorization matrix

| Capability | Guest | Owner | Scout | Assessor | Operator | Community | Admin |
|---|---|---|---|---|---|---|---|
| View guest-safe LIVE Moments | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create property | No | Own | No | No | Yes | No | Yes |
| Submit scout evidence | No | No | Yes | Yes | Yes | No | Yes |
| Verify/reject Moment evidence | No | No | No | Yes | No | No | Yes |
| Confirm availability/rate | No | Own | No | Read | Yes | No | Yes |
| Record readiness | No | No | No | Yes | Yes | No | Yes |
| Owner activation decision | No | Own | No | No | No | No | Yes |
| Read internal Mastermind decisions | No | No | No | Yes | Yes | No | Yes |
| Read audit trail | No | No | No | No | No | No | Yes |

RLS is authoritative. UI hiding is not authorization.

## 7. DEMO vs LIVE

DEMO and LIVE use **separate Supabase projects**, credentials and deployments. There is no browser switch that changes a record from demo to live. The same migrations may be applied to both environments, but data never shares a database.

Deployment must fail if `LH_ENVIRONMENT=LIVE` is paired with known DEMO credentials.

## 8. API/service boundaries

Use server-side services rather than direct ad-hoc table access from components:

- `discovery`: guest-safe qualified Moment/property projection;
- `evidence`: capture, review, expiry;
- `availability`: authoritative current windows;
- `rates`: authoritative price windows;
- `readiness`: operational gate state;
- `mastermind`: deterministic decisions;
- `booking`: enquiry transitions;
- `audit`: append-only material events.

Every write accepts an authenticated actor and produces or triggers an audit event.

## 9. UI doctrine

- Lead with image, atmosphere and Moment language.
- Property identity is secondary to the Moment.
- Use full-bleed/large editorial photography and restrained typography.
- Never render Moments as icon cards or dashboard tiles.
- Never fabricate sample homes on a LIVE surface.
- If no qualified Moment exists, show a deliberate empty state rather than fallback inventory.
- Operational complexity stays behind authenticated surfaces.

## 10. Build sequence

Each slice follows:

`Schema → authorization → service/API → UI → tests → qualification gate`

Recommended order:

1. Foundation + Moment evidence qualification.
2. Scout → assessment → evidence verification.
3. Owner decision → activation.
4. Guest Moment discovery → property reveal.
5. Availability/rate truth → enquiry.
6. Operator readiness + risk escalation.
7. Booking handoff and audit completeness.

No slice is “done” because a route renders.

## 11. Deployment

- GitHub is canonical source.
- CI runs typecheck, unit tests and production build on every PR.
- Vercel preview deploys may use DEMO only.
- Production uses LIVE Supabase credentials only.
- Secrets stay in deployment environment variables.
- Database migrations are versioned and reviewed before production application.

## 12. Definition of done

The rebuild is production-qualified only when all critical journeys pass against durable LIVE data; authorization denial tests pass; every guest-facing Moment is traceable to current property-specific evidence; availability and rates are current; owner activation is explicit; audit events explain material transitions; DEMO cannot leak into LIVE; and the production URL is directly verified after deployment.
