import type { SourceAdapter, PollTarget } from "../source";
import { AvailabilitySnapshot, type AwardSlice, type Cabin } from "../types";

/**
 * Generates plausible availability with churn: seats open, increase
 * and vanish over successive polls, so change detection and routing
 * can be exercised before the real adapter exists. Deterministic
 * enough to be useful, random enough to produce events.
 */
export class MockAdapter implements SourceAdapter {
  name = "mock";
  private state = new Map<string, number>();

  private targets: Record<string, PollTarget[]> = {
    smiles: [
      { programId: "smiles", origin: "GRU", destination: "MCO", fromDate: "2026-09-01", toDate: "2026-09-07" },
      { programId: "smiles", origin: "GRU", destination: "LIS", fromDate: "2026-10-01", toDate: "2026-10-07" },
    ],
    latam_pass: [
      { programId: "latam_pass", origin: "GRU", destination: "SCL", fromDate: "2026-09-01", toDate: "2026-09-07" },
    ],
    aeroplan: [
      { programId: "aeroplan", origin: "GRU", destination: "YYZ", fromDate: "2026-11-01", toDate: "2026-11-07" },
      { programId: "aeroplan", origin: "SIN", destination: "FRA", fromDate: "2026-09-15", toDate: "2026-09-21" },
    ],
    lifemiles: [
      { programId: "lifemiles", origin: "BOG", destination: "MAD", fromDate: "2026-09-01", toDate: "2026-09-07" },
    ],
    qantas_ff: [
      { programId: "qantas_ff", origin: "SYD", destination: "SIN", fromDate: "2026-09-01", toDate: "2026-09-07" },
    ],
  };

  supports(): boolean {
    return true;
  }

  async listTargets(programId: string): Promise<PollTarget[]> {
    return this.targets[programId] ?? [];
  }

  async fetch(target: PollTarget): Promise<AvailabilitySnapshot> {
    const cabins: Cabin[] = ["economy", "business"];
    const slices: AwardSlice[] = [];

    for (const cabin of cabins) {
      for (let day = 0; day < 3; day++) {
        const date = addDays(target.fromDate, day);
        const key = `${target.programId}|${target.origin}|${target.destination}|${date}|${cabin}`;
        const prev = this.state.get(key) ?? 0;
        const next = churn(prev);
        this.state.set(key, next);

        if (next > 0) {
          slices.push({
            programId: target.programId,
            origin: target.origin,
            destination: target.destination,
            departureDate: date,
            cabin,
            seats: next,
            milesCost: cabin === "business" ? 75000 : 25000,
            feesAmount: 42.5,
            feesCurrency: "USD",
            direct: true,
            flightNumbers: [],
          });
        }
      }
    }

    return AvailabilitySnapshot.parse({
      programId: target.programId,
      target,
      fetchedAt: new Date().toISOString(),
      slices,
    });
  }
}

function churn(prev: number): number {
  const r = Math.random();
  if (prev === 0) return r < 0.25 ? 1 + Math.floor(Math.random() * 4) : 0;
  if (r < 0.2) return 0;
  if (r < 0.4) return Math.min(9, prev + 1 + Math.floor(Math.random() * 2));
  return prev;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
