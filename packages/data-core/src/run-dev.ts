/**
 * End-to-end demo of the data core using the mock source.
 *
 * Cycle 1 builds the baseline (no events by design).
 * Cycle 2 runs after the mock world mutates: a route opens in business,
 * a price drops, and a route closes. Watch one aeroplan event fan out
 * to BOTH the global brand (en-US, email/x) and RadarMilhas (pt-BR,
 * telegram/instagram), because both markets feature aeroplan.
 *
 * Usage: npm run demo -w @rewardradar/data-core
 */
import { DataCore } from "./index";
import { InMemorySnapshotStore } from "./availability";
import { MockSource, type SeedFlight } from "./sources/mock";
import { ConsoleSink } from "./sinks";

const seed: SeedFlight[] = [
  {
    program: "aeroplan", origin: "JFK", destination: "LHR",
    departureDate: "2026-09-14", cabin: "business",
    flight: { carrier: "AC", number: "871" }, seats: 0, miles: 60000,
  },
  {
    program: "smiles", origin: "GRU", destination: "LIS",
    departureDate: "2026-10-02", cabin: "business",
    flight: { carrier: "TP", number: "82" }, seats: 2, miles: 110000,
  },
  {
    program: "latam_pass", origin: "GRU", destination: "MIA",
    departureDate: "2026-08-21", cabin: "economy",
    flight: { carrier: "LA", number: "8180" }, seats: 4, miles: 38000,
  },
];

const source = new MockSource(seed);

const core = new DataCore({
  source,
  store: new InMemorySnapshotStore(),
  sinks: [new ConsoleSink()],
  targets: [
    { program: "aeroplan", origin: "JFK", destination: "LHR", daysAhead: 120 },
    { program: "smiles", origin: "GRU", destination: "LIS", daysAhead: 120 },
    { program: "latam_pass", origin: "GRU", destination: "MIA", daysAhead: 120 },
    // qantas_ff is only featured by the planned AU market, so the core
    // drops this target at boot. Flip au to beta and it gets polled.
    { program: "qantas_ff", origin: "SYD", destination: "SIN", daysAhead: 120 },
  ],
});

console.log("\n== Cycle 1: baseline (first sight emits no events) ==");
const c1 = await core.tick();
console.log(`events: ${c1.events.length}, routed alerts: ${c1.alerts.length}`);

source.mutate((state) => {
  const ac = state.find((s) => s.program === "aeroplan");
  if (ac) ac.seats = 2;                       // opened
  const tp = state.find((s) => s.program === "smiles");
  if (tp) tp.miles = 95000;                   // price_drop
  const la = state.find((s) => s.program === "latam_pass");
  if (la) la.seats = 0;                       // closed
});

console.log("\n== Cycle 2: after the world changed ==");
core.forceAllDue();
const c2 = await core.tick();
console.log(`events: ${c2.events.length}, routed alerts: ${c2.alerts.length}\n`);
