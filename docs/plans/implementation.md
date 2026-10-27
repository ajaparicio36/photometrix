# Photometrix phased implementation plan

Status: implementation and Railway delivery completed after user approval; see [verification evidence](implementation-evidence.md) and [deployment evidence](../deployment.md). The original phase sequence below records the approved scope. Interactive browser/emulator/device QA and visual adjustments are paused at gate B pending shared-resource confirmation. No Git commit, push, or integration selection was made.

## Inputs and approval boundaries

Read root/scoped instructions and `../../CONTEXT.md` first. Contracts live in `../specs/system.md` and `../specs/lighting-device.md`; visual inputs live in `../specs/visual-references.md` and `../../app/DESIGN.md`. Local tracking is `.scratch/photometrix/` under the approved tracker convention.

The product choices and lifecycle/report rules are accepted: one portable three-sensor module per manually started/stopped session, lux assessment/history/downloadable PDF report, app-generated module ID/token, and one private seeded account. Use `photometrix@cpu.edu.ph` locally and in the cloud; generate strong passwords during implementation. No public registration/recovery, fixture calculation, or multi-module aggregation is included. Follow `lighting-device.md` for the complete accepted contract.

Approval gate A: present the reviewable specification, design direction, and this plan; ask the user whether to continue into implementation. Documentation approval alone does not authorize application implementation. After this approval, implementation includes deployment, local/cloud account provisioning, and non-interactive local/cloud checks.

Approval gate B: after implementation, Railway deployment, credential provisioning, and non-interactive local/cloud verification, pause before taking control of Chrome, an emulator, or a physical device for interactive QA or visual adjustments. Ask whether the shared PC/resource is available, identify the exact session/device, and obtain the user's confirmation before acting. No additional deployment-approval gate is introduced by this plan.

## Staffing and checkout discipline

Use `gpt-6.1-sol` with `high` reasoning for backend, workspace, firmware, documentation, and other non-UI workers. Use `gpt-6-astra` with `xhigh` reasoning for UI implementation, carrying the user's explicit override of the handoff skill's saved High preference. Validate both selections against the live catalog; report unavailable selections rather than silently substituting. A model-override worker uses `fork_turns: none` and receives a self-contained contract.

The lead owns approved scope, contracts, sequencing, integration, credentials delivery, and verification reporting. Workers own bounded files and return evidence. Documentation writers may work concurrently on disjoint files. Future potentially conflicting implementation writers require the `using-git-worktrees` skill, an actual viable committed base, a distinct branch/worktree, and recorded parent branch. This repository is currently unborn with the user's staged files: do not create a speculative base commit or manipulate that index without authorization. Sequence conflicting work in the current checkout if no authorized base exists.

After checks pass in a worktree, invoke `finishing-a-development-branch` and return integration choices to the user. Workers must not merge, push, create PRs, delete branches, or remove worktrees on their own. Apply the root parent-PR/stacked-PR rule where relevant.

## Phase 1: Reviewable contracts and design

Owner: lead plus bounded documentation/research workers. Files: approved root agent docs/glossary, `docs/specs/`, `docs/plans/`, `app/DESIGN.md`, and local tracker files.

1. Record current source/tool/deployment inventory without claiming implementation success.
2. Preserve the complete screenshot/HTML/design/logo/thesis manifest and distinguish visual evidence from selected product behavior.
3. Specify workspace startup/checks/hooks, Passport auth, Drizzle lifecycle, device/session ingestion, calculations, UI states, credentials, and Railway ownership.
4. Record accepted product/lifecycle rules and material thesis/design/firmware conflicts, including the user's overriding room targets and private account email.
5. Present the resulting documents and gate A.

Done when every requested area has an owner, a contract pointer, and a verification criterion, and the accepted scope is consistent across documents. No code, installation, cloud mutation, commit, or QA should be represented as complete.

## Phase 2: Workspace, local database, and starter cleanup

Owner: GPT-6.1 Sol High. Files: root package/workspace/lockfile, hooks, formatter/ignore rules, Compose, startup orchestration, README, and package scripts/configs. Astra owns visual starter replacement in phase 4; server placeholder replacement belongs to phase 3.

1. Consolidate to one pnpm workspace and root lockfile, pin pnpm, and preserve package-specific compiler requirements.
2. Implement workspace/local orchestration from `system.md`: local ignored configuration, PostgreSQL readiness, and one process runner for API plus Expo. Complete migration/seed startup integration in phase 3 when the schema/auth implementation exists; leave no success-reporting stub. Generate local secrets/account credentials during implementation without exposing them in logs.
3. Add staged check-only lint/format pre-commit and whole-repo lint/format/typecheck/tests/build pre-push. Separate fix commands and ensure tests run once.
4. Remove unused starter configuration/scripts only after checking callers; retain supplied product assets, references, firmware, and scoped instructions. Sequence visual and API placeholder replacement with their owning phases.
5. Document start/stop, persistent data, API URL selection, credentials, and troubleshooting.

