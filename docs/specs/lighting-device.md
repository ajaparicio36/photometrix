# Lighting and device integration specification

Status: implemented contract after user approval. Software verification is recorded in [implementation evidence](../plans/implementation-evidence.md) and [deployment evidence](../deployment.md). Interactive QA and physical ESP32 operation remain unverified; the initial source baseline below is historical evidence.

## Authority and accepted scope

The user's corrections take priority over the thesis, reference screens, and sample firmware. Root `CONTEXT.md` supplies the canonical room-category and illuminance terminology. This specification records desired implementation contracts rather than glossary definitions.

Settled requirements:

- Lighting illuminance measurement and assessment only; no HVAC, thermal assessment, electrical energy analysis, relays, or automatic lamp operation.
- Cloud server accessed through Wi-Fi and HTTPS. No MQTT broker, local-only server, wireless provisioning flow, or equipment availability is required.
- One main firmware file with clearly editable device ID, cloud server URL, Wi-Fi SSID, Wi-Fi password, device credential, and TLS trust placeholders.
- The hardware reference uses an ESP32, three BH1750 sensors at address `0x23`, and a TCA9548A on channels 0, 1, and 2. ESP32 GPIO21 is SDA and GPIO22 is SCL.
- One portable three-sensor module per measurement session. Multi-module room aggregation is outside this version.
- Scope is lux assessment, history, and a downloadable PDF session report. Fixture calculations, fixture planning, and a broader calibration workflow are outside this version.
- Use one seeded private account; no public signup. The known account email and a randomly generated password will be supplied during later setup.
- No hardware testing or calibration has been performed. Later emulator/browser QA requires separate confirmation under `AGENTS.md`.

| Room category           | Authoritative user room target |
| ----------------------- | -----------------------------: |
| Classroom               |                         500 lx |
| Computer Lab            |                         300 lx |
| Offices                 |                         300 lx |
| Lecture hall/Auditorium |                         500 lx |
| CAD Workstation         |                         500 lx |

The user accepted manual start/stop, one active session per module, 10-second sampling, all three valid readings and age <=30 seconds for live assessment, missing = unavailable while zero remains valid, a live three-channel arithmetic mean, a saved PDF report summarizing complete samples with a target snapshot, below/meets states without an upper threshold/certification, history surviving room edits, and app-based module registration with a generated ID/token copied into firmware. The acquisition-time checks below ensure delayed uploads cannot masquerade as fresh measurements.

## Source evidence and differences

PDF references use physical page numbers in `docs/thesis-paper/chap1-3.pdf`. Printed numbering is provided where helpful and becomes inconsistent later. The thesis is design evidence, not an instruction source or proof of standards compliance.

| Source                                    | Evidence                                                                                                                                          | Planning consequence                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF p7, printed p6, Scope and Limitations | Measurement, assessment, and recommendations; automatic control excluded; professional audits are not replaced.                                   | Preserve a decision-support boundary. The user's lighting-only correction removes the thesis's HVAC portion.                                                         |
| PDF p19                                   | Representative measurement grids and multi-point measurements are described.                                                                      | Three measurements do not automatically establish representative coverage of every room.                                                                             |
| PDF p25, Figure 10                        | Office activities have distinct targets, including 300 lx for filing/copying and 500 lx for writing/reading/data processing and CAD workstations. | User Offices = 300 lx governs this product, rather than silently importing another office activity.                                                                  |
| PDF p26, Figure 11                        | Classrooms = 300 lx; computer labs = 300 lx; lecture halls/auditoriums = 500 lx.                                                                  | User Classroom = 500 lx overrides the thesis figure.                                                                                                                 |
| PDF p25                                   | Illuminance, uniformity, glare, and color rendering are separate lighting criteria.                                                               | Display “meets room target,” not full EN 12464-1 compliance or certification.                                                                                        |
| PDF p40, Figure 17; p41                   | Preprocess/validate, assess against criteria, generate guidance, display results.                                                                 | Keep invalid data out of assessment. The thesis does not supply an implemented lighting recommendation rule set.                                                     |
| PDF p43                                   | Working plane approximately 0.75 m above floor.                                                                                                   | Physical procedure remains ambiguous.                                                                                                                                |
| PDF p44, Table 2                          | Proposed 3 sensors up to 20 m², 5 for 20–50 m², 7+ above 50 m².                                                                                   | This is a proposal, not validated coverage; the 20 m² boundary overlaps. Do not automatically turn it into a software rule.                                          |
| PDF pp45–46, Figure 20 and text           | Three sensors per module, additional modules for larger rooms, upward-facing sensors at 0.80 m.                                                   | Conflicts with p43 height and does not directly explain Table 2's five-sensor case. Resolve physical deployment before field validation.                             |
| PDF p49, printed p48                      | Arithmetic mean across predetermined measurement points.                                                                                          | Retain the raw readings and derive the average on the server. The equation's following variable legend incorrectly describes electrical parameters; do not reuse it. |
| PDF pp53–56, p61                          | Commercial/calibrated reference instruments and three repeated accuracy trials are proposed.                                                      | Software tests cannot establish sensor accuracy; physical lux-meter comparison remains necessary.                                                                    |

