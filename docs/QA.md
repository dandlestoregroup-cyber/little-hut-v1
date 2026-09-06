# QA and Qualification Gates

## Every slice

A slice is qualified only when all six layers exist and pass:

1. Schema
2. Authorization
3. Service/API boundary
4. UI
5. Automated tests
6. Real journey verification

A rendered screen is never sufficient evidence of completion.

## Mandatory automated gates

CI must fail on:

- TypeScript errors
- Unit test failures
- Production build failure
- A Mastermind rule regression that allows an unqualified Moment
- Evidence records without valid provenance/supporting media
- Guest code reading internal evidence/provenance tables directly

## Critical red-team cases

### Evidence-before-promise
- Verified Moment + valid media → eligible.
- No evidence → blocked.
- Pending/rejected/expired evidence → blocked.
- Evidence for a different property → blocked.
- Evidence for a different Moment → blocked.
- Evidence without supporting media → blocked.
- Evidence with malformed provenance → blocked.

### Availability/rate truth
- Missing availability → blocked.
- Stale availability → blocked.
- Availability not covering full requested stay → blocked.
- Missing rate → blocked.
- Stale rate → blocked.
- Rate not covering full requested stay → blocked.

### Operational truth
- Property not LIVE → blocked.
- Readiness not READY → blocked.
- Unresolved high risk → blocked.
- Unresolved medium risk with all mandatory gates passing → escalated.

### Authorization
- Owner cannot verify assessor evidence.
- Scout cannot activate a property.
- Guest cannot read raw evidence, internal readiness, rate provenance or audit events.
- Community cannot obtain operator/admin access through UI manipulation.
- Unauthorized writes fail at database level, not only in the interface.

### DEMO/LIVE
- LIVE deployment must use LIVE Supabase credentials.
- DEMO and LIVE records cannot share a database.
- Preview/demo labels never appear as LIVE inventory.
- No fixture may be imported into LIVE automatically.

## Required end-to-end journeys before production declaration

1. Scout submits property → assessor evaluates → property-specific Moment evidence is verified.
2. Owner reviews → explicit activation decision → property becomes eligible for LIVE only after gates pass.
3. Guest chooses a Moment → only qualified property appears.
4. Guest selects dates → stale/missing availability or price blocks progress.
5. Verified availability + rate + readiness → enquiry persists.
6. Operator sees the enquiry without exposing internal state to the guest.
7. Unauthorized actor attempts each sensitive action and is denied.
8. DEMO property exists in DEMO but cannot appear in LIVE deployment.

## Production acceptance

Do not report “done”, “live”, “production-ready” or equivalent until:

- CI is green on the exact production commit.
- Migrations are applied to LIVE deliberately.
- Production environment variables are verified without exposing secrets.
- At least one real property completes the full evidence → activation → discovery → enquiry journey.
- The deployed production URL is checked directly after release.
- No critical claim depends on fixtures, browser state, generated copy or unverified evidence.
