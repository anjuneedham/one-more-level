# Android / Google Play

The native project in `android/` was generated with Capacitor and then tuned:
portrait-locked, dark themed, hardware accelerated, minimal permissions,
release build configured for a signed, minified AAB.

| | |
| --- | --- |
| App name | One More Level |
| Application ID | `com.onemorelevel.myapp` |
| Min SDK | 22 (Android 5.1) |
| Target SDK | 34 |
| Orientation | Portrait only |
| Permissions | `INTERNET` (ads/analytics), `VIBRATE` (haptics) |

## Build

```bash
npm install
npm run android:sync     # vite build + cap sync
npm run android:open     # Android Studio
```

Or from the command line (needs a JDK and the Android SDK):

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug        # APK for testing
cd android && ./gradlew bundleRelease        # AAB for Play
```

## Release signing

1. Create an upload key (once), keeping it **outside** the repo:

```bash
keytool -genkey -v -keystore ~/keys/one-more-level.keystore \
  -alias onemorelevel -keyalg RSA -keysize 2048 -validity 10000
```

2. Copy `android/keystore.properties.example` to `android/keystore.properties`
   and fill it in. That file, `*.keystore` and `*.jks` are git-ignored; if it is
   absent, release builds simply stay unsigned instead of failing.
3. `cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/`.

Bump `versionCode` (integer, +1 every upload) and `versionName` in
`android/app/build.gradle` for each release.

## Icons and splash

Source art: `resources/icon.svg`, `resources/splash.svg` (original geometric
mark, no third-party assets). The committed mipmaps are the Capacitor
placeholders; generate branded ones with:

```bash
npx @capacitor/assets generate --android
```

## Ads (AdMob) — live

`@capacitor-community/admob` is installed and wired into `AdMobAdService`
(`src/services/ads.ts`), which talks to the plugin's real API directly (not a
generic bridge guess). The manifest's App ID meta-data
(`android/app/src/main/AndroidManifest.xml`) comes from `manifestPlaceholders`
in `android/app/build.gradle`, which reads the `ADMOB_APP_ID` env var — never
a literal in either file.

Three secrets drive it, same pattern as the signing key
(**Settings → Secrets and variables → Actions**):

| Secret | Used by |
| --- | --- |
| `ADMOB_APP_ID` | `VITE_ADMOB_APP_ID` (web build) **and** `ADMOB_APP_ID` (Gradle manifest placeholder) |
| `ADMOB_REWARDED_ID` | `VITE_ADMOB_REWARDED_ID` |
| `ADMOB_INTERSTITIAL_ID` | `VITE_ADMOB_INTERSTITIAL_ID` |

Builds missing any of the three env vars fall back to the mock provider and
Google's public test units (`src/services/config.ts`), so a build can never
serve live ads by accident.

Placement policy, enforced in `AdManager`: rewarded ads only on an explicit
player tap ("watch ad to continue"), interstitials only between runs, at most
one every 3 runs and never within 2 minutes of the last one.

**Don't repeatedly tap your own live ads.** Once real ad unit IDs are set,
`testMode` is `false` and the build requests real ads — normal for verifying
they show up, but repeated self-clicks for "revenue" is invalid traffic and
against AdMob policy. Use `AdMobInitializationOptions.testingDevices` (in
`AdMobAdService.initialize`) if you want to hammer on it safely during QA.

## Analytics (Firebase, optional)

Add `google-services.json` to `android/app/` (git-ignored) and a Firebase
Analytics Capacitor plugin. `AnalyticsService` picks the native bridge up at
runtime; if it is missing, events are dropped silently and the game is
unaffected.

## Public pages (required by Play)

Google Play needs a reachable privacy policy URL before **any** release,
closed testing included. The pages are in `docs/` and are served by GitHub
Pages straight from `main`:

| Page | URL |
| --- | --- |
| Landing | `https://anjuneedham.github.io/one-more-level/` |
| Privacy policy | `https://anjuneedham.github.io/one-more-level/privacy.html` |
| Terms | `https://anjuneedham.github.io/one-more-level/terms.html` |

Enable it once in the repository: **Settings -> Pages -> Source: Deploy from a
branch -> `main` / `/docs`**. The same URLs are in `LINKS`
(`src/services/config.ts`) and are opened by the in-app settings screen.

The policy describes the app as it ships today, including the AdMob section.
**If you enable Firebase Analytics too, update `docs/privacy.html` and the
Play Data safety form again before releasing that build** - the two must
always agree.

## Pre-launch checklist

- [ ] `npm run build` clean, `npx cap sync android` run
- [ ] Version code/name bumped
- [ ] Release keystore configured, AAB signed
- [ ] Data safety form: local storage only; ads/analytics declared if enabled
- [ ] GitHub Pages enabled (Settings -> Pages -> Deploy from branch `main`,
      folder `/docs`) so the privacy and terms pages are live
- [ ] Privacy policy URL entered in Play Console -> App content
- [ ] Tested on a low-end device (60 FPS target) and with airplane mode on
- [ ] Store listing art produced from `resources/` (no third-party assets)