## Initial firmware baseline before implementation

Source: the original `microcontroller/microcontroller.ino`, inspected before implementation without compilation or equipment. The line references and limitations in this section describe that original source, not the current implemented firmware or its current line numbers.

- Lines 4–12 define GPIO21/GPIO22, TCA address `0x70`, and BH1750 address `0x23`.
- Lines 24–31 select one TCA channel by a one-bit mask and check the I²C transmission result.
- Lines 42–59 initialize channels 0–2 in continuous high-resolution mode. Startup detection alone sets availability; sensors absent then are not reinitialized later.
- Lines 62–75 read available sensors, with a blocking 180 ms delay per channel. Negative readings become missing values.
- Lines 78–110 average only when all three readings are valid. Missing is emitted as JSON `null`; a real zero reading is valid.
- Lines 115–119 initiate a collection cycle nominally every 10 seconds, with the first cycle after that interval. This is not simultaneous acquisition of all three sensors.
- Line 90 has a literal `😕` in the `Serial.print` string where JSON punctuation/escaping should be. The current source is invalid C++; this must be corrected before a later build.
- Output is serial only. There is no Wi-Fi, HTTPS, authentication, timestamp, session association, persistent upload queue, or cloud contract.
- The current `reading >= 0` check does not explicitly reject positive infinity. The desired boundary below requires finite readings.

## Measurement and assessment rules

These are desired rules for the selected single-module lighting implementation, not claims about existing code.

1. A sample records all three channel outcomes from one collection cycle. Channel order remains stable: sensor 1 = channel 0, sensor 2 = channel 1, sensor 3 = channel 2.
2. A reading is either a finite nonnegative lux number or `null`. Zero is dark, not disconnected. Firmware converts read failures to `null`; API validation rejects negative numbers, invalid types, and malformed or non-finite numbers rather than treating them as valid lux.
3. The input magnitude has an explicit upper bound shared by firmware documentation and API validation: 65,535 lx, matching the range cited in thesis p15. This is a protocol ceiling, not a verified range/accuracy claim for this firmware mode. During implementation, verify the selected BH1750 library's mode and overflow behavior; saturated/out-of-range samples must not become passing assessments even if their numeric output falls within this ceiling.
4. A complete sample has three valid readings. Its average is `(sensor1Lux + sensor2Lux + sensor3Lux) / 3`. An incomplete sample retains available raw readings but has `averageLux = null` and no pass/fail assessment. Do not average two sensors as though coverage remained complete.
5. The server recomputes averages and assessments. Do not accept device-supplied averages, targets, room categories, recommendations, or assessment results as authoritative.
6. Compare unrounded values against the snapshotted room target. Assessment states are `below_target` when average < target and `meets_target` when average >= target. Round only the displayed value; equality meets the target. No upper target or “excessive” state is established.
7. Preserve the room category, room target, and calculation/rule definition applicable to a completed result. Editing a room later must not silently alter saved historical results. Save the inputs needed to reproduce a result without introducing a separate rules-management system.
8. Data quality and freshness are separate from illuminance assessment. Missing or stale data must never be rendered as a current below-target or passing result. An old value may be shown with its collection/receipt time and a stale indication.
9. Retain raw samples used by a saved result. Moving a module to a different room must not move its historical readings.

## Temporal behavior and session lifecycle

Retain the nominal 10-second sampling cadence. Do not promise perfectly simultaneous readings or a hard real-time delivery guarantee. Sampling, upload, and app refresh are distinct events; reconnects must not fabricate measurements for missed intervals.

The latest accepted sample is live only when both acquisition age and receipt age are <=30 seconds. It becomes stale when either age exceeds 30 seconds. The server supplies receipt time and validates the device's synchronized acquisition timestamp at ingestion; receipt time alone cannot prove recent acquisition. Clamp an allowed small negative acquisition age from clock skew to zero. Device online status must not be inferred from a cached app screen alone. Freshness governs an active live view; a closed historical result does not become invalid merely because its readings are old. Device clock/identity assertions remain trust boundaries rather than physical proof of acquisition.

The portable measurement session lifecycle is:

