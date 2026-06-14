import { readFileSync } from "node:fs";
import type { AvailabilityRequest } from "./contract";
import type { UpstreamPort, UpstreamRow } from "./upstream";

const COLUMNS: Array<keyof UpstreamRow> = [
  "origin",
  "destination",
  "airline",
  "cabin",
  "program",
  "points_required",
  "seats_available",
  "taxes_currency",
  "taxes_amount",
  "flight_type",
  "search_date",
  "departure_date",
  "availability_status",
];

/**
 * UpstreamPort backed by a CSV export (the AMERICAS_routes.csv shape).
 * Loads the file once, then answers each request from memory, filtered
 * to the route and departure-date window. Programme and cabin filtering
 * happen in the service, after the cache, so one read serves many brands.
 */
export class CsvUpstream implements UpstreamPort {
  private rows: UpstreamRow[] | null = null;

  constructor(private readonly csvPath: string) {}

  async fetchRows(req: AvailabilityRequest): Promise<UpstreamRow[]> {
    const rows = (this.rows ??= this.load());
    return rows.filter(
      (r) =>
        r.origin === req.origin &&
        r.destination === req.destination &&
        r.departure_date >= req.dateFrom &&
        r.departure_date <= req.dateTo,
    );
  }

  private load(): UpstreamRow[] {
    const text = readFileSync(this.csvPath, "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    const [, ...body] = lines; // header is fixed; COLUMNS defines the order
    return body.map((line) => {
      const cells = parseCsvLine(line);
      const row = {} as UpstreamRow;
      COLUMNS.forEach((col, i) => {
        row[col] = (cells[i] ?? "").trim();
      });
      return row;
    });
  }
}

/** Minimal RFC-4180-ish line parser: handles quoted fields and "" escapes. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}
