import type { AvailabilityQuery, AvailabilitySource } from "./types";
import type { AvailabilitySnapshot } from "../availability";

/**
 * Adapter for the real award-availability API.
 *
 * TO COMPLETE, provide:
 *   1. Base URL and auth (env: AWARD_API_BASE_URL, AWARD_API_KEY)
 *   2. The availability endpoint path and query params
 *   3. A sample response, so mapResponse() can be written against
 *      the real payload shape
 *   4. Rate limits, so the limiter below can be tuned
 */
export class ExternalApiSource implements AvailabilitySource {
  id = "external_api";

  private baseUrl = process.env.AWARD_API_BASE_URL ?? "";
  private apiKey = process.env.AWARD_API_KEY ?? "";
  private minIntervalMs = 250;
  private lastCallAt = 0;

  supports(_programId: string): boolean {
    // Narrow this once the real programme coverage list is known.
    return true;
  }

  async fetchAvailability(q: AvailabilityQuery): Promise<AvailabilitySnapshot[]> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        "ExternalApiSource not configured. Set AWARD_API_BASE_URL and AWARD_API_KEY.",
      );
    }

    await this.throttle();

    const url = new URL("/v1/availability", this.baseUrl); // TODO real path
    url.searchParams.set("program", q.program);
    url.searchParams.set("origin", q.origin);
    url.searchParams.set("destination", q.destination);
    url.searchParams.set("date_from", q.dateFrom);
    url.searchParams.set("date_to", q.dateTo);

    const res = await fetch(url, {
      headers: { authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Availability API ${res.status} for ${q.program} ${q.origin}-${q.destination}`);
    }

    const body: unknown = await res.json();
    return this.mapResponse(body, q);
  }

  private mapResponse(_body: unknown, _q: AvailabilityQuery): AvailabilitySnapshot[] {
    // TODO map the real payload into AvailabilitySnapshot[].
    throw new Error("mapResponse not implemented: provide a sample API response.");
  }

  private async throttle(): Promise<void> {
    const wait = this.lastCallAt + this.minIntervalMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }
}
