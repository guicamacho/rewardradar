import { syndicationTargets } from "@rewardradar/market-config";
import type { DealEvent } from "./events";

export interface RoutedAlert {
  event: DealEvent;
  market: string;
  languageTag: string;
  /** Whether this programme is featured (vs merely searchable) here. */
  featured: boolean;
  channels: { type: string; role: string; paidTierOnly: boolean }[];
  /** Paid subscribers get the event at this time. */
  releaseInstantAt: string;
  /** Free tier and the public teaser feed get it at this time. */
  releaseTeaserAt: string;
}

/**
 * Fan one deal event out to every brand that cares about its programme.
 * The free-tier delay per market comes straight from market-config and
 * is the core upgrade lever: paid users hear first.
 *
 * "closed" events are routed only to alert channels (primary and
 * secondary), never broadcast: the public feed announces finds, the
 * alert system also retracts them.
 */
export function routeEvent(event: DealEvent, now: Date = new Date()): RoutedAlert[] {
  const targets = syndicationTargets(event.program);
  return targets.map((t) => {
    const channels =
      event.change === "closed"
        ? t.channels.filter((c) => c.role !== "broadcast_only")
        : t.channels;
    return {
      event,
      market: t.market,
      languageTag: t.languageTag,
      featured: t.featured,
      channels: channels.map((c) => ({
        type: c.type,
        role: c.role,
        paidTierOnly: c.paidTierOnly,
      })),
      releaseInstantAt: now.toISOString(),
      releaseTeaserAt: new Date(
        now.getTime() + t.freeTierDelayMinutes * 60_000,
      ).toISOString(),
    };
  });
}
