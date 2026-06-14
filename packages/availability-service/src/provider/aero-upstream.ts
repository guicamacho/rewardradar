import type { AvailabilityRequest, Cabin } from "../contract";
import type { UpstreamPort, UpstreamRow } from "../upstream";
import { fetchFlights, getAeroConfig, type AeroConfig } from "./aero-client";
import { flightToRows, isoDate, type CabinKey } from "./map-rows";

/** Every cabin the provider encodes, mapped to its config key. */
const ALL_CABINS: CabinKey[] = ["Economy", "Premium", "Business", "First"];

const CABIN_KEY_BY_CANONICAL: Record<Cabin, CabinKey> = {
  economy: "Economy",
  premium_economy: "Premium",
  business: "Business",
  first: "First",
};

export interface AeroUpstreamOptions {
  config?: AeroConfig;
  /**
   * Restrict to specific cabins. Defaults to all, so one cached
   * route+window result serves requests for any cabin (the service
   * narrows by cabin downstream, exactly as with the CSV port).
   */
  cabins?: Cabin[];
}

/**
 * Live UpstreamPort backed by the Aero partner search API. An
 * alternative to CsvUpstream: instead of reading a pre-generated CSV, it
 * queries the provider per route and maps results into the same row
 * shape. Returns every programme and cabin for the route+window so the
 * service cache stays shareable across brands; the service filters by
 * programme and cabin after caching.
 *
 * Trade-off vs CsvUpstream: real-time freshness at the cost of a live
 * API call (and its rate limits) on each cache miss. The per-region
 * airline allowlist that the batch generator applies is a curation step
 * and is intentionally not applied here.
 */
export class AeroUpstream implements UpstreamPort {
  private readonly config: AeroConfig;
  private readonly cabins: CabinKey[];

  constructor(opts: AeroUpstreamOptions = {}) {
    this.config = opts.config ?? getAeroConfig();
    this.cabins = opts.cabins
      ? opts.cabins.map((c) => CABIN_KEY_BY_CANONICAL[c])
      : ALL_CABINS;
  }

  async fetchRows(req: AvailabilityRequest): Promise<UpstreamRow[]> {
    const flights = await fetchFlights(req.origin, req.destination, this.config);
    const searchDate = isoDate(new Date());
    const rows = flights.flatMap((f) => flightToRows(f, { cabins: this.cabins, searchDate }));
    // fetchFlights scans a fixed forward span; honour the request window.
    return rows.filter((r) => r.departure_date >= req.dateFrom && r.departure_date <= req.dateTo);
  }
}