Done when a fresh authorized root install installs both packages and orchestration produces a ready local database plus both development processes; failure paths stop clearly and shutdown preserves data. Phase 3 completes the full migrated/seeded two-command first-run contract and verifies repeat start preserves data/account. Check commands fail on an intentional temporary local violation and leave source/index intact; remove that temporary violation afterward. Do not commit or push to test hooks.

## Phase 3: Authentication, persistence, and domain API

Owner: GPT-6.1 Sol High. Files: server auth/database/domain modules, Drizzle schema/migrations/seed, server tests, API README examples, environment examples. Shared root/config changes remain with their assigned owner.

1. Implement private Passport JWT login/profile at `/api/auth/login` and `/api/auth/me`; expose `/api/health`. Omit public registration and recovery. Validate inputs, normalize email, hash passwords, set expiry, and omit sensitive response fields.
2. Implement protected ownership boundaries and separate device credentials.
3. Implement the approved schema, session lifecycle, measurement/assessment rules, and exact domain routes from `lighting-device.md`. Enforce explicit session attribution, replay/idempotency, and invalid/stale data rules.
4. Apply reviewed SQL migrations and idempotent local seed; complete startup ordering and prove the full root install/start contract including repeat start preserving data/credentials. Test a separate account for ownership checks using isolated local test database configuration.
5. Add working usage examples and end-to-end tests for every new/changed public route.

Done when unit and database/HTTP tests prove auth success/failure/expiry, uniqueness, safe responses, cross-account rejection, migration/seed repeatability, selected domain transitions, and measurement edge cases. Explicit app/server typechecks must pass; Nest SWC compilation alone is insufficient. No domain test may target developer/cloud data implicitly.

## Phase 4: App integration and ESP32 firmware

UI owner: Astra XHigh. Firmware owner: GPT-6.1 Sol High. Run in parallel only with disjoint ownership or approved isolation. Shared API contracts must be settled first.

### UI preflight and implementation

The lead should use the handoff supplement at `C:/Users/ajapa/.codex/skills/handoff-ui-to-astra/SKILL.md`, overriding only its model effort with the user's XHigh choice. Send the original request/corrections, exact checkout/branch/parent, allowed app files, API contracts, current product decisions, verification commands, and the entire manifest from `docs/specs/visual-references.md` with stable IDs, absolute source paths, roles, and user-specified priorities. Repeat the full manifest on revisions; summaries and inherited attachments are insufficient.

Astra must read the actual files before editing:

- `C:/Users/ajapa/.agents/skills/design-taste-frontend/SKILL.md`
- `C:/Users/ajapa/.agents/skills/impeccable/SKILL.md`
- `C:/Users/ajapa/.agents/skills/emil-design-eng/SKILL.md`

From its assigned project cwd, run `C:/Users/ajapa/.agents/skills/impeccable/scripts/impeccable.cmd context --target app/src/app/index.tsx` once per UI-worker session on Windows, adjusting the target to its actual assigned route. Follow the launcher's applicable surface/native guidance and load its appropriate playbook. If it fails, announce the documented fallback before the next tool call and read existing project context directly. Immediately before the first UI edit, read Impeccable's `reference/craft-floor.md`; it is not required for this planning-only phase.

View actual pixels for every relevant manifest image through an image-capable tool; inspect corresponding HTML as source reference. Send a readiness report naming skill/reference files loaded, image IDs viewed, Operate surface mode, reference features to preserve, design direction, and access gaps. Stop only work dependent on an inaccessible required input and tell the lead. Do not replace user references with a generated image or make backend changes to disguise a missing interface.

Before relying on NativeWind, inspect current Expo 58/RN 0.88/React 19.3 compatibility and primary versioned guidance. In a bounded compatibility spike, verify installation/configuration, native/web styling, existing Reanimated/worklets compatibility, TypeScript className support, and export behavior. Record exact compatible versions and a minimal working screen. If compatibility is unresolved, report the limitation and get an explicit choice before substituting another styling stack; do not silently downgrade Expo or silently abandon NativeWind.

