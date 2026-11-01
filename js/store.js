// In-memory app state, written through to IndexedDB.
import * as db from './db.js';
import { newSrs } from './srs.js';
import { dayKey } from './day.js';
import { norm } from './answer.js';

export const DEFAULT_SETTINGS = {
  goalOn: true,
  dailyGoal: 100,
  newPerSession: 5,
  lenient: true,
  sound: true,
  ttsRate: 0.9,
  mascot: true,
  ilrInReviews: true,
};

export const state = {
  cards: new Map(),    // id → card
  mastery: new Map(),  // "verbId|tense|person" or "ilr|itemId" → { key, count, days: [] }
  points: new Map(),   // day → points
  meta: {},            // key → value
  decks: [],
  verbData: null,      // { persons, impPersons, tenses, verbs }
  verbs: new Map(),    // id → verb
  lessons: [],         // ILR lessons from data/ilr.json, by number
};

const CONTENT_FIELDS = ['deck', 'type', 'ro', 'en', 'gender', 'plural', 'def', 'forms', 'verb', 'ilr'];

export async function initStore() {
  const [cards, mastery, points, meta, vocab, verbData, ilr] = await Promise.all([
    db.getAll('cards'), db.getAll('mastery'), db.getAll('points'), db.getAll('meta'),
    fetch('data/vocab.json').then(r => r.json()),
    fetch('data/verbs.json').then(r => r.json()),
    fetch('data/ilr.json').then(r => r.json()).catch(() => ({ lessons: [] })),
  ]);
  state.cards = new Map(cards.map(c => [c.id, c]));
  state.mastery = new Map(mastery.map(m => [m.key, m]));
  state.points = new Map(points.map(p => [p.day, p.points]));
  state.meta = Object.fromEntries(meta.map(m => [m.key, m.value]));
  state.decks = vocab.decks;
  state.verbData = verbData;
  state.verbs = new Map(verbData.verbs.map(v => [v.id, v]));
  state.lessons = [...ilr.lessons].sort((a, b) => a.number - b.number);

  // A lesson's own cards live in a deck named after the lesson; refs point at starter cards.
  const ilrCards = state.lessons.flatMap(l => l.cards.filter(c => !c.ref).map(c => ({ ...c, deck: l.id, ilr: true })));
  await mergeContent([...vocab.cards, ...ilrCards]);
  await foldQuickAdds();

  if (!state.meta.firstRun) {
    await setMeta('firstRun', new Date().toISOString());
    try { await setMeta('persisted', await navigator.storage?.persist?.() ?? false); } catch { /* not supported */ }
  }
}

// Merge shipped cards into stored ones by stable id, keeping all progress.
async function mergeContent(contentCards) {
  const changed = [];
  const shipped = new Set();
  contentCards.forEach((c, order) => {
    shipped.add(c.id);
    const existing = state.cards.get(c.id);
    if (!existing) {
      const card = { ...c, order, srs: newSrs(), history: [], correctDays: [], introduced: null };
      state.cards.set(c.id, card);
      changed.push(card);
      return;
    }
    let dirty = existing.order !== order || existing.retired;
    for (const f of CONTENT_FIELDS) {
      if (JSON.stringify(existing[f]) !== JSON.stringify(c[f])) {
        if (c[f] === undefined) delete existing[f]; else existing[f] = c[f];
        dirty = true;
      }
    }
    if (dirty) {
      existing.order = order;
      delete existing.retired;
      changed.push(existing);
    }
  });
  // Cards removed from the shipped data are kept (with progress) but hidden.
  for (const card of state.cards.values()) {
    if (!card.custom && !shipped.has(card.id) && !card.retired) {
      card.retired = true;
      changed.push(card);
    }
  }
  await db.putMany('cards', changed);
}

