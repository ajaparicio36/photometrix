# Photometrix API

NestJS + Passport local/JWT authentication, Drizzle/PostgreSQL persistence, and PDF session reports. Product and payload rules are defined in [lighting-device.md](../docs/specs/lighting-device.md). There is no public signup, recovery, fixture calculation, HVAC, or automatic equipment control.

Start from the repository root with `pnpm install` and `pnpm start`. The root bootstrap starts PostgreSQL, applies checked migrations, provisions the private account idempotently, then runs the API and Expo. Root `.env` and `.local/credentials.json` are ignored local configuration; do not commit or paste their secrets into logs. The account is `photometrix@cpu.edu.ph`; use the generated environment-specific password. Reseeding preserves an existing password.

Direct server commands run with `server/` as cwd and require the root environment to be injected or an ignored server `.env` prepared from `.env.example`:

| Command                                      | Purpose                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm start:dev`                             | API watch process, default port 3000.                                                     |
| `pnpm build` / `pnpm start:prod`             | Compile / run `dist/main.js`.                                                             |
| `pnpm db:generate`                           | Generate reviewed SQL from `src/database/schema.ts` into `drizzle/`.                      |
| `pnpm db:migrate`                            | Apply checked migrations; rerunning is safe.                                              |
| `pnpm db:seed`                               | Provision the configured private account without resetting its password.                  |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Static checks and non-watch unit tests.                                                   |
| Root `pnpm test:e2e`                         | Prepare the separate loopback test database, migrate, and run real PostgreSQL/HTTP tests. |

`DATABASE_URL` is required and must be a PostgreSQL URL. `JWT_SECRET` needs at least 32 random characters, `JWT_EXPIRES_IN_SECONDS` is 1–86400 (default 3600), `PORT` is 1–65535, and `CORS_ORIGINS` is a comma-separated list of exact allowed origins. Seed commands require `SEED_EMAIL` and a generated `SEED_PASSWORD` of 16–256 characters. Tests require a separate `TEST_DATABASE_URL` on localhost/127.0.0.1/::1 with a database name ending `_test`; there is no fallback to developer/cloud data. Pools close on application shutdown and test cleanup removes only its generated fixture accounts/resources.

For production pre-deploy after build, run `node dist/database/migrate.js`, and provision the account once with `node dist/database/seed.js`. Keep the checked `drizzle/` directory alongside `dist/`. Use one migration actor per environment; application startup does not generate or push schema. Configure runtime secrets through the host, never source control. The API listens on `0.0.0.0` and honors `PORT`.

## Authentication and errors

`GET /api/health` returns `{ "status": "ok" }`. `POST /api/auth/login` accepts `{ "email": "photometrix@cpu.edu.ph", "password": "<environment password>" }` and returns `{accessToken, expiresIn, user: {id,email}}`. `GET /api/auth/me` requires that JWT and returns `{id,email}`. JWT expiry requires reauthentication; there is no refresh token. Login is limited to 10 attempts per IP per 60 seconds in this single API process. Scale-out would need a shared login limiter.

Errors use `{statusCode, code, message}`. Unknown body/query fields and invalid values return 400; authentication 401; cross-account user resources 404; active/archive/session/idempotency conflicts 409; oversized JSON 413; rate limits 429 with `Retry-After`. A device/session mismatch returns 403. JSON request size is limited to 16 KiB. No credential/hash appears in normal entity responses or API errors.

## Operator route examples

This PowerShell sequence exercises every user-facing route. Supply the local or deployed API URL. The login password prompt is masked; do not print the resulting login/registration objects, because only their respective responses contain a token. New modules/rooms below are real records, and the final archive operations intentionally retain their historical sessions.

```powershell
$apiBase = 'http://localhost:3000/api'
$password = Read-Host 'Private account password' -MaskInput
$login = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/login" -ContentType 'application/json' -Body (@{ email = 'photometrix@cpu.edu.ph'; password = $password } | ConvertTo-Json)
$userHeaders = @{ Authorization = "Bearer $($login.accessToken)" }
function Api($method, $path, $value = $null, $headers = $userHeaders) {
  $options = @{ Method = $method; Uri = "$apiBase$path"; Headers = $headers }
  if ($null -ne $value) { $options.ContentType = 'application/json'; $options.Body = $value | ConvertTo-Json }
  Invoke-RestMethod @options
}
$health = Invoke-RestMethod "$apiBase/health"
$profile = Api Get '/auth/me'
$room = Api Post '/rooms' @{ name = 'EN 106'; category = 'Classroom' }
$rooms = Api Get '/rooms?limit=20'
$roomDetail = Api Get "/rooms/$($room.id)"
$room = Api Patch "/rooms/$($room.id)" @{ name = 'EN 106 classroom' }
$registration = Api Post '/modules' @{ name = 'Portable lighting module' }
$moduleId = $registration.module.deviceId
# Privately copy moduleId and registration.deviceToken into firmware; the token cannot be redisplayed.
$modules = Api Get '/modules?limit=20'
$moduleDetail = Api Get "/modules/$moduleId"
$moduleDetail = Api Patch "/modules/$moduleId" @{ name = 'Portable module A' }
$startHeaders = @{ Authorization = $userHeaders.Authorization; 'Idempotency-Key' = [Guid]::NewGuid().ToString() }
$session = Api Post '/sessions' @{ roomId = $room.id; moduleId = $moduleId; placementNotes = 'Three working-plane points' } $startHeaders
$sessionId = $session.id
$detail = Api Get "/sessions/$sessionId"
$active = Api Get '/sessions?status=active&limit=20'
# Let the physical module or the separate HTTP device example below upload samples before stop.
$latest = Api Get "/sessions/$sessionId/latest"
$samples = Api Get "/sessions/$sessionId/samples?limit=100"
$completeOnly = Api Get "/sessions/$sessionId/samples?quality=complete&limit=100"
$completed = Api Post "/sessions/$sessionId/stop"
$sameCompleted = Api Post "/sessions/$sessionId/stop"
$history = Api Get "/sessions?roomId=$($room.id)&status=completed"
Invoke-WebRequest -Uri "$apiBase/sessions/$sessionId/report.pdf" -Headers $userHeaders -OutFile 'photometrix-session.pdf'
$rotated = Api Post "/modules/$moduleId/credentials/rotate"
# Copy rotated.deviceToken into firmware before the next session; the old credential is now invalid.
$archivedModule = Api Post "/modules/$moduleId/archive"
$archivedRoom = Api Post "/rooms/$($room.id)/archive"
$allRooms = Api Get '/rooms?includeArchived=true'
$allModules = Api Get '/modules?includeArchived=true'
```

Room/category targets are server-derived: Classroom, Lecture hall/Auditorium, and CAD Workstation = 500 lx; Computer Lab and Offices = 300 lx. `Room` returns `{id,name,category,targetLux,createdAt,updatedAt,archivedAt}`. `Module` returns `{deviceId,name,createdAt,updatedAt,archivedAt,lastReceivedAt}`. Only registration/rotation additionally returns `deviceToken` once. Targets cannot be overridden by a request. Editing, archiving, or rotating an active room/module returns 409; stop first. Archive is terminal and idempotent, preserves all foreign keys/history, and revokes an archived module's credential. There is no destructive delete or permanent room-module pairing.

Starting takes immutable room/module name/category/target snapshots. Only one active session per room and per module is allowed. A start requires `Idempotency-Key`; identical input/key returns the original session (200), a new key creates one (201), conflicting reuse returns 409. `Session` returns `{id,roomId,moduleId,status,startedAt,stoppedAt,roomSnapshot,moduleSnapshot,placementNotes,summary}`; active summary is null. Stop is idempotent and freezes counts, complete-sample arithmetic mean, assessment, and recommendations atomically. Empty or entirely incomplete sessions return an insufficient-data summary and PDF rather than a pass/fail.

All list responses are `{items: [], nextCursor: null|string}`. Follow a non-null opaque cursor using `?cursor=<URL-encoded cursor>&limit=20` and keep the same filters. Limits are 1–100; invalid cursors/filter changes return 400. `includeArchived=true` includes archives; direct detail/history always preserve them. Session filters accept owned `roomId`, `moduleId`, and `status=active|completed`. Samples default to all qualities in receipt order; `quality=complete|incomplete` filters explicitly. The latest endpoint always returns the newest accepted sample, including an incomplete one, rather than silently falling back.

## Device HTTPS example

Device bearer tokens authenticate only `/api/device/*`, never user routes. Use HTTPS on a cloud host with certificate/hostname validation; loopback HTTP here is for local simulation. Run during the active session above, before stop:

```powershell
$deviceHeaders = @{ Authorization = "Bearer $($registration.deviceToken)" }
$assignment = Invoke-RestMethod -Uri "$apiBase/device/active-session" -Headers $deviceHeaders
$payload = @{
  deviceId = $moduleId
  sessionId = $assignment.sessionId
  sampleId = [Guid]::NewGuid().ToString()
  uptimeMs = 10000
  sampledAt = [DateTime]::UtcNow.ToString('o')
  sensor1Lux = 500.0
  sensor2Lux = 500.0
  sensor3Lux = 500.0
} | ConvertTo-Json
$accepted = Invoke-RestMethod -Method Post -Uri "$apiBase/device/measurements" -Headers $deviceHeaders -ContentType 'application/json' -Body $payload
$sameSample = Invoke-RestMethod -Method Post -Uri "$apiBase/device/measurements" -Headers $deviceHeaders -ContentType 'application/json' -Body $payload
```

Discovery returns `{sessionId: string|null}`. Upload first acceptance is 201, identical replay 200, returning `{sampleId,receivedAt,averageLux,assessment}`. Replay retains original receipt/counters even after stop; changed content under the same device/sample identity conflicts. Authentication is revalidated under the owner lock so guard/rotation races cannot admit revoked tokens. Device HTTP requests share a persisted 60-per-60-second limit, including authenticated invalid-body requests.

All three reading keys are required as finite numbers from 0–65535 or explicit null. Zero is valid. One missing value means average/assessment null. Client averages/targets/owner fields are rejected. The synchronized UTC acquisition timestamp must be no more than 30 seconds old, no more than 5 seconds in the future, and no earlier than session start minus 5 seconds. Unique sample identity and uptime do not prove wall-clock acquisition. Firmware retries only the current sample until the next 10-second acquisition deadline; there is no durable offline queue. A new upload to a stopped session is rejected.

`latest` returns `{sample,evaluatedAt,live:{state,averageLux,assessment,recommendations}}`. Only complete samples with acquisition age and receipt age <=30 seconds have `state=fresh` and live assessment. Other states are waiting, incomplete, stale, or completed. Historical samples contain their recorded assessment; use `latest.live`, not that raw field, for the current screen. Completed reports average the complete sample means and retain snapshot targets; today's freshness cutoff does not invalidate historical results. PDF reports are decision support, not standards certification or a claim of validated physical accuracy.

## Verification

`src/domain/measurement.spec.ts` checks target overrides, threshold equality/unrounded values, zero/null handling, complete-sample summaries, test-database safety, and password hashing. `test/app.e2e-spec.ts` uses real isolated PostgreSQL and HTTP to exercise every route, unknown-field/size/auth/expiry failures, ownership, uniqueness, migration/seed repeatability, pagination, snapshots/archive, time/reading validation, concurrent starts/replays/stop-upload, credential revalidation, and PDFs. Generated test PDFs are placed in the OS temporary directory for source/render review; no physical hardware claim follows from these tests.

No graphical browser/emulator/device QA is included in these commands. Cloud deployment, real ESP32 TLS/Wi-Fi behavior, wiring, reference-meter accuracy, and calibration require separate evidence.
