# Tapp Capacitor SDK

`tapp-capacitor-sdk` wraps the native Tapp iOS and Android SDKs for Capacitor deep linking and attribution. Its TypeScript API starts Tapp, generates tracked links, sends events, and resolves incoming and deferred install links, including device match attribution.

> **Choose exactly one Tapp package.** Install `tapp-capacitor-sdk` OR `tapp-adjust-capacitor-sdk`, never both. This core package has no install guard. The Adjust package's Android Gradle guard fails the build with `Install exactly one of tapp-capacitor-sdk or tapp-adjust-capacitor-sdk.` iOS has no guard: both share an affiliate, and the last start wins. Co-installation is unsupported.

Current published version: `0.1.0-alpha.2`, an alpha pre-release. Interfaces may change before stable release.

## Integrating this SDK into an app

### Install

```sh
npm i tapp-capacitor-sdk@alpha @capacitor/app && npx cap sync
```

`@capacitor/app` is required for incoming-link forwarding and is not a declared plugin dependency. The current README install command omits both `@alpha` and `@capacitor/app`; use the command above. Pin `@capacitor/app` to the same major as the app's Capacitor version (for Capacitor 8, `@capacitor/app@8`).

To switch packages, uninstall the current Tapp package, install the other, then run `npx cap sync`.

### Requirements

| Requirement | Supported |
|---|---|
| Capacitor | 6, 7, 8; peer `@capacitor/core >=6.0.0 <9.0.0` |
| iOS | 15.0+ |
| Android | minSdk 24+ |
| Capacitor 6 toolchain | Node 18+ / JDK 17 |
| Capacitor 7 toolchain | Node 20+ / JDK 21 |
| Capacitor 8 toolchain | Node 22+ / JDK 21 / Xcode 26+ |

The plugin compiles to Java/Kotlin target 17. Standalone contributor builds use Capacitor 8 devDependencies and need Node 22+ / JDK 21.

Set iOS 15.0 in the app target and, for CocoaPods, `platform :ios, '15.0'` in `ios/App/Podfile`. Set `minSdkVersion = 24` or higher in `android/variables.gradle`. Older Capacitor defaults need raising.

For Capacitor 7 + Xcode 27 or later, merge this hook into `ios/App/Podfile`, keeping `assertDeploymentTarget(installer)` (see [README](README.md)):

```ruby
post_install do |installer|
  assertDeploymentTarget(installer)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    end
  end
end
```

### Differs from the other Tapp wrappers

> - `env` is the string `'PRODUCTION' | 'SANDBOX'`; Flutter uses `EnvironmentType`.
> - `shouldProcess` returns `Promise<{ value: boolean }>`; RN Adjust returns a synchronous boolean.
> - Incoming URLs come from `@capacitor/app`; Flutter needs `app_links`, and RN uses `Linking`.
> - Core has no mechanical co-install guard; Adjust Android has one, and Flutter/RN have none.
> - iOS supports SPM and CocoaPods; Flutter/RN are CocoaPods-only today.

### iOS Universal Links

The Tapp link host (`HOST` below) comes from the Tapp dashboard for this app; it is a host, not a URL.

1. In Xcode, open the app target → Signing & Capabilities → Associated Domains, and add `applinks:HOST` (no scheme or path). That creates or updates the `.entitlements` file.
2. Confirm `CODE_SIGN_ENTITLEMENTS` on the app target points at that file for every build configuration.
3. Match the dashboard's Apple team ID and bundle identifier to the app. Tapp hosts `https://HOST/.well-known/apple-app-site-association`; its `appID` is `<TeamID>.<bundleId>`. The Apple CDN must serve the same association.
4. Test Universal Links on a physical device, not the simulator.

### Android App Links

On the launcher activity in `android/app/src/main/AndroidManifest.xml`, use the same Tapp link host:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="HOST" />
</intent-filter>
```

Tapp hosts `https://HOST/.well-known/assetlinks.json`. Configure the application ID and the distributed build's **SHA-256 certificate hash** (also called **SHA-256 signing certificate hash**) in the dashboard.

### iOS dependency managers

SPM product `TappCapacitorSdk` is the default and recommended path on Capacitor 8. CocoaPods pod `TappCapacitorSdk` is also supported. CocoaPods trunk becomes read-only on 2 December 2026.