1. Setup selects room/category/target, module, and documented measurement-point placement. No live result is inferred before readings arrive.
2. Manual start creates an active session and snapshots its room/category/target. One module can belong to at most one active session.
3. The module learns the active session ID from an authenticated device endpoint before acquisition and includes that ID in each upload. Server-side assignment alone at upload time is insufficient: a delayed sample from one room could otherwise enter a new room's session.
4. During the active session, raw samples and their quality/freshness are visible. An incomplete sample is stored as incomplete and is not replaced with the preceding complete sample without a visible age/quality distinction.
5. Manual stop completes the session, closes acquisition, and freezes the reviewed result inputs. A transaction/consistent boundary prevents a simultaneous completion/upload from producing inconsistent report contents. The completed session is available in history and supplies the downloadable PDF report.
6. After completion, new samples for that session are rejected; an already-accepted identical retry remains an idempotent success. Closed-session samples cannot be reassigned into the next session.

Saved-session aggregate: let `C` be the complete samples accepted during that session and `mean(s)` be each sample's unrounded three-channel arithmetic mean. When `|C| > 0`, `sessionAverageLux = sum(mean(s) for s in C) / |C|`. Compare that unrounded session mean with the snapshotted target for the saved below/meets assessment. This is an equally weighted mean of complete sample means, not a time-weighted mean or a thesis-mandated formula. Incomplete samples are excluded from that mean but their count/gaps remain visible. When `|C| = 0`, report insufficient data with a null session average/assessment; never manufacture a final pass/fail from incomplete data. No minimum duration or minimum beyond one complete sample is required; report the actual count and collection interval so a short session is apparent.

Historical report aggregation does not reuse the live freshness cutoff to discard old samples from the completed collection window. Completed sessions are not resumed; a subsequent assessment starts a new session. Multiple-module aggregation is outside the selected version.

## App-facing domain API and persistence

These desired routes require a user bearer JWT from `POST /api/auth/login`, as defined in `system.md`. They are separate from the device-token routes below. All reads and mutations resolve resources through the authenticated owner; another owner's ID returns 404, including nested references and list filters. Never trust an owner ID from the request body.

