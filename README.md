# Romaniac

A cheerful, no-pressure Romanian learning PWA (see [SPEC.md](SPEC.md)). Plain HTML/CSS/JS, no build step, no backend. Everything is stored in IndexedDB on the device.

## Run locally

```bash
npm start
```

Then open http://localhost:8080. On `localhost` the service worker prefers the network, so edits show up on reload; offline it falls back to the cache.

## Test

```bash
npm test
```

The tests check the verb tables (every form for every tense, nothing empty, spot checks against reference conjugations, tile distractors), the vocabulary (ids, noun/adjective extras, orthography), answer checking, the 04:00 day boundary, the scheduler, and that `sw.js` precaches every app file.

## Content

- **Vocabulary:** `data/vocab.json`. Every card has a stable `id`. When an update ships, cards are merged into the stored data by id, so progress is kept. Removed cards are hidden, not deleted.
- **Verbs:** edit the principal parts in `tools/verb-sources.mjs`, then run `npm run build:verbs` to regenerate the complete tables in `data/verbs.json`. Irregular forms go in each verb's `x` overrides. You can also edit `data/verbs.json` directly, but then `npm test` will report that it no longer matches the sources.
- **Icons:** `npm run build:icons`.

- **ILR lessons:** `data/ilr.json` holds practice content made from the ILR class lessons (see SPEC.md, section 7). The class PDFs and notes stay outside the repo in `C:\projects\ilr\lectia-NN\`; ask Claude Code to "add lesson NN" (procedure in `.claude/skills/add-ilr-lesson/`, local only). `npm test` validates the lesson file.

## Releasing an update

1. Bump `VERSION` in `sw.js` (and add any new files to its `ASSETS` list; `npm test` catches missing ones).
2. Deploy. The app shows "New version ready — tap to refresh" instead of silently serving the old version.

## Install on the phone

Deploy the folder to any HTTPS static host (GitHub Pages or Netlify). All paths are relative, so a GitHub Pages subfolder works. Open the URL in Chrome on Android, then choose "Install app" / "Add to Home screen".

For Romanian audio, install the Romanian voice: Android Settings → Text-to-speech → Speech Services by Google → ⚙ → Install voice data → Română.

## Credits

The Nunito font (`fonts/`) is © The Nunito Project Authors and used under the SIL Open Font License 1.1 — see [licenses/Nunito-OFL.txt](licenses/Nunito-OFL.txt).
