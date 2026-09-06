# Little Hut — Mastermind Rebuild

**Book the Moment, not the Property.**

This branch is a clean rebuild. It does not inherit the previous LHL implementation or its data authority.

## Product spine

Guest intent → verified property evidence → Moment qualification → availability truth → rate truth → operational readiness → risk/conflict resolution → recommendation or booking action.

## Non-negotiables

- No Moment claim without property-specific evidence.
- No localStorage/browser state as production authority.
- DEMO and LIVE data are structurally separated.
- Mastermind is a deterministic, auditable decision engine around verified records; an LLM may explain a decision but never manufacture its inputs.
- Internal evidence, scores, operator states and provenance details stay off guest surfaces.
- Moments are photo-first editorial experiences, never generic icon cards.
- No Base44 or Lovable credits.

## First verified slice

This foundation includes:

1. Canonical domain model and evidence contract.
2. Mastermind qualification engine with explicit blocking reasons.
3. Supabase schema and RLS boundary.
4. Minimal cinematic guest shell with no fake LIVE inventory.
5. CI gates for typecheck, tests and build.
6. Architecture, authorization and QA documentation.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables are documented in `.env.example`. Never commit secrets.

## Quality gate

```bash
npm run check
```

A feature is not complete because the UI renders. It is complete only when its schema, authorization, API/service boundary, UI, tests and end-to-end qualification journey are all verified against durable data.
