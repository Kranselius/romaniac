// Validates data/verbs.json: every verb has every form for every tense, nothing empty.
// Identical forms (el lucrează / ei lucrează) are fine and not flagged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAll } from '../tools/build-verbs.mjs';
import { tileSet, joinTiles, sentenceFor } from '../js/conjugation.js';
import { norm } from '../js/answer.js';

const data = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ALLOWED_MISSING = ['imperativ']; // modal verbs (a putea, a vrea) have no imperative

test('verbs.json is in sync with tools/verb-sources.mjs', () => {
  assert.deepEqual(data, buildAll(), 'run `npm run build:verbs`');
});

test('about 100 verbs with unique ids', () => {
  assert.ok(data.verbs.length >= 100, `only ${data.verbs.length} verbs`);
  const ids = data.verbs.map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every verb has every form for every tense', () => {
  for (const v of data.verbs) {
    assert.match(v.inf, /^a \S+$/, v.id);
    assert.ok(v.en && v.group, `${v.id} meta`);
    assert.ok(LEVELS.includes(v.level), `${v.id} level`);
    assert.ok(v.sentence?.c, `${v.id} sentence complement`);
    for (const t of data.tenses) {
      if (!v.forms[t.id]) {
        assert.ok(v.missing?.includes(t.id) && ALLOWED_MISSING.includes(t.id), `${v.inf}: missing tense ${t.id}`);
        continue;
      }
      const persons = t.id === 'imperativ' ? data.impPersons : data.persons;
      assert.deepEqual(Object.keys(v.forms[t.id]).sort(), [...persons].sort(), `${v.inf} ${t.id} persons`);
      for (const p of persons) {
        const f = v.forms[t.id][p];
        assert.equal(typeof f, 'string', `${v.inf} ${t.id} ${p}`);
        assert.ok(f.trim().length > 0, `${v.inf} ${t.id} ${p} is empty`);
        assert.equal(f, f.trim().replace(/\s+/g, ' '), `${v.inf} ${t.id} ${p} whitespace`);
        assert.match(f, /^[a-zăâîșț ]+$/, `${v.inf} ${t.id} ${p}: "${f}" has unexpected characters`);
        assert.doesNotMatch(f, /undefined/);
      }
    }
  }
});

test('modern orthography: comma-below ș ț, no î inside words, sunt not sînt', () => {
  const text = JSON.stringify(data);
  assert.doesNotMatch(text, /[şţŞŢ]/, 'cedilla found');
  assert.doesNotMatch(text, /sînt/);
  for (const v of data.verbs) {
    for (const t of Object.values(v.forms)) {
      for (const f of Object.values(t)) {
        for (const w of f.split(' ')) assert.doesNotMatch(w, /.î./, `${v.inf}: "${w}" should use â`);
      }
    }
  }
});

test('required irregular and stem-changing verbs are present', () => {
  const infs = new Set(data.verbs.map(v => v.inf));
  for (const v of ['fi', 'avea', 'vrea', 'lua', 'da', 'sta', 'face', 'putea', 'ști', 'bea', 'mânca', 'merge',
    'veni', 'spune', 'zice', 'ține', 'scrie']) assert.ok(infs.has(`a ${v}`), `a ${v} missing`);
  const groups = new Set(data.verbs.map(v => v.group));
  for (const g of ['-a', '-a (-ez)', '-ea', '-e', '-i', '-i (-esc)', '-î', '-î (-ăsc)']) assert.ok(groups.has(g), `no ${g} verbs`);
});

