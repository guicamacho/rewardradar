# @rewardradar/availability-service

The shared, brand-neutral data backend. Owns all upstream polling and
caching; front-end brands read normalised availability over a private
HTTP contract and never query airline systems directly.

This package has no public identity by design. Keep every identifier
here neutral so no brand inherits the backend's origin.

## Contract

`POST /v1/availability` with header `x-availability-key: <shared secret>`

Request:
```json
{ "program": "qantas_ff", "origin": "SYD", "destination": "LAX",
  "dateFrom": "2026-06-09", "dateTo": "2026-12-31", "cabins": ["business"] }
```

Response: `{ request, servedAt, cached, records[] }` where each record is
normalised to the data-core snapshot shape (program, origin, destination,
departureDate, cabin, flight, seats, miles, taxes, connection, observedAt).

## Why caching lives here

Two brands sharing one backend must not double upstream load. The
service caches per route+window for `cacheTtlMs`, so repeated brand
calls inside the window are served from memory. This is the mechanism
that makes one-backend-many-brands safe for upstream systems.

## Upstream port

`UpstreamPort.fetchRows(req)` is the single seam to the real data store.
`CsvUpstream` implements it from a CSV export (the provided
AMERICAS_routes.csv shape) for dev and tests. The production port
implements the same interface against the live backend; nothing else
changes.

### Mapping notes (from the real sample)

- `program` arrives as display names ("Qantas", "American"); mapped to
  canonical ids via `PROGRAM_BY_DISPLAY` in normalise.ts. Extend that
  table as coverage grows; unmapped names are logged, not silently
  dropped.
- `seats_available` is null in ~34% of rows. Preserved as `null`
  (unknown), never coerced to 0, because 0 reads downstream as "closed"
  and would fire false retraction alerts.
- Taxes carry mixed currencies (USD, AUD) verbatim.
- `flight_type` Direct/Connecting is preserved as `connection`.
- The sample carries no flight number; carrier is mapped, number left
  empty until upstream exposes it.

## Run

```
npm run demo -w @rewardradar/availability-service
```

Loads the real CSV sample, serves it through the contract, exercises the
cache, and prints normalised records.

## Consuming from a brand

The data-core `AvailabilityServiceSource` calls this contract. Set
`AVAILABILITY_SERVICE_URL` and `AVAILABILITY_SERVICE_KEY` and the brand's
DataCore reads from the service instead of scraping. Mapping is a thin
field copy because the response is already snapshot-shaped.