Replace visual starter screens/components/branding with private login, room management, manual module registration with generated ID/token, manual session start/stop, live three-channel assessment, history, and PDF report download using real API contracts. Remove newly unused tutorial assets/dependencies after checking callers, preserving supplied references/logo. Omit signup/recovery, fixture calculation, and multi-module aggregation. Provide loading, empty, error, disabled, success, offline/stale, token-expired, and invalid-reading states relevant to each flow. Preserve native navigation/safe areas, accessible controls, readable contrast, text scaling, keyboard/focus behavior, responsive web preview, and reduced-motion behavior. Keep motion purposeful and repeated actions immediate.

### Firmware implementation

Preserve existing I2C sensor/multiplexer hardware configuration and measurement timing unless the approved device spec changes them explicitly. Implement configured Wi-Fi/HTTPS, provisioned device credentials, active-session discovery, explicit session IDs in uploads, validated three-sensor readings, bounded retries/reconnects, and session-change handling exactly as `lighting-device.md` specifies. Keep deployment/Wi-Fi/device secrets outside tracked firmware. Document setup and recovery without claiming untested hardware calibration.

Done when app non-interactive checks/export pass and selected flows use the actual API without hidden mock data. Firmware should compile with the identified ESP32/library toolchain when available; otherwise identify the exact missing toolchain. Run non-interactive simulated-device contract tests. Report firmware compilation, simulated HTTPS proof, and physical sensor/network/TLS validation separately. Interactive/visual/hardware QA remains behind gate B.

## Phase 5: Non-interactive verification, Railway delivery, and account handoff

Owners: lead with GPT-6.1 Sol High backend/deployment/firmware verification support. This phase is part of implementation after gate A; gate B has not yet been reached.

1. Run whole-repo lint, Prettier check, explicit typechecks, meaningful unit tests, isolated database/HTTP tests, server production build, and Expo platform export. Review diffs against scope and contracts; report failures or skips honestly.
2. Recheck Railway identity and create/link the new `photometrix` project in the working user's workspace. Provision managed PostgreSQL and the Nest API using Railway CLI/plugin; leave unrelated projects unchanged.
3. Configure root workspace build/server production start, `/api/health`, Railway PORT, secret variables, and pre-deploy migration. Verify deployment health/logs before seeding.
4. Generate and provision the cloud account `photometrix@cpu.edu.ph`; seed idempotently without resetting an existing password unexpectedly. Verify local and cloud login and deliver their email/password credentials directly to the user, outside tracked files.
5. Run non-interactive cloud health/auth/profile/ownership smoke tests and the persisted assessment/history/PDF workflow. Use an authenticated HTTPS simulator to prove the device payload/session/retry contract against Railway. Point app configuration at the verified API URL and exercise API integration non-interactively.
6. Provide the concrete implementation, deployment URL, local/cloud credentials, root commands, firmware provisioning steps, route examples, check results, and remaining limits. Pause at gate B before any interactive browser/emulator/device QA or visual adjustments.

Done when local and deployed accounts work, persistence and ownership tests pass, the cloud assessment/PDF contract has non-interactive evidence, and the user has a reviewable running result. A simulator is API/network evidence, not physical ESP32 verification. No controlled-browser/emulator/device action is permitted while shared-resource confirmation is pending.

## Phase 6: Confirmed interactive QA and visual adjustments

Owners: Astra XHigh for UI review/corrections; GPT-6.1 Sol High for connected backend/firmware investigation. Start only after the user confirms gate B and the exact shared browser/device is identified.

1. Invoke `computer-use` for Chrome and/or `android-cli` for Android; use only the confirmed session/device. Exercise private login, room creation/editing, module registration/credential copying, manual start/stop, fresh/missing/stale readings, assessment, history/PDF, logout, and relevant error/recovery flows. Record actual screenshot/evidence paths.
2. Review against actual reference pixels and the full manifest. Apply Impeccable's bounded review: one batched inspection, one correction batch, and at most one confirmation round. Use Astra XHigh for UI changes; rerun checks relevant to corrections.
3. If equipment is available and confirmed, validate real ESP32 firmware, sensors, TLS/Wi-Fi recovery, and session transitions; otherwise state the hardware checks remain outstanding. Do not treat successful compilation or simulated HTTPS uploads as sensor, wiring, calibration, or physical-network verification.

Done when supported connected app flows have interactive evidence, visual deviations are resolved or disclosed, and hardware gaps are explicit. Signed native binaries and web hosting remain outside scope unless separately selected.

## Completion and integration

Keep implementation contracts in `docs/specs/` and execution outcomes in this plan or linked evidence. Create ADRs only for settled consequential choices, keep the root glossary focused on resolved domain language, and create individual local tickets if issue breakdown is needed. Before any worktree integration, present the finishing skill's choices and wait for the user. Do not silently commit the user's initial staged files.
