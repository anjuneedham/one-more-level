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

## Leaderboards (Google Play Games Services)

Sign-in is optional: everyone plays as a guest, and guests see their own
best runs on the device. Players who sign in with Google Play Games post to two
global leaderboards, and their **Play Games gamer name is their unique
username**. Google guarantees that it is unique, the player picks it in the
Play Games app, and it follows their Google account to any phone. Play Games
does not allow a game to set or show a custom name of its own.

The bridge is a small local Capacitor plugin,
`android/app/src/main/java/com/onemorelevel/myapp/PlayGamesPlugin.java`
(registered in `MainActivity`), used by `src/services/leaderboard.ts`. Until
it is configured it reports "not available" and the game behaves exactly as
before.

One-time setup in Play Console:

1. **Grow users → Play Games Services → Setup and management → Configuration**:
   create a Play Games Services project for this app. Copy the numeric
   **project ID** shown there.
2. **Credentials → Add credential → Android**. Create the OAuth client it asks
   for in Google Cloud, using package `com.onemorelevel.myapp` and the
   **SHA-1 of the app signing key**
   (Play Console → Setup → App integrity → App signing). Add a second Android
   credential with the **upload key** SHA-1 too, so sideloaded/internal builds
   can sign in.
3. **Leaderboards → Add leaderboard**, twice:
   - `Best Level`: format Numeric, 0 decimal places, ordering *Larger is better*.
   - `High Score`: same settings.

   Copy each leaderboard ID (they look like `CgkI...`).
4. **Testers**: add your testers' Google accounts. Until the Play Games
   configuration is **published** (Review and publish on the same page),
   only these accounts can sign in.
5. Add three repository secrets
   (**Settings → Secrets and variables → Actions**):

| Secret | Used by |
| --- | --- |
| `PLAY_GAMES_APP_ID` | Gradle `resValue` `game_services_project_id` → manifest `com.google.android.gms.games.APP_ID` |
| `PLAY_GAMES_LEADERBOARD_LEVEL` | `VITE_PLAY_GAMES_LEADERBOARD_LEVEL` |
| `PLAY_GAMES_LEADERBOARD_SCORE` | `VITE_PLAY_GAMES_LEADERBOARD_SCORE` |

The leaderboard screen and Play Games sign-in appear only when all three are
set. **Update the Play Console Data safety form when this ships**: with
Play Games on, the app handles a *User ID* (the Play Games player ID) and
*App activity* (game scores). Declare both as optional and used for app
functionality, and check Google's current Play Games Services Data safety
guidance when you fill it in. `docs/privacy.html`
already describes this.

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
- [ ] Data safety form: local storage only; ads/analytics declared if enabled; Play Games (user ID, scores) declared once its secrets are set
- [ ] GitHub Pages enabled (Settings -> Pages -> Deploy from branch `main`,
      folder `/docs`) so the privacy and terms pages are live
- [ ] Privacy policy URL entered in Play Console -> App content
- [ ] Tested on a low-end device (60 FPS target) and with airplane mode on
- [ ] Store listing art produced from `resources/` (no third-party assets)
