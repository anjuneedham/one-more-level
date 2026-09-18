# Android / Google Play

The native project in `android/` was generated with Capacitor and then tuned:
portrait-locked, dark themed, hardware accelerated, minimal permissions,
release build configured for a signed, minified AAB.

| | |
| --- | --- |
| App name | One More Level |
| Application ID | `com.onemorelevel.game` |
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

## Ads (AdMob)

Ad logic is already abstracted behind `AdService` (`src/services/ads.ts`), so
enabling real ads does not touch game code:

1. `npm i @capacitor-community/admob` and `npx cap sync android`.
2. Uncomment the `com.google.android.gms.ads.APPLICATION_ID` meta-data and the
   `AD_ID` permission in `android/app/src/main/AndroidManifest.xml`, supplying
   the app id through a Gradle variable — not a literal in the manifest.
3. Put the real unit IDs in `.env.production` (see `.env.example`). Builds
   without all three values keep using the mock provider and Google's public
   test units, so a stray production build can never serve live ads by accident.

Placement policy, enforced in `AdManager`: rewarded ads only on an explicit
player tap ("watch ad to continue"), interstitials only between runs, at most
one every 3 runs and never within 2 minutes of the last one.

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

The policy describes the app as it ships today: no ads, no analytics, nothing
collected. **If you enable AdMob or Firebase, update `docs/privacy.html` and
the Play Data safety form before releasing that build** - the two must agree.

## Pre-launch checklist

- [ ] `npm run build` clean, `npx cap sync android` run
- [ ] Version code/name bumped
- [ ] Release keystore configured, AAB signed
- [ ] Data safety form: local storage only; ads/analytics declared if enabled
- [ ] GitHub Pages enabled (Settings -> Pages -> Deploy from branch `main`,
      folder `/docs`) so the privacy and terms pages are live
- [ ] Contact email filled in on the three pages in `docs/` (search for
      `REPLACE-WITH-YOUR-CONTACT-EMAIL`)
- [ ] Privacy policy URL entered in Play Console -> App content
- [ ] Tested on a low-end device (60 FPS target) and with airplane mode on
- [ ] Store listing art produced from `resources/` (no third-party assets)
