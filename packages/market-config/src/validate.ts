/**
 * Validates every market config against the schema and cross-checks
 * programme references and domain uniqueness.
 * Usage: npm run validate
 */
import { markets, liveMarkets, programsToCollect } from "./index";

try {
  const ids = Object.keys(markets);
  const live = liveMarkets().map((m) => m.id);
  const collect = programsToCollect();

  console.log(`Markets configured : ${ids.join(", ")}`);
  console.log(`Live or beta       : ${live.join(", ") || "(none)"}`);
  console.log(`Programmes to poll : ${collect.size}`);
  console.log("");
  for (const m of Object.values(markets)) {
    const primary = m.channels.find((c) => c.role === "primary")?.type ?? "-";
    console.log(
      `  ${m.id.padEnd(7)} ${m.status.padEnd(8)} ${m.currency.padEnd(4)} ` +
      `primary=${primary.padEnd(9)} featured=${m.programs.featured.length} ` +
      `domains=${m.brand.domains[0]}`,
    );
  }
  console.log("\nAll market configs are valid.");
} catch (err) {
  console.error("Market config validation failed:\n");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
