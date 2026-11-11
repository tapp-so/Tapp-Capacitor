# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Example app disables Capacitor bridge logging (`loggingBehavior: 'none'`); README logging guidance corrected.
- Example app handles the Android cold-start launch URL only once during startup.

## [0.1.0-alpha.1] - 2026-11-11

First release published from GitHub Actions via npm trusted publishing (OIDC) with provenance. There are no code changes compared to `0.1.0-alpha.0`.

## [0.1.0-alpha.0] - 2026-11-03

### Added

- Initial release of the `tapp-capacitor-sdk` Capacitor plugin.
- TypeScript API: `start`, `url`, `handleTappEvent`, `shouldProcess`, `fetchLinkData`, and `fetchOriginLinkData`.
- Events `deferredLinkReceived` and `didFailResolvingURL`, with retained delivery until the first listener attaches.
- iOS Swift bridge (`CAPBridgedPlugin`), distributed through Swift Package Manager and CocoaPods.
- Android Kotlin bridge.
- Pinned native SDK versions:
  - iOS `Tapp` `1.1.23`
  - iOS `Tapp-Networking` `1.1.7`
  - Android `com.github.Tapp-so.Tapp-Android:Tapp-Native` `1.1.6`
- Requirements: iOS 15.0, Android minSdk 24, Capacitor 6, 7, and 8.
  - Capacitor 6 and 7 apps must raise their iOS deployment target and Android `minSdkVersion` to the minimums above.
- Plugin privacy manifest (`PrivacyInfo.xcprivacy`) declaring the data types the bundled Tapp SDK sends (Device ID, Product Interaction, Other Data Types), none linked to the user or used for tracking.
- Example app (`example-app/`) demonstrating the API, including JavaScript-side cold- and warm-start link handling and a JitPack sync hook.
- Web stub: validates input, reports that Tapp is not supported on web, and rejects with error codes (`INVALID_ARGUMENT`, `INVALID_URL`, `UNIMPLEMENTED`).
- Shared URL validation for `shouldProcess` and `fetchLinkData` on web, iOS, and Android: the URL is trimmed and must be an absolute URL with a scheme. `javascript:`, `data:`, and `file:` are rejected (case-insensitive) with `INVALID_URL`. The check runs before the started check.

### Changed

- iOS unit tests are no longer shipped in the npm package. `Package.swift` declares the test target only when `ios/Tests/TappCapacitorPluginTests` exists.

### Fixed

- `Package.swift` links Capacitor's Cordova product again, which Capacitor's public headers require.

### Known limitations

- Link handling is JavaScript-side only. The plugin does not intercept links natively; apps pass URLs to `shouldProcess` and `fetchLinkData` themselves.
- The web platform is not supported.
- The iOS bridge has been compiled with Xcode 27.2 for the iOS 27.2 simulator (Capacitor 8 with Swift Package Manager and Capacitor 7 with CocoaPods). Device tests are still pending.
- Device-level end-to-end tests are pending: deferred links, Universal Links / App Links, and cold and warm start.
