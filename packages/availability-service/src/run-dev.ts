/**
 * End-to-end demo of the availability service.
 *
 * Loads the real CSV sample, serves it through the HTTP contract,
 * exercises the route+window cache (including the one-backend-many-brands
 * case where a second programme on the same window is served from cache),
 * and prints normalised records.
 *
 * Usage: npm run demo -w @rewardradar/availability-service
 */
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { CsvUpstream } from "./csv-upstream";
import { AvailabilityService } from "./service";
import { createAvailabilityServer } from "./server";
import type { AvailabilityRequest, AvailabilityResponse } from "./contract";

const API_KEY = "demo-shared-secret";
const csvPath = fileURLToPath(new URL("../AMERICAS_routes.csv", import.meta.url));

const service = new AvailabilityService({
  upstream: new CsvUpstream(csvPath),
  cacheTtlMs: 60_000,
});
const server = createAvailabilityServer({ service, apiKey: API_KEY });

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address() as AddressInfo;
const url = `http://127.0.0.1:${port}/v1/availability`;

async function call(body: AvailabilityRequest): Promise<AvailabilityResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-availability-key": API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`service responded ${res.status}: ${await res.text()}`);
  return (await res.json()) as AvailabilityResponse;
}

const window = { origin: "SYD", destination: "LAX", dateFrom: "2026-06-09", dateTo: "2026-12-31" } as const;

console.log("\n== Call 1: Qantas FF, SYD-LAX business (cold, reads upstream) ==");
const a = await call({ program: "qantas_ff", cabins: ["business"], ...window });
console.log(`cached: ${a.cached}, records: ${a.records.length}`);
for (const r of a.records.slice(0, 3)) {
  console.log(
    `  ${r.departureDate} ${r.cabin} ${r.flight?.carrier ?? "??"} seats=${r.seats ?? "unknown"} ` +
      `miles=${r.miles?.toLocaleString() ?? "?"} taxes=${r.taxes ? `${r.taxes.currency} ${r.taxes.amount}` : "?"} ` +
      `(${r.connection})`,
  );
}

console.log("\n== Call 2: same request again (served from cache) ==");
const b = await call({ program: "qantas_ff", cabins: ["business"], ...window });
console.log(`cached: ${b.cached}, records: ${b.records.length}`);

console.log("\n== Call 3: AAdvantage, same route+window (different brand, cache shared) ==");
const c = await call({ program: "aa_aadvantage", cabins: ["business"], ...window });
console.log(`cached: ${c.cached}, records: ${c.records.length}`);

await new Promise<void>((resolve, reject) =>
  server.close((err) => (err ? reject(err) : resolve())),
);
console.log();
