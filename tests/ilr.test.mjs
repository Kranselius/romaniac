// Validates data/ilr.json, the practice content made from the ILR course lessons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { norm } from '../js/answer.js';

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const ilr = read('../data/ilr.json');
const vocab = read('../data/vocab.json');
const verbs = read('../data/verbs.json');
const vocabIds = new Set(vocab.cards.map(c => c.id));
const verbIds = new Set(verbs.verbs.map(v => v.id));
const TYPES = ['noun', 'verb', 'adjective', 'phrase', 'other'];
const KINDS = ['type', 'choice', 'order'];

test('lessons have unique ids and numbers', () => {
  assert.ok(Array.isArray(ilr.lessons));
  const ids = ilr.lessons.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate lesson id');
  assert.equal(new Set(ilr.lessons.map(l => l.number)).size, ids.length, 'duplicate lesson number');
  for (const l of ilr.lessons) {
    assert.match(l.id, /^ilr-\d{2}$/, l.id);
    assert.equal(l.id, `ilr-${String(l.number).padStart(2, '0')}`, `${l.id} must match its number`);
    assert.ok(l.title && l.topic, `${l.id}: title and topic`);
  }
});

test('every id is unique and prefixed with its lesson', () => {
  const seen = new Set();
  for (const l of ilr.lessons) {
    const ids = [...l.cards.filter(c => !c.ref).map(c => c.id), ...(l.grammar || []).flatMap(g => [g.id, ...g.items.map(i => i.id)])];
    for (const id of ids) {
      assert.ok(id.startsWith(`${l.id}.`), `${id} should start with ${l.id}.`);
      assert.ok(!seen.has(id), `duplicate id ${id}`);
      assert.ok(!vocabIds.has(id), `${id} clashes with a starter card`);
      seen.add(id);
    }
  }
});

test('cards are complete; references point at existing starter cards', () => {
  for (const l of ilr.lessons) {
    const refs = new Set();
    for (const c of l.cards) {
      if (c.ref) {
        assert.ok(vocabIds.has(c.ref), `${l.id}: unknown ref ${c.ref}`);
        assert.ok(!refs.has(c.ref), `${l.id}: ${c.ref} referenced twice`);
        refs.add(c.ref);
        continue;
      }
      assert.ok(TYPES.includes(c.type), `${c.id}: type`);
      assert.ok(c.ro?.length && c.ro.every(Boolean), `${c.id}: ro`);
      assert.ok(c.en?.length && c.en.every(Boolean), `${c.id}: en`);
      assert.equal(new Set(c.ro.map(norm)).size, c.ro.length, `${c.id}: duplicate ro answer`);
      if (c.type === 'noun') {
        assert.ok(['m', 'f', 'n'].includes(c.gender), `${c.id}: gender`);
        assert.ok(c.plural && c.def, `${c.id}: plural/def`);
      }
      if (c.type === 'adjective') {
        assert.equal(c.forms?.length, 4, `${c.id}: forms`);
        assert.equal(c.forms[0], c.ro[0], `${c.id}: first form is the main form`);
      }
    }
  }
});

test('lesson verbs exist in verb mode', () => {
  for (const l of ilr.lessons) {
    for (const v of l.verbs || []) assert.ok(verbIds.has(v), `${l.id}: verb ${v} is not in data/verbs.json`);
  }
});

test('grammar items are answerable', () => {
  for (const l of ilr.lessons) {
    for (const g of l.grammar || []) {
      assert.ok(g.title && g.rule, `${g.id}: title and rule`);
      assert.ok(g.items.length, `${g.id}: no items`);
      for (const it of g.items) {
        assert.ok(KINDS.includes(it.kind), `${it.id}: kind`);
        assert.ok(it.prompt, `${it.id}: prompt`);
        assert.ok(it.answer?.length && it.answer.every(Boolean), `${it.id}: answer`);
        assert.equal(new Set(it.answer.map(norm)).size, it.answer.length, `${it.id}: duplicate answer`);
        if (it.kind === 'choice') {
          assert.ok(it.options?.length >= 2, `${it.id}: needs 2+ options`);
          assert.ok(it.options.includes(it.answer[0]), `${it.id}: options must include the answer`);
          assert.equal(new Set(it.options.map(norm)).size, it.options.length, `${it.id}: duplicate options`);
          const right = it.options.filter(o => it.answer.some(a => norm(a) === norm(o)));
          assert.equal(right.length, 1, `${it.id}: exactly one option may be correct`);
        }
        if (it.kind === 'order') assert.ok(it.answer[0].split(' ').length >= 3, `${it.id}: too short to scramble`);
      }
    }
  }
});

test('modern orthography in lesson content', () => {
  const romanian = ilr.lessons.flatMap(l => [
    ...l.cards.filter(c => !c.ref).flatMap(c => [...c.ro, c.def, c.plural, ...(c.forms || [])]),
    ...(l.grammar || []).flatMap(g => [...g.examples.map(e => e.ro), ...g.items.flatMap(i => [...i.answer, ...(i.options || [])])]),
  ]).filter(Boolean);
  for (const s of romanian) {
    assert.doesNotMatch(s, /[şţŞŢ]/, `cedilla in "${s}"`);
    assert.doesNotMatch(s, /\bsînt/, `"${s}" should use sunt`);
    for (const w of s.toLowerCase().split(/[\s,?!.…()→–-]+/)) assert.doesNotMatch(w, /.î./, `"${w}" should use â`);
  }
});
