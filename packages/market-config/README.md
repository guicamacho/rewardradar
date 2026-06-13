# @rewardradar/market-config

Config-as-code for the multi-brand, multi-market RewardRadar platform (the Radar family). One data core, many thin brand frontends, all driven by the five configs in `src/markets/`.

## Design principles

1. **One data core, thin brands.** Collectors, cache and the alert engine are shared. A brand is a domain, a locale, a programme ordering, a price list and a channel mix. Adding a market must never mean adding scrapers.
2. **Config as code, validated at boot.** Zod parses every config on import. A typo in a programme id or a duplicated domain fails the build, not production. Changes arrive as reviewable pull requests.
3. **Language is the brand boundary.** `global` covers all English-comfortable markets (US, UK, SG, Scandinavia). Dedicated brands exist where language or community insularity creates a moat: `br`, `au`, `es` (pan-Hispanic), `de` (DACH).
4. **Programme ids are the contract.** `programs.ts` is the single catalogue. Market configs, the collector scheduler and the syndication pipeline all reference the same ids.

## Who consumes what

| Service | Reads |
| --- | --- |
| Collector scheduler | `programsToCollect()` for the polling set; featured programmes of live markets get top refresh priority |
| Alert engine | `pricing.tiers[].limits.alertDelayMinutes` (free users get delayed alerts, the main upgrade lever), `channels` per market |
| Syndication pipeline | `syndicationTargets(programId)` to fan one deal event out into per-brand, per-language posts; `content` for templates, TTS voice and platforms |
| Billing service | `currency`, `payments`, `pricing`, `regionOverrides` (Stripe price objects should be generated from this file, not maintained by hand) |
| Brand frontends | `resolveMarketByHost()` then `brand`, `locale`, `seo`, `features`, `programs.featured` for UI ordering |
| Affiliate renderer | `affiliates[]` slots filtered by `active` and `surfaces` |

## Per-market notes

- **global** (live): flagship, USD, email-first, API and GDS load data enabled.
- **br** (beta): brand name pending (GarimpaMilhas vs RadarMilhas, placeholder domains in the config). Telegram primary, WhatsApp as a paid-tier channel, Pix via Stripe with Mercado Pago as fallback, LGPD, NFS-e on the to-do list. Affiliate slots for clube de milhas, compra de milhas promos, transfer bonuses and cards.
- **au** (planned): Qantas FF and Velocity featured, GST pricing, and `gdsLoadData: true` as the local differentiator for the fare-class load niche.
- **es** (planned): one pan-Hispanic brand. Base currency USD with `regionOverrides` for MX (MXN, OXXO) and ES (EUR, SEPA). Argentina deliberately stays on USD card and is treated as audience rather than revenue. LifeMiles buy-miles promos are the natural first affiliate.
- **de** (planned): Miles & More plus the Star partner programmes Germans actually use to book Lufthansa Group premium space. GDPR, cookie banner, EU VAT via OSS.

## Adding a market

1. Add any new programmes to `src/programs.ts`.
2. Create `src/markets/<id>.ts` and extend the `id` enum in `src/schema.ts`.
3. Register the import in `src/index.ts`.
4. `npm run validate` (also wire this into CI).
5. Point the new domain at the frontend; `resolveMarketByHost` picks up the brand.

Steps 1 to 4 are the whole engineering cost of a launch. Everything else is go-to-market.

## Commands

```
npm run validate    # parse all configs, cross-check programmes and domains
npm run typecheck   # tsc --noEmit
```

## Deliberate omissions

Secrets (Stripe keys, Telegram bot tokens, ElevenLabs keys) do not belong here; this package holds only public-shaped configuration. Per-market secrets live in the deployment environment keyed by market id.
