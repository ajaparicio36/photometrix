# Railway deployment

The API is deployed at [api-production-60e6d.up.railway.app](https://api-production-60e6d.up.railway.app). The app API base URL is `https://api-production-60e6d.up.railway.app/api`; health is `GET /api/health`. This deployment exposes the API, not a hosted Expo website or signed mobile binary.

| Resource                | Identity                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- |
| Workspace               | Anthony John's Projects — `58986dc8-8671-4a3b-a7de-5255587bc825`                 |
| Project                 | photometrix — `5c4a4815-e57c-4ce1-9ff2-3d9d2c96bc9e`                             |
| Environment             | production — `99bd8815-ed35-40e7-a8c9-5218a27071d6`                              |
| API service             | api — `c42f29e2-ed14-48f4-b352-4a91ba47706d`                                     |
| PostgreSQL service      | Postgres — `9b811e04-6198-4baf-a845-eec55449693a`                                |
| Successful source build | `6abd8063-61c4-40fb-954d-196dfcfb92bc`                                           |
| Configuration refresh   | `fc671a39-520f-4b9c-83dc-47cc19bb103d` — reuses that build to add port-8090 CORS |

## Build and data lifecycle

`Dockerfile` builds only the server dependency graph from the shared frozen lockfile using Node 24 and pnpm 10.30.1. A separate offline/frozen production install removes development dependencies before the final non-root runtime stage. Only the app package manifest is needed for workspace-lock consistency; Expo source and dependencies are not included in the runtime. `.dockerignore` and `.railwayignore` exclude secrets, local artifacts, dependencies, references, and unrelated app source from build/upload use.

The container keeps `dist/` and checked `drizzle/` migrations together. Railway runs `node dist/database/migrate.js` as a pre-deploy command, starts `node dist/main.js`, routes to port 3000, and waits for `/api/health`. Runtime binds `0.0.0.0` and honors `PORT`. Migrations are idempotent and are not generated against production. A failed initial deployment exposed package deployment excluding ignored `dist/`; the Dockerfile was corrected to copy compiled output and migrations explicitly. The subsequent source deployment succeeded.

PostgreSQL uses Railway's standard `postgres` template with a persistent `/var/lib/postgresql/data` volume, generated credentials, and the private-network connection reference `${{Postgres.DATABASE_URL}}` on the API. No public database proxy is needed for API migration, seeding, or smoke tests. This is a single database and one API replica; high availability, backup/restore exercises, and disaster-recovery proof are not part of this delivery.

The Railway plugin created/configured the matching project, services, standard database template, variables, domain, and configuration refresh. The authenticated Railway CLI uploaded local source directly; no Git commit, GitHub repository, or remote was required. Unrelated Railway projects were left unchanged.

## Secrets and account

The private account is `photometrix@cpu.edu.ph`. Runtime `JWT_SECRET` and `SEED_PASSWORD` were sent through CLI stdin without putting their values in shell arguments/logs; they are not build arguments or tracked files. The cloud handoff is ignored `.local/cloud/credentials.json`, and the local handoff remains ignored `.local/credentials.json`. The current cloud account uses the generated local account password; deliver it privately from those files, not from this document.

An explicit remote seed ran through Railway SSH after successful migration:

```powershell
railway ssh --project 5c4a4815-e57c-4ce1-9ff2-3d9d2c96bc9e --environment 99bd8815-ed35-40e7-a8c9-5218a27071d6 --service c42f29e2-ed14-48f4-b352-4a91ba47706d -- node dist/database/seed.js
```

The seed preserves existing passwords. Runtime secrets remain in Railway variables; changing local configuration alone does not rotate the cloud account. Login JWTs expire after 3,600 seconds. Device tokens are generated per module and revoked on archive or explicit rotation.

The current Photometrix browser preview uses port **8090**. Exact allowed origins are `http://localhost:8081`, `http://127.0.0.1:8081`, `http://localhost:8082`, `http://127.0.0.1:8082`, `http://localhost:8090`, and `http://127.0.0.1:8090`; earlier origins are retained and native requests do not need a browser Origin header. No wildcard origin is configured. The 8090 configuration refresh on 2026-10-27 reuses the successful server image; it changes no account credential or database setting.

Verified at `2026-10-27T08:13:06Z`: health 200, login 200 with unchanged credentials, and an Origin `http://localhost:8090` login preflight returned 204 with that exact `Access-Control-Allow-Origin`. Both API and PostgreSQL remained online with one running replica. Redacted evidence is `.local/cloud/cors-8090-evidence.json`.

## HTTPS evidence and firmware trust

TLS hostname and certificate-chain verification succeeded for `api-production-60e6d.up.railway.app` on 2026-10-27. The observed leaf `*.up.railway.app` is issued by Let's Encrypt YE2 and expires 2026-12-26. The observed chain continues through Root YE and ISRG Root X2 to trusted **ISRG Root X1**:

- Root SHA-256: `96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6`.
- Root expiry: 2035-06-04.
- Exact verified public PEM: `.local/cloud/tls-root.pem`; chain and metadata: `.local/cloud/tls-chain.pem` and `.local/cloud/tls.json`.

The firmware origin is `https://api-production-60e6d.up.railway.app`, with routes under `/api/device/`. Use the verified root CA, certificate/hostname validation, and synchronized time; do not pin the short-lived leaf certificate or disable TLS verification. Railway can change its issuing chain in future, so trust configuration requires maintenance. Desktop HTTPS verification does not prove ESP32 certificate parsing, clock synchronization, Wi-Fi recovery, or physical sensor operation.

## Reproduce delivery and smoke checks

After a coordinated install/lock window is released, upload from the repository root:

```powershell
railway up --project 5c4a4815-e57c-4ce1-9ff2-3d9d2c96bc9e --environment 99bd8815-ed35-40e7-a8c9-5218a27071d6 --service c42f29e2-ed14-48f4-b352-4a91ba47706d --detach --yes
```

Use Railway deployment status/logs to confirm build, pre-deploy migrations, and readiness; upload success alone does not prove a healthy service. Credentials must be configured in runtime variables before starting a new environment.

With the ignored cloud credential handoff present, run:

```powershell
node scripts/cloud-smoke.mjs
```

The script verifies HTTPS health, login/profile, invalid-token rejection, owner-field override rejection, room/module/session creation, device assignment, complete/partial readings, zero handling, identical retry, explicit invalid-reading rejection, latest incomplete state without fallback, stored history, idempotent stop, frozen target snapshot after editing/archiving the room, and a downloadable PDF. It labels fixture names and placement **SIMULATED**, stops acquisition, and archives only its own fixture room/module. Preserved historical test sessions remain visibly simulated; cleanup is archival, not a silent history deletion.

Evidence is written under ignored `.local/cloud/`: `smoke-evidence.json`, `simulated-session-report.pdf`, and rendered `simulated-report-page-1.png`. The observed report is one legible page, explicitly states simulation, and preserves Classroom/500 lx despite a later Offices/300 lx room edit. It contains two accepted samples: one complete at 500 lx and one incomplete. No token/password is included in evidence.

Cloud boundary checks reject invalid authentication and client-selected owner fields. Full two-account cross-owner isolation and concurrency cases are proved by the isolated PostgreSQL HTTP suite, rather than by creating a second permanent production account. Browser/emulator QA, actual ESP32 operation, wiring, reference-meter accuracy, and calibration remain unverified physical/interactive work.
