/**
 * Refreshes the region route-list CSVs from the live upstream provider.
 *
 * Polls the Aero partner search API per route (paginated, with retry),
 * maps each result into the CSV row shape CsvUpstream reads, and writes
 * one CSV per region. Run on a schedule (e.g. a weekly worker);
 * CsvUpstream then serves the latest export through /v1/availability.
 *
 * Usage: AERO_API_KEY=... npm run generate -w @rewardradar/availability-service
 * Output dir: $ROUTES_OUTPUT_DIR, or ./data next to this package.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFlights, getAeroConfig } from "./provider/aero-client";
import { flightToRows, isoDate, type CabinKey } from "./provider/map-rows";
import type { UpstreamRow } from "./upstream";

type Route = { origin: string; destination: string; airlines: string[] };
type Region = { name: string; filename: string; routes: Route[]; directOnly: boolean };

const CABINS_TO_EXPORT: CabinKey[] = ["Business"];

/**
 * Per-region routes and their airline allowlists are intentionally
 * hardcoded: this is a deliberate coverage rule, not a default to
 * generalise. Do not replace it with "all airlines" — narrowing to
 * these carriers per route is the intended behaviour. Extend the lists
 * deliberately as coverage grows.
 */
const REGIONS: Region[] = [
  {
    name: "EUROPE",
    filename: "EUROPE_routes.csv",
    directOnly: false,
    routes: expand(["SYD", "MEL", "BNE"], ["LHR", "FCO", "CDG"], ["SQ", "CX", "QR", "EY"]),
  },
  {
    name: "AMERICAS",
    filename: "AMERICAS_routes.csv",
    directOnly: false,
    routes: expand(["SYD", "MEL"], ["LAX"], ["QF", "AA", "UA"]),
  },
  {
    name: "ASIA",
    filename: "ASIA_routes.csv",
    directOnly: true,
    routes: [
      ...expand(["SYD", "MEL"], ["NRT"], ["SQ", "CX"]),
      ...expand(["SYD", "MEL"], ["BKK"], ["SQ", "CX"]),
      ...expand(["SYD", "MEL"], ["HKG"], ["CX"]),
      ...expand(["SYD", "MEL"], ["SIN"], ["SQ"]),
    ],
  },
  {
    name: "SHORT_HAUL",
    filename: "SHORT_HAUL_routes.csv",
    directOnly: true,
    routes: expand(["SYD", "MEL"], ["DPS"], ["SQ", "VA"]),
  },
];

function expand(origins: string[], destinations: string[], airlines: string[]): Route[] {
  const out: Route[] = [];
  for (const origin of origins) {
    for (const destination of destinations) {
      out.push({ origin, destination, airlines });
    }
  }
  return out;
}

const HEADERS = [
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
] as const;

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function writeCsv(dir: string, filename: string, rows: UpstreamRow[]): void {
  const header = HEADERS.join(",");
  const body = rows.map((r) => HEADERS.map((col) => csvEscape(r[col])).join(",")).join("\n");
  writeFileSync(join(dir, filename), `${header}\n${body}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const config = getAeroConfig(); // fail fast if the key is missing
  const outputDir =
    process.env.ROUTES_OUTPUT_DIR ?? fileURLToPath(new URL("../data", import.meta.url));
  mkdirSync(outputDir, { recursive: true });

  const searchDate = isoDate(new Date());
  console.log(`Writing route CSVs to ${outputDir}`);

  for (const region of REGIONS) {
    console.log(`\n=== ${region.name} ===`);
    const regionRows: UpstreamRow[] = [];

    for (const route of region.routes) {
      const allowlist = new Set(route.airlines);
      const directions: [string, string][] = [
        [route.origin, route.destination],
        [route.destination, route.origin],
      ];
      for (const [origin, destination] of directions) {
        try {
          const flights = await fetchFlights(origin, destination, config);
          const rows = flights.flatMap((f) =>
            flightToRows(f, {
              cabins: CABINS_TO_EXPORT,
              searchDate,
              directOnly: region.directOnly,
              airlineAllowlist: allowlist,
            }),
          );
          regionRows.push(...rows);
          console.log(`  ${origin}->${destination}: ${flights.length} flights -> ${rows.length} rows`);
        } catch (e) {
          console.error(`  ${origin}->${destination}: ERROR ${(e as Error).message}`);
        }
        await sleep(500);
      }
    }

    writeCsv(outputDir, region.filename, regionRows);
    console.log(`Wrote ${region.filename} - ${regionRows.length} total rows`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
