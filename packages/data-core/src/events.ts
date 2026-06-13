import { z } from "zod";

export const Cabin = z.enum(["economy", "premium_economy", "business", "first"]);
export type Cabin = z.infer<typeof Cabin>;

/**
 * opened          - availability appeared where there was none
 * seats_increased - more seats than the previous snapshot
 * price_drop      - same seats, fewer miles required
 * closed          - availability disappeared (used to expire alerts)
 */
export const ChangeKind = z.enum(["opened", "seats_increased", "price_drop", "closed"]);
export type ChangeKind = z.infer<typeof ChangeKind>;

export const DealEventSchema = z.object({
  id: z.string(),
  detectedAt: z.string(),
  program: z.string(),
  origin: z.string().length(3),
  destination: z.string().length(3),
  /** YYYY-MM-DD local departure date. */
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cabin: Cabin,
  change: ChangeKind,
  /** GDS-style count, capped at 9 by upstream systems. null = unknown. */
  seats: z.number().int().nullable(),
  miles: z.number().int().nullable(),
  taxes: z.object({ amount: z.number(), currency: z.string() }).nullable(),
  flight: z.object({ carrier: z.string(), number: z.string() }).nullable(),
});

export type DealEvent = z.infer<typeof DealEventSchema>;

let seq = 0;
export function newEventId(now: Date): string {
  seq += 1;
  return `evt_${now.getTime().toString(36)}_${seq.toString(36)}`;
}
