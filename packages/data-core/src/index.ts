import { programsToCollect } from "@rewardradar/market-config";
import type { AvailabilitySource, AvailabilityQuery } from "./sources/types";
import type { SnapshotStore } from "./availability";
import { routeKey } from "./availability";
import { PollScheduler, type PollTarget, type SchedulerOptions } from "./scheduler";
import { detectChanges } from "./detector";
import { routeEvent, type RoutedAlert } from "./router";
import type { AlertSink } from "./sinks";
import type { DealEvent } from "./events";

export interface DataCoreOptions {
  source: AvailabilitySource;
  store: SnapshotStore;
  sinks: AlertSink[];
  targets: PollTarget[];
  scheduler?: Partial<SchedulerOptions>;
}

const DEFAULT_SCHEDULER: SchedulerOptions = {
  featuredIntervalMs: 5 * 60_000,
  defaultIntervalMs: 15 * 60_000,
  jitterMs: 90_000,
};

/**
 * Wires the pipeline: scheduler -> source -> detector -> router -> sinks.
 * One tick() processes everything currently due. Run it on an interval
 * (Railway worker) or per invocation (cron).
 */
export class DataCore {
  private scheduler: PollScheduler;
  private opts: DataCoreOptions;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: DataCoreOptions) {
    this.opts = opts;

    const collectable = programsToCollect();
    const dropped = opts.targets.filter((t) => !collectable.has(t.program));
    if (dropped.length > 0) {
      console.warn(
        `[data-core] dropping ${dropped.length} target(s) for programmes no live market surfaces: ` +
        dropped.map((t) => t.program).join(", "),
      );
    }
    const targets = opts.targets.filter((t) => collectable.has(t.program));

    this.scheduler = new PollScheduler(targets, {
      ...DEFAULT_SCHEDULER,
      ...opts.scheduler,
    });
  }

  async tick(now: Date = new Date()): Promise<{ events: DealEvent[]; alerts: RoutedAlert[] }> {
    const due = this.scheduler.due(now.getTime());
    const allEvents: DealEvent[] = [];
    const allAlerts: RoutedAlert[] = [];

    for (const target of due) {
      if (!this.opts.source.supports(target.program)) continue;

      const query = buildQuery(target, now);
      const snaps = await this.opts.source.fetchAvailability(query);

      const key = routeKey(target.program, target.origin, target.destination);
      const prev = await this.opts.store.getRoute(key);
      const events = detectChanges(prev, snaps, now);
      await this.opts.store.replaceRoute(key, snaps);

      for (const event of events) {
        allEvents.push(event);
        const routed = routeEvent(event, now);
        allAlerts.push(...routed);
        for (const alert of routed) {
          for (const sink of this.opts.sinks) {
            try {
              await sink.deliver(alert);
            } catch (err) {
              console.error(`[data-core] sink ${sink.id} failed:`, err);
            }
          }
        }
      }
    }

    return { events: allEvents, alerts: allAlerts };
  }

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick().catch((err) => console.error("[data-core] tick failed:", err));
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Demo helper. */
  forceAllDue(): void {
    this.scheduler.forceAllDue();
  }
}

function buildQuery(t: PollTarget, now: Date): AvailabilityQuery {
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + t.daysAhead * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return {
    program: t.program,
    origin: t.origin,
    destination: t.destination,
    dateFrom: from,
    dateTo: to,
    cabins: ["economy", "premium_economy", "business", "first"],
  };
}

export * from "./events";
export * from "./availability";
export * from "./scheduler";
export * from "./detector";
export * from "./router";
export * from "./sinks";
export * from "./sources/types";
export { MockSource } from "./sources/mock";
export { ExternalApiSource } from "./sources/external-api";
