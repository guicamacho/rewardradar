# Deploying RewardRadar on Fly.io

All services run on Fly. Shared image: `Dockerfile` at the repo root.
Each app has its own `fly.*.toml` and selects its process command there.

## Services

| App | Config | Role | Exposure |
|-----|--------|------|----------|
| `rewardradar-availability` | `fly.availability.toml` | brand-neutral backend (`/v1/availability`) | private (6PN only) |
| `rewardradar-worker` (next) | `fly.worker.toml` | data-core poll/detect/route worker | private |

`apps/web` will be added to Fly when it exists.

## availability-service

Private by design — no public IP. Peers reach it at
`rewardradar-availability.internal:8080`.

First-time setup (run from the repo root):

```sh
fly apps create rewardradar-availability

# Generate and set the shared contract secret
fly secrets set AVAILABILITY_SERVICE_KEY="$(openssl rand -hex 32)" \
  -a rewardradar-availability

# Live provider mode (optional): switch UPSTREAM=aero in the toml, then
# fly secrets set AERO_API_KEY=... -a rewardradar-availability

fly deploy -c fly.availability.toml
```

Test the private service without exposing it:

```sh
fly proxy 8080:8080 -a rewardradar-availability
curl -s localhost:8080/health
```

### Upstream modes

- `UPSTREAM=csv` (default): serves the CSV in the image. Refresh the data
  with `generate-routes` (a scheduled job) writing to a mounted volume,
  and point `ROUTES_CSV` at it.
- `UPSTREAM=aero`: queries the live provider per route; needs `AERO_API_KEY`.

## Notes

- Image runs TypeScript via `tsx` (the repo has no build step). To slim the
  image later, add a `tsc` build and run compiled JS.
- Region `syd` matches the AU market and is close to the upstream provider.
