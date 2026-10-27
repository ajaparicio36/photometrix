# Implementation verification evidence

Status: local workspace integration and final platform exports verified on 2026-10-27; Railway evidence is recorded in [deployment.md](../deployment.md). Interactive visual QA and physical-hardware operation remain paused and unverified.

## Root commands

| Command or proof   | Actual result                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:migrate`  | Passed against local PostgreSQL; committed migrations applied.                                                                                          |
| `pnpm db:seed`     | Passed; existing private account password preserved.                                                                                                    |
| `pnpm test`        | Passed: 4 root tooling tests, 14 app contract/transport tests, and 8 backend unit tests.                                                                |
| `pnpm test:e2e`    | Passed: isolated local test database preparation/migration and 5 HTTP tests.                                                                            |
| Root script ESLint | Passed for `scripts/` and `lint-staged.config.mjs`.                                                                                                     |
| Hook fixture       | Passed in an isolated temporary Git repository: partially staged contents and working bytes preserved. No real-repository hook smoke test was repeated. |

The unborn-repository hook branch checks whole-repository lint/format without invoking lint-staged. The normal committed-repository path uses lint-staged backup/restore and check-only commands.

Combined `pnpm check` passed whole-repository lint/format, both typechecks, all tests above, Nest compilation, and Android/iOS/web bundle exports. After the final app-only refresh-timing correction, targeted app lint, typecheck, all 14 tests, and all three platform exports passed; unchanged backend/database suites were not repeated. Whole-repository formatting was rechecked after the documentation status updates. Bundle export does not produce signed native binaries or verify displayed UI.

## Database target guard regression

A no-network reproduction using the installed PostgreSQL client's parser showed that `?host=remote.invalid&port=6543` overrides the authority of a loopback-looking test URL. Both original guards accepted that URL. The local configuration guard and backend test-only guard now reject URL query parameters. Focused tests prove valid loopback test targets remain accepted, remote/non-test targets remain rejected, and production runtime configuration still accepts normal remote PostgreSQL URLs with options such as `sslmode=require`. No real database connection or cloud redeployment was used for this reproduction.

## Root startup and shutdown

Actual `pnpm start` ran in CLI-only CI mode with Metro port 8082 selected. It waited for PostgreSQL readiness, applied migrations, ran the idempotent seed, and launched Nest on port 3000 plus Metro on port 8082. Non-interactive HTTP requests verified `/api/health`, private login, authenticated `/api/auth/me`, and Metro `/status`.

Credential fingerprints matched before/after the startup checkpoint, without printing passwords, tokens, database URLs, or signing material. The separate cloud credential file was subsequently updated by the deployment owner; that concurrent cloud update is not a local credential rotation.

Ctrl+C stopped the owned Nest and Metro processes. Ports 3000 and 8082 were no longer listening afterward. PostgreSQL remained healthy on loopback port 5433 with its named volume. An unrelated project already listening on port 8081 was left untouched. No browser, emulator, or physical device was controlled.

Another project later occupied port 8082. The final handoff configuration therefore selects Metro 8090. A second CLI-only `pnpm start` verified database readiness, migrations, preserved seed credentials, API health on 3000, exact local browser CORS for 8090, and Metro `/status` on 8090. Ctrl+C stopped both owned processes and cleared ports 3000/8090. The unrelated listeners on 8081/8082 and persistent PostgreSQL on 5433 remained running.

## Runtime configuration and integrity

Source-generated defaults select Metro 8082; the ignored configuration for this shared checkout now selects 8090. Local browser CORS includes ports 8081, 8082, and 8090. The port-only change preserved all other environment values and private credential files. After the lead confirmed cloud health, the ignored root app API base was set to `https://api-production-60e6d.up.railway.app/api`. Root startup still launches the local backend; the README explains how to switch app API environments.

The original 71-entry staged state is preserved. Its cached binary diff SHA-256 remains `cf1b7dc1073fc79e8c2497e0b01ec43d9bc5c16378cb24dc0b835bf018d482c0`. No commit, push, staging operation, dependency installation, or cloud mutation was performed during this root integration verification.
