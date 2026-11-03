# Tapp Capacitor SDK

`tapp-capacitor-sdk` is a Capacitor plugin for Tapp deep linking and attribution. It exposes one TypeScript API and wraps the native Tapp iOS SDK and Tapp Android SDK. Use it to start Tapp, generate tracked Tapp links, send events, and resolve incoming and deferred (install) links from a Capacitor app.

## Requirements

| Requirement | Supported |
|---|---|
| Capacitor | 6, 7, 8 (peer `@capacitor/core` `>=6.0.0 <9.0.0`) |
| iOS | 15.0+ |
| Android | minSdk 24+ |

Capacitor 8 defaults already meet these minimums. Apps on older Capacitor versions must raise their minimums:

| App Capacitor version | iOS deployment target | Android `minSdkVersion` |
|---|---|---|
| 8 | Already 15.0+ | Already 24+ |
| 7 | Raise from 14.0 to **15.0** | Raise from 23 to **24** |
| 6 | Raise from 13.0 to **15.0** | Raise from 22 to **24** |

Where to change them:

- **iOS (CocoaPods):** `ios/App/Podfile` — `platform :ios, '15.0'`
- **iOS (Xcode / Swift Package Manager):** select the app target, then Build Settings → iOS Deployment Target → `15.0`
- **Android:** `android/variables.gradle` — `minSdkVersion = 24`

## Installation

```sh
npm install tapp-capacitor-sdk
npx cap sync
```

### iOS

The plugin supports both Swift Package Manager (SPM) and CocoaPods:

- SPM product: `TappCapacitorSdk`
- CocoaPods pod: `TappCapacitorSdk`

SPM is the default for new Capacitor 8 apps and is the recommended path. The CocoaPods trunk becomes read-only on 2 December 2026, so prefer SPM for new integrations and when you upgrade an existing app.

### Android

The Tapp Android SDK is published through JitPack. Add JitPack to the repositories used by your app. In `android/build.gradle`:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

If your project declares repositories in `android/settings.gradle` through `dependencyResolutionManagement`, add `maven { url 'https://jitpack.io' }` to that `repositories` block instead.

The example app automates this step. Its `capacitor:sync:after` hook runs `scripts/ensure-jitpack.mjs`, which adds JitPack to `allprojects.repositories` after `mavenCentral()` when it is missing. The script does not change `minSdkVersion`; it warns if the value is below 24.

## Native SDK versions

The plugin pins these native SDK versions:

| Platform | Dependency | Version | Pin |
|---|---|---|---|
| iOS | `Tapp` | 1.1.23 | SPM `exact: "1.1.23"`; CocoaPods `= 1.1.23` |
| iOS | `Tapp-Networking` | 1.1.7 | SPM `exact: "1.1.7"`; CocoaPods `= 1.1.7` |
| Android | `com.github.Tapp-so.Tapp-Android:Tapp-Native` | 1.1.6 | Gradle `implementation` |

## Quick start

```ts
import { Tapp, EventAction } from 'tapp-capacitor-sdk';

// Initialize once at app startup. Later calls are no-ops.
await Tapp.start({
  authToken: AUTH_TOKEN, // load from your configuration, not from source control
  env: 'PRODUCTION',
  tappToken: TAPP_TOKEN,
});

// Listen for deferred links and resolution failures.
// Events emitted before a listener attaches are retained.
await Tapp.addListener('deferredLinkReceived', (data) => {
  console.log('Deferred link:', data);
});
await Tapp.addListener('didFailResolvingURL', ({ url, error }) => {
  console.warn('Could not resolve', url, error);
});

// Generate a tracked link.
const { url } = await Tapp.url({
  influencer: 'creator_name',
  adGroup: 'spring_campaign',
  creative: 'video_a',
  data: { campaign: 'launch' },
});

// Send a standard event with flat metadata.
await Tapp.handleTappEvent({
  eventAction: EventAction.TAPP_PURCHASE,
  metadata: { currency: 'EUR', price: 10.34 },
});

// Send a custom event.
await Tapp.handleTappEvent({
  eventAction: EventAction.CUSTOM,
  customValue: 'onboarding_completed',
});
```

