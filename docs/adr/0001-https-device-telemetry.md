---
status: accepted
---

# HTTPS telemetry with a manually prepared firmware file

The user selected direct Wi-Fi/HTTPS communication with the cloud server instead of MQTT, and one main firmware file with editable device ID, server URL, SSID, and password placeholders instead of a device provisioning flow. This keeps the three-sensor integration understandable and manually deployable without adding a broker or provisioning service. The transport is implemented and the firmware compiles. Desktop HTTPS certificate/hostname verification and API simulation are recorded in [deployment evidence](../deployment.md); physical ESP32 operation remains unverified.

The planned HTTPS integration uses a separate per-device upload credential, bound to device identity, and validates the cloud server's TLS certificate and hostname. A device ID alone is not authentication, and user login tokens are not firmware credentials. The firmware file therefore also needs explicit credential and TLS trust configuration. An optional development `.env` preparation step may fill placeholders if useful; the device does not read a development `.env` at runtime.

Use bounded retries of the current sample with a stable identity so server ingestion can be idempotent; replace/discard it at the next 10-second acquisition deadline. Do not promise durable offline history: missed/discarded samples remain visible gaps. Require synchronized acquisition timestamps, reject delayed/future first uploads within the explicit bounds in the specification, and assess both acquisition and receipt age before displaying live results. Uptime and sample IDs do not establish acquisition time. This limits the initial firmware's storage and operational complexity while retaining transport validation and duplicate protection.

## Consequences

Operators must prepare/flash each device and update Wi-Fi/cloud/credential settings manually when they change. Real secrets must stay out of committed examples and logs; credential rotation/revocation and TLS trust-anchor updates remain operational responsibilities. Clock synchronization may be required before certificate validation, so time-sync failure can prevent uploads. No MQTT broker, captive portal, Bluetooth provisioning, or durable device history queue is part of this transport decision.

The user separately accepted one portable three-sensor module per session, manual start/stop, 10-second acquisition, complete/fresh live assessment, complete-sample PDF session summaries with historical target snapshots, app module registration, and a seeded private account. The implemented contract and validation boundaries are documented in [lighting-device.md](../specs/lighting-device.md). Software evidence does not establish physical sensor accuracy, calibration, or hardware operation.
