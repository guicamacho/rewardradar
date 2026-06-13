import type { AvailabilitySnapshot } from "./types";

/**
 * A polling target: one route and date window for one programme.
 * In production these are derived from user watchlists plus the
 * teaser-feed defaults in market-config (homeAirports x popular
 * destinations). The scaffold lets each adapter declare its own.
 */
export interface PollTarget {
  programId: string;
  origin: string;
  destination: string;
  fromDate: string;
  toDate: string;
}

/**
 * The seam between RewardRadar and any data source. The real flight
 * data API becomes one implementation of this interface; nothing
 * downstream (diffing, routing, alerts, syndication) knows or cares
 * where availability comes from.
 */
export interface SourceAdapter {
  name: string;
  /** Programmes this adapter can serve. */
  supports(programId: string): boolean;
  /** Targets this adapter wants polled for a programme. */
  listTargets(programId: string): Promise<PollTarget[]>;
  /** Fetch current availability for one target. */
  fetch(target: PollTarget): Promise<AvailabilitySnapshot>;
}

export class AdapterRegistry {
  private adapters: SourceAdapter[] = [];

  register(adapter: SourceAdapter): void {
    this.adapters.push(adapter);
  }

  /** First registered adapter that supports the programme wins. */
  forProgram(programId: string): SourceAdapter | null {
    return this.adapters.find((a) => a.supports(programId)) ?? null;
  }
}
