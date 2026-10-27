# Photometrix native app

Expo Router screens for the private lighting assessment workflow. Use the workspace commands in the [root README](../README.md) for installation and normal startup.

```powershell
pnpm start
# App only, from the repository root:
pnpm start:app
```

The native app uses Expo 58 / React Native 0.88, NativeWind 4.2.7 with Tailwind 3, and small React Native components. `react-native-css-interop` is an explicit dependency because NativeWind's Babel runtime must resolve through pnpm's isolated dependency layout. Babel, Metro, root CSS, and `src/` discovery are configured together. Android, iOS, and web exports pass; physical/native rendering remains a separate QA step. Added native modules require a compatible development build.

## API configuration

`EXPO_PUBLIC_API_URL` includes `/api`. The deployed API is `https://api-production-60e6d.up.railway.app/api`. This workspace's ignored `app/.env.local` points to it; root startup supplies the root `.env` value, which takes precedence. Restart Metro after changing this public setting.

For local development use `http://localhost:3000/api` on the desktop browser, `http://10.0.2.2:3000/api` on an Android emulator, or the computer's LAN address on a physical device. The backend must allow the actual web origin in CORS. No user or device secrets belong in an `EXPO_PUBLIC_` variable. Without a setting, the source fallback is local `http://localhost:3000/api`.

The provisioned email is `photometrix@cpu.edu.ph`. Environment passwords are delivered privately and remain in ignored configuration. There is no registration or password-recovery flow. User access tokens use Expo SecureStore on native. The web preview uses tab-scoped `sessionStorage`, which is browser storage rather than native secure storage. Expiration requires another sign-in. Logout clears the stored user token; active measurement sessions continue until explicitly stopped.

## Operator flow

1. Sign in. Create a room and select its category. Classroom, Lecture hall/Auditorium, and CAD Workstation use 500 lx; Computer Lab and Offices use 300 lx.
2. Register a module. Copy its generated immutable device ID and one-time token into the firmware, save them privately, and acknowledge before leaving. The app does not persist the raw device token. A lost issuance response requires reviewing the modules list and explicitly rotating the matching module's credential.
3. Open a room, choose a portable module, optionally document its three measurement positions, and start a session. The same idempotency key and normalized inputs survive an ambiguous in-screen retry; input editing stays locked until the result is known. Active-resource conflicts link to the existing session.
4. View the latest three sensor readings. A current assessment requires all three valid readings and both acquisition and receipt ages within 30 seconds. The client ages cached results between polls and includes request latency conservatively. An incomplete or stale latest sample never falls back to an earlier passing sample. Zero lux remains valid.
5. Stop and save. The historical assessment uses the server's equally weighted mean of complete sample means and snapshotted room/module names and target. No complete samples means insufficient data. Open raw samples, filter quality, and load subsequent pages.
6. Download the authenticated PDF. Native uses a share sheet or file preview; web starts a file download. The session-named native cache file remains available for a receiving app to finish reading and can be cleared by the operating system. Re-export overwrites that cache file.

Rooms and modules can be renamed or archived when inactive. Archive is terminal, preserves history, and revokes a module's credential. Credential rotation immediately invalidates its old token and requires a firmware update. None of these actions silently stop a measurement.

## Native Android build on Windows

From `app/`, run `pnpm exec expo run:android --device <ADB_SERIAL> --port 8081` after confirming that port is available. This builds and installs the separate `com.photometrix.app` debug application; it does not replace or clear Expo Go. A native build includes the project's native modules, including ExpoCrypto.

`app.config.js` selects Android SDK CMake 3.31.6 on Windows through Expo's supported `expo-build-properties` plugin. Its Ninja 1.12.1 handles the long pnpm dependency/build paths that made the default CMake 3.22.1 / Ninja 1.10.2 repeatedly regenerate `build.ninja`. Install CMake 3.31.6 in the Android SDK and keep Windows long-path support enabled. Other platforms retain their normal CMake default. After changing this setting in an existing generated project, run `pnpm exec expo prebuild --platform android --no-install` before the build; the native Gradle files remain generated output.

See [Expo's Windows long-path guidance](https://docs.expo.dev/troubleshooting/windows-long-paths/) for the toolchain requirement. No SDK or native-library version downgrade is required.

## Customization and verification

[DESIGN.md](DESIGN.md) defines the accepted design. Change reusable colors, explicit Inter / JetBrains Mono font families, sizes, and radii in `tailwind.config.js`; shared controls are in `src/components/ui.tsx`. The original logo is retained in `assets/images/photometrix-logo.png`. There are no simulated readings in the app.

```powershell
pnpm --filter app lint
pnpm --filter app typecheck
pnpm --filter app test
pnpm --filter app build
# Optional read-only cloud readback, using ignored provisioned credentials:
node app/scripts/check-api.mjs
```

Node 24 runs the contract/state and transport tests without a second test framework. Its module-autodetection warning is harmless; the Expo configuration remains CommonJS. Expo generates typed route declarations on its first development start. A fresh checkout can start Metro once before standalone typechecking; normal `pnpm start` does this.

The readback script exercises the actual app decoders against authenticated API responses, paginated raw samples, and PDFs. It prints counts only. Override `PHOTOMETRIX_CREDENTIALS` with an ignored credential JSON file and `EXPO_PUBLIC_API_URL` to use another provisioned environment. Backend mutation/ownership coverage lives under `server/`.

Interactive browser/emulator/device QA is intentionally pending until the user confirms the shared resource is available. Static exports do not verify navigation gestures, native layouts, font scaling, clipboard permissions, or share-sheet behavior. No physical sensor accuracy or calibration is claimed.
