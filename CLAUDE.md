# CLAUDE.md

Standing instructions for Claude Code working in this repository.

## What this project is

RewardRadar: a multi-brand, multi-market platform for real-time award
flight availability and alerts. One shared data core feeds several thin
brand frontends and a content syndication worker. Brands: RewardRadar
(global, en), RadarMilhas (br, pt-BR), RewardRadar Australia (en-AU),
RadarMillas (es, pan-Hispanic), MeilenRadar (de, DACH).

## Hard constraints

1. NEVER reference, import from, link to, or mention "AwardSpy" or any
   predecessor project in code, comments, commit messages, docs, package
   names, or user-facing copy. This is a standalone venture.
2. Never commit secrets. All credentials come from env vars (see
   .env.example). Per-market secrets are keyed by market id.
3. Programme ids in packages/market-config/src/programs.ts are the
   contract between all services. Add new programmes there first;
   market configs and the data core reference ids only.
4. market-config is the single source of truth for anything per-brand:
   pricing, channels, languages, featured programmes, delays. Do not
   hardcode per-brand behaviour anywhere else.
5. User-facing copy: UK English for en markets, no em dashes, no emojis.

## Layout

```
packages/market-config   Brand definitions, zod-validated at import.
packages/data-core       Scheduler -> source adapter -> detector ->
                         router -> sinks. See src/index.ts (DataCore).
```

Planned: apps/web (one Next.js app rendering per brand via
resolveMarketByHost), apps/syndication (LLM copy + ElevenLabs TTS +
templated video + posting).

## Commands

```
npm install
npm run validate     # market configs
npm run typecheck    # both packages
npm run demo         # end-to-end pipeline with MockSource
```

The demo is the smoke test: cycle 1 must emit 0 events (baseline),
cycle 2 must emit 3 events and 4 routed alerts. Keep it passing.

## Current state

Done: market configs (5 markets), event schema, poll scheduler with
jitter, change detection (opened / seats_increased / price_drop /
closed), config-driven fan-out router with free-tier teaser delays,
sinks (console, HMAC webhook, Telegram), in-memory snapshot store,
runnable demo.

Stubbed: packages/data-core/src/sources/external-api.ts. Blocked on
the owner supplying: base URL + auth, endpoint path and params, one
sample response (to write mapResponse against), and rate limits.

## Roadmap (priority order)

1. ExternalApiSource: implement mapResponse() against the real payload
   once the owner provides a sample. Add retry with backoff and honour
   rate limits. Acceptance: demo runs against the live API behind an
   env flag.
2. PostgresSnapshotStore implementing SnapshotStore (target: Railway
   Postgres). Schema: one table keyed by route_key + snapshot_key with
   a JSONB payload is fine to start. Acceptance: demo passes with
   STORE=postgres.
3. Watchlists: a model for user watch targets; PollScheduler targets
   derived from watchlists plus a curated popular-routes list per
   market (seed from market homeAirports).
4. apps/web: one Next.js app, brand resolved per request via
   resolveMarketByHost; pricing page rendered from market-config tiers;
   Stripe checkout per market (prices generated from config, never
   hand-maintained).
5. apps/syndication: webhook receiver (verify x-rewardradar-signature),
   per-language copy templates, ElevenLabs TTS, Remotion or FFmpeg
   video template, posting adapters (Telegram broadcast first, then
   Instagram/TikTok/Shorts).
6. Tests: vitest; start with detector.ts (pure function, table-driven)
   and router.ts.

## Conventions

TypeScript strict + noUncheckedIndexedAccess, ESM, zod v3 (z.input for
authoring types, parse at boundaries), Node 22, npm workspaces. Keep
packages dependency-light. Adapters (sources, stores, sinks) are
interfaces; new integrations implement an interface, the pipeline does
not change.
