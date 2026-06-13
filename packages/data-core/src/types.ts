import { z } from "zod";

export const Cabin = z.enum(["economy", "premium_economy", "business", "first"]);
export type Cabin = z.infer<typeof Cabin>;

const Iata = z.string().length(3).regex(/^[A-Z]{3}$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * One bookable award unit: a programme, route, date and cabin with a
 * seat count. The atom everything else is built from.
 */
export const AwardSlice = z.object({
  programId: z.string(),
  origin: Iata,
  destination: Iata,
  departureDate: IsoDate,
  cabin: Cabin,
  /** Seat count as reported. 9 conventionally means "9 or more". */
  seats: z.number().int().min(0).max(9),
  milesCost: z.number().int().nullable().default(null),
  feesAmount: z.number().nullable().default(null),
  feesCurrency: z.string().nullable().default(null),
  direct: z.boolean().default(true),
  flightNumbers: z.array(z.string()).default([]),
});
export type AwardSlice = z.infer<typeof AwardSlice>;

/** Everything a source returned for one polling target at one moment. */
export const AvailabilitySnapshot = z.object({
  programId: z.string(),
  target: z.object({
    origin: Iata,
    destination: Iata,
    fromDate: IsoDate,
    toDate: IsoDate,
  }),
  fetchedAt: z.string().datetime(),
  slices: z.array(AwardSlice),
});
export type AvailabilitySnapshot = z.infer<typeof AvailabilitySnapshot>;

/** What changed between two observations of the same slice key. */
export const DealEventType = z.enum(["opened", "increased", "closed"]);
export type DealEventType = z.infer<typeof DealEventType>;

export const DealEvent = z.object({
  /** Deterministic id, used for idempotent fan-out. */
  id: z.string(),
  type: DealEventType,
  slice: AwardSlice,
  previousSeats: z.number().int().min(0),
  detectedAt: z.string().datetime(),
});
export type DealEvent = z.infer<typeof DealEvent>;

/**
 * Stable identity of a slice independent of seat count, the unit of
 * change detection.
 */
export function sliceKey(s: AwardSlice): string {
  return [s.programId, s.origin, s.destination, s.departureDate, s.cabin, s.direct ? "D" : "C"].join("|");
}
