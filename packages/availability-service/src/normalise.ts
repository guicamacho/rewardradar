import type { AvailabilityRecord, Cabin } from "./contract";
import type { UpstreamRow } from "./upstream";

/**
 * Upstream `program` arrives as a display name. Map it to the canonical
 * programme id that is the data-core contract. Extend this table as
 * coverage grows; unmapped names are logged, not silently dropped.
 */
export const PROGRAM_BY_DISPLAY: Record<string, string> = {
  Alaska: "alaska_mileage_plan",
  American: "aa_aadvantage",
  Etihad: "etihad_guest",
  Flyingblue: "flying_blue",
  Qantas: "qantas_ff",
};

/** Upstream cabin label to canonical cabin. */
const CABIN_BY_DISPLAY: Record<string, Cabin> = {
  Economy: "economy",
  "Premium Economy": "premium_economy",
  Premium: "premium_economy",
  Business: "business",
  First: "first",
};

/** Operating-carrier display name to IATA carrier code. */
const CARRIER_BY_DISPLAY: Record<string, string> = {
  "American Airlines": "AA",
  Qantas: "QF",
};

export interface NormaliseLogger {
  warn(message: string): void;
}

/**
 * Map raw upstream rows to normalised records.
 *
 * - program: display -> canonical id. Unmapped names are logged and the
 *   row skipped (we cannot emit a record without a contract id).
 * - seats_available "NULL" stays null (unknown). Never coerced to 0,
 *   because 0 reads downstream as "closed" and fires false retractions.
 * - taxes: currency preserved verbatim, amount passed through unchanged.
 * - flight_type Direct/Connecting -> connection.
 * - flight: carrier mapped, number left empty until upstream exposes it.
 */
export function normalise(
  rows: UpstreamRow[],
  logger: NormaliseLogger = console,
): AvailabilityRecord[] {
  const records: AvailabilityRecord[] = [];
  const unmappedSeen = new Set<string>();

  for (const row of rows) {
    const program = PROGRAM_BY_DISPLAY[row.program];
    if (!program) {
      if (!unmappedSeen.has(row.program)) {
        unmappedSeen.add(row.program);
        logger.warn(`[availability-service] unmapped programme display name: "${row.program}"`);
      }
      continue;
    }

    const cabin = CABIN_BY_DISPLAY[row.cabin];
    if (!cabin) {
      logger.warn(`[availability-service] unmapped cabin: "${row.cabin}" (${row.program} ${row.origin}-${row.destination})`);
      continue;
    }

    records.push({
      program,
      origin: row.origin,
      destination: row.destination,
      departureDate: row.departure_date,
      cabin,
      flight: { carrier: CARRIER_BY_DISPLAY[row.airline] ?? row.airline, number: "" },
      seats: parseSeats(row.seats_available),
      miles: parseIntOrNull(row.points_required),
      taxes: parseTaxes(row.taxes_amount, row.taxes_currency),
      connection: row.flight_type.toLowerCase() === "connecting" ? "connecting" : "direct",
      observedAt: toIso(row.search_date),
    });
  }

  return records;
}

function parseSeats(raw: string): number | null {
  const v = raw.trim();
  if (v === "" || v.toUpperCase() === "NULL") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: string): number | null {
  const v = raw.trim();
  if (v === "" || v.toUpperCase() === "NULL") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseTaxes(amount: string, currency: string): { amount: number; currency: string } | null {
  const a = amount.trim();
  const c = currency.trim();
  if (a === "" || a.toUpperCase() === "NULL" || c === "" || c.toUpperCase() === "NULL") return null;
  const n = Number.parseFloat(a);
  if (!Number.isFinite(n)) return null;
  return { amount: n, currency: c };
}

/** A bare YYYY-MM-DD becomes midnight UTC; anything else is passed through. */
function toIso(date: string): string {
  const v = date.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00.000Z` : v;
}
