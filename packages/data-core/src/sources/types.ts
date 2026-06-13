import type { AvailabilitySnapshot } from "../availability";
import type { Cabin } from "../events";

export interface AvailabilityQuery {
  program: string;
  origin: string;
  destination: string;
  /** Inclusive YYYY-MM-DD range to scan. */
  dateFrom: string;
  dateTo: string;
  cabins: Cabin[];
}

/**
 * Adapter boundary for any upstream availability provider.
 * Implementations must be stateless per call and rate-limit internally.
 */
export interface AvailabilitySource {
  id: string;
  supports(programId: string): boolean;
  fetchAvailability(q: AvailabilityQuery): Promise<AvailabilitySnapshot[]>;
}
