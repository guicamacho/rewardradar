import type { AvailabilitySnapshot } from "./availability";
import { snapshotKey } from "./availability";
import { newEventId, type DealEvent } from "./events";

/**
 * Diff the previous snapshot map for a route against fresh results.
 *
 * First sight of a route (prev === undefined) is treated as baseline
 * and emits nothing, so booting the collector never causes an alert
 * storm for availability that has existed for weeks.
 */
export function detectChanges(
  prev: Map<string, AvailabilitySnapshot> | undefined,
  next: AvailabilitySnapshot[],
  now: Date = new Date(),
): DealEvent[] {
  if (prev === undefined) return [];

  const events: DealEvent[] = [];
  const seen = new Set<string>();

  for (const snap of next) {
    const key = snapshotKey(snap);
    seen.add(key);
    const before = prev.get(key);

    if (!before) {
      if ((snap.seats ?? 1) > 0) events.push(toEvent(snap, "opened", now));
      continue;
    }
    if (
      snap.seats !== null &&
      before.seats !== null &&
      snap.seats > before.seats
    ) {
      events.push(toEvent(snap, "seats_increased", now));
      continue;
    }
    if (
      snap.miles !== null &&
      before.miles !== null &&
      snap.miles < before.miles
    ) {
      events.push(toEvent(snap, "price_drop", now));
    }
  }

  for (const [key, before] of prev) {
    if (!seen.has(key)) events.push(toEvent(before, "closed", now));
  }

  return events;
}

function toEvent(
  s: AvailabilitySnapshot,
  change: DealEvent["change"],
  now: Date,
): DealEvent {
  return {
    id: newEventId(now),
    detectedAt: now.toISOString(),
    program: s.program,
    origin: s.origin,
    destination: s.destination,
    departureDate: s.departureDate,
    cabin: s.cabin,
    change,
    seats: s.seats,
    miles: s.miles,
    taxes: s.taxes,
    flight: s.flight,
  };
}
