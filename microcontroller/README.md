# Prepare a Photometrix lighting module

`microcontroller.ino` is the only firmware source file. It runs on an ESP32 Dev Module with three BH1750 sensors behind a TCA9548A. It sends raw readings directly to the cloud API over verified HTTPS; the server computes assessments. No MQTT broker, relay control, phone-to-device provisioning, or runtime `.env` loader is required.

## Instructor preparation

1. Sign into the correct cloud environment in the app. Create a portable lighting module. Copy its generated device ID and **one-time device token** privately; these are different from the user's login credentials. A lost token must be rotated in the app. Rotation invalidates the old token and requires updating/reflashing the module.
2. Make a private student copy of this folder. Fill the four per-module placeholders in the clearly marked constants block: `WIFI_SSID`, `WIFI_PASSWORD`, `DEVICE_ID`, and `DEVICE_TOKEN`. The cloud origin and public root CA are already filled in. Keep real secrets out of tracked repository files, screenshots, and shared logs. Distribute each prepared file privately to the assigned students; do not reuse a device token across physical modules.
3. Keep `SERVER_BASE_URL` set to the verified cloud **origin**, [https://api-production-60e6d.up.railway.app](https://api-production-60e6d.up.railway.app), without `/api`, query, port override, or another path. Plain HTTP/local emulator URLs are not accepted by this firmware. Change the origin only when moving to another verified deployment.
4. Keep the prefilled ISRG Root X1 PEM in `SERVER_ROOT_CA`. The maintenance procedure below applies if the deployment's trust chain changes. Keep the `R"PEM(` / `)PEM"` delimiters intact. Until the private module/Wi-Fi placeholders are replaced, the sketch fails closed with a configuration message and makes no uploads.
5. Compile for the exact ESP32 board variant before handing out the prepared source. The commands below compile only; flashing and physical checks require the actual board and an explicitly available device.

An optional desktop preparation tool could replace constants from a private `.env`, but none is needed here. The ESP32 cannot read the developer computer's `.env` after flashing. Never put a user JWT into `DEVICE_TOKEN`.

## TLS trust and clock

On 2026-10-27, an independent desktop Node TLS client verified `api-production-60e6d.up.railway.app` with hostname verification and only the embedded root CA (`rejectUnauthorized: true`). The verified chain was `*.up.railway.app -> Let's Encrypt YE2 -> Root YE -> ISRG Root X2 -> ISRG Root X1`; the HTTPS health route returned 200. The embedded root matches the [official ISRG Root X1 publication](https://letsencrypt.org/certs/isrgrootx1.pem), with a valid self-signature, validity from 2015-06-04 through **2035-06-04 11:04:38 UTC**, and SHA-256 fingerprint:

```text
96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6
```

This is desktop trust-chain evidence, not proof of an ESP32 connection. The root certificate is public trust material, not a secret. For a future deployment/CA update, verify the hostname's chain using a current trusted desktop TLS client, identify its root, and obtain that root PEM from the CA's official repository. With OpenSSL available, inspect the connection using `openssl s_client -connect HOSTNAME:443 -servername HOSTNAME -showcerts -verify_return_error -verify_hostname HOSTNAME`; a server usually omits the root from the transmitted chain, so do not mistake the first/leaf certificate for the root. Confirm the downloaded root's subject, fingerprint and validity against the CA publication, then verify the chain with that CA before copying it into firmware. Never copy certificates from an unverified network prompt or use an insecure TLS mode.

Railway may renew a leaf certificate or change its issuing chain. Ordinary renewals under the same root do not require leaf pin updates; a changed/expired root does require distributing and reflashing an updated prepared file. The instructor owns this trust-anchor maintenance. Keep the actual hostname in `SERVER_BASE_URL`: core HTTPClient/NetworkClientSecure use it for DNS, SNI and certificate hostname verification. Redirects are disabled so a credential is never forwarded to another origin.

Uploads wait for a successful SNTP synchronization using `pool.ntp.org` or `time.google.com`. Wi-Fi must have Internet/DNS access and permit NTP (UDP 123) plus HTTPS (TCP 443); a captive portal or enterprise login flow is not implemented. Failed synchronization is retried at bounded intervals. Time is refreshed by the core's SNTP service, and a synchronization older than six hours blocks uploads until refreshed. NTP is operational clock synchronization, not physical proof of when a measurement was taken.

## Wiring to verify before power

| Connection | Intended mapping |
| --- | --- |
| ESP32 SDA / SCL | GPIO21 / GPIO22 to TCA upstream SDA / SCL |
| Multiplexer | Address `0x70`; verify straps on the actual board |
| Sensor 1 | TCA **SD0 -> SDA**, **SC0 -> SCL**, BH1750 `0x23` |
| Sensor 2 | TCA **SD1 -> SDA**, **SC1 -> SCL**, BH1750 `0x23` |
| Sensor 3 | TCA **SD2 -> SDA**, **SC2 -> SCL**, BH1750 `0x23` |
| Address / ground | Confirm each BH1750 ADDR low/default `0x23`; common ground |

The supplied circuit illustration was inspected, but is not a verified schematic. It calls both downstream SDA and SCL “SCx” and appears to join downstream sensor buses. Each channel needs its own **pair** of SDn/SCn lines; do not join all same-address sensors onto one downstream bus. The image's 5 V statements also conflate breakout supply and logic levels: verify each exact board's regulator, pullups and level shifting from its schematic. ESP32 GPIO must not receive 5 V pullups. Confirm power polarity, supply stability, cable length, combined I2C pullups and ADDR straps before powering equipment.

## Build and checks

Target/toolchain is Arduino CLI **1.5.1**, Espressif Arduino ESP32 core **3.3.12**, and `esp32:esp32:esp32` (ESP32 Dev Module). WiFi, HTTPClient, NetworkClientSecure, Wire, SNTP and cJSON come from that core/its ESP-IDF SDK. No separately installed BH1750 or ArduinoJson library is needed. The configured commands select default MTreg 69 and one-time high-resolution mode; the [BH1750 1.3.0 implementation](https://github.com/claws/BH1750/blob/1.3.0/src/BH1750.cpp) and [mode definitions](https://github.com/claws/BH1750/blob/1.3.0/src/BH1750.h) document the raw/1.2 conversion and maximum 180 ms conversion time used here.

From the repository root, with Arduino CLI on PATH:

```powershell
# First-time toolchain setup, only if not already installed:
arduino-cli core update-index --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core install esp32:esp32@3.3.12 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json

# Compile; this does not flash or open a serial port:
arduino-cli compile --fqbn esp32:esp32:esp32 --warnings all ./microcontroller

# Optional noninteractive host check; requires Node and g++ (or CXX):
node ./microcontroller/check-firmware.mjs
```

The host check compiles the actual `.ino`'s pure encoding/validation/deadline functions, checks finite/zero/missing/saturated readings, invalid IDs, payload bounds, retry classifications and uptime wrap, and parses the emitted JSON against the device payload shape. It does not simulate the Wi-Fi/TLS stack or sensors.

Final verification on 2026-10-27: the exact sketch with the prefilled cloud origin and ISRG Root X1 CA compiled with Arduino CLI 1.5.1, ESP32 core 3.3.12, `esp32:esp32:esp32`, and `--warnings all` without reported warnings. It used 1,075,700 bytes (82%) of the default application partition and 51,880 bytes (15%) of global RAM. The Node host check passed using MinGW g++ 15.2.0 with `-Wall -Wextra -Werror`. A strict desktop TLS connection using the URL and PEM extracted from the actual `.ino` also passed. Compilation and desktop TLS verification do not establish a physical ESP32 cloud connection.

## What students operate

Start a session in the app for a room and this module; only one active session is allowed per room/module. The firmware first requests `GET /api/device/active-session` with its device bearer token, then captures a sample for that explicit session. No active session means no measurement upload. Stop the session in the app to freeze its history/report. Moving the module never permanently pairs it to a room.

Each nominal 10-second cycle reinitializes all three sensors, starts one-time measurements, waits 180 ms, and reads each independent channel. Missing/short I2C reads and raw `0xFFFF` saturation become JSON `null`; a true zero is `0`. With this fixed measurement mode the largest usable numeric output is below 54,612.5 lx, despite the API's broader 65,535 lx protocol ceiling. This is not an accuracy or calibrated-range claim. Recovery is attempted next cycle, including sensors absent at startup. Sampling is sequential and network/DNS delays can extend the nominal cadence.

`POST /api/device/measurements` contains only `deviceId`, `sessionId`, random-boot-plus-counter `sampleId`, 32-bit `uptimeMs`, synchronized UTC `sampledAt` and the three nullable sensor lux values. It never supplies an authoritative average/target/result. A retry preserves the identical encoded payload. There is one in-memory pending sample, at most three attempts with bounded backoff, and no durable offline queue. A new attempt needs a full request budget plus margin left before the 10-second sample deadline; expired/disconnected samples are discarded as gaps. Core HTTPClient owns HTTP framing, chunked decoding and status handling. A small response sink bounds JSON to 2 KiB and rejects body delivery after the request budget. Connect/read/handshake and I2C operations have finite timeouts. DNS/TLS scheduling can extend a cycle: this is bounded best-effort acquisition, not a hard real-time guarantee, and late data is also rejected by the server acquisition-time contract.

Serial diagnostics at 115200 show only operational states, HTTP status and an allowlisted machine error code; they do not print credentials or raw server messages. Keep the Arduino **Core Debug Level: None**; verbose core HTTP debugging can expose authorization headers. HTTP 401 stops device requests until the token/configuration is corrected and firmware restarted. Invalid payload, closed-session and ownership errors discard that sample; the next cycle refreshes assignment. `SAMPLE_TIME_INVALID` requests clock resynchronization. HTTP 429 discards the current sample and respects numeric Retry-After (bounded to one hour); transient transport/5xx failures can retry within the current window. Refreshing an assignment never reassigns an older pending sample.

## Verification boundary

No flashing, connected-device interaction, wiring validation, sensor comparison/calibration, real ESP32 Wi-Fi/TLS recovery test, or field measurement has been performed. Compilation, host checks and the independent desktop trust-chain verification cannot establish those properties. Before trusting field results, verify the exact boards/wiring, placement and working-plane procedure, compare against an appropriate reference lux meter, and exercise missing-sensor, Wi-Fi/NTP outage, certificate failure, rotated credential and session-stop races on explicitly available equipment.
