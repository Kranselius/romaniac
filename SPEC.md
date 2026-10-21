# Romanian Learning App — Project Spec

Personal Romanian learning app for a single user on an Android phone. Cheerful, encouraging feel. Gamified with points, but **zero pressure**.

## Platform

- **Progressive Web App (PWA)**, installed via Chrome → "Add to Home screen" / "Install app".
- Plain HTML/CSS/JavaScript (a light framework like Preact or Svelte is fine if it helps), no backend.
- Works fully offline: service worker + web app manifest.
- **Storage:**
  - All data stored locally in **IndexedDB**.
  - Call `navigator.storage.persist()` on first run so the browser doesn't evict data.
  - This data is the only copy of the user's progress.
- **Export/import** button to back up all progress as a JSON file. Import replaces the current data, after a confirmation prompt.
- **App updates:**
  - Show a small "New version ready, tap to refresh" message rather than silently serving an old cached version.
  - When new or corrected words and verbs ship, merge them into the stored data without losing existing progress. Match items by stable ids, never by position.
- Mobile-first layout: large tap targets, portrait orientation.
- **No notifications or reminders.** Nothing that nudges or nags.

## Data model (initial sketch)

- **Card:**
  - id, deck, type (noun / verb / adjective / phrase / other)
  - ro and en, each an array of accepted answers (the first one is the main form shown to the user)
  - **Noun extras:** gender, plural, definite singular (câine → câinele; plural câini)
  - **Adjective extras:** forms (m sg, f sg, m pl, f pl)
  - SRS state, history of reviews
  - custom flag
- **Verb:**
  - infinitive, English meaning, group/pattern, difficulty (beginner / intermediate / advanced)
  - forms keyed by tense → person
  - Imperative has only tu/voi, each in affirmative and negative
  - Example sentences for the "in a sentence" drill
- **Verb mastery:** verb × tense × person → correct-answer count and the dates of correct answers.
- **Points log:** one entry per day with that day's points. Weekly totals, best week and levels are derived from this log.
- **Settings:** daily goal, new cards per session, lenient diacritics, sound on/off, TTS speed.

## 1. Vocabulary practice

- **Spaced repetition** using FSRS, or SM-2 as a simpler fallback. Each word/phrase is a card with scheduling state.
- Exercise types, using the same cards:
  - Flashcards, in both directions (RO→EN and EN→RO). These are self-graded with Again / Good / Easy buttons.
  - Multiple choice, with distractors drawn from the same deck and word type.
  - Typed answer
  - Listen and type
- **Audio:**
  - Web Speech API text-to-speech with `lang="ro-RO"`. No audio files.
  - Speak the **Romanian** word or phrase after each question, in both directions. Never read English text with the Romanian voice.
  - On first run, check that a Romanian voice exists. If not, show a friendly one-time tip to install Romanian voice data in Android's text-to-speech settings (the Speech Services by Google app).
  - Hide audio-only exercises until a voice is available.
- **Answer checking:**
  - Case-insensitive; ignore surrounding whitespace and trailing punctuation.
  - Accept any of several correct answers (synonyms, "the dog" / "dog").
  - Treat comma-below (ș ț) and cedilla (ş ţ) as equivalent.
  - Lenient mode (on by default for a beginner): accept answers with missing diacritics, but always show the correct spelling.
  - Answer input fields: `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="none"`, `spellcheck="false"`, so the Android keyboard doesn't "fix" Romanian words.
- **Diacritics:** quick-insert bar for ă â î ș ț (and uppercase).
- **Content:**
  - Use modern standard orthography: â inside words, "sunt" (not "sînt"), comma-below ș ț.
  - **Starting level: complete beginner.**
  - Themed starter decks, roughly 150–200 words and short phrases in total: greetings and polite phrases, numbers 0–20, family, food and drink, days and time, common verbs, common adjectives.
  - Later decks draw from the ~1,000 most frequent words.
  - Nouns include gender, plural and definite form.
  - Adjectives include their gender/number forms.
  - User can add custom cards.
- **Sessions:**
  - Offer "a session of 20 is ready" (or the actual size if fewer cards are due). Never show an overdue/backlog count.
  - When nothing is due, offer new words or a relaxed review of already-learned words. This still earns points but doesn't disturb the spaced-repetition schedule.
  - Prioritize the most important due cards quietly.
  - Mix a few new cards into each session (default 5); let the user pick how many new cards per session.
  - **Introduce before testing:** a new card is first shown as a "meet the word" card (Romanian, English, audio, and gender/plural for nouns), then tested later in the session, starting with the easiest exercise (recognition or multiple choice) before typed EN→RO.

## 2. Verb mode

Verb mode is separate from the spaced-repetition cards. It's free, endless practice on one verb.

1. **Choose a verb:** searchable list (beginner verbs shown first), or a "Surprise me" random button that picks from beginner verbs by default.
2. **Choose tenses to practice** (toggles; default is prezent only):
   - prezent
   - perfect compus
   - imperfect
   - viitor (voi merge)
   - viitor popular (o să merg)
   - conjunctiv prezent (să merg)
   - condițional prezent (aș merge)
   - imperativ: tu and voi only, affirmative and negative. Negative tu uses "nu" + infinitive (nu merge).
   - mai-mult-ca-perfectul
   - perfect simplu (optional / advanced)
