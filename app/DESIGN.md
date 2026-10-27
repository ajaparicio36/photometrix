# Photometrix native design

Status: UI implementation is present for the accepted product scope. Lint, typecheck, contract/transport tests, platform exports, and cloud API decoder checks are recorded in [implementation evidence](../docs/plans/implementation-evidence.md). Interactive visual QA and adjustments are paused pending shared-resource confirmation.

## Read before screen work

Read root `CONTEXT.md` for canonical terms and room targets. Read [lighting-device.md](../docs/specs/lighting-device.md) for measurement/device rules and [system.md](../docs/specs/system.md) for application/API contracts. Screens and their sample data cannot establish those rules. Surface any remaining engineering ambiguity rather than selecting a new product scope.

Read [the visual reference manifest](../docs/specs/visual-references.md) when building, changing, or reviewing a referenced screen. View its original image pixels; this document and the manifest do not replace the images. Follow `app/AGENTS.md` for Expo and navigation requirements.

## Product boundary and flows

Photometrix is a lighting illuminance assessment application. Present measured illuminance in lux (`lx`) against a room target. Attribute targets using the accepted domain contract; use certification or standards attribution only when that contract supplies evidence.

| Decision             | Accepted behavior                                                                                                          | UI consequence                                                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device/session model | One portable module with three sensors per session; manual start/stop; at most one active session per module and per room. | Select a room and available module for that session, then show its three channel outcomes. Modules have no permanent room pairing. Multiple modules do not contribute to one assessment.                                                    |
| Assessment scope     | Lux assessment, history, and PDF report.                                                                                   | Show the available readings, room target and below-target/meets-target result. Preserve historical target snapshots. Fixture calculation, uniformity and automatic control are outside this scope.                                          |
| Account model        | Seeded private access, using the account specified in system.md.                                                           | Provide sign-in/session restoration and sign-out. Registration and password recovery are outside this scope.                                                                                                                                |
| Module setup         | Create the module in the app and copy its generated device ID and one-time token into firmware.                            | Show the generated ID read-only after creation, with one-time copy/save feedback for the token. Later credential rotation uses the real API and explains firmware updates; ordinary detail/history responses cannot retrieve the raw token. |

The primary flow is sign-in -> rooms -> room/session setup with a selected module -> manual start -> live three-sensor measurement -> manual stop -> saved assessment -> history/PDF report. Module creation/setup is a supporting flow. Preserve back navigation and return to the changed parent after saving. Global tabs, if useful, must each lead to a complete supported destination; the sample Audit, Standard, and Compliance labels do not authorize extra screens.

Exclude HVAC and environmental metrics, automatic fixture control, baseline calibration, floorplan/topology tooling, and unsupported certification claims. Keep unrelated functionality out of forms and navigation.

## Visual direction

Use a quiet field-instrument interface: legible values first, compact metadata second, and amber accents for lighting. Preserve the reference composition and shared rounded cards while repairing overlapping text, cramped controls, and clipped meaningful labels.

The pale-lavender palette from the supplied HTML/frontmatter is the shared foundation. It matches most screen backgrounds and selected controls. Adapt the cooler dashboard/assessment references to that foundation rather than shipping two themes. The reference design's competing slate-neutral prose palette remains historical input; see the manifest for the conflict.

| Token            | Value                 | Use                                                                           |
| ---------------- | --------------------- | ----------------------------------------------------------------------------- |
| Canvas           | `#FAF8FF`             | Screen background                                                             |
| Surface          | `#FFFFFF`             | Cards and fields                                                              |
| Surface subtle   | `#F2F3FF`             | Nested telemetry and grouped fields                                           |
| Surface selected | `#E2E7FF`             | Selected segment or choice                                                    |
| Text             | `#131B2E`             | Headings and readings                                                         |
| Text secondary   | `#3E4850`             | Supporting copy                                                               |
| Border           | `#BEC8D2`             | Structural edges; soften visually through spacing rather than unreadable text |
| Action           | `#283044`             | Primary button with white text                                                |
| Lighting         | `#FEA619`             | Meter fill and lighting accents; use `#855300` for amber text                 |
| Pass             | `#006C49` / `#ECFDF5` | Text/icon and pale status background                                          |
| Warning          | `#9A3412` / `#FFF7ED` | Text/icon and pale warning background                                         |
| Error            | `#BA1A1A` / `#FFDAD6` | Text/icon and error background                                                |
| Link/focus       | `#006591`             | Links, focus indication, small brand accent                                   |

Use the actual `assets/images/photometrix-logo.png` with contain sizing and its original aspect ratio. Replace reference placeholder marks with that asset. The logo's cyan and green details do not introduce additional product domains.

Load real Inter and JetBrains Mono font assets through the native font setup. Use Inter for navigation, body copy, and form labels; JetBrains Mono for lux values, sensor identifiers, and restrained technical metadata. CSS font-family strings alone do not load native fonts. Keep font variants explicit and avoid synthetic weight assumptions.

Start with 24/30 heading, 20/26 section heading, 16/22 body/control, 13/18 secondary, and 32/38 telemetry value sizes. Small nonessential metadata may use 12/16; do not reproduce the references' tiny text for instructions, errors, or interactive labels. Keep units near their values and use tabular numerals to avoid jitter during updates.

Use a 4-unit rhythm, about 16 units of screen margin and card padding, 12-unit gaps, and 24-unit section spacing. Cards use 12-unit radii; controls use 8. Favor borders and flat surfaces; reserve subtle shadow for primary actions or genuinely floating content. Avoid decorative dashboard additions.

