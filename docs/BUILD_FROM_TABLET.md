# Building the release .aab from a tablet (no computer needed)

You do not need Android Studio, a desktop, or a terminal. Everything below
happens in a browser, on github.com, using tap-to-run buttons and file
downloads. Two workflows are already set up in `.github/workflows/`.

## Step 1 — Generate your signing key (do this once, ever)

1. Open your repo on github.com and tap the **Actions** tab.
2. In the left list, tap **"1. Generate release keystore"**.
3. Tap **Run workflow** (top right), leave the default alias, tap the green
   **Run workflow** button.
4. Wait ~30 seconds, then open that run. Under **Artifacts**, download
   **keystore-and-instructions** (downloads as a `.zip`).
5. Open the zip (most tablet Files apps can open zips directly) and read
   `READ_ME_FIRST.txt` — it has three files and tells you exactly what to do
   with each one.
6. **Save `release.keystore` somewhere permanent** — email it to yourself,
   upload it to Google Drive, whatever survives. This file cannot be
   recreated. If you lose it, you can never publish an update to this app
   again under the same listing.
7. Add the 4 secrets it lists to your repo: **Settings → Secrets and
   variables → Actions → New repository secret**, one at a time
   (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`). Copy each value
   straight from the downloaded files.
8. Once you've saved the keystore and added all 4 secrets, go back to that
   workflow run and delete the artifact (open the run → the trash icon next
   to Artifacts) so it isn't left sitting there for the full 7-day window.

## Step 2 — Build the .aab (do this every time you want a new build)

1. Actions tab → **"2. Build signed Android App Bundle"** → **Run
   workflow** → green **Run workflow** button.
2. Takes a few minutes (it builds the whole Android project from scratch).
   Refresh the page to check progress.
3. When it finishes, open the run, download the **one-more-level-release-aab**
   artifact. Unzip it — inside is `app-release.aab`.

## Step 3 — Upload to Play Console

1. Open [Play Console](https://play.google.com/console) in your tablet's
   browser.
2. Your app → **Testing → Closed testing** → your track → **Create new
   release**.
3. Tap the upload area and pick `app-release.aab` from your downloads.
4. Fill in release notes, save, review, roll out.

## Every future update

Just repeat **Step 2** — it always builds from whatever is currently on the
`main` branch — and **Step 3**. Step 1 is one-time only; running it again
would create a different signing key that Play will not accept as an update
to the same app.