In CocoaPods mode only, put both sources in `ios/App/Podfile`, Specs first, then CDN. Declaring a source removes the implicit trunk source:

```ruby
source 'https://github.com/tapp-so/Specs.git'   # must be first
source 'https://cdn.cocoapods.org/'
```

This block is recommended now and required from the first wrapper release that pins a native version published after 2 December 2026.

### Android repositories

Add JitPack to the repositories the app actually uses: `allprojects.repositories` in `android/build.gradle` OR `dependencyResolutionManagement.repositories` in `android/settings.gradle` / `settings.gradle.kts`.

```groovy
maven { url 'https://jitpack.io' }
```

Kotlin DSL equivalent:

```kotlin
maven { url = uri("https://jitpack.io") }
```

### Initialize and forward links

Load `authToken` and `tappToken` from environment/configuration, never literals in source. `authToken` is the authentication token issued for this app in the Tapp dashboard; `tappToken` is the Tapp application token issued for the same app. They are different values. Inject them at build time (for example `import.meta.env`), never commit them. `env` must be `'PRODUCTION' | 'SANDBOX'` and must match the environment those tokens were issued for.

Call order: register listeners first, call `Tapp.start({ authToken, env, tappToken })` and await completion, then handle the launch URL. Events emitted before a Tapp listener attaches are retained. Register `appUrlOpen` BEFORE `getLaunchUrl()`; queue URLs received during startup until `start()` completes.

The plugin does not hook `AppDelegate` or `Activity`. The app must forward URLs from JavaScript through `@capacitor/app`.

```ts
import { App } from '@capacitor/app';
import { Tapp } from 'tapp-capacitor-sdk';
import type { TappLinkData, TappStartOptions } from 'tapp-capacitor-sdk';

// App callbacks receive data only after the error flag has been checked.
async function initializeTapp(
  config: TappStartOptions, // supplied by the app's environment/configuration
  route: (data: TappLinkData) => void,
  reportFailure: () => void, // show a safe message without logging credentials
): Promise<void> {
  let started = false;
  const pending: string[] = [];
  const seen = new Set<string>();
  const consume = (data: TappLinkData): void => {
    if (data.error) { reportFailure(); return; }
    route(data);
  };
  const handle = async (url: string): Promise<void> => {
    if (seen.has(url)) return;
    seen.add(url);
    try {
      const { value } = await Tapp.shouldProcess({ url });
      if (value) consume(await Tapp.fetchLinkData({ url }));
    } catch {
      reportFailure(); // e.g. INVALID_URL rejects, even before start()
    }
  };

  await Tapp.addListener('deferredLinkReceived', consume);
  await Tapp.addListener('didFailResolvingURL', () => reportFailure());
  await App.addListener('appUrlOpen', ({ url }) => {
    if (!started) pending.push(url);
    else void handle(url);
  });
  const { authToken, env, tappToken } = config;
  await Tapp.start({ authToken, env, tappToken });
  started = true;
  for (const url of pending.splice(0)) await handle(url);
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handle(launch.url);
}
```

Call `initializeTapp` once at app startup (for example from `main.ts`). `route` should navigate using `data.tappUrl` / `data.influencer`; `reportFailure` should show a safe message and must not log credentials. Keep listener handles for cleanup when appropriate. Android cold launch may deliver the same URL through both mechanisms; keep a `Set` of already-handled URL strings and skip repeats.

For each URL: `shouldProcess` → if `value` is true, `fetchLinkData` → always check `data.error`. `shouldProcess` works before `start()`. With valid input, `fetchLinkData` / `fetchOriginLinkData` before startup resolve `{ error: true, message }`; they do not reject for missing startup. Invalid URLs reject `INVALID_URL` even before startup. `fetchOriginLinkData()` takes no URL.

### Errors → fix

See [docs/errors.md](docs/errors.md) for the error catalog.

