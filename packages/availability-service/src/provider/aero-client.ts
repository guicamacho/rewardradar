import type { AeroFlightItem, AeroSearchResponse } from "./aero-types";

/**
 * Per-cabin field map. The provider encodes each cabin as a letter
 * prefix (Y economy, W premium, J business, F first) across a family of
 * fields; this picks the right ones per cabin so the rest of the code
 * stays cabin-agnostic.
 */
export interface FlightClassConfig {
  remainingSeats: keyof AeroFlightItem;
  directRemainingSeats: keyof AeroFlightItem;
  available: keyof AeroFlightItem;
  mileageCost: keyof AeroFlightItem;
  directMileageCost: keyof AeroFlightItem;
  airlines: keyof AeroFlightItem;
  direct: keyof AeroFlightItem;
  totalTaxes: keyof AeroFlightItem;
  directTotalTaxes: keyof AeroFlightItem;
}

export const FLIGHT_CLASS_CONFIG: Record<string, FlightClassConfig> = {
  Economy: {
    remainingSeats: "YRemainingSeats",
    directRemainingSeats: "YDirectRemainingSeats",
    available: "YAvailable",
    mileageCost: "YMileageCostRaw",
    directMileageCost: "YDirectMileageCostRaw",
    airlines: "YAirlines",
    direct: "YDirect",
    totalTaxes: "YTotalTaxes",
    directTotalTaxes: "YDirectTotalTaxes",
  },
  Business: {
    remainingSeats: "JRemainingSeats",
    directRemainingSeats: "JDirectRemainingSeats",
    available: "JAvailable",
    mileageCost: "JMileageCostRaw",
    directMileageCost: "JDirectMileageCostRaw",
    airlines: "JAirlines",
    direct: "JDirect",
    totalTaxes: "JTotalTaxes",
    directTotalTaxes: "JDirectTotalTaxes",
  },
  Premium: {
    remainingSeats: "WRemainingSeats",
    directRemainingSeats: "WDirectRemainingSeats",
    available: "WAvailable",
    mileageCost: "WMileageCostRaw",
    directMileageCost: "WDirectMileageCostRaw",
    airlines: "WAirlines",
    direct: "WDirect",
    totalTaxes: "WTotalTaxes",
    directTotalTaxes: "WDirectTotalTaxes",
  },
  First: {
    remainingSeats: "FRemainingSeats",
    directRemainingSeats: "FDirectRemainingSeats",
    available: "FAvailable",
    mileageCost: "FMileageCostRaw",
    directMileageCost: "FDirectMileageCostRaw",
    airlines: "FAirlines",
    direct: "FDirect",
    totalTaxes: "FTotalTaxes",
    directTotalTaxes: "FDirectTotalTaxes",
  },
};

/** Public vendor endpoint; not a secret, so it has a default. */
const DEFAULT_API_URL = "https://seats.aero/partnerapi";

/** Pagination + retry tuning for the partner search API. */
const PAGE_SIZE = 1000;
const PAGE_DELAY_MS = 250;
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 1000;

export interface AeroConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * The provider key MUST come from the environment. It is never hardcoded
 * or committed (RewardRadar treats all credentials as env-only).
 */
export function getAeroConfig(): AeroConfig {
  const apiKey = process.env.AERO_API_KEY ?? "";
  if (!apiKey) {
    throw new Error(
      "AERO_API_KEY is not set. The award-availability provider key must come from the environment.",
    );
  }
  return { apiUrl: process.env.AERO_API_URL ?? DEFAULT_API_URL, apiKey };
}

type PagedResponse = AeroSearchResponse & { hasMore?: boolean; moreURL?: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** GET with exponential backoff on transient failures. */
async function fetchJson(url: string, config: AeroConfig): Promise<PagedResponse> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Partner-Authorization": config.apiKey, accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Aero API ${res.status}`);
      return (await res.json()) as PagedResponse;
    } catch (e) {
      if (attempt >= MAX_RETRIES) throw e;
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }
}

/**
 * Fetch a full year of availability for one directional route.
 *
 * The API caps each page, so follow the cursor (hasMore/moreURL) until
 * exhausted rather than assuming a single large page holds the whole
 * year. Each page is retried with backoff.
 */
export async function fetchFlights(
  origin: string,
  destination: string,
  config: AeroConfig = getAeroConfig(),
): Promise<AeroFlightItem[]> {
  const today = new Date();
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(today.getFullYear() + 1);
  const startDate = today.toISOString().slice(0, 10);
  const endDate = oneYearLater.toISOString().slice(0, 10);
  const apiOrigin = new URL(config.apiUrl).origin;

  let url: string | null =
    `${config.apiUrl}/search?origin_airport=${origin}&destination_airport=${destination}` +
    `&start_date=${startDate}&end_date=${endDate}&take=${PAGE_SIZE}`;

  const all: AeroFlightItem[] = [];
  while (url) {
    const json = await fetchJson(url, config);
    all.push(...(json.data ?? []));
    url = json.hasMore && json.moreURL ? `${apiOrigin}${json.moreURL}` : null;
    if (url) await sleep(PAGE_DELAY_MS);
  }
  return all;
}
