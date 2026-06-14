import { z } from "zod";

/**
 * The private HTTP contract between brand front ends and this backend.
 * Identifiers here are deliberately brand-neutral: nothing in this
 * package names or hints at any consumer brand.
 */

export const Cabin = z.enum(["economy", "premium_economy", "business", "first"]);
export type Cabin = z.infer<typeof Cabin>;

const Iata = z.string().length(3).regex(/^[A-Z]{3}$/, "expected a 3-letter IATA code");
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** POST /v1/availability body. */
export const AvailabilityRequest = z
  .object({
    /** Canonical programme id (the data-core contract), e.g. "qantas_ff". */
    program: z.string().min(1),
    origin: Iata,
    destination: Iata,
    /** Inclusive departure-date window to scan. */
    dateFrom: IsoDate,
    dateTo: IsoDate,
    cabins: z.array(Cabin).nonempty(),
  })
  .refine((r) => r.dateFrom <= r.dateTo, {
    message: "dateFrom must be on or before dateTo",
    path: ["dateFrom"],
  });
export type AvailabilityRequest = z.infer<typeof AvailabilityRequest>;

/**
 * One normalised availability record. Shaped to drop straight into the
 * data-core snapshot (program, origin, destination, departureDate,
 * cabin, flight, seats, miles, taxes) with two extra neutral fields:
 * connection and observedAt.
 */
export interface AvailabilityRecord {
  program: string;
  origin: string;
  destination: string;
  departureDate: string;
  cabin: Cabin;
  /** Carrier mapped; number empty until upstream exposes it. */
  flight: { carrier: string; number: string } | null;
  /** null means "unknown", never coerced to 0 (0 reads as "closed"). */
  seats: number | null;
  miles: number | null;
  /** Currency preserved verbatim, never FX-converted. */
  taxes: { amount: number; currency: string } | null;
  connection: "direct" | "connecting";
  observedAt: string;
}

export interface AvailabilityResponse {
  request: AvailabilityRequest;
  servedAt: string;
  /** True when this route+window was served from cache, not upstream. */
  cached: boolean;
  records: AvailabilityRecord[];
}
