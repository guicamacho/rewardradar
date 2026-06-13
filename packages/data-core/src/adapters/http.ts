import { z } from "zod";
import type { SourceAdapter, PollTarget } from "../source";
import { AvailabilitySnapshot, type AwardSlice } from "../types";

/**
 * Skeleton adapter for the real flight-data API. Three things to fill
 * in once API details are available, all marked TODO:
 *
 *   1. RawResponse  - zod schema matching the actual response shape
 *   2. toSlices()   - mapping from the raw shape to AwardSlice
 *   3. listTargets()- where polling targets come from (watchlists DB
 *                     plus market-config teaser defaults)
 *
 * Nothing outside this file changes when the real API is wired in.
 */

/* TODO(1): replace with the actual response schema. */
const RawResponse = z.object({
  results: z.array(
    z.object({
      program: z.string(),
      from: z.string(),
      to: z.string(),
      date: z.string(),
      cabin: z.string(),
      seats: z.number(),
      miles: z.number().optional(),
      taxes: z.number().optional(),
      currency: z.string().optional(),
      direct: z.boolean().optional(),
    }),
  ),
});

const CABIN_MAP: Record<string, AwardSlice["cabin"]> = {
  Y: "economy",
  W: "premium_economy",
  J: "business",
  F: "first",
  economy: "economy",
  premium_economy: "premium_economy",
  business: "business",
  first: "first",
};

export interface HttpAdapterOptions {
  baseUrl: string;
  apiKey: string;
  /** Programmes this deployment of the API serves. */
  programs: string[];
  fetchImpl?: typeof fetch;
}

export class HttpAdapter implements SourceAdapter {
  name = "flight-data-api";

  constructor(private readonly opts: HttpAdapterOptions) {}

  supports(programId: string): boolean {
    return this.opts.programs.includes(programId);
  }

  async listTargets(_programId: string): Promise<PollTarget[]> {
    /* TODO(3): pull from the watchlists table and market-config
       homeAirports teaser defaults. */
    return [];
  }

  async fetch(target: PollTarget): Promise<AvailabilitySnapshot> {
    const f = this.opts.fetchImpl ?? fetch;
    const url = new URL("/availability", this.opts.baseUrl);
    url.searchParams.set("program", target.programId);
    url.searchParams.set("origin", target.origin);
    url.searchParams.set("destination", target.destination);
    url.searchParams.set("from", target.fromDate);
    url.searchParams.set("to", target.toDate);

    const res = await f(url, {
      headers: { authorization: `Bearer ${this.opts.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`${this.name}: ${res.status} ${res.statusText} for ${url.pathname}`);
    }

    const raw = RawResponse.parse(await res.json());

    /* TODO(2): adjust mapping to the real field names. */
    const slices: AwardSlice[] = raw.results.map((r) => ({
      programId: r.program,
      origin: r.from,
      destination: r.to,
      departureDate: r.date,
      cabin: CABIN_MAP[r.cabin] ?? "economy",
      seats: Math.min(9, Math.max(0, r.seats)),
      milesCost: r.miles ?? null,
      feesAmount: r.taxes ?? null,
      feesCurrency: r.currency ?? null,
      direct: r.direct ?? true,
      flightNumbers: [],
    }));

    return AvailabilitySnapshot.parse({
      programId: target.programId,
      target,
      fetchedAt: new Date().toISOString(),
      slices,
    });
  }
}
