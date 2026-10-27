# Photometrix

Lighting illuminance assessment with an Expo app, Nest API, PostgreSQL, and a portable ESP32 module with three BH1750 sensors.

## Local development

Install Node 24, pnpm 10.30.1, and Docker Desktop with Compose, then run from this directory:

```powershell
pnpm install
pnpm start
```

The first start generates ignored `.env` and `.local/credentials.json`, starts PostgreSQL on loopback port 5433, waits for readiness, applies migrations, seeds `photometrix@cpu.edu.ph` idempotently, and runs the API on port 3000 plus Expo. The generated Metro default is 8082; this checkout now uses 8081 to match the installed native development build. Retrieve the generated password from the ignored credential file; secrets are not printed by startup. Repeated starts retain the account and data. Docker must be running. For a database port conflict, change `POSTGRES_PORT` and both database URL ports in `.env` together. To select another available Metro port, set `RCT_METRO_PORT` in `.env` and add its browser origin to `CORS_ORIGINS`.

Ctrl+C stops the API and Expo. PostgreSQL remains available with persistent data; `pnpm db:stop` stops it without deleting the volume. `docker compose down --volumes` permanently deletes local data and is only for an intentional reset.

| Command                            | Purpose                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `pnpm start:app`                   | Expo only; does not launch a browser or emulator.                          |
| `pnpm start:server`                | Database readiness, migrations, seed, and Nest watch.                      |
| `pnpm db:start`                    | Generate local configuration and start PostgreSQL.                         |
| `pnpm db:migrate` / `pnpm db:seed` | Apply local migrations / preserve-or-create seeded account.                |
| `pnpm check`                       | Lint, formatting, explicit typechecks, unit/integration tests, and builds. |
| `pnpm lint:fix` / `pnpm format`    | Explicit source-changing fixes; hooks only check.                          |
| `pnpm test:e2e`                    | Prepare a separate local `_test` database and run HTTP tests.              |

Root scripts load root `.env` and pass it to package processes. Direct server scripts expect their environment already set (or an optional ignored `server/.env`). Root database commands deliberately reject cloud URLs; use server migration/seed scripts with an explicitly supplied cloud environment for deployment.

## App connectivity

`EXPO_PUBLIC_API_URL` is the API base including `/api`, defaulting to `http://localhost:3000/api`. For a physical phone, replace localhost with the PC's LAN IP and allow port 3000 through the local firewall. Android Emulator ordinarily reaches the host at `10.0.2.2`; iOS Simulator can use localhost. Add the actual browser origin to `CORS_ORIGINS` when using web. Cloud clients and the ESP32 use the verified HTTPS Railway API address. Public app API URLs are not secrets; credentials and signing material stay server-side.

This checkout's ignored root `.env` now selects the deployed API at `https://api-production-60e6d.up.railway.app/api` for the app. Root startup still runs the local backend. To test against it, change the root API URL to the appropriate local address above. Root startup passes its environment into Expo, so set this choice in root `.env` rather than relying on an app-local file to override it.

## Checks and hooks

Husky is prepared by root install. Pre-commit runs staged ESLint and Prettier checks without fixes. Before the first commit, it checks the whole repository because lint-staged cannot safely back up an unborn index; afterward lint-staged protects partially staged changes with its normal backup/restore workflow. Pre-push runs `pnpm check` for the whole workspace. Failed checks block the operation; run explicit fixes and stage deliberately afterward. Tests run once. Integration tests use only the separate local test database, never the development or cloud database.

The build compiles the Nest server and exports Android/iOS/web JavaScript bundles. Expo export is not a signed APK, AAB, or IPA; native signing/EAS release work is separate. Interactive Chrome/emulator/device QA requires confirming the shared resource is free first.

## Contracts and deployment

See [system specification](docs/specs/system.md), [lighting/device contract](docs/specs/lighting-device.md), [implementation plan](docs/plans/implementation.md), and the server README for route examples. The [Railway deployment](docs/deployment.md) uses the server Docker image and managed PostgreSQL, with `node dist/database/migrate.js` as its pre-deploy command and `node dist/main.js` as its runtime command. Never deploy Compose as the cloud database or commit generated credentials.
