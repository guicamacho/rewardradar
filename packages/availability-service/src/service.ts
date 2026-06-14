import { TtlCache } from "./cache";
import {
  AvailabilityRequest,
  type AvailabilityRecord,
  type AvailabilityResponse,
} from "./contract";
import { normalise, type NormaliseLogger } from "./normalise";
import type { UpstreamPort } from "./upstream";

export interface AvailabilityServiceOptions {
  upstream: UpstreamPort;
  /** How long a route+window result is reused before re-reading upstream. */
  cacheTtlMs?: number;
  logger?: NormaliseLogger;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60_000;

/**
 * Brand-neutral availability backend. Validates the request, reads
 * upstream once per route+window (cached), then narrows to the requested
 * programme and cabins. Caching at route+window granularity is what lets
 * one backend serve many brands without multiplying upstream load.
 */
export class AvailabilityService {
  private readonly upstream: UpstreamPort;
  private readonly logger: NormaliseLogger;
  private readonly cache: TtlCache<AvailabilityRecord[]>;

  constructor(opts: AvailabilityServiceOptions) {
    this.upstream = opts.upstream;
    this.logger = opts.logger ?? console;
    this.cache = new TtlCache<AvailabilityRecord[]>(opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
  }

  /** Parse-and-handle from untrusted input (e.g. an HTTP body). */
  async handle(input: unknown, now: Date = new Date()): Promise<AvailabilityResponse> {
    const request = AvailabilityRequest.parse(input);
    return this.serve(request, now);
  }

  /** Handle an already-validated request. */
  async serve(request: AvailabilityRequest, now: Date = new Date()): Promise<AvailabilityResponse> {
    const key = routeWindowKey(request);
    let all = this.cache.get(key, now.getTime());
    let cached = true;

    if (!all) {
      cached = false;
      const rows = await this.upstream.fetchRows(request);
      all = normalise(rows, this.logger);
      this.cache.set(key, all, now.getTime());
    }

    const cabins = new Set(request.cabins);
    const records = all.filter((r) => r.program === request.program && cabins.has(r.cabin));

    return { request, servedAt: now.toISOString(), cached, records };
  }
}

/** Cache key is the upstream read unit: route + departure-date window. */
function routeWindowKey(r: AvailabilityRequest): string {
  return `${r.origin}|${r.destination}|${r.dateFrom}|${r.dateTo}`;
}