## Handling links

The plugin does not hook the native `AppDelegate` or `Activity`. Your app passes incoming URLs to the SDK from JavaScript, using the `App` plugin from `@capacitor/app` (install it in your app).

- **Cold start:** `App.getLaunchUrl()` returns the URL that launched the app.
- **Warm start:** `App.addListener('appUrlOpen', …)` receives URLs while the app is running.

For each URL, call `shouldProcess` first. If it returns `true`, call `fetchLinkData`. Call `start()` before handling links.

```ts
import { App } from '@capacitor/app';
import { Tapp } from 'tapp-capacitor-sdk';

async function handleIncomingUrl(url: string): Promise<void> {
  try {
    const { value } = await Tapp.shouldProcess({ url });
    if (!value) return;

    const data = await Tapp.fetchLinkData({ url });
    if (data.error) {
      console.warn('Link resolution failed:', data.message);
      return;
    }
    // Route the user using data.tappUrl, data.influencer, data.data, etc.
    console.log('Link data:', data);
  } catch (error) {
    // Invalid input (for example, an empty URL) rejects with code INVALID_URL.
    console.error('Incoming URL failed:', error);
  }
}

// After Tapp.start(). Register the warm-start listener before reading the launch URL
// so a URL that arrives during the lookup is not missed.
await App.addListener('appUrlOpen', (event) => {
  void handleIncomingUrl(event.url);
});

const launch = await App.getLaunchUrl();
if (launch?.url) {
  await handleIncomingUrl(launch.url);
}
```

A resolved `fetchLinkData` result can still be a failure (`error: true`). Always check `error` before using the payload.

## Deferred links and events

The plugin emits two events:

- **`deferredLinkReceived`** — delivers a `TappLinkData` payload when Tapp resolves a deferred (install) link. On iOS, the payload has no `deepLink` field. On Android, it may include `deepLink`.
- **`didFailResolvingURL`** — delivers `{ url: string; error: string }` when Tapp cannot resolve a URL.

Native events are retained until the first listener attaches (Capacitor `retainUntilConsumed`). Attaching listeners after `start()` is therefore safe, and a deferred link received during startup is still delivered.

Remove listeners with the handle returned by `addListener`, or remove all plugin listeners with `Tapp.removeAllListeners()`.

## API reference

All methods are on `Tapp`. Types are exported from `tapp-capacitor-sdk`.

### `start(options: TappStartOptions): Promise<void>`

Initializes the SDK. `authToken`, `tappToken`, and `env` (`'PRODUCTION'` or `'SANDBOX'`) are required. The first successful call initializes the SDK; later calls resolve without doing anything.

### `url(options: TappUrlOptions): Promise<{ url: string }>`

Generates a Tapp link.

- `influencer` (required, nonempty)
- `adGroup?: string`
- `creative?: string`
- `data?: Record<string, string>` — non-string values are dropped.

### `handleTappEvent(options: TappEventOptions): Promise<void>`

Sends an event.

- `eventAction: EventAction` (required) — `EventAction.CUSTOM` or a standard event from the table below.
- `customValue?: string` — the event name used with `EventAction.CUSTOM`.
- `metadata?: TappMetadata` — flat metadata. Invalid values are dropped (see below).

### `shouldProcess(options: { url: string }): Promise<{ value: boolean }>`

Returns whether Tapp should process a nonempty URL. This method has no `{ error: true }` payload; invalid input rejects with `INVALID_URL`.

### `fetchLinkData(options: { url: string }): Promise<TappLinkData>`

Resolves link data for a URL. SDK and backend failures resolve with `{ error: true, message }`. Invalid input rejects with `INVALID_URL`.

