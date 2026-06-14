import type { AvailabilityResponse } from "@rewardradar/availability-service";
import type { AvailabilityQuery, AvailabilitySource } from "./types";
import type { AvailabilitySnapshot } from "../availability";

/**
 * Reads from the shared availability-service over its private HTTP
 * contract instead of querying airline systems directly. The response
 * is already snapshot-shaped, so mapping is a thin field copy
 * (observedAt -> fetchedAt; connection is metadata the snapshot drops).
 *
 * Configure with AVAILABILITY_SERVICE_URL and AVAILABILITY_SERVICE_KEY.
 */
export class AvailabilityServiceSource implements AvailabilitySource {
  id = "availability_service";

  private baseUrl = process.env.AVAILABILITY_SERVICE_URL ?? "";
  private apiKey = process.env.AVAILABILITY_SERVICE_KEY ?? "";

  supports(_programId: string): boolean {
    // The service is the universal backend; it answers for any programme
    // it covers and returns nothing for those it does not.
    return true;
  }

  async fetchAvailability(q: AvailabilityQuery): Promise<AvailabilitySnapshot[]> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        "AvailabilityServiceSource not configured. Set AVAILABILITY_SERVICE_URL and AVAILABILITY_SERVICE_KEY.",
      );
    }

    const res = await fetch(new URL("/v1/availability", this.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-availability-key": this.apiKey,
      },
      body: JSON.stringify({
        program: q.program,
        origin: q.origin,
        destination: q.destination,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        cabins: q.cabins,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Availability service ${res.status} for ${q.program} ${q.origin}-${q.destination}`,
      );
    }

    const body = (await res.json()) as AvailabilityResponse;
    return body.records.map((r) => ({
      program: r.program,
      origin: r.origin,
      destination: r.destination,
      departureDate: r.departureDate,
      cabin: r.cabin,
      flight: r.flight,
      seats: r.seats,
      miles: r.miles,
      taxes: r.taxes,
      fetchedAt: r.observedAt,
    }));
  }
}