## Native components and interaction

Use React Native primitives styled with NativeWind and a small shared vocabulary: primary/secondary/destructive button, labeled field, status pill, surface card, sensor row, meter, and screen header. Reuse those components across supported screens. Expo Router owns navigation; non-route code stays outside `src/app/`.

This recommendation is outside the web-oriented `pick-ui-library` component list. Its DOM primitives, web toasts, and web chart packages are unsuitable substitutes for native controls. The existing native stack is sufficient; add a dependency only for an approved concrete requirement. A retained radial gauge may justify Expo-compatible `react-native-svg` after compatibility review, rather than a chart suite. Platform confirmations are sufficient for supported destructive actions.

Preserve useful selectors, numeric hierarchy, channel rows, summary strips, and restrained progress/gauge shapes. Remove sign-in/register, add/edit and lighting/HVAC segments when they have no meaningful supported choice. A live gauge represents the current complete three-sensor arithmetic mean in lux against the snapshotted room target; it is not a uniformity, coverage, or full-room quality score. Label individual readings separately. A saved assessment/report presents the session aggregate from lighting-device.md, its complete/incomplete sample counts and collection interval, distinct from the last live reading. Historical results remain historical rather than becoming stale live results. Gauge scales and markers must make the quantity and target explicit; a meets-target result establishes only that numerical comparison.

Actions show immediate pressed/disabled feedback. Submit once while pending, retain form values after recoverable errors, place field errors beside their fields, and announce submission results. Editing state must distinguish unsaved values from saved measurements. Use Archive room/module for supported lifecycle operations, naming the affected resource and explaining that history is preserved before confirmation. Surface active-session conflicts. There is no separate unpair action: a portable module is selected anew for each session. Credential rotation has its own explicit action and consequence; it is not a normal raw-token retrieval flow.

## Accessibility and layout

Phone portrait is the primary layout. Use safe-area insets, keyboard-aware forms, scrollable content, and enough bottom space for persistent actions/navigation. Larger screens may center a bounded layout or use columns where the same content benefits. Important values, room categories, action labels, and errors remain readable without ellipsis.

Provide at least 44-by-44-unit touch targets, accessible names/roles/states, logical screen-reader order, visible keyboard focus, and sufficient contrast. Combine status color with text and an icon. Support larger text without overlapping labels or controls. Do not disable font scaling to fit a mock.

Keep repeated actions and live updates immediate. Use subtle, interruptible transitions only when they explain state; respect reduced motion. Sensor readings must not trigger celebratory animation or repeated screen-reader announcements. Splash duration follows real initialization rather than a fake progress percentage.

## Real states

Implement states from real contracts: restoring session; submitting and validation/auth/network failure; loading lists; no rooms/sessions; no configured module; missing or archived resource; unavailable/partial sensor data; offline; stale; starting/stopping a session; module or room already active; acquiring assessment; insufficient readings; saving; archive/rotation success and failure; PDF generation/download success and failure; and supported mutations with retry. Copy-token feedback must reflect actual clipboard success; leaving one-time issuance must not imply the token can be viewed again later.

Unavailable data is not zero lux. Show a last-received timestamp when available, and separate connection state from assessment outcome. All three sensor readings must be valid and fresh before displaying a current assessment; use the sampling/freshness rules in lighting-device.md. Identify readings with their explicit session; changing the selected room must never relabel delayed readings from a previous session. Display only verified online counts, transport/version details, and sampling rates. Product copy should describe the actual state plainly rather than decorative security or telemetry claims.

## NativeWind compatibility gate

Read the installed Expo major and matching official docs before changing configuration. The initial investigation found SDK58 with RN0.88/React19.3, matching the [SDK58 version table](https://docs.expo.dev/versions/v58.0.0/). Recheck `package.json`; this observation is not a dependency pin.

Begin a bounded spike with the stable NativeWind v4 setup from its [official installation guide](https://www.nativewind.dev/docs/getting-started/installation). At investigation time, 4.2.7 used Tailwind3 and documented Expo57 support. Its docs did not establish SDK58 compatibility. [V5 installation](https://www.nativewind.dev/v5/getting-started/installation) documented a release candidate with a tested Expo57 target, not evidence that SDK58 works.

Before building screens, verify typed `className` on native View/Text/TextInput/Pressable, component discovery under `src/`, one root CSS import, conditional/pressed/disabled/focus styles, and actual font loading. Typecheck, lint, and non-interactive platform exports must pass. Inspect native runtime behavior after authorized device access. Report any concrete incompatibility and obtain a decision before an incompatible dependency/SDK change or prerelease migration; preserve the chosen Expo version during the spike.

## Implementation and review completion

The later UI worker uses Astra with xhigh reasoning, reads the actual handoff skill and all three required design skills, and views each applicable reference. Its readiness report identifies skills read, images viewed, chosen surface, direction, and access gaps before editing. This document does not replace that preflight.

Review against the accepted flow, original pixels, this palette, and domain contract. Acceptance requires the real logo, correct room targets, supported navigation, honest data and states, accessible small-phone/large-text layouts, and passing required checks. Report reference correspondence and intentional deviations.

Planning verification: reference pixels and starter source were inspected; no implementation, NativeWind installation, native rendering, or interactive QA has been performed. Graphical QA requires shared-resource confirmation and exact browser/device identification under repository instructions.