// Spot checks against standard reference tables (dexonline.ro).
const REFERENCE = [
  ['a fi', 'prezent', { eu: 'sunt', tu: 'ești', el: 'este', noi: 'suntem', voi: 'sunteți', ei: 'sunt' }],
  ['a fi', 'conjunctiv', { eu: 'să fiu', tu: 'să fii', el: 'să fie' }],
  ['a fi', 'imperfect', { eu: 'eram', ei: 'erau' }],
  ['a fi', 'mmcp', { eu: 'fusesem', ei: 'fuseseră' }],
  ['a fi', 'imperativ', { tu: 'fii', voi: 'fiți', tu_neg: 'nu fi', voi_neg: 'nu fiți' }],
  ['a avea', 'prezent', { eu: 'am', el: 'are', ei: 'au' }],
  ['a avea', 'conjunctiv', { el: 'să aibă' }],
  ['a avea', 'mmcp', { eu: 'avusesem' }],
  ['a vrea', 'prezent', { eu: 'vreau', ei: 'vor' }],
  ['a vrea', 'imperfect', { eu: 'voiam' }],
  ['a lua', 'prezent', { eu: 'iau', tu: 'iei', el: 'ia', noi: 'luăm' }],
  ['a lua', 'conjunctiv', { el: 'să ia' }],
  ['a da', 'prezent', { el: 'dă', noi: 'dăm' }],
  ['a da', 'imperfect', { eu: 'dădeam' }],
  ['a da', 'perfect_simplu', { eu: 'dădui', el: 'dădu' }],
  ['a sta', 'conjunctiv', { el: 'să stea' }],
  ['a sta', 'imperfect', { eu: 'stăteam' }],
  ['a face', 'perfect_compus', { eu: 'am făcut' }],
  ['a face', 'imperativ', { tu: 'fă', tu_neg: 'nu face' }],
  ['a putea', 'prezent', { eu: 'pot', tu: 'poți', el: 'poate' }],
  ['a putea', 'conjunctiv', { el: 'să poată' }],
  ['a ști', 'prezent', { eu: 'știu', tu: 'știi', el: 'știe' }],
  ['a bea', 'perfect_compus', { eu: 'am băut' }],
  ['a bea', 'prezent', { eu: 'beau', noi: 'bem' }],
  ['a mânca', 'prezent', { eu: 'mănânc', noi: 'mâncăm', ei: 'mănâncă' }],
  ['a mânca', 'conjunctiv', { el: 'să mănânce' }],
  ['a merge', 'conjunctiv', { el: 'să meargă' }],
  ['a merge', 'perfect_compus', { noi: 'am mers' }],
  ['a merge', 'viitor', { eu: 'voi merge' }],
  ['a merge', 'viitor_popular', { eu: 'o să merg' }],
  ['a merge', 'conditional', { eu: 'aș merge' }],
  ['a merge', 'imperativ', { tu: 'mergi', tu_neg: 'nu merge' }],
  ['a merge', 'mmcp', { eu: 'mersesem' }],
  ['a veni', 'prezent', { eu: 'vin', tu: 'vii', el: 'vine' }],
  ['a veni', 'imperativ', { tu: 'vino' }],
  ['a spune', 'prezent', { tu: 'spui' }],
  ['a zice', 'imperativ', { tu: 'zi' }],
  ['a ține', 'prezent', { tu: 'ții' }],
  ['a scrie', 'prezent', { eu: 'scriu', tu: 'scrii' }],
  ['a scrie', 'perfect_compus', { eu: 'am scris' }],
  ['a lucra', 'prezent', { eu: 'lucrez', el: 'lucrează', ei: 'lucrează' }],
  ['a vorbi', 'prezent', { eu: 'vorbesc', el: 'vorbește' }],
  ['a vorbi', 'conjunctiv', { el: 'să vorbească' }],
  ['a coborî', 'prezent', { eu: 'cobor', el: 'coboară', noi: 'coborâm' }],
  ['a hotărî', 'prezent', { eu: 'hotărăsc', noi: 'hotărâm' }],
  ['a vedea', 'prezent', { eu: 'văd', tu: 'vezi' }],
  ['a vedea', 'perfect_compus', { eu: 'am văzut' }],
  ['a cânta', 'perfect_simplu', { eu: 'cântai', el: 'cântă', noi: 'cântarăm' }],
  ['a cânta', 'mmcp', { eu: 'cântasem', noi: 'cântaserăm' }],
  ['a învăța', 'prezent', { tu: 'înveți' }],
  ['a cunoaște', 'imperfect', { eu: 'cunoșteam' }],
];

test('spot checks against reference conjugations', () => {
  for (const [inf, tense, forms] of REFERENCE) {
    const v = data.verbs.find(x => x.inf === inf);
    assert.ok(v, inf);
    for (const [p, f] of Object.entries(forms)) assert.equal(v.forms[tense][p], f, `${inf} ${tense} ${p}`);
  }
});

test('tile builder never offers a distractor identical to the answer', () => {
  for (const v of data.verbs) {
    for (const [tense, forms] of Object.entries(v.forms)) {
      for (const form of Object.values(forms)) {
        for (let i = 0; i < 3; i++) {
          const { target, extras } = tileSet(form, forms);
          assert.equal(norm(joinTiles(target)), norm(form), `${v.inf} ${tense}: tiles rebuild "${form}"`);
          const texts = target.map(t => t.text);
          for (const e of extras) {
            assert.ok(!texts.includes(e.text), `${v.inf} ${tense}: duplicate tile "${e.text}"`);
            assert.notEqual(norm(e.text), norm(form), `${v.inf} ${tense}: distractor equals answer`);
          }
        }
      }
    }
  }
});

test('example sentences are built for every tense and person', () => {
  for (const v of data.verbs) {
    for (const [tense, forms] of Object.entries(v.forms)) {
      for (const p of Object.keys(forms)) {
        const { before, after } = sentenceFor(v, tense, p);
        assert.ok(before.length && after.length, `${v.inf} ${tense} ${p}`);
      }
    }
  }
});
