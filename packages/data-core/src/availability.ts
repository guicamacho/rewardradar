import type { Cabin } from "./events";

/** One observed fare bucket on one flight/date. The unit of diffing. */
export interface AvailabilitySnapshot {
  program: string;
  origin: string;
  destination: string;
  departureDate: string;
  cabin: Cabin;
  flight: { carrier: string; number: string } | null;
  seats: number | null;
  miles: number | null;
  taxes: { amount: number; currency: string } | null;
  fetchedAt: string;
}

export function routeKey(program: string, origin: string, destination: string): string {
  return `${program}|${origin}|${destination}`;
}

export function snapshotKey(s: AvailabilitySnapshot): string {
  const f = s.flight ? `${s.flight.carrier}${s.flight.number}` : "ANY";
  return `${s.departureDate}|${s.cabin}|${f}`;
}

/**
 * Persistence boundary. InMemory for dev and tests; the production
 * implementation (Postgres on Railway) implements the same interface.
 */
export interface SnapshotStore {
  getRoute(key: string): Promise<Map<string, AvailabilitySnapshot> | undefined>;
  replaceRoute(key: string, snaps: AvailabilitySnapshot[]): Promise<void>;
}

export class InMemorySnapshotStore implements SnapshotStore {
  private data = new Map<string, Map<string, AvailabilitySnapshot>>();

  async getRoute(key: string): Promise<Map<string, AvailabilitySnapshot> | undefined> {
    return this.data.get(key);
  }

  async replaceRoute(key: string, snaps: AvailabilitySnapshot[]): Promise<void> {
    const m = new Map<string, AvailabilitySnapshot>();
    for (const s of snaps) m.set(snapshotKey(s), s);
    this.data.set(key, m);
  }
}
