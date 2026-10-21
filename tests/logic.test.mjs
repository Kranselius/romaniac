import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { checkAnswer } from '../js/answer.js';
import { dayKey, weekStart, weekDays, daysBetween } from '../js/day.js';
import { newSrs, review, isDue } from '../js/srs.js';

test('answers: case, whitespace, trailing punctuation', () => {
  assert.ok(checkAnswer('  Bună Ziua!  ', ['Bună ziua'], { lang: 'ro' }).ok);
  assert.ok(checkAnswer('ce faci', ['Ce faci?'], { lang: 'ro' }).ok);
  assert.ok(checkAnswer('nota vă rog', ['Nota, vă rog'], { lang: 'ro' }).ok);
});

test('answers: synonyms and optional English articles', () => {
  assert.ok(checkAnswer('the dog', ['dog'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('dog', ['the dog'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('be', ['to be'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('thanks', ['thank you', 'thanks'], { lang: 'en' }).ok);
  assert.ok(!checkAnswer('cat', ['dog'], { lang: 'en' }).ok);
  assert.ok(!checkAnswer('', ['dog'], { lang: 'en' }).ok);
});

test('answers: parenthetical hints are optional', () => {
  assert.ok(checkAnswer('please', ['please (formal)'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('please formal', ['please (formal)'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('old', ['old (things)'], { lang: 'en' }).ok);
  assert.ok(checkAnswer('live', ['to live (reside)'], { lang: 'en' }).ok);
});

test('answers: cedilla equals comma-below', () => {
  const r = checkAnswer('şase', ['șase'], { lang: 'ro' });
  assert.ok(r.ok && r.exact);
  assert.ok(checkAnswer('ţară', ['țară'], { lang: 'ro' }).exact);
});

test('answers: lenient diacritics', () => {
  assert.ok(!checkAnswer('mananc', ['mănânc'], { lang: 'ro', lenient: false }).ok);
  const r = checkAnswer('mananc', ['mănânc'], { lang: 'ro', lenient: true });
  assert.ok(r.ok && !r.exact);
  assert.equal(r.answer, 'mănânc');
});

test('answers: verbs with or without "a", forms with or without pronoun', () => {
  assert.ok(checkAnswer('merge', ['a merge'], { lang: 'ro', kind: 'verb' }).ok);
  assert.ok(checkAnswer('noi am mers', ['am mers'], { lang: 'ro', kind: 'form' }).ok);
  assert.ok(!checkAnswer('am merge', ['am mers'], { lang: 'ro', kind: 'form' }).ok);
});

test('day rolls over at 04:00', () => {
  assert.equal(dayKey(new Date(2026, 9, 21, 3, 59)), '2026-10-20');
  assert.equal(dayKey(new Date(2026, 9, 21, 4, 0)), '2026-10-21');
  assert.equal(dayKey(new Date(2026, 9, 21, 23, 30)), '2026-10-21');
});

test('weeks run Monday–Sunday', () => {
  assert.equal(weekStart('2026-10-21'), '2026-10-19'); // Wednesday → Monday
  assert.equal(weekStart('2026-10-25'), '2026-10-19'); // Sunday → same week
  assert.equal(weekDays('2026-10-21').length, 7);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // across DST
});

test('FSRS: Good grows intervals, Again resets to tomorrow', () => {
  let s = review(newSrs(), 3, '2026-10-01');
  assert.equal(s.state, 'review');
  assert.ok(s.ivl >= 3);
  const first = s.ivl;
  s = review(s, 3, s.due);
  assert.ok(s.ivl > first, 'interval grows');
  const lapsed = review(s, 1, s.due);
  assert.equal(lapsed.ivl, 1);
  assert.equal(lapsed.lapses, 1);
  assert.ok(isDue(lapsed, lapsed.due) && !isDue(lapsed, '2026-10-01'));
  assert.ok(review(newSrs(), 4, '2026-10-01').ivl > review(newSrs(), 3, '2026-10-01').ivl);
});

test('service worker precaches every app file', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const root = new URL('../', import.meta.url);
  const walk = dir => readdirSync(new URL(dir, root)).flatMap(f => {
    const rel = `${dir}${f}`;
    return statSync(new URL(rel, root)).isDirectory() ? walk(`${rel}/`) : [rel];
  });
  for (const f of ['index.html', 'manifest.webmanifest', ...walk('js/'), ...walk('css/'), ...walk('data/'), ...walk('fonts/'), ...walk('icons/')]) {
    assert.ok(sw.includes(`'${f}'`), `sw.js ASSETS is missing ${f}`);
  }
});