3. **Endless loop of drills on that one verb**, rotating modes so it stays fun:
   - **Fill the table:** one blank per person (eu, tu, el/ea, noi, voi, ei/ele), or 4 blanks for imperativ. Each correct cell flips with a pop animation.
   - **Rapid fire:**
     - A random person + tense prompt (e.g. "noi · imperfect"). Type the form, then the next prompt appears quickly, right after the correct form has been spoken.
     - Consecutive correct answers build a combo bonus. A wrong answer quietly resets it, with no negative sound or message.
     - No timer.
   - **Tile builder:** assemble the form from pieces (am + mers, să + meargă, aș + merge). Good for compound tenses.
   - **In a sentence:** fill the gap, with the target tense shown, e.g. "Ieri noi ___ la piață. (a merge · perfect compus)" → am mers. The tense label is needed because several tenses can fit the same sentence. Example sentences use only beginner vocabulary.
   - **Listen and type:** TTS says the form, user types it.
   - Always speak the correct form aloud after each answer.
4. **Mastery grid:**
   - Person × tense cells fill with color in stages as they're answered correctly.
   - A cell is **mastered** after correct answers on at least 2 different days (using the 04:00 day boundary), so mastery means remembering, not just repeating within one session.
   - A fully mastered tense earns a star on that verb.
5. **Data:**
   - Store **complete conjugation tables** as JSON for ~100 of the most common verbs. Don't generate forms by rule.
   - Must include irregular and stem-changing verbs: a fi, a avea, a vrea, a lua, a da, a sta, a face, a putea, a ști, a bea, a mânca (mănânc), a merge (să meargă), a veni, a spune, a zice, a ține, a scrie.
   - Cover all main patterns: -a, -ea, -e, -i, -î verbs, including the -ez and -esc types.
   - Validate the data with an automated test: every verb has every form for every tense, with no empty entries. Don't flag identical forms as errors, since many are legitimately the same (el lucrează / ei lucrează).
   - In multiple-choice-style drills (tile builder), never offer a distractor that's identical to the correct form, which can happen when two persons share a form.
   - Spot-check tables against a reference conjugation source (e.g. dexonline.ro).
   - Allow adding more verbs later.

## 3. Points — no pressure

- **Earning points:**
  - Correct answer (vocabulary or verb): 10. For self-graded flashcards, "Good" and "Easy" count as correct.
  - Correct answer on a vocabulary card with a long review interval (21+ days) or one that was previously forgotten: 15
  - Meeting a new word ("meet the word" card): 5
  - Finishing a vocabulary session with no wrong answers and no "Again" presses: +20 bonus
  - Verb-mode combo: after 5 correct in a row each answer earns +2 extra, after 10 in a row +4, and so on, up to a maximum of +10 extra per answer
  - Newly mastered verb tense: +25
- **Never lose points.** Wrong answers cost nothing; the card simply returns sooner.
- **No streaks, no streak freezes, no guilt mechanics.** Skipping days has no consequence and is never highlighted.
- **Day boundary:** the day rolls over at 04:00 local time, so late-evening practice counts for that evening.
- **Today:**
  - Points counter with a gentle, optional daily goal (default 100, user-adjustable, can be turned off).
  - Reaching it gives confetti. Not reaching it gives nothing negative.
- **This week:**
  - Bar chart of points per day, Monday–Sunday (user is in Sweden), using the same 04:00 day boundary.
  - Empty days are just blank: no red, no X marks.
  - "Best week" record shown as a fun thing to beat.
- **Levels and badges:**
  - Based only on cumulative progress, so they only go up.
  - Badge examples: 100 words learned, first verb fully mastered, 10 verbs mastered, 1,000 total points.
  - A word counts as **learned** once it has been answered correctly on at least 2 different days, matching the mastery rule in verb mode.

## 4. Look and feel

- Bright, rounded, friendly design.
- Palette inspired by the Romanian flag (blue #002B7F, yellow #FCD116, red #CE1126), softened, on a warm cream background.
- **Red only as an accent**, never to mark wrong answers. Wrong answers use a soft neutral or warm color.
- Playful rounded font that supports Romanian diacritics, including comma-below ș ț. Many display fonts don't; check before choosing, and bundle the font for offline use.
- Animations:
  - Bounce or pop on correct answers
  - Gentle shake plus the correct answer on wrong ones; never harsh
  - Confetti at the daily goal and when a tense is mastered
- Optional cheerful sound effects, with a mute toggle.
- Encouragement in Romanian after correct answers, rotated randomly: Bravo!, Foarte bine!, Super!, Excelent!, Ești pe val!, Perfect!, Grozav!
- Optional small mascot (e.g. a friendly wolf or stork) that reacts to answers.

## 5. Screens

- **Home:**
  - Today's points with a progress ring
  - Weekly bar chart
  - Big buttons: "Practice words" and "Verb mode"
- **Practice session**
- **Verb picker → verb drill screen** with the mastery grid
- **Progress:** levels, badges, best week, words learned, verbs mastered
- **Settings:**
  - Daily goal (or off)
  - New cards per session
  - Lenient diacritics
  - Sound
  - TTS speed
  - Export/import
  - Add custom cards

## 6. Build order

1. Project scaffold: PWA manifest, service worker, IndexedDB layer, TTS helper
2. Card decks + spaced repetition + flashcards
3. Points, daily goal, weekly chart
4. Verb mode with conjugation data, data validation test and drill modes
5. More vocabulary exercise types
6. Polish: animations, sounds, mascot, badges, more decks

## Testing

- Test in Chrome on Android, or a mobile emulator in Chrome DevTools.
- A service worker only runs on HTTPS or localhost. A plain http:// address on the local network won't work for offline mode or installing.
- To test on the phone during development, either:
  - use Chrome's port forwarding (USB debugging enabled on the phone, phone connected via USB, chrome://inspect on the computer), so the phone can open the dev server as localhost, or
  - deploy it free to GitHub Pages or Netlify and install from that HTTPS URL. This is also the simplest way to install the finished app.
- GitHub Pages serves the app from a subfolder (username.github.io/repo-name/), so use relative paths for the manifest `start_url`, service worker scope and all assets.