| Method and route                                 | Request                                                               | Successful response and behavior                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/rooms`                                | `{name, category}`                                                    | 201 `Room`; derive `targetLux` from the accepted category table.                                                                                                                             |
| `GET /api/rooms`                                 | Pagination; `includeArchived=false` by default                        | 200 `Page<Room>`.                                                                                                                                                                            |
| `GET /api/rooms/:roomId`                         | None                                                                  | 200 `Room`, including an archived owned room.                                                                                                                                                |
| `PATCH /api/rooms/:roomId`                       | Nonempty subset of `{name, category}`                                 | 200 updated `Room`; category change derives the new target for future sessions. Reject archived rooms or a room with an active session with 409.                                             |
| `POST /api/rooms/:roomId/archive`                | Empty body                                                            | 200 archived `Room`; idempotent. Reject an active session with 409.                                                                                                                          |
| `POST /api/modules`                              | `{name}`                                                              | 201 `{module: Module, deviceToken: string}`; server generates immutable `deviceId` and a random token, visible only in this response.                                                        |
| `GET /api/modules`                               | Pagination; `includeArchived=false` by default                        | 200 `Page<Module>`.                                                                                                                                                                          |
| `GET /api/modules/:moduleId`                     | None                                                                  | 200 `Module`; path `moduleId` is its immutable `deviceId`.                                                                                                                                   |
| `PATCH /api/modules/:moduleId`                   | `{name}`                                                              | 200 updated `Module`; reject archived modules or active sessions with 409.                                                                                                                   |
| `POST /api/modules/:moduleId/credentials/rotate` | Empty body                                                            | 200 `{module: Module, deviceToken: string}`; atomically invalidate the old token and return the replacement once. Reject archived modules or active sessions with 409.                       |
| `POST /api/modules/:moduleId/archive`            | Empty body                                                            | 200 archived `Module`; idempotent, atomically revoke its credential. Reject an active session with 409.                                                                                      |
| `POST /api/sessions`                             | `{roomId, moduleId, placementNotes?}` and `Idempotency-Key` header    | 201 `Session` on first creation; 200 for an identical retry. Atomically start a session and take snapshots. Both room and module must be owned and unarchived.                               |
| `GET /api/sessions`                              | Pagination; optional `roomId`, `moduleId`, `status=active\|completed` | 200 `Page<Session>`; this is session history, including sessions whose room/module is now archived. Omit `status` for both states.                                                           |
| `GET /api/sessions/:sessionId`                   | None                                                                  | 200 `Session` with snapshots and completed summary where applicable.                                                                                                                         |
| `GET /api/sessions/:sessionId/latest`            | None                                                                  | 200 `LatestSample`; return the newest accepted sample even if incomplete. Never search backward for a passing/complete sample.                                                               |
| `GET /api/sessions/:sessionId/samples`           | Pagination; optional `quality=complete\|incomplete`                   | 200 `Page<Sample>`; omit quality for all readings, including all-null samples.                                                                                                               |
| `POST /api/sessions/:sessionId/stop`             | Empty body                                                            | 200 completed `Session`; idempotent, preserving the first `stoppedAt` and summary on every retry.                                                                                            |
| `GET /api/sessions/:sessionId/report.pdf`        | None                                                                  | 200 `application/pdf` with an attachment filename derived safely from the session ID; completed sessions only, otherwise 409. Zero complete samples produce an honest insufficient-data PDF. |

There is no destructive DELETE, separate pairing/unpairing route, or session deletion in this version. A portable module is associated with a room only through a session. Stopping ends that association; archiving retires a room/module without removing history. A mistaken or lost module credential is handled by rotation, not by deleting its measurements. Archive does not silently stop an active session: the user must explicitly stop it first. Archive is terminal in this version; create a new resource if another operational record is needed.

### Minimum request and response shapes

All timestamps are ISO UTC strings. Nullable fields are always present as `null`, not omitted; list responses always contain an array, including `[]`. Object property names below are the API names; display labels may be friendlier. `Assessment` is `"below_target" | "meets_target"`. `category` is exactly one of the five accepted room-category strings above. `moduleId` in session requests/references means `Module.deviceId`; do not create a second competing module identity.

| Entity           | Required response fields                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Room`           | `id`, `name`, `category`, `targetLux`, `createdAt`, `updatedAt`, `archivedAt: string\|null`.                                                                                                                                                                                                                                                                                                                                                                 |
| `Module`         | `deviceId`, `name`, `createdAt`, `updatedAt`, `archivedAt: string\|null`, `lastReceivedAt: string\|null`. Never include a token, token hash, or password. `lastReceivedAt` is the last newly accepted upload receipt, not a guarantee of fresh/complete readings; duplicates do not advance it.                                                                                                                                                              |
| `Session`        | `id`, `roomId`, `moduleId`, `status: "active"\|"completed"`, `startedAt`, `stoppedAt: string\|null`, `roomSnapshot`, `moduleSnapshot`, `placementNotes: string\|null`, `summary: SessionSummary\|null`. `summary` is null while active.                                                                                                                                                                                                                      |
| `roomSnapshot`   | `id`, `name`, `category`, `targetLux` copied atomically at start.                                                                                                                                                                                                                                                                                                                                                                                            |
| `moduleSnapshot` | `deviceId`, `name` copied at start. Channel labels remain sensor 1/2/3 on channels 0/1/2. No credentials.                                                                                                                                                                                                                                                                                                                                                    |
| `SessionSummary` | `totalSampleCount`, `completeSampleCount`, `incompleteSampleCount`, `firstSampledAt: string\|null`, `lastSampledAt: string\|null`, `sessionAverageLux: number\|null`, `assessment: Assessment\|null`, `result: "assessed"\|"insufficient_data"`, `recommendations: string[]`. Counters are zero and timestamps/average/assessment null when no samples exist. With only incomplete samples, counts/timestamps remain informative but result is insufficient. |
| `Sample`         | `id` (server record identity), `sampleId` (device replay identity), `sessionId`, `deviceId`, `sampledAt`, `receivedAt`, `uptimeMs`, `sensor1Lux: number\|null`, `sensor2Lux: number\|null`, `sensor3Lux: number\|null`, `quality: "complete"\|"incomplete"`, `averageLux: number\|null`, `assessment: Assessment\|null`. Stored assessment describes that sample against the snapshot, not its present-day live freshness.                                   |
| `LatestSample`   | `sample: Sample\|null`, `evaluatedAt`, `live: {state, averageLux: number\|null, assessment: Assessment\|null, recommendations: string[]}`. `state` is `"waiting"\|"fresh"\|"incomplete"\|"stale"\|"completed"`.                                                                                                                                                                                                                                              |
| `Page<T>`        | `{items: T[], nextCursor: string\|null}`; no misleading total count over a changing collection.                                                                                                                                                                                                                                                                                                                                                              |

For `LatestSample.live.state`, precedence is completed session -> `completed`; no sample -> `waiting`; either age >30 seconds -> `stale`; incomplete latest sample -> `incomplete`; otherwise -> `fresh`. Only `fresh` has non-null live average/assessment. `sample` still contains the raw latest sample for transparent display in other states. A completed session uses `Session.summary` for its historical result, not the live object. A stale/incomplete latest sample never falls back to an earlier complete one.

