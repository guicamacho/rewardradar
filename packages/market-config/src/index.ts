import { MarketConfigSchema, type MarketConfig, type MarketId } from "./schema";
import { isKnownProgram } from "./programs";

import global from "./markets/global";
import br from "./markets/br";
import au from "./markets/au";
import es from "./markets/es";
import de from "./markets/de";

function load(raw: unknown): MarketConfig {
  const cfg = MarketConfigSchema.parse(raw);
  const unknown = [...cfg.programs.featured, ...cfg.programs.alsoSearched]
    .filter((p) => !isKnownProgram(p));
  if (unknown.length > 0) {
    throw new Error(
      `Market "${cfg.id}" references unknown programme ids: ${unknown.join(", ")}. ` +
      `Add them to programs.ts first.`,
    );
  }
  return cfg;
}

const all: MarketConfig[] = [global, br, au, es, de].map(load);

{
  const seen = new Map<string, MarketId>();
  for (const m of all) {
    for (const d of m.brand.domains) {
      const prior = seen.get(d);
      if (prior) throw new Error(`Domain "${d}" is claimed by both "${prior}" and "${m.id}".`);
      seen.set(d, m.id);
    }
  }
}

export const markets = Object.fromEntries(all.map((m) => [m.id, m])) as Record<MarketId, MarketConfig>;

export function getMarket(id: MarketId): MarketConfig {
  return markets[id];
}

export function liveMarkets(): MarketConfig[] {
  return all.filter((m) => m.status !== "planned");
}

/**
 * Resolve the brand from an incoming request host. Returns null for
 * unrecognised hosts so the caller can fall back to the global brand.
 */
export function resolveMarketByHost(host: string): MarketConfig | null {
  const h = host.toLowerCase().replace(/^www\./, "").split(":")[0] ?? "";
  return all.find((m) => m.brand.domains.some((d) => h === d)) ?? null;
}

/**
 * Union of programmes any live or beta market needs, used by the
 * collector scheduler to decide what to poll.
 */
export function programsToCollect(): Set<string> {
  const out = new Set<string>();
  for (const m of liveMarkets()) {
    m.programs.featured.forEach((p) => out.add(p));
    m.programs.alsoSearched.forEach((p) => out.add(p));
  }
  return out;
}

/** Programmes featured by at least one live or beta market (poll faster). */
export function featuredPrograms(): Set<string> {
  const out = new Set<string>();
  for (const m of liveMarkets()) m.programs.featured.forEach((p) => out.add(p));
  return out;
}

/**
 * Which brands a deal event should fan out to, with the channels for
 * each. The syndication pipeline and alert router iterate this.
 */
export function syndicationTargets(programId: string) {
  return liveMarkets()
    .filter(
      (m) =>
        m.programs.featured.includes(programId) ||
        m.programs.alsoSearched.includes(programId),
    )
    .map((m) => ({
      market: m.id,
      languageTag: m.content.languageTag,
      channels: m.channels,
      featured: m.programs.featured.includes(programId),
      freeTierDelayMinutes:
        m.pricing.tiers.find((t) => t.id === "free")?.limits.alertDelayMinutes ?? 0,
    }));
}

export { MarketConfigSchema } from "./schema";
export type { MarketConfig, MarketId } from "./schema";
export { PROGRAMS, ALL_PROGRAM_IDS, isKnownProgram } from "./programs";
