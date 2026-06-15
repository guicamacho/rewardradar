/**
 * Production entry point for the availability service.
 *
 * Env:
 *   PORT                     listen port (default 8080)
 *   AVAILABILITY_SERVICE_KEY required; the x-availability-key secret
 *   UPSTREAM                 "csv" (default) | "aero" (live provider)
 *   ROUTES_CSV               CSV path for UPSTREAM=csv (default: bundled sample)
 *   AERO_API_KEY             required when UPSTREAM=aero
 *   CACHE_TTL_MS             route+window cache TTL (default 5m)
 */
import { fileURLToPath } from "node:url";
import { AvailabilityService } from "./service";
import { CsvUpstream } from "./csv-upstream";
import { AeroUpstream } from "./provider/aero-upstream";
import { createAvailabilityServer } from "./server";
import type { UpstreamPort } from "./upstream";

const PORT = Number(process.env.PORT ?? 8080);

const apiKey = process.env.AVAILABILITY_SERVICE_KEY;
if (!apiKey) {
  console.error("AVAILABILITY_SERVICE_KEY is required.");
  process.exit(1);
}

const mode = process.env.UPSTREAM ?? "csv";
let upstream: UpstreamPort;
if (mode === "aero") {
  upstream = new AeroUpstream(); // reads AERO_API_KEY; throws if unset
} else if (mode === "csv") {
  const csvPath =
    process.env.ROUTES_CSV ?? fileURLToPath(new URL("../AMERICAS_routes.csv", import.meta.url));
  upstream = new CsvUpstream(csvPath);
} else {
  console.error(`Unknown UPSTREAM "${mode}". Use "csv" or "aero".`);
  process.exit(1);
}

const cacheTtlMs = Number(process.env.CACHE_TTL_MS ?? 5 * 60_000);
const service = new AvailabilityService({ upstream, cacheTtlMs });
const server = createAvailabilityServer({ service, apiKey });

// Bind IPv6 dual-stack so the service is reachable over Fly private
// networking (.internal is IPv6); also accepts IPv4 for local/health.
server.listen(PORT, "::", () => {
  console.log(`availability-service listening on :${PORT} (upstream=${mode})`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
