import type { AeroFlightItem } from "./aero-types";
import { FLIGHT_CLASS_CONFIG } from "./aero-client";
import type { UpstreamRow } from "../upstream";

/**
 * Shared mapping from provider flight items to upstream CSV rows. Both
 * the batch generator and the live AeroUpstream use this so their output
 * cannot drift apart.
 */

export type CabinKey = keyof typeof FLIGHT_CLASS_CONFIG;

const AIRLINE_NAMES: Record<string, string> = {
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  QR: "Qatar Airways",
  EY: "Etihad Airways",
  VA: "Virgin Australia",
  QF: "Qantas",
  AA: "American Airlines",
  UA: "United Airlines",
};

/**
 * Per-cabin "operating carrier of the nonstop" field. Direct rows are
 * attributed to the airline that actually flies the segment, not to the
 * whole-itinerary airline list.
 */
const DIRECT_AIRLINES_FIELD: Record<CabinKey, keyof AeroFlightItem> = {
  Economy: "YDirectAirlines",
  Business: "JDirectAirlines",
  Premium: "WDirectAirlines",
  First: "FDirectAirlines",
};

function capitalizeSource(source: string): string {
  if (!source) return source;
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

/** ISO YYYY-MM-DD, matching the CSV the normaliser already parses. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface MapOptions {
  cabins: CabinKey[];
  searchDate: string;
  /** Drop connecting awards (region-level "directOnly"). */
  directOnly?: boolean;
  /**
   * Optional operating-carrier allowlist (uppercase IATA). The batch
   * generator passes a per-region list; the live port passes none and
   * lets the service narrow by programme instead.
   */
  airlineAllowlist?: Set<string>;
}

/**
 * Map one flight item to zero or more upstream rows.
 *
 * One row per flight/date per matched carrier: prefer the nonstop award
 * when one exists, otherwise the connecting award (never both for the
 * same date). All numeric fields are emitted as strings, with "NULL" for
 * unknowns, exactly as the CSV export does, so downstream normalisation
 * is identical whether the row came from a file or live.
 */
export function flightToRows(flight: AeroFlightItem, opts: MapOptions): UpstreamRow[] {
  const rows: UpstreamRow[] = [];

  for (const cabinKey of opts.cabins) {
    const config = FLIGHT_CLASS_CONFIG[cabinKey];
    if (!config || !flight[config.available]) continue;

    const isDirect = Boolean(flight[config.direct]);
    if (opts.directOnly && !isDirect) continue;

    const costField = isDirect ? config.directMileageCost : config.mileageCost;
    const cost = flight[costField];
    if (cost == null || isNaN(parseFloat(String(cost)))) continue;

    const airlinesField = isDirect ? DIRECT_AIRLINES_FIELD[cabinKey] : config.airlines;
    if (!airlinesField) continue;
    const airlinesStr = (flight[airlinesField] as string) ?? "";
    if (!airlinesStr) continue;

    const iataList = airlinesStr
      .split(",")
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a && a !== "NULL" && (!opts.airlineAllowlist || opts.airlineAllowlist.has(a)));
    if (iataList.length === 0) continue;

    const seats = flight[isDirect ? config.directRemainingSeats : config.remainingSeats];
    const taxes = flight[isDirect ? config.directTotalTaxes : config.totalTaxes];

    for (const iata of iataList) {
      rows.push({
        origin: flight.Route.OriginAirport,
        destination: flight.Route.DestinationAirport,
        airline: AIRLINE_NAMES[iata] ?? iata,
        cabin: cabinKey,
        program: capitalizeSource(flight.Source),
        points_required: typeof cost === "number" ? String(cost) : String(parseFloat(String(cost))),
        seats_available: seats != null && Number(seats) > 0 ? String(Number(seats)) : "NULL",
        taxes_currency: flight.TaxesCurrency ?? "NULL",
        taxes_amount: taxes != null && Number(taxes) > 0 ? String(taxes) : "NULL",
        flight_type: isDirect ? "Direct" : "Connecting",
        search_date: opts.searchDate,
        departure_date: isoDate(new Date(flight.Date)),
        availability_status: "Available",
      });
    }
  }

  return rows;
}
