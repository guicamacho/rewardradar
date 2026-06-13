import type { AvailabilityQuery, AvailabilitySource } from "./types";
import type { AvailabilitySnapshot } from "../availability";
import type { Cabin } from "../events";

interface SeedFlight {
  program: string;
  origin: string;
  destination: string;
  departureDate: string;
  cabin: Cabin;
  flight: { carrier: string; number: string };
  seats: number;
  miles: number;
}

/**
 * Deterministic fake provider for development and tests.
 * Call mutate() between polls to simulate the world changing,
 * which is what produces deal events downstream.
 */
export class MockSource implements AvailabilitySource {
  id = "mock";
  private state: SeedFlight[];

  constructor(seed: SeedFlight[]) {
    this.state = seed.map((s) => ({ ...s }));
  }

  supports(_programId: string): boolean {
    return true;
  }

  async fetchAvailability(q: AvailabilityQuery): Promise<AvailabilitySnapshot[]> {
    const now = new Date().toISOString();
    return this.state
      .filter(
        (s) =>
          s.program === q.program &&
          s.origin === q.origin &&
          s.destination === q.destination &&
          s.seats > 0,
      )
      .map((s) => ({
        program: s.program,
        origin: s.origin,
        destination: s.destination,
        departureDate: s.departureDate,
        cabin: s.cabin,
        flight: s.flight,
        seats: s.seats,
        miles: s.miles,
        taxes: { amount: 87.4, currency: "USD" },
        fetchedAt: now,
      }));
  }

  /** Apply a world change: open seats, close them, or reprice. */
  mutate(fn: (state: SeedFlight[]) => void): void {
    fn(this.state);
  }
}

export type { SeedFlight };