// Words added on the phone with "Add to lesson" are custom cards in that lesson's deck. When a
// lesson file later ships the same word, the shipped card takes over (with the progress, if it
// is still new) and the phone's copy is retired.
async function foldQuickAdds() {
  const changed = [];
  for (const custom of state.cards.values()) {
    if (!custom.custom || !custom.ilr || custom.retired) continue;
    const shipped = [...state.cards.values()].find(c => !c.custom && !c.retired && c.deck === custom.deck && norm(c.ro[0]) === norm(custom.ro[0]));
    if (!shipped) continue;
    if (shipped.srs.state === 'new' && custom.srs.state !== 'new') {
      Object.assign(shipped, { srs: custom.srs, history: custom.history, correctDays: custom.correctDays, introduced: custom.introduced });
    }
    custom.retired = true;
    custom.mergedInto = shipped.id;
    changed.push(shipped, custom);
  }
  await db.putMany('cards', changed);
}

export const activeCards = () => [...state.cards.values()].filter(c => !c.retired);

export const lessonById = id => state.lessons.find(l => l.id === id);

// Everything practiced in a lesson, in lesson-file order: its own cards and referenced starter
// cards, then words added on the phone.
export function lessonCards(lesson) {
  const listed = lesson.cards.map(c => state.cards.get(c.ref || c.id)).filter(c => c && !c.retired);
  const added = activeCards().filter(c => c.custom && c.deck === lesson.id);
  return [...listed, ...added];
}

export const saveCard = card => db.put('cards', card);

export async function deleteCard(id) {
  state.cards.delete(id);
  await db.del('cards', id);
}

export async function addCustomCard(fields) {
  const id = 'custom.' + Date.now().toString(36);
  const card = {
    id, deck: 'custom', custom: true, order: 100000 + state.cards.size, ...fields,
    srs: newSrs(), history: [], correctDays: [], introduced: null,
  };
  state.cards.set(id, card);
  await saveCard(card);
  return card;
}

export const getSettings = () => ({ ...DEFAULT_SETTINGS, ...(state.meta.settings || {}) });
export const saveSettings = s => setMeta('settings', { ...getSettings(), ...s });

export async function setMeta(key, value) {
  state.meta[key] = value;
  await db.put('meta', { key, value });
}

// ---- points ----
export const todayPoints = () => state.points.get(dayKey()) || 0;

export async function addPointsRaw(n) {
  const day = dayKey();
  const total = (state.points.get(day) || 0) + n;
  state.points.set(day, total);
  await db.put('points', { day, points: total });
  return total;
}

// ---- verb mastery ----
export const masteryKey = (verbId, tense, person) => `${verbId}|${tense}|${person}`;

export const recordVerbCorrect = (verbId, tense, person) => recordMastery(masteryKey(verbId, tense, person));

// Correct-answer count and the days of correct answers, for a verb cell or a grammar item.
export async function recordMastery(key) {
  const cell = state.mastery.get(key) || { key, count: 0, days: [] };
  const day = dayKey();
  cell.count += 1;
  if (!cell.days.includes(day)) cell.days.push(day);
  state.mastery.set(key, cell);
  await db.put('mastery', cell);
  return cell;
}

// ---- backup ----
export function exportData() {
  return {
    app: 'romaniac',
    format: 1,
    exportedAt: new Date().toISOString(),
    cards: [...state.cards.values()],
    mastery: [...state.mastery.values()],
    points: [...state.points].map(([day, points]) => ({ day, points })),
    meta: Object.entries(state.meta).map(([key, value]) => ({ key, value })),
  };
}

export async function importData(data) {
  if (data?.app !== 'romaniac' || !Array.isArray(data.cards)) throw new Error('This file is not a Romaniac backup.');
  if (!data.cards.every(c => c?.id && c.srs && Array.isArray(c.ro) && Array.isArray(c.en))) throw new Error('This backup looks damaged, so nothing was changed.');
  await db.replaceAll({ cards: data.cards, mastery: data.mastery || [], points: data.points || [], meta: data.meta || [] });
}
