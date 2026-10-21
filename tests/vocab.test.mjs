import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vocab = JSON.parse(readFileSync(new URL('../data/vocab.json', import.meta.url), 'utf8'));
const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const TYPES = ['noun', 'verb', 'adjective', 'phrase', 'other'];

test('cards have unique stable ids and known decks/types', () => {
  const ids = vocab.cards.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  const decks = new Set(vocab.decks.map(d => d.id));
  for (const c of vocab.cards) {
    assert.ok(decks.has(c.deck), `${c.id}: deck ${c.deck}`);
    assert.ok(c.id.startsWith(c.deck + '.'), `${c.id}: id should start with deck`);
    assert.ok(TYPES.includes(c.type), `${c.id}: type`);
    assert.ok(Array.isArray(c.ro) && c.ro.length && c.ro.every(Boolean), `${c.id}: ro`);
    assert.ok(Array.isArray(c.en) && c.en.length && c.en.every(Boolean), `${c.id}: en`);
  }
});

test('starter decks hold roughly 150–200 items', () => {
  assert.ok(vocab.cards.length >= 150 && vocab.cards.length <= 220, `${vocab.cards.length} cards`);
});

test('nouns have gender, plural and definite form; adjectives have 4 forms', () => {
  for (const c of vocab.cards) {
    if (c.type === 'noun') {
      assert.ok(['m', 'f', 'n'].includes(c.gender), `${c.id}: gender`);
      assert.ok(c.plural && c.def, `${c.id}: plural/def`);
    }
    if (c.type === 'adjective') {
      assert.equal(c.forms?.length, 4, `${c.id}: forms`);
      assert.equal(c.forms[0], c.ro[0], `${c.id}: first form is the main form`);
    }
    if (c.verb) assert.ok(verbs.verbs.some(v => v.id === c.verb), `${c.id}: verb ${c.verb} not in verbs.json`);
  }
});

test('modern orthography', () => {
  const text = JSON.stringify(vocab.cards.map(c => [c.ro, c.def, c.plural, c.forms]));
  assert.doesNotMatch(text, /[şţŞŢ]/, 'cedilla found');
  assert.doesNotMatch(text, /sînt/);
  for (const c of vocab.cards) {
    for (const s of [...c.ro, c.def, c.plural, ...(c.forms || [])].filter(Boolean)) {
      for (const w of s.toLowerCase().split(/[\s,?!.…-]+/)) assert.doesNotMatch(w, /.î./, `${c.id}: "${w}" should use â`);
    }
  }
});