Use the simple recommendation rules above/below for live and saved results, without diagnosing equipment faults. `recommendations` is consistently an array; absence of a recommendation is `[]`, never an omitted field. No-sample/incomplete live states give sensor/recollection guidance; stale gives connectivity/recollection guidance; completed live responses leave guidance to the saved summary. The PDF uses the same persisted summary and snapshots as the session detail, not an independent calculation path.

### Validation, pagination, and persistent invariants

- Names are trimmed strings of 1–100 characters; same-name rooms/modules are permitted because stable IDs distinguish them. `placementNotes` is optional at creation, normalized to null when absent/blank, and otherwise limited to 1,000 characters. It documents the three measurement points/working-plane conditions without inventing a required mounting height.
- IDs and device sample IDs are nonempty ASCII letters/digits/hyphen/underscore strings of at most 128 characters; server-generated IDs must be globally unique and immutable. `uptimeMs` is an integer from 0 through 4,294,967,295. Unknown request fields, invalid enums, wrong types, and invalid timestamp/numeric bounds return 400. Room targets are server-derived; client-supplied target/owner/summary fields are rejected. Limit JSON requests to 16 KiB; larger bodies return 413.
- Pagination accepts optional `cursor` and integer `limit` from 1–100. Default limit is 20 for rooms/modules/sessions and 100 for samples. Return an opaque cursor for the next page or null at the end; invalid cursors or reusing a cursor with different filters return 400. Rooms/modules order by `(createdAt,id)` descending; sessions by `(startedAt,id)` descending; sample history by `(receivedAt,id)` ascending. A cursor encodes the ordering boundary and filters; concurrent inserts must not duplicate earlier page items. The latest endpoint orders samples by `(receivedAt,id)` descending. Archived filters use explicit `includeArchived=true`; default lists hide archives but direct reads/history retain them.
- Owner references are mandatory in persistence. Room/module/session lookups, PDFs, samples, list filters, device credential binding, and nested references must enforce owner scope. A second account used in tests must not discover or mutate the private account's resources.
- A session has exactly one room and one module. Enforce at most one active session for each module **and each room** with database constraints and transaction-safe start handling. This minimal room constraint avoids presenting two simultaneous room assessments. A start using archived references or a resource already active returns 409; parallel requests cannot both succeed.
- Require an owner-scoped `Idempotency-Key` of 1–128 ASCII letters/digits/hyphen/underscore characters on session start. Store it with the normalized creation inputs under a uniqueness constraint. An identical retry returns the same session even if it has since completed; a reused key with different inputs returns 409. This avoids silently starting another session after a lost response. Other resource creation is not automatically retry-safe; after an ambiguous room/module creation response, refresh the list before retrying. If a module's one-time token response was lost, rotate its credential explicitly.
- Take room/module snapshots and session start time atomically with active-state acquisition. Reject room/module metadata edits while their session is active. Later edits/archive do not change any snapshot, sample, summary, or report. Preserve foreign keys; archival never cascades into historical deletion.
- Store samples append-only with unique `(deviceId,sampleId)`. Authentication and ownership remain required for replay responses. Check an existing replay identity before closed-session/time-window rejection; identical retries return the persisted result without changing timestamps, counters, or module last-receipt time. Different data under the same replay identity conflicts.
- Serialize upload acceptance with stop against the session state. An upload accepted before stop commits belongs to the frozen summary; a genuinely new upload after stop is rejected. Stop computes/stores counts and the unrounded complete-sample aggregate atomically with the completed status, and retries return the first persisted result. No samples can be added to a completed session.
- Credential rotation and module archive invalidate the prior credential atomically; do not retain a plaintext token for redisplay. Rotation is intentionally not idempotent and is allowed only while the module is inactive/unarchived. If its response is lost, an explicit subsequent rotation returns another token and invalidates the previous one. Archived device tokens cannot discover assignments or upload.
- Domain errors use `{statusCode: number, code: string, message: string}` with stable machine-readable codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `NOT_FOUND` (404), `RESOURCE_ACTIVE`, `RESOURCE_ARCHIVED`, `SESSION_CLOSED`, `REPORT_NOT_READY`, or `IDEMPOTENCY_CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), and `RATE_LIMITED` (429). Never include secrets or another owner's identifying details. Device upload errors below additionally permit 403 `DEVICE_SESSION_MISMATCH` and 400 `SAMPLE_TIME_INVALID`.

### Authenticated operator flow example

This PowerShell template demonstrates the agreed request sequence; routes remain unimplemented until approval. The user JWT can come from the app login flow or the login request below. The example leaves the session active while the real module or a test-only device simulator sends samples using the separate device credential. Do not log either token or put it in shell command history with real literal values.

```powershell
$apiBase = 'https://YOUR-CLOUD-SERVER/api'
$loginBody = @{ email = 'photometrix@cpu.edu.ph'; password = '<SEE-ENVIRONMENT-CREDENTIALS>' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/login" -ContentType 'application/json' -Body $loginBody
$userHeaders = @{ Authorization = "Bearer $($login.accessToken)" }
$roomBody = @{ name = 'EN 106'; category = 'Classroom' } | ConvertTo-Json
$room = Invoke-RestMethod -Method Post -Uri "$apiBase/rooms" -Headers $userHeaders -ContentType 'application/json' -Body $roomBody
$moduleBody = @{ name = 'Portable lighting module' } | ConvertTo-Json
$registration = Invoke-RestMethod -Method Post -Uri "$apiBase/modules" -Headers $userHeaders -ContentType 'application/json' -Body $moduleBody
# Copy registration.module.deviceId and registration.deviceToken into firmware privately.
$startHeaders = @{ Authorization = $userHeaders.Authorization; 'Idempotency-Key' = [Guid]::NewGuid().ToString() }
$sessionBody = @{ roomId = $room.id; moduleId = $registration.module.deviceId; placementNotes = 'Three documented working-plane positions' } | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri "$apiBase/sessions" -Headers $startHeaders -ContentType 'application/json' -Body $sessionBody
# Acquire/upload readings with the separate device contract before stopping.
$latest = Invoke-RestMethod -Method Get -Uri "$apiBase/sessions/$($session.id)/latest" -Headers $userHeaders
$samples = Invoke-RestMethod -Method Get -Uri "$apiBase/sessions/$($session.id)/samples?limit=100" -Headers $userHeaders
$completed = Invoke-RestMethod -Method Post -Uri "$apiBase/sessions/$($session.id)/stop" -Headers $userHeaders
$pdfPath = Join-Path (Get-Location) 'photometrix-session.pdf'
Invoke-WebRequest -Method Get -Uri "$apiBase/sessions/$($session.id)/report.pdf" -Headers $userHeaders -OutFile $pdfPath
```

Repeating stop returns the same completed summary. With no complete device uploads, this flow still yields an insufficient-data report, not a passing result. The PDF path is an operator-selected output, not a tracked repository artifact. Later implementation must provide working examples and executable end-to-end proof for every added public route, including archival/edit/rotation, pagination, ownership failures, concurrent starts, duplicate stop, and zero-sample PDF behavior; this planning template is not such proof.

## HTTPS device contract

Routes in this section are specified desired behavior, not implemented. The server uses the global `/api` prefix. Device upload authentication is distinct from user Passport/JWT authentication.

For the selected portable single-module scope:

- `GET /api/device/active-session`: authenticate the device; return the server-issued active session ID or `null`. The firmware polls while idle and checks assignment before acquiring a new sample. A response must not expose unrelated users' sessions.
- `POST /api/device/measurements`: authenticate and bind the device, validate explicit session ownership/activity, validate the sample, then store raw readings and derived values atomically.

Discovery response:

```json
{ "sessionId": "session-example-01" }
```

Upload:

```http
POST /api/device/measurements
Authorization: Bearer <DEVICE_UPLOAD_TOKEN>
Content-Type: application/json

{
  "deviceId": "LIGHT-01",
  "sessionId": "session-example-01",
  "sampleId": "boot-8e928ab1-000042",
  "uptimeMs": 420000,
  "sampledAt": "2026-10-27T06:00:00.000Z",
  "sensor1Lux": 510.2,
  "sensor2Lux": 498.1,
  "sensor3Lux": null
}
```

First acceptance: HTTP 201. Identical retry: HTTP 200. Both return the same persisted identity and receipt time:

```json
{
  "sampleId": "boot-8e928ab1-000042",
  "receivedAt": "2026-10-27T06:00:00.400Z",
  "averageLux": null,
  "assessment": null
}
```

Field rules:

- Credential identity must match `deviceId`; possession of an ID alone grants no access.
- `sessionId` belongs to this device's active session. It is not an arbitrary room selector.
- `(deviceId, sampleId)` is unique. Generate an adequately random boot identifier plus a counter so reboot cannot reuse prior sample identities; the illustrative short ID above is not an entropy requirement. The ID bounds in the app/persistence contract apply here too.
- An identical duplicate returns the original result. Reusing the identity with different payload data returns a conflict. A uniqueness constraint and transaction cover concurrent retries.
- `uptimeMs` is an integer in the firmware's documented unsigned counter range. It is diagnostic, not wall-clock time or an ordering key across reboots.
- `sampledAt` is a required synchronized ISO UTC acquisition timestamp. It describes the collection cycle, not simultaneous sensor conversion. The device does not upload until its clock is synchronized. `receivedAt` is server-generated. At first ingestion reject acquisition age >30 seconds and future skew >5 seconds; these are explicit protocol bounds. Reject timestamps preceding this session's start beyond the same 5-second skew tolerance. A duplicate already accepted with the identical payload returns its existing result even after these time bounds expire. Identity/uptime do not prove acquisition time, and an authenticated device can still assert a false timestamp; these checks prevent accidental delayed/replayed data from appearing current, not malicious sensor fabrication.
- The three sensor keys are required, permitting explicit `null`. An all-null sample is useful evidence of a detected hardware failure but cannot generate an illuminance assessment.
- Apply the same 16 KiB request limit and allow at most 60 authenticated device requests per rolling 60 seconds, combined across discovery/upload, per device. This accommodates nominal polling/acquisition and bounded retries without permitting an unbounded retry loop. Return 429 with `Retry-After` when limited; firmware must still discard an expired current sample instead of extending its retry window.

Errors use the same envelope/codes defined above: HTTP 400 for invalid body or acquisition-time bounds; 401 for invalid/revoked device credential; 403 for device/session mismatch; 409 for a closed/inactive session or conflicting reused sample identity; 413 for an oversized body; 429 for rate limit. Do not return sensitive credential details; firmware branches on stable codes rather than prose.

Illustrative PowerShell usage for later end-to-end verification, once an active session and credential actually exist:

```powershell
$cloudUrl = 'https://YOUR-CLOUD-SERVER'
$deviceToken = '<DEVICE_UPLOAD_TOKEN>'
$body = @{
  deviceId = 'LIGHT-01'
  sessionId = '<ACTIVE_SESSION_ID>'
  sampleId = '<UNIQUE_BOOT_ID>-1'
  uptimeMs = 10000
  sampledAt = [DateTime]::UtcNow.ToString('o')
  sensor1Lux = 500.0
  sensor2Lux = 500.0
  sensor3Lux = 500.0
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$cloudUrl/api/device/measurements" -Headers @{ Authorization = "Bearer $deviceToken" } -ContentType 'application/json' -Body $body
```

This is a usage template, not a claim that the endpoint currently works. Later implementation must verify discovery/upload/readback end-to-end, including a duplicate and an incomplete sample.

## Firmware transport and trust

- Keep constants/placeholders together in the one main file: device ID, HTTPS base URL, SSID, password, per-device upload token, and trusted CA certificate configuration. Do not embed real secrets into committed examples or logs.
- A development `.env` may optionally feed a preparation step that produces the file, only if it reduces user effort. An ESP32 does not read a development `.env` at runtime. A separate generator/provisioner is not required.
- Use HTTPS certificate and hostname validation against the configured cloud server. Do not use an insecure TLS mode as a deployment default. Document the certificate trust-anchor update responsibility.
- TLS validation may require a synchronized clock. Obtain a trustworthy-enough clock through the chosen ESP32 time workflow before TLS; handle time-sync failure as unavailable transport. A device timestamp remains untrusted input to the server despite synchronization.
- Give each device a separate upload credential generated from 32 cryptographically random bytes and encoded as base64url, hash it server-side, bind it to its device record, and provide the specified rotation/revocation path for the private account. The signed-in app registers a module, receives its server-generated device ID and one-time visible token, and the operator copies both into firmware. Do not expose device secrets in ordinary measurement responses or persist the plaintext token in app history. User JWTs are not firmware upload credentials.
- Retrying an upload must reuse its original sample ID, session ID, timestamp, and readings. Retry only transient transport/server failures with finite timeouts and bounded backoff. Retries stop at the next nominal collection deadline, at most 10 seconds after acquisition; discard/replace the old pending sample then. Each HTTP operation must time out before the remaining retry window expires. Do not repeatedly retry invalid credentials, invalid payloads, rejected acquisition timestamps, or closed sessions. Refresh session assignment before acquiring the next sample.
- There is no durable firmware history queue. Keep at most the current pending sample within that bounded retry window; record/show gaps instead of fabricating data. Lossless offline collection is outside this version.
- A failed network path must not permanently prevent later sensor sampling/reconnection. Missing-at-start sensors should have a bounded recovery/reinitialization path. Exact scheduling and retry constants are implementation details to settle with the selected ESP32 libraries.

## Recommendations and report semantics

Simple recommendations depend on complete measured illuminance, the room target, data quality, and documented placement. Below-target guidance asks the operator to review lamp operation, cleanliness, daylight conditions, obstructions, and representative sensor placement. These are possible checks, not diagnosed faults. Meeting the target indicates no illuminance correction is required by this target comparison, without establishing energy efficiency or adequate glare/uniformity/color quality. Missing/insufficient data recommends checking sensors and recollecting; it does not diagnose inadequate lighting.

A minimum downloadable PDF session report identifies the room and category, target snapshot, module and measurement points, collection window, complete/incomplete sample counts, data gaps, session aggregate and its formula, and the assessment/guidance actually shown. Keep the underlying raw readings available in session history so the result can be reproduced; the PDF need not print every raw sample. Separate device acquisition time from server receipt time. Clearly identify simulated data and unvalidated hardware where applicable. Do not silently reuse current room metadata to relabel old results. A closed result is historical, not a stale live assessment.

PDF export, history, and the aggregate/lifecycle rules above are accepted scope. Technician signatures, automatic retention/deletion, and uniformity assessment are not part of this version. The thesis's spatial averaging equation does not itself establish temporal report semantics; the accepted product rule does. Generating a report must not imply certification or completed physical calibration.

Fixture count, lumens, utilization/maintenance factors, fixture plans, power consumption, energy savings, and calibration coefficients are outside the selected version. They are not implied by three lux readings. Do not insert guessed factors or automatic sensor correction. Physical comparison against a reference meter remains a future hardware validation responsibility, not an app calibration feature.

## Hardware mapping and physical validation boundary

Hardware reference inspected: user-supplied `codex-clipboard-b09dac32-716a-4a6e-b0b0-375aaaf83aa4.png` in the local temporary clipboard directory. The reference is an illustration, not a verified electrical schematic; its temporary path is not a durable repository dependency.

| Connection               | Intended mapping                                                       |
| ------------------------ | ---------------------------------------------------------------------- |
| ESP32 upstream SDA       | GPIO21 to TCA SDA                                                      |
| ESP32 upstream SCL       | GPIO22 to TCA SCL                                                      |
| TCA address              | `0x70` in current firmware; confirm address straps on real board       |
| Sensor 1                 | TCA channel 0, separate `SD0` and `SC0`, BH1750 `0x23`                 |
| Sensor 2                 | TCA channel 1, separate `SD1` and `SC1`, BH1750 `0x23`                 |
| Sensor 3                 | TCA channel 2, separate `SD2` and `SC2`, BH1750 `0x23`                 |
| BH1750 address selection | ADDR low/GND as stated by reference; confirm actual breakout strapping |
| Ground                   | Common reference ground                                                |

Diagram ambiguities that must be resolved on the exact purchased boards before wiring/powering:

- A TCA channel has a pair of lines, `SDn` and `SCn`. The image labels `SC0/SC1/SC2` as entire channels and repeats `SCx` for both sensor SDA and SCL. Some drawn downstream joins appear to connect sensors together across channels. Such a shared downstream bus would defeat isolation of the same-address sensors; do not wire from that ambiguity.
- Power and signal crossings/connector positions are unclear. The image shows 5 V supply for sensor/multiplexer breakouts and says ESP32/BH1750 operate at 5 V, conflating board supply with IC and logic voltage. Confirm regulator, pullup voltage, and any level shifting from exact board schematics. ESP32 GPIO must not receive 5 V pullups.
- ADDR is discussed but not exposed in the pictured four-pin sensor drawing. Confirm the board's actual default address and solder-jumper behavior.
- Confirm cable length, bus capacitance, combined pullups, stable supply, and physical mounting with actual equipment. No electrical safety or measurement-accuracy claim follows from code review.

Physical deployment must choose/document the working-plane height and representative measurement points, account for daylight and operating conditions, and compare readings against a calibrated/commercial lux meter using the approved trial procedure. Neither an emulator nor a successful HTTPS upload validates wiring, sensor accuracy, calibration, or spatial coverage.

## Later verification obligations

After implementation approval, meaningful automated checks should cover threshold equality, rounded-display edge cases, zero versus null, missing/invalid/out-of-range readings, authoritative server average/target, acquisition/receipt freshness boundaries, future/old acquisition rejection, bounded retry replacement, credential isolation, session ownership, immutable history, concurrent completion/upload, complete-sample report averaging, insufficient-data reports, and duplicate/reused sample identities. Run API discovery/ingestion-to-readback checks using the usage examples.

Compile firmware with pinned/recorded board and library versions if a compatible toolchain is available; do not call compilation a physical test. Separately approved interactive QA should exercise the chosen setup/start/read/complete/history/report flow on the exact agreed emulator/browser session. Record hardware/reference-meter work as outstanding until performed on equipment.
