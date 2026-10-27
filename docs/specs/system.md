# Photometrix system specification

Status: implemented after user approval, with local and Railway verification recorded in [implementation evidence](../plans/implementation-evidence.md) and [deployment evidence](../deployment.md). Interactive browser/emulator/device QA and visual adjustments remain paused until the user confirms the shared resource is available.

## Scope and sources of truth

Photometrix should provide a mobile lighting illuminance assessment workflow backed by NestJS, PostgreSQL, and the existing ESP32 lighting module. Use the resolved terminology in `../../CONTEXT.md`.

- `lighting-device.md` owns measurement calculations, assessment/session rules, device payloads, domain routes, and firmware behavior. Do not redefine those contracts here.
- `visual-references.md` owns the complete reference manifest; `../../app/DESIGN.md` owns the approved app design direction.
- This document owns workspace operations, shared verification, authentication infrastructure, persistence lifecycle, and deployment.

The initial implementation should use the existing `app/`, `server/`, and `microcontroller/` directories. It should avoid extra services, queues, shared packages, and speculative roles or administration screens.

## Accepted product decisions

The user accepted the following scope and rules. Reference screenshots remain evidence of appearance rather than approval of additional behavior.

| Decision             | Accepted behavior                                                                                                 | Consequence                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Measurement workflow | One portable three-sensor module per session; manual start/stop; one active session per module                    | Follow the session and ownership contract in `lighting-device.md`; multi-module aggregation is outside scope.                |
| Assessment scope     | Lux assessment, history, and downloadable PDF session report                                                      | Implement below/meets-target assessment without an upper limit or certification claim. Fixture calculation is outside scope. |
| Account access       | One seeded private account, `photometrix@cpu.edu.ph`, with an agent-generated strong password in each environment | No public registration or account-recovery route/screen. Generate and deliver passwords during implementation.               |
| Device setup         | Manual app module registration generates an ID/token for copying into one firmware file                           | Preserve the accepted provisioning and device-credential boundaries.                                                         |

Accepted numerical/session rules are 10-second sampling, a live assessment only with all three readings valid and both synchronized acquisition age and server receipt age <=30 seconds, zero as valid and missing as unavailable, the live three-sensor arithmetic mean, and a report summarizing complete samples with a target snapshot. Room edits preserve history. The detailed clock-validation, numerical, and state-transition contract belongs in `lighting-device.md`, which is authoritative over this scope summary.

Record material settled tradeoffs as ADRs. The user authorized implementation and deployment; evidence distinguishes verified software behavior from unperformed interactive and physical-hardware checks.

## Baseline repository evidence before implementation

The inventory found two independently installed starters, two pnpm lockfiles, no root package/workspace, and no configured remote. Git is on unborn `master`; the user's initial source files are already staged. These are observations, not authorization to commit or replace their index.

The app uses Expo 58.0.19, Expo Router 58.0.26, React 19.3.0, React Native 0.88.0, and TypeScript 6.0.3. Its home/explore tabs and branding are starter examples. The backend uses Nest 11.2.8 with SWC and TypeScript 5.9.3; its only route is the tested `Hello World!` placeholder. Neither auth nor database infrastructure exists yet.

Node 24.13.0, pnpm 10.30.1, Docker 29.2.0/Compose 5.0.2, Railway CLI 5.30.3, and GitHub CLI 2.92.0 were available during inventory. Docker responded; Railway was authenticated but this directory was unlinked. These checks do not constitute application verification.

Baseline typechecking reported pre-existing errors. A baseline lint attempt auto-installed missing lint dependencies; package manifest and lockfile changes were restored afterward, while ignored local dependency/cache files changed. The starter therefore has no verified clean lint/typecheck baseline. These tooling checks did not implement product behavior or deploy the application.

## Workspace and local operation

Desired first-run commands from the repository root:

```powershell
pnpm install
pnpm start
```

The root should be a private pnpm workspace containing `app` and `server`, pin pnpm 10.30.1 through `packageManager`, and own one root lockfile. Keep package-specific TypeScript versions where necessary. Install Expo dependencies using the SDK-aware Expo installer required by `app/AGENTS.md`.

