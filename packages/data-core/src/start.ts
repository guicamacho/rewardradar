/**
 * Production entry point for the data-core worker.
 *
 * Reads availability from the shared availability-service, runs the
 * poll -> detect -> route pipeline on an interval, and delivers alerts
 * to the configured sinks. Exposes a small /health endpoint so Fly can
 * check liveness and report the last tick.
 *
 * Env:
 *   PORT                       health port (default 8080)
 *   TICK_INTERVAL_MS           heartbeat between ticks (default 60000)
 *   AVAILABILITY_SERVICE_URL   required; the backend base URL
 *   AVAILABILITY_SERVICE_KEY   required; the x-availability-key secret
 *   ALERTS_WEBHOOK_URL/SECRET  optional; enables the HMAC webhook sink
 *   TELEGRAM_BOT_TOKEN         optional; enables the Telegram sink
 *   TELEGRAM_CHAT_ID_BR/ES     chat ids per Telegram-primary market
 */
import { createServer } from "node:http";
import { DataCore } from "./index";
import { InMemorySnapshotStore } from "./availability";
import { AvailabilityServiceSource } from "./sources/availability-service";
import { ConsoleSink, WebhookSink, TelegramSink, type AlertSink } from "./sinks";
import type { PollTarget } from "./scheduler";

const PORT = Number(process.env.PORT ?? 8080);
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 60_000);

if (!process.env.AVAILABILITY_SERVICE_URL || !process.env.AVAILABILITY_SERVICE_KEY) {
  console.error("AVAILABILITY_SERVICE_URL and AVAILABILITY_SERVICE_KEY are required.");
  process.exit(1);
}

const sinks: AlertSink[] = [new ConsoleSink()];
if (process.env.ALERTS_WEBHOOK_URL && process.env.ALERTS_WEBHOOK_SECRET) {
  sinks.push(new WebhookSink(process.env.ALERTS_WEBHOOK_URL, process.env.ALERTS_WEBHOOK_SECRET));
}
if (process.env.TELEGRAM_BOT_TOKEN) {
  const chatIds: Record<string, string> = {};
  if (process.env.TELEGRAM_CHAT_ID_BR) chatIds["br"] = process.env.TELEGRAM_CHAT_ID_BR;
  if (process.env.TELEGRAM_CHAT_ID_ES) chatIds["es"] = process.env.TELEGRAM_CHAT_ID_ES;
  sinks.push(new TelegramSink(process.env.TELEGRAM_BOT_TOKEN, chatIds));
}

/**
 * Curated poll targets matching the availability-service's current
 * coverage. In production these become watchlist- and market-derived
 * (roadmap item 3); for now they are an explicit seed. Targets whose
 * programme no live/beta market collects are dropped by DataCore at boot.
 */
const TARGETS: PollTarget[] = [
  { program: "qantas_ff", origin: "SYD", destination: "LAX", daysAhead: 330 },
  { program: "qantas_ff", origin: "MEL", destination: "LAX", daysAhead: 330 },
  { program: "aa_aadvantage", origin: "SYD", destination: "LAX", daysAhead: 330 },
  { program: "aa_aadvantage", origin: "MEL", destination: "LAX", daysAhead: 330 },
  { program: "alaska_mileage_plan", origin: "SYD", destination: "LAX", daysAhead: 330 },
  { program: "etihad_guest", origin: "SYD", destination: "LAX", daysAhead: 330 },
  { program: "flying_blue", origin: "SYD", destination: "LAX", daysAhead: 330 },
];

const core = new DataCore({
  source: new AvailabilityServiceSource(),
  store: new InMemorySnapshotStore(),
  sinks,
  targets: TARGETS,
});

interface TickHealth {
  startedAt: string;
  lastTickAt: string | null;
  lastEvents: number;
  lastAlerts: number;
  lastError: string | null;
  ticks: number;
}
const health: TickHealth = {
  startedAt: new Date().toISOString(),
  lastTickAt: null,
  lastEvents: 0,
  lastAlerts: 0,
  lastError: null,
  ticks: 0,
};

async function tickOnce(): Promise<void> {
  try {
    const { events, alerts } = await core.tick();
    health.lastTickAt = new Date().toISOString();
    health.lastEvents = events.length;
    health.lastAlerts = alerts.length;
    health.lastError = null;
    health.ticks += 1;
  } catch (err) {
    health.lastTickAt = new Date().toISOString();
    health.lastError = (err as Error).message;
    console.error("[worker] tick failed:", err);
  }
}

const server = createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ...health }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

// Bind IPv6 dual-stack for Fly private networking (also accepts IPv4).
server.listen(PORT, "::", () => {
  console.log(`data-core worker up on :${PORT}, ticking every ${TICK_INTERVAL_MS}ms`);
});

await tickOnce(); // build the baseline immediately
const timer = setInterval(() => void tickOnce(), TICK_INTERVAL_MS);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`);
    clearInterval(timer);
    server.close(() => process.exit(0));
  });
}