| Result / code | Cause and fix |
|---|---|
| `INVALID_ARGUMENT` rejection | Check required tokens, environment, influencer, or event action for the method. |
| `INVALID_URL` rejection | Supply a nonblank URL with a scheme; blocked schemes include `javascript:`, `data:`, `file:`. |
| `NOT_STARTED` rejection | Await `start()` before `url()` / `handleTappEvent()`. |
| `{ error: true, message }` | Link-data failure or missing startup; inspect `error` before routing. |
| `START_ERROR` / `URL_ERROR` / `HANDLE_EVENT_ERROR` | SDK failure; check configuration and the method-specific README behavior. Startup/event codes apply on Android. |
| `UNIMPLEMENTED` rejection | Web `url()` / `handleTappEvent()`; test native functionality on iOS/Android. |

### Common mistakes

- Also installing `tapp-adjust-capacitor-sdk`. Confirm it is absent with `npm ls tapp-adjust-capacitor-sdk`.
- Missing `@capacitor/app` or JS URL forwarding.
- Missing entitlement or unwired `CODE_SIGN_ENTITLEMENTS`.
- Missing Android `autoVerify`, `VIEW`, `DEFAULT`, `BROWSABLE`, `https`, or host.
- Environment/token mismatch or hard-coded tokens.
- Testing Universal Links on a simulator or putting a scheme/path in `applinks:`.
- Putting the CocoaPods CDN before Specs, or omitting the CDN.
- Calling `url()` / `handleTappEvent()` before `start()` completes.
- Using link-data results without checking `data.error`.

### Logging and credentials

Set `loggingBehavior: 'none'` in `capacitor.config.ts` so Capacitor does not log plugin arguments, including tokens, in logcat / Xcode. Never use `'production'` in an app that passes credentials. The default `'debug'` also exposes arguments in debug builds. This controls bridge logging, not native SDK logs.

Never log `authToken`, `tappToken`, or other credentials. Keep secret values out of source, docs, command lines, and logs.

### How to verify

The intended commands are `npx tapp-capacitor-sdk doctor` and `npx tapp-capacitor-sdk doctor --json`. **Neither is available in `0.1.0-alpha.2`; the doctor is planned for `0.1.0-alpha.3`.** Do not treat them as current verification commands.

Until then, manually check the entitlement, `CODE_SIGN_ENTITLEMENTS`, Android intent filter, JitPack, minSdk 24+ / iOS 15.0+, installed `@capacitor/app`, and that awaited `start()` plus launch/warm-link wiring exist. Test native link delivery on a physical device and inspect `data.error`.

## Working on this repo

### Layout

- `src/definitions.ts`: public types; `src/index.ts`: plugin registration/exports; `src/web.ts`: web fallback.
- `ios/Sources/` and `android/src/main/`: native bridges and mappings.
- `src/__tests__/`, `ios/Tests/`, `android/src/test/`: existing tests.
- `example-app/src/main.ts`: interactive Vite/TypeScript example and URL forwarding.
- `Package.swift`, `TappCapacitorSdk.podspec`, `android/build.gradle`: dependency declarations.

### Safe commands

These existing package scripts are available; choose checks appropriate to the change:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:android
npm run verify:ios
```

`build` regenerates `dist/`; native checks require the relevant platform/toolchain. For docs-only edits, check content, links, line counts, and diff scope without regenerating artifacts.

Do not publish, run `npm publish` or `pod trunk`, push, tag, or open a PR unless explicitly authorized. Do not edit native SDK repos (`Tapp-iOS`, `Tapp-Networking-iOS`, `Tapp-Adjust-iOS`).

### Generated files and pins

`dist/` is generated by the build; do not edit it by hand. Native example projects under `example-app/ios/` and `example-app/android/` are ignored; the example's sync hook adds JitPack and warns about low minSdk without changing it.

Keep iOS pins aligned in `Package.swift` and `TappCapacitorSdk.podspec`: Tapp `1.1.24`, Tapp-Networking `1.1.7`. Android pins `com.github.Tapp-so.Tapp-Android:Tapp-Native:1.1.6` in `android/build.gradle`.

### Rules for contributors and agents

- Use “device match” terminology and “SHA-256 certificate hash”.
- Never hard-code or log tokens, including through Capacitor bridge logging.
- Keep docs-only changes free of runtime changes; preserve API signatures and emitted JavaScript.
- Keep this file at or under 250 lines. Follow the task's allowed file scope.