### `fetchOriginLinkData(): Promise<TappLinkData>`

Resolves the original install link data. SDK and backend failures resolve with `{ error: true, message }`.

### `addListener('deferredLinkReceived' | 'didFailResolvingURL', fn)`

Subscribes to the events described in [Deferred links and events](#deferred-links-and-events). Returns a `PluginListenerHandle`.

### `removeAllListeners(): Promise<void>`

Removes all listeners added through this plugin.

### `TappLinkData`

| Field | Type | Notes |
|---|---|---|
| `error` | `boolean` | `true` when resolution failed |
| `message?` | `string` | Failure description, when available |
| `tappUrl?` | `string` | Resolved Tapp URL |
| `attrTappUrl?` | `string` | Attribution Tapp URL |
| `influencer?` | `string` | Influencer associated with the link |
| `data?` | `Record<string, string>` | Custom string data attached to the link |
| `isFirstSession?` | `boolean` | Whether this is the first session |
| `deepLink?` | `string` | Original deep link; omitted on iOS |

Optional fields are omitted when unavailable.

### Errors

Errors reject with a `code`:

| Code | Raised by | Meaning |
|---|---|---|
| `INVALID_ARGUMENT` | `start`, `url`, `handleTappEvent` | Missing or invalid credentials, `env`, `influencer`, or `eventAction` |
| `INVALID_URL` | `shouldProcess`, `fetchLinkData` | URL is empty or not a valid URL |
| `URL_ERROR` | `url` | Link generation failed |
| `NOT_STARTED` | `url`, `handleTappEvent` (iOS and Android) | `start()` has not completed |
| `START_ERROR` | `start` (Android) | The native SDK failed to initialize |
| `HANDLE_EVENT_ERROR` | `handleTappEvent` (Android) | The native SDK failed while sending the event |

On iOS and Android, `fetchLinkData` and `fetchOriginLinkData` called before `start()` resolve with `{ error: true, message }` instead of rejecting. `shouldProcess` works before `start()`. Call `start()` first.

### Metadata rules

`TappMetadata` is a flat object: each value must be a string, a finite number, or a boolean. Other values (nested objects, arrays, `null`, `NaN`, `Infinity`) are dropped silently. The call does not throw. The package also exports `sanitizeMetadata` and `normalizeLinkData`, which apply the same rules.

### `EventAction`

Values match the native SDKs.

| Value | Name |
|---|---|
| 0 | `CUSTOM` (use with `customValue`) |
| 1 | `TAPP_ADD_PAYMENT_INFO` |
| 2 | `TAPP_ADD_TO_CART` |
| 3 | `TAPP_ADD_TO_WISHLIST` |
| 4 | `TAPP_COMPLETE_REGISTRATION` |
| 5 | `TAPP_CONTACT` |
| 6 | `TAPP_CUSTOMIZE_PRODUCT` |
| 7 | `TAPP_DONATE` |
| 8 | `TAPP_FIND_LOCATION` |
| 9 | `TAPP_INITIATE_CHECKOUT` |
| 10 | `TAPP_GENERATE_LEAD` |
| 11 | `TAPP_PURCHASE` |
| 12 | `TAPP_SCHEDULE` |
| 13 | `TAPP_SEARCH` |
| 14 | `TAPP_START_TRIAL` |
| 15 | `TAPP_SUBMIT_APPLICATION` |
| 16 | `TAPP_SUBSCRIBE` |
| 17 | `TAPP_VIEW_CONTENT` |
| 18 | `TAPP_CLICK_BUTTON` |
| 19 | `TAPP_DOWNLOAD_FILE` |
| 20 | `TAPP_JOIN_GROUP` |
| 21 | `TAPP_ACHIEVE_LEVEL` |
| 22 | `TAPP_CREATE_GROUP` |
| 23 | `TAPP_CREATE_ROLE` |
| 24 | `TAPP_LINK_CLICK` |
| 25 | `TAPP_LINK_IMPRESSION` |
| 26 | `TAPP_APPLY_FOR_LOAN` |
| 27 | `TAPP_LOAN_APPROVAL` |
| 28 | `TAPP_LOAN_DISBURSAL` |
| 29 | `TAPP_LOGIN` |
| 30 | `TAPP_RATE` |
| 31 | `TAPP_SPEND_CREDITS` |
| 32 | `TAPP_UNLOCK_ACHIEVEMENT` |
| 33 | `TAPP_ADD_SHIPPING_INFO` |
| 34 | `TAPP_EARN_VIRTUAL_CURRENCY` |
| 35 | `TAPP_START_LEVEL` |
| 36 | `TAPP_COMPLETE_LEVEL` |
| 37 | `TAPP_POST_SCORE` |
| 38 | `TAPP_SELECT_CONTENT` |
| 39 | `TAPP_BEGIN_TUTORIAL` |
| 40 | `TAPP_COMPLETE_TUTORIAL` |

### Platform differences

- **iOS:** link data has no `deepLink` field.
- **iOS and Android:** calls made before `start()` are guarded. `url` and `handleTappEvent` reject with `NOT_STARTED`. `fetchLinkData` and `fetchOriginLinkData` resolve `{ error: true, message }`. `shouldProcess` works before `start()`.
- **Android:** `fetchOriginLinkData` calls the native `fetchOriginalLinkData`.
- **Web:** not supported. `start` validates its input and logs a warning once. `url` and `handleTappEvent` reject as unimplemented. `shouldProcess` resolves `{ value: false }`. `fetchLinkData` and `fetchOriginLinkData` resolve with `{ error: true, message: 'Tapp is not supported on web.' }`.

## Universal Links and App Links

Tapp manages the association files for your link domain after you configure your app in the Tapp dashboard. You do not host them yourself. Configure the dashboard with your app identifiers, then complete the native setup below. Use your own Tapp link domain in place of the placeholders.

### iOS (Universal Links)

In Xcode, open the app target, go to **Signing & Capabilities**, add **Associated Domains**, and add:

```text
applinks:YOUR_TAPP_LINK_DOMAIN
```

Make sure the bundle identifier and Apple team ID in the dashboard match your Xcode project. Test Universal Links on a physical device.

### Android (App Links)

Add an intent filter with `android:autoVerify="true"` to `MainActivity` in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="YOUR_TAPP_LINK_DOMAIN" />
</intent-filter>
```

In the Tapp dashboard, provide your application ID and the **SHA-256 signing certificate hash** of the build you distribute, so Tapp can host `assetlinks.json` for your domain.

## Privacy and data disclosure

This section describes what the bundled native SDKs do. It is provided for app developers and is not legal advice.

To attribute installs, the native Tapp SDK sends device and app information to Tapp's servers, including a device match request on first launch.

- **iOS:** the data includes values such as screen resolution, device model, language, region, locale, calendar, time zone, platform, bundle identifier, a Tapp device identifier, and data collected by a hidden web view.
- **Android:** the Tapp SDK uses the Google Play Install Referrer and may read the advertising ID (GAID) and Android ID. Its manifest merges the `INTERNET`, `com.google.android.gms.permission.AD_ID`, and install-referrer permissions.

App developers are responsible for declaring this data collection in App Store privacy details and in Google Play Data safety, and for obtaining any consent that applies to your app.

The plugin ships a `PrivacyInfo.xcprivacy` manifest. It covers only the plugin's own bridge code and declares no collected data types for that code. It does not cover the data collection of the underlying Tapp SDK.

## Example app

[`example-app/`](./example-app) is a Vite and TypeScript app that exercises the API. It shows `start()`, listeners, link generation, events, and cold- and warm-start link handling. See [`example-app/README.md`](./example-app/README.md) for setup.

## License

MIT. See [LICENSE](./LICENSE).

## Support

Contact [support@tapp.so](mailto:support@tapp.so).
