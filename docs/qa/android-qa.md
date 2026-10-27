# Android device QA

Status: native development build installed and launched; connected phone QA is in progress. The user explicitly selected the Infinix phone, replacing the initial emulator target. Full functional and visual acceptance is not yet claimed.

## Authorized target and environment

- Phone: Infinix X6711, Android 14 / API 34, serial `112492539R101297`.
- Current runtime: `com.photometrix.app/.MainActivity`, native debug version 1.0.0 / code 1, min SDK 24 and target SDK 36.
- Existing Expo Go `host.exp.exponent`, version 58.0.5 / code 466, was neither replaced nor cleared.
- Project: Expo SDK 58.0.19. The installed native app connects to Metro on port 8081 and uses the deployed Railway HTTPS API.
- Owned root development server PTY: `83389`; API port 3000, Metro port 8081. Earlier owned servers on 8090 and the build-only 8081 server were stopped during consolidation.
- USB mapping: `adb -s 112492539R101297 reverse tcp:8081 tcp:8081`. A USB disconnection cleared earlier mappings; no unrelated mapping was explicitly removed.
- Android CLI 1.0.15985488, SDK `E:/Android/Sdk`; Android CLI handles layout/screenshots, and explicitly selected `adb` handles interaction.

An authorized Pixel 9a boot was already underway when the user switched targets. That owned emulator process exited before boot completed; no emulator or tablet was subsequently used. The Infinix is the sole interactive QA device.

## Initial Expo Go runtime blocker

| Field       | Observation                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Trigger     | Open the exact Photometrix development link in the existing Expo Go runtime.                                     |
| Actual      | Error overlay: `Cannot find native module 'ExpoCrypto'`, before the sign-in screen.                              |
| Source path | Eager `expo-crypto` import in `app/src/app/sessions/new.tsx:4`; the package requires native module `ExpoCrypto`. |
| Expected    | Photometrix initializes and reaches private sign-in.                                                             |
| Evidence    | `.local/qa/screens/01-missing-expo-crypto.png` and sanitized `.local/qa/layouts/01-launch.json`.                 |
| Impact      | Login, room/module/session flows, live states, history/PDF, and visual/accessibility review cannot proceed yet.  |

The issue was reported to the lead. The user then selected a native development build; the native build reaches sign-in without this Expo Go-specific error. No source workaround for ExpoCrypto was added. No QA records or device credentials were created before this blocker.

## Native Android build recovery

