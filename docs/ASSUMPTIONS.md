# Assumptions and Decisions

## Bound decisions

- Target repository: `dandlestoregroup-cyber/little-hut-v1`.
- Rebuild branch: `rebuild/mastermind-v2`.
- Previous LHL repositories remain untouched.
- The rebuild creates a fresh Git tree and does not inherit the legacy starter implementation.
- Production architecture: Next.js + Supabase + Vercel using zero-credit/open-source paths.
- DEMO and LIVE use separate Supabase projects and credentials.
- Mastermind is deterministic for authority/truth gates; generative AI may explain but not decide factual eligibility.
- Raw evidence media is private. Guest-facing media is an explicitly approved derivative.

## Deferred decisions that must not be guessed

- Final canonical Moment vocabulary and number of Moments.
- Exact evidence validity periods by Moment/evidence type.
- Rate freshness TTL and availability freshness TTL by source.
- Community-specific approval rules by destination/compound.
- Booking/payment provider and payment authority.
- Owner/partner commercial terms and thresholds.
- Whether medium-risk escalation requires only Mourad or a delegated operator under defined thresholds.

## Release rule

Deferred decisions may block only the slices that depend on them. They must never be silently converted into defaults and later represented as policy.
