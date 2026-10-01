# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- People who participate in the internal office foosball league and are also coworkers.
- Secondary operational role: league organizers/admins who create rounds and trigger scheduling.

## Product Purpose

This product coordinates an internal foosball league workflow end-to-end without manual spreadsheets: identify who is acting in the app, collect biweekly office availability, create rounds, generate feasible matches, and keep the league progressing with low friction.

Success means each round can be prepared quickly with complete player availability coverage and generated matches that are playable and fair under league rules.

## Positioning

The product is differentiated by an availability-first scheduling flow, a pairing calculation engine with fairness constraints, and a login-free identity model that optimizes speed for internal office usage.

## Operating Context

- Used by coworkers in an office league context, typically around afternoon match windows.
- Round cadence is two-week windows.
- Users act via a lightweight identity selector ("Quién eres?") instead of account login.
- Admin operations are protected with an internal admin action key.
- Scheduling depends on office-day overlap and role orientation (forward/defense) constraints.

## Capabilities and Constraints

- Player identity selection without login for regular interactions.
- Availability capture by weekdays for each player in the active round.
- Hard gate: rounds cannot be generated until all active players submit availability.
- Match generation in 4-player groupings using shared weekday availability.
- Pair fairness constraints across season history:
  - same pair cannot exceed 2 matches together;
  - orientation alternation is enforced (forward/defense cannot repeat on second pairing).
- Admin-only actions (via `ADMIN_ACTION_KEY`): create next round and generate matches.
- Active season is created automatically if absent when creating next round.
- Known undecided product facts:
  - final governance for result validation/anti-impersonation in later iterations;
  - long-term scoring/tiebreak policy enforcement level in this codebase revision.

## Brand Commitments

- Product naming to preserve: "Liga Interna de Futbolín NTT DATA" / "Futbolín NTT DATA".
- Internal, practical, low-friction tone in Spanish for operational copy.

## Evidence on Hand

- Iteration scope and flow documentation: `README.md`.
- Product analysis and roadmap notes: `README.analysis.md`.
- Current implemented interaction surface: `src/components/league-dashboard.tsx`.
- Scheduling rules implementation: `src/lib/scheduler.ts`.
- Round creation and generation API behavior: `src/app/api/rounds/create-next/route.ts`, `src/app/api/rounds/[roundId]/generate/route.ts`.
- SQL migration for iteration 1 round/availability model: `supabase/iteration1.sql`.
- No external testimonials, marketing proof, or public customer claims are present and future design/content should not fabricate them.

## Product Principles

- Minimize operational friction for office participants.
- Enforce fairness and feasibility through explicit scheduling constraints.
- Prefer transparent round readiness gates over implicit assumptions.
- Keep governance simple but auditable for internal trust.
- Optimize for iterative evolution from a working MVP under real league usage.

## Accessibility & Inclusion

- No project-specific accessibility standard is confirmed yet.
- Preserve responsive operation on mobile and desktop as a minimum baseline, and treat formal conformance level as an open decision.
