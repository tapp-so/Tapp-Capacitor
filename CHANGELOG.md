# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-03

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
- Plugin privacy manifest (`PrivacyInfo.xcprivacy`) covering the iOS bridge code.
- Example app (`example-app/`) demonstrating the API, including JavaScript-side cold- and warm-start link handling and a JitPack sync hook.
- Web stub: validates input and reports that Tapp is not supported on web.

### Known limitations

- Link handling is JavaScript-side only. The plugin does not intercept links natively; apps pass URLs to `shouldProcess` and `fetchLinkData` themselves.
- The web platform is not supported.
- Device-level end-to-end testing is pending before 1.0.0.