The user's native build hit `manifest 'build.ninja' still dirty after 100 tries` in Worklets. The exact failing manifest reproduced that loop with the default CMake 3.22.1 / Ninja 1.10.2, while the already-installed CMake 3.31.6 / Ninja 1.12.1 processed the same graph successfully. Diagnostics found no future timestamps or changing source glob; the older Ninja reported existing long prefab paths as missing. This matches [Expo's Windows long-path guidance](https://docs.expo.dev/troubleshooting/windows-long-paths/).

The durable fix adds SDK-compatible `expo-build-properties` 58.0.11 and a Windows-only `cmakeVersion: 3.31.6` selection in `app/app.config.js`. Other platforms retain their default. Expo prebuild regenerated native output; the pre-existing Gradle property values and user's Gradle 9.4.1 wrapper were verified unchanged apart from the generated CMake setting. No manual native-cache deletion, dependency downgrade, user-home Gradle setting, or UI source change was used.

Actual command from `app/`: `pnpm exec expo run:android --device 112492539R101297 --port 8081`. It completed `BUILD SUCCESSFUL in 3m 50s`, with 346 tasks, then installed/launched the native app. APK: `app/android/app/build/outputs/apk/debug/app-debug.apk`, 76,960,919 bytes; SHA-256 `04a9f431b7e866359bcd7ef74595e3de69699a9ef6239dcfecbadf67cf03e672`. The existing Expo Go data remained intact.

Config assertions verified Windows versus non-Windows toolchain selection and preservation of existing app identifier/plugins; app lint and typecheck passed. Build/diagnostic logs are under `.local/qa/build/`. Clean sign-in evidence is `.local/qa/screens/02-native-sign-in.png` and `.local/qa/layouts/02-native-launch.json`.

Root `pnpm start` was consolidated onto API 3000 and Metro 8081, preserving credentials and the cloud API URL. Metro's `/json/list` identifies the Infinix native package and its React Native C++ connection. A safer relaunch reused the active app after automatic review rejected a force-stop command; no force-stop occurred. Port 8081 was already free before the build, so no unrelated listener was terminated.

## Connected native checks completed

The native app passed required-password and incorrect-password validation, then signed in with the provisioned account against the deployed API. The empty Rooms and Modules states rendered correctly. The room form showed the expected target for all five categories: Classroom 500 lx, Computer Lab 300 lx, Offices 300 lx, Lecture hall/Auditorium 500 lx, and CAD Workstation 500 lx. Blank room and module names were rejected.

The UI created only explicitly simulated fixtures: room `SIMULATED Infinix QA 1027` (`9e3baccf-9b65-462e-9aa8-babedd77cbff`, CAD Workstation / 500 lx) and module `SIMULATED Infinix Module` (`c5e7fb81-f71e-43ff-9ed1-6e22a23cc7bf`). The one-time credential flow blocked Back and Done until acknowledgment, confirmed copying, presented the device ID as read-only text, and omitted the token from subsequent module details. No token screenshot or persisted token-screen layout was collected. A privately rotated credential is held only in ignored QA state for the upcoming simulator upload and must be revoked during cleanup.

Room details and measurement setup showed the correct 500 lx target, a selectable registered module, optional measurement-point notes, and a manual Start measurement action. The USB debugging connection changed to `offline` before the Start action was delivered; no session or simulated readings have been created yet. After the user reported reconnecting and unlocking the phone, the exact serial still returned `offline` and Android CLI independently reported it was not online. Device actions remain paused; global ADB restart and phone USB/power changes were not attempted. Evidence includes sanitized layouts `23-rooms-with-fixture.json` through `26-session-setup.json` under `.local/qa/layouts/`.

### USB transport diagnosis after further reconnection

The later host inventory changed from `offline` to no ADB transports at all. `adb devices -l` was empty, mDNS discovery was empty, and Windows `Get-PnpDevice -PresentOnly` contained no Infinix, Android, ADB, or MediaTek VID `0E8D` interface. Historical entries for the exact phone serial remained with `Unknown` status, indicating they were not presently enumerated. No connected USB device reported a descriptor error, and no emulator/QEMU process was active.

The only host ADB daemon (PID 48400) used `E:/Android/Sdk/platform-tools/adb.exe`, platform-tools 36.0.2 / ADB 1.0.41, listening on localhost 5037. PATH and `ANDROID_HOME` selected the same SDK; Android CLI had been called with this explicit SDK path. One authorized targeted `adb -s 112492539R101297 reconnect` returned `device not found`; the inventory remained empty three seconds later. A global daemon restart was not used because Windows itself no longer exposed the phone's USB interface. No phone reboot, USB/power setting, app data, build, or unrelated development process was changed.

The next specific physical check is a known data-capable cable connected directly to another PC USB port, followed by confirming the phone's USB debugging authorization prompt if it appears. The evidence cannot distinguish a cable, port, or phone-side USB problem; it does establish that rebuilding Photometrix cannot restore the missing Windows USB enumeration.

## Evidence handling and remaining work

Only Photometrix and required runtime/system UI are in scope. Screenshots/layouts containing passwords or one-time tokens are excluded. An initial screenshot overlapped a personal notification and was discarded immediately; the retained replacement contains no notification text or credentials.

After reconnection, verify session restoration/logout, room editing/archive, UI module rotation/archive, session lifecycle and conflicts, simulated complete/partial/zero/stale readings, history/raw pagination, PDF local sharing/viewing, and normal/enlarged-text rendering. Original phone font scale is 0.85 and has not been changed. Simulated HTTPS readings do not establish ESP32 hardware operation or calibration. Any modified font-scale setting and owned temporary mapping must be restored or explicitly handed off.
