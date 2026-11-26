# Hanja & Kanji

A small study app for two people. It teaches the 612 JLPT N5-N3 kanji and 610 Korean hanja: all of 한국어문회 levels 8급 to 5급 (500) plus 110 characters of 4급Ⅱ. Each character comes with its readings, meanings, the parts it is built from, example words and an animated stroke order.

Cards are scheduled with FSRS, the same algorithm Anki uses. Each person has a `name#1234` profile with separate progress for each language. Progress is saved on the device, works with no connection, and can be synced between devices through a private GitHub repository.

## Using it

Open https://frelekkacper.com/hanja-kanji-app/ in Safari on the iPhone, tap Share, then Add to Home Screen. Open the app once while online so it can cache everything. After that it works in airplane mode. On a laptop it works in any modern browser.

On the iPhone:

- The Home Screen app keeps its own storage, separate from Safari. Add the profile and paste the sync token inside the Home Screen app itself, not in Safari.
- The app has cached everything once the "Update available" banner has cleared, or after one full open while online.
- If the old version still shows after an update, close the app from the app switcher and open it again.

## Profiles

The first launch asks for a name and a 4-digit number. The same `name#1234` on another device is the same person's progress.

On a new device, add your profile, then connect sync before studying. The first sync brings your progress down and says "Welcome back".

## Setting up sync (once)

1. Create a **private** repository on GitHub, for example `hanja-kanji-progress`, and tick "Add a README" so it is not empty.
2. Create a **fine-grained personal access token**. Set Repository access to only that repository, and Permissions to Contents: Read and write. Choose an expiry. Kacper's GitHub account creates the tokens for every device, his girlfriend's included: a fine-grained token can only reach repositories its owner owns.
3. On each device, open Settings, then Sync. Paste the token, check the repository name, and press Connect. The "Test connection" button there checks it again later.
4. When the token expires or lacks permission, the status line says "Sync problem: token refused, tap to fix". Make a new token and paste it.

The repository holds one folder per profile: `profiles/<name>-<tag>/profile.json` and one `log-YYYY-Www.json` file per ISO week of answers.

Never share the token and never commit it anywhere. It is stored only on the device.

## For developers

The app is plain ES modules with no build step. Generated files (`data/`, `assets/fonts/`, `precache.json`) are committed.

- Rebuild the data: `python tools/fetch_sources.py && python tools/build_data.py && node tools/gen_precache.mjs`
- Run the tests: `python -m unittest discover -s tools/tests -t tools` and `npm test`
- Preview locally: `python -m http.server 8080`
- After changing anything under `src/`, `vendor/`, `assets/` or `data/`, or `index.html`, `manifest.webmanifest` or `sw.js`, run `node tools/gen_precache.mjs` before committing. The precache test enforces this. Only files git tracks are precached, so `git add` a new file first.

Design and plan: `docs/superpowers/specs/2026-11-23-hanja-kanji-rebuild-design.md` and `docs/superpowers/plans/2026-11-23-hanja-kanji-rebuild.md`.

## Data sources and licences

See `data/LICENSES.md`.