Root `start` should prepare explicitly local configuration if absent, start Compose PostgreSQL, wait for its healthcheck, apply committed migrations, provision the local account idempotently, and start Nest watch plus Expo through one cross-platform process runner. A failed database or migration step should stop startup with an actionable error before either application is reported ready. A second start should preserve data and credentials.

Local bootstrap may generate strong random database/JWT/account secrets into ignored local configuration. It must not create or contact cloud resources. The agent should provision these values during authorized implementation; the user should not have to invent a password to start the project. Document required Docker prerequisites and port-conflict remediation.

Ctrl+C should stop both foreground development processes and close backend database connections. PostgreSQL may remain running with its named volume. Provide explicit `db:stop` and document the destructive data-reset command separately; normal shutdown must preserve data. Provide app-only and server-only development commands for diagnosis.

Root-owned scripts should provide these semantics:

| Command                             | Desired behavior                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm lint:fix`       | Check all package source / explicitly fix supported lint findings.                                         |
| `pnpm format:check` / `pnpm format` | Check repository formatting / explicitly write formatting. Ignore generated outputs and binary references. |
| `pnpm typecheck`                    | Run explicit TypeScript checks for app and server. SWC build is not a substitute.                          |
| `pnpm test`                         | Run meaningful unit tests once, without watch mode.                                                        |
| `pnpm test:e2e`                     | Run HTTP/database integration tests against an isolated local test database.                               |
| `pnpm build`                        | Compile Nest and export Expo bundles for the supported platforms.                                          |
| `pnpm check`                        | Run lint, formatting, typecheck, unit/integration tests, and build; propagate any failure.                 |
| `pnpm db:migrate` / `pnpm db:seed`  | Apply committed local migrations / idempotently provision the configured local account.                    |

Use a small number of root scripts; do not introduce a task orchestration framework for two packages. A root README should explain the two-command start, credentials location, API URL, individual commands, shutdown, migrations, and verification.

## Starter cleanup and quality hooks

Replace unused Expo tutorial screens/components/assets, animated Expo branding, reset script, and Nest placeholder behavior/tests with the approved product flow and meaningful checks. Preserve the supplied Photometrix logo, design source HTML/screenshots, thesis paper, firmware, and scoped app instructions. Remove dependencies only after checking surviving callers. Product identity should replace generic app naming where supported without inventing store identifiers or release configuration.

Husky should be installed once at the Git root through root package preparation. Pre-commit should run lint-staged against staged source files with the appropriate package ESLint configuration and run Prettier `--check` against staged supported text files. Both checks must leave source and the staging index unchanged. Use separate fix commands when a check fails.

Pre-push should run whole-repository lint, formatting checks, explicit typechecks, non-watch unit/integration tests, and build. Test DB readiness/migrations should be reproducible; it must never use the developer or cloud database implicitly. A failed check blocks the push. Exercise the hook commands without committing or pushing the user's staged starter as a test.

The Expo part of `build` should validate Android, iOS, and web bundle export using the installed SDK's supported CLI. It is not a signed APK/AAB/IPA. Native release signing/EAS builds and app web hosting are separate deliverables that require explicit scope; Railway API deployment does not imply them. Existing web output configuration should be assessed deliberately rather than silently advertised as a static site.

TypeScript code should follow root instructions, including `unknown` plus guards at uncertain boundaries and no `any`. Configure the current server's disabled `no-explicit-any`/implicit-any checks accordingly. New security, parsing, calculation, state-transition, and retry logic should have meaningful tests; trivial presentation changes do not need mirrored tests.

## Authentication and ownership

Use Nest Passport with a small email/password login flow and expiring JWT bearer access tokens. Normalize email consistently, enforce database uniqueness, hash passwords with an established password-hashing implementation, validate incoming DTOs, and return generic invalid-credential failures. Password hashes, JWT signing material, and configuration secrets must never appear in API responses or normal logs. Return a user access token only in the login response and a device secret only in its one-time issuance or rotation response. Ordinary entity responses and logs must omit both kinds of credential.

Infrastructure routes:

| Route                  | Access and behavior                                                             |
| ---------------------- | ------------------------------------------------------------------------------- |
| `GET /api/health`      | Public minimal service health response without internal configuration.          |
| `POST /api/auth/login` | Validate email/password; return an expiring access token and safe user summary. |
| `GET /api/auth/me`     | Require a valid user JWT; return the authenticated user's safe profile.         |

Use the global `/api` route prefix consistently. There is no public registration or account-recovery endpoint. Domain/device routes are specified only in `lighting-device.md`; UI or firmware workers must not independently invent alternatives.

Each protected room, module, session, assessment, and history operation should be scoped to the authenticated owner. Prove that a second account cannot read or mutate another account's resources. Device credentials should be separately issued and restricted to the assigned device workflow; a device must not authenticate as a user or gain account-management permissions. Upload attribution should follow the explicit server-issued `sessionId` rules in `lighting-device.md` so delayed retries cannot attach to a different room/session.

For the app, use Expo-compatible secure storage for native user tokens and explicitly handle expiration, logout, restored authentication, loading, and failed requests. Web storage behavior should be chosen for the supported preview surface without claiming native secure storage exists in a browser. Start with reauthentication on token expiry rather than adding refresh-token infrastructure without a requirement.

The agent should generate and provision the requested usable local and cloud accounts after implementation is authorized. Use `photometrix@cpu.edu.ph` for both accounts, generate strong random passwords rather than asking the user to invent them, keep real credentials in ignored local configuration or Railway secret variables, and deliver the email/password for each environment directly to the user on completion. Do not use the user's personal email. Never write real passwords or tokens to tracked documentation. Re-running a seed should find the account without resetting its password; rotation should be explicit.

## Database and configuration lifecycle

Drizzle schema and checked-in SQL migrations should live under the server. Use PostgreSQL for users and the approved room/module/session/measurement/assessment records defined by `lighting-device.md`. Match relational constraints to ownership and replay/idempotency invariants. Avoid keeping a second in-memory source of truth.

Schema changes should be generated, reviewed, committed with their source change when the user selects integration, and applied through the migration command. Runtime startup must not generate schema or run a development schema-push against production. Use one migration actor per environment; Railway pre-deploy should finish migrations before the new API is marked ready.

Environment loading should be explicit and validated at backend startup. Example files should contain placeholders and required variable descriptions. Database URLs, JWT signing material, seed passwords, Wi-Fi secrets, and device credentials belong in ignored environment-specific configuration. Configure CORS only for the app/browser origins that need it. The app's public API base URL is not a secret; document physical-device LAN addresses, emulator addresses, and cloud HTTPS separately.

Compose should run PostgreSQL with a readiness healthcheck and named data volume. Integration tests should require a dedicated test database URL/name and a local safety guard, migrate it reproducibly, isolate fixtures, and clean up owned test resources. Database tests must reject a production/cloud target by default. Pool lifecycle should support graceful backend shutdown and avoid hanging Jest.

## Railway delivery

Proposed target: a new `photometrix` project in the user's existing Anthony John's Projects workspace using the working Railway connection. Read-only discovery found no matching project. Existing unrelated projects should remain unchanged. Recheck connection and target identity at deployment time; provision no cloud resources during this planning phase.

Deploy the Nest API with managed Railway PostgreSQL. Compose remains local. Build from the pnpm workspace root, select the server package, use the production entrypoint, honor Railway `PORT`, configure healthcheck routing, and run the reviewed migration command during pre-deploy. Set runtime secrets through Railway rather than committing them. Use Railway CLI and the connected Railway plugin for project/service identity, configuration, logs, and delivery evidence as appropriate.

Provision the cloud account with an explicit one-time idempotent seed after migrations. Verify deployed health, user login, authenticated profile, ownership rejection, and the selected domain workflow. Update the app's public API URL to the verified HTTPS service URL and provide local/cloud usage examples. A simulator posting the device contract over HTTPS proves API/network behavior only; physical ESP32 TLS, sensors, calibration, and recovery require hardware evidence.

## Evidence required before completion

For every changed public route, provide a working README request/response example and executable end-to-end proof, including relevant failure cases. Cover normalized-email uniqueness, password verification, token rejection/expiry, safe response fields, cross-account isolation, migration application, and seed idempotency. Domain calculations, session state, upload retries, and invalid sensor handling follow `lighting-device.md`.

Report each check actually run with its result, environment, and relevant evidence. Keep app export, signed native release, simulated device HTTP, firmware compilation, and physical hardware validation distinct. No tests, implementation, deployment, or hardware success is claimed by this specification.
