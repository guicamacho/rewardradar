# RewardRadar

Multi-brand, multi-market platform for real-time award flight availability and alerts. One shared data core, thin brand frontends, config-driven everything.

Brands: RewardRadar (global, en), RadarMilhas (Brazil, pt-BR), RewardRadar Australia (en-AU), RadarMillas (pan-Hispanic, es), MeilenRadar (DACH, de).

## Repository structure

```
packages/
  market-config/   What each brand IS: programmes, locale, pricing,
                   channels, affiliates. Zod-validated at boot.
  data-core/       The engine: poll scheduler, availability store,
                   change detection, deal events, fan-out router, sinks.
```

Planned packages: `apps/web` (brand frontends, one codebase rendering per market via resolveMarketByHost), `apps/syndication` (content worker: copy via LLM, TTS via ElevenLabs, templated video, posting).

## Quickstart

```
npm install
npm run validate     # check all market configs
npm run typecheck
npm run demo         # end-to-end pipeline with the mock source
```

The demo builds a baseline on cycle 1, mutates the mock world, then shows cycle 2 emitting deal events that fan out per market: one aeroplan opening routes to both the global brand (en-US) and RadarMilhas (pt-BR) with each market's channels and free-tier teaser delay.

## How the pipeline works

1. `PollScheduler` decides which (programme, route) pairs are due. Featured programmes of live/beta markets poll faster. Per-target jitter keeps refresh timing unpredictable from outside.
2. The `AvailabilitySource` adapter fetches fresh snapshots. `MockSource` for dev; `ExternalApiSource` is the stub for the real provider.
3. `detectChanges` diffs against the previous snapshot per route and emits `DealEvent`s: opened, seats_increased, price_drop, closed. First sight of a route is baseline and emits nothing, so boot never causes an alert storm.
4. `routeEvent` fans each event out using market-config: which brands feature or search this programme, in which language, on which channels, and with what free-tier delay (`releaseInstantAt` vs `releaseTeaserAt`). Paid users hear first.
5. Sinks deliver. `ConsoleSink` for dev, `WebhookSink` (HMAC-signed) to point at brand apps and the syndication worker, `TelegramSink` for Telegram-primary markets.

## Wiring the real data source

`packages/data-core/src/sources/external-api.ts` needs four things: base URL and auth (env `AWARD_API_BASE_URL`, `AWARD_API_KEY`), the endpoint path and params, one sample response to write `mapResponse()` against, and the rate limits to tune the throttle. Nothing else in the pipeline changes.

## Deployment shape (Railway)

One worker service running `DataCore.start()` with Postgres implementing `SnapshotStore`, one web service per region or a single multi-domain web app for the brands, and one syndication worker subscribed via `WebhookSink`. Secrets live in service env vars keyed by market id, never in this repo.

## Repo hygiene

This repository starts its own history. Do not import history from any predecessor project: no mirrors, no GitHub forks (fork parentage is public). Copy code in, commit fresh.
