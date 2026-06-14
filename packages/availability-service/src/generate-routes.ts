/**
 * Refreshes the region route-list CSVs from the live upstream provider.
 *
 * Polls the Aero partner search API per route, maps each result into the
 * CSV row shape CsvUpstream reads, and writes one CSV per region. Run on
 * a schedule (e.g. a weekly worker); CsvUpstream then serves the latest
 * export through the /v1/availability contract.
 *
 * Usage: AERO_API_KEY=... npm run generate -w @rewardradar/availability-service
 * Output dir: $ROUTES_OUTPUT_DIR, or ./data next to this package.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AeroFlightItem } from "./provider/aero-types";
import { FLIGHT_CLASS_CONFIG, fetchFlights, getAeroConfig } from "./provider/aero-client";

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

function capitalizeSource(source: string): string {
  if (!source) return source;
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

type Route = { origin: string; destination: string; airlines: string[] };
type Region = { name: string; filename: string; routes: Route[]; directOnly: boolean };

const CABINS_TO_EXPORT: (keyof typeof FLIGHT_CLASS_CONFIG)[] = ["Business"];

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

type CsvRow = Record<(typeof HEADERS)[number], string | number>;

/** ISO YYYY-MM-DD, matching the CSV the normaliser already parses. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function processRoute(
  flights: AeroFlightItem[],
  route: Route,
  searchDate: string,
  directOnly: boolean,
): CsvRow[] {
  const rows: CsvRow[] = [];
  const routeAirlinesSet = new Set(route.airlines);

  const directFlags = directOnly ? [true] : [true, false];

  for (const flight of flights) {
    for (const cabinKey of CABINS_TO_EXPORT) {
      const config = FLIGHT_CLASS_CONFIG[cabinKey];
      if (!config || !flight[config.available]) continue;

      for (const isDirect of directFlags) {
        const directFlag = flight[config.direct] as boolean;
        if (isDirect !== directFlag) continue;

        const costField = isDirect ? config.directMileageCost : config.mileageCost;
        const cost = flight[costField];
        if (cost == null || isNaN(parseFloat(String(cost)))) continue;

        const airlinesStr = (flight[config.airlines] as string) ?? "";
        if (!airlinesStr) continue;

        const iataList = airlinesStr
          .split(",")
          .map((a) => a.trim().toUpperCase())
          .filter((a) => a && a !== "NULL" && routeAirlinesSet.has(a));
        if (iataList.length === 0) continue;

        const seatsField = isDirect ? config.directRemainingSeats : config.remainingSeats;
        const taxesField = isDirect ? config.directTotalTaxes : config.totalTaxes;

        const seats = flight[seatsField];
        const taxes = flight[taxesField];

        for (const iata of iataList) {
          rows.push({
            origin: flight.Route.OriginAirport,
            destination: flight.Route.DestinationAirport,
            airline: AIRLINE_NAMES[iata] ?? iata,
            cabin: cabinKey,
            program: capitalizeSource(flight.Source),
            points_required: typeof cost === "number" ? cost : parseFloat(String(cost)),
            seats_available: seats != null && Number(seats) > 0 ? Number(seats) : "NULL",
            taxes_currency: flight.TaxesCurrency ?? "NULL",
            taxes_amount: taxes != null && Number(taxes) > 0 ? String(taxes) : "NULL",
            flight_type: isDirect ? "Direct" : "Connecting",
            search_date: searchDate,
            departure_date: isoDate(new Date(flight.Date)),
            availability_status: "Available",
          });
        }
      }
    }
  }

  return rows;
}

function writeCsv(dir: string, filename: string, rows: CsvRow[]): void {
  const header = HEADERS.join(",");
  const body = rows.map((r) => HEADERS.map((col) => r[col]).join(",")).join("\n");
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
    const regionRows: CsvRow[] = [];

    for (const route of region.routes) {
      const directions: [string, string][] = [
        [route.origin, route.destination],
        [route.destination, route.origin],
      ];
      for (const [origin, destination] of directions) {
        try {
          const flights = await fetchFlights(origin, destination, config);
          const rows = processRoute(flights, route, searchDate, region.directOnly);
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
