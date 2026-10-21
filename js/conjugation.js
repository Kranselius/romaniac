// Pure helpers for verb drills (no DOM), shared with the tests.
import { norm } from './answer.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => [...arr].map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

// Split a form into tiles: words for compound forms (am + mers, să + meargă),
// stem + ending for single words, using the stem shared by the tense's forms.
export function splitForm(form, tenseForms) {
  if (form.includes(' ')) return form.split(' ').map(text => ({ text, word: true }));
  const singles = Object.values(tenseForms).filter(f => !f.includes(' '));
  let stem = singles[0] || form;
  for (const f of singles) { while (!f.startsWith(stem)) stem = stem.slice(0, -1); }
  if (stem.length >= 2 && stem.length < form.length) {
    return [{ text: stem, word: false }, { text: form.slice(stem.length), word: false }];
  }
  // The bare stem (eu merg): one tile, so the task is to add no ending.
  if (stem.length >= 2 && stem === form) return [{ text: form, word: false }];
  if (form.length >= 4) {
    const cut = Math.ceil(form.length / 2);
    return [{ text: form.slice(0, cut), word: false }, { text: form.slice(cut), word: false }];
  }
  return [{ text: form, word: false }];
}

export const joinTiles = tiles => tiles.map((t, i) => (i > 0 && (t.word || tiles[i - 1].word) ? ' ' : '') + t.text).join('');

// Tiles for the target plus up to `n` distractor pieces taken from the tense's other forms.
// Forms identical to the target (e.g. el/ei lucrează) are never used, and no distractor
// duplicates a tile of the correct answer.
export function tileSet(form, tenseForms, n = 3) {
  const target = splitForm(form, tenseForms);
  const taken = new Set(target.map(t => t.text));
  const extras = [];
  for (const f of shuffle(Object.values(tenseForms))) {
    if (norm(f) === norm(form)) continue;
    for (const t of splitForm(f, tenseForms)) {
      if (!taken.has(t.text) && norm(t.text) !== norm(form)) { taken.add(t.text); extras.push(t); }
    }
  }
  return { target, extras: shuffle(extras).slice(0, n) };
}

// "In a sentence" frames. The tense label is always shown, since several tenses can fit.
const FRAMES = {
  prezent: 'Acum {p} ___ {c}.',
  perfect_compus: 'Ieri {p} ___ {c}.',
  imperfect: 'Pe vremuri, {p} ___ {c}.',
  viitor: 'Mâine {p} ___ {c}.',
  viitor_popular: 'Diseară {p} ___ {c}.',
  conjunctiv: 'Mama vrea ca {p} ___ {c}.',
  conditional: 'Dacă ar fi timp, {p} ___ {c}.',
  mmcp: 'Până atunci, {p} ___ deja {c}.',
  perfect_simplu: 'Atunci {p} ___ {c}.',
};
const SUBJECT = { eu: ['eu'], tu: ['tu'], el: ['el', 'ea'], noi: ['noi'], voi: ['voi'], ei: ['ei', 'ele'] };

export function sentenceFor(verb, tense, person) {
  let frame;
  if (tense === 'imperativ') frame = person.startsWith('tu') ? 'Ana, ___ {c}!' : 'Copii, ___ {c}!';
  else frame = FRAMES[tense].replace('{p}', pick(SUBJECT[person]));
  const [before, after] = frame.replace('{c}', verb.sentence.c).split('___');
  return { before, after };
}
