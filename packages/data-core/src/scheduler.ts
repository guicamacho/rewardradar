import { featuredPrograms } from "@rewardradar/market-config";

export interface PollTarget {
  program: string;
  origin: string;
  destination: string;
  /** How far ahead to scan, in days. */
  daysAhead: number;
}

export interface SchedulerOptions {
  /** Interval for programmes featured in a live/beta market. */
  featuredIntervalMs: number;
  /** Interval for everything else. */
  defaultIntervalMs: number;
  /** Random 0..jitterMs added per target per cycle. */
  jitterMs: number;
}

interface Tracked {
  target: PollTarget;
  intervalMs: number;
  nextDueAt: number;
}

/**
 * Decides which (programme, route) pairs are due for polling.
 * Featured programmes poll faster; jitter prevents the whole fleet
 * hitting upstream at the same instant and keeps refresh timing
 * unpredictable from the outside.
 *
 * In production, targets come from user watchlists plus a curated
 * popular-routes list per market; here they are injected.
 */
export class PollScheduler {
  private tracked: Tracked[] = [];
  private opts: SchedulerOptions;

  constructor(targets: PollTarget[], opts: SchedulerOptions) {
    this.opts = opts;
    const featured = featuredPrograms();
    const now = Date.now();
    this.tracked = targets.map((t) => ({
      target: t,
      intervalMs: featured.has(t.program) ? opts.featuredIntervalMs : opts.defaultIntervalMs,
      nextDueAt: now, // everything due on first cycle to build the baseline
    }));
  }

  due(now: number = Date.now()): PollTarget[] {
    const out: PollTarget[] = [];
    for (const t of this.tracked) {
      if (now >= t.nextDueAt) {
        out.push(t.target);
        t.nextDueAt = now + t.intervalMs + Math.floor(Math.random() * this.opts.jitterMs);
      }
    }
    return out;
  }

  /** Force everything due immediately (used by the demo). */
  forceAllDue(): void {
    for (const t of this.tracked) t.nextDueAt = 0;
  }
}
