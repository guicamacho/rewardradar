import type { AvailabilityRequest } from "./contract";

/**
 * A raw upstream row, before normalisation. Field names mirror the CSV
 * export so a real backend can return the same shape unchanged.
 */
export interface UpstreamRow {
  origin: string;
  destination: string;
  airline: string;
  cabin: string;
  program: string;
  points_required: string;
  seats_available: string;
  taxes_currency: string;
  taxes_amount: string;
  flight_type: string;
  search_date: string;
  departure_date: string;
  availability_status: string;
}

/**
 * The single seam to the real data store. Implementations return every
 * row they hold for the request's route and departure-date window,
 * across all programmes and cabins. The service narrows by programme
 * and cabin after caching, so one upstream read serves many brands.
 *
 * CsvUpstream implements this from a CSV export for dev and tests; the
 * production port implements the same interface against the live
 * backend. Nothing else in the service changes.
 */
export interface UpstreamPort {
  fetchRows(req: AvailabilityRequest): Promise<UpstreamRow[]>;
}
