// Derived progress: totals, weeks, levels, learned words, verb stars, badges.
import { state } from './store.js';
import { dayKey, weekStart, weekDays } from './day.js';

export const totalPoints = () => [...state.points.values()].reduce((a, b) => a + b, 0);

// Level L starts at 50·L·(L−1) points: 0, 100, 300, 600, 1000, 1500, …
const levelStart = L => 50 * L * (L - 1);
const LEVEL_NAMES = ['Începător', 'Curios', 'Explorator', 'Vorbăreț', 'Călător', 'Pasionat', 'Isteț', 'Fluent-ish', 'Maestru', 'Legendă'];

export function level(total = totalPoints()) {
  let L = 1;
  while (levelStart(L + 1) <= total) L++;
  const from = levelStart(L), to = levelStart(L + 1);
  return { level: L, name: LEVEL_NAMES[Math.min(L - 1, LEVEL_NAMES.length - 1)], from, to, frac: (total - from) / (to - from) };
}

export function weekPoints(key = dayKey()) {
  return weekDays(key).map(d => ({ day: d, points: state.points.get(d) || 0 }));
}

export function weekTotals() {
  const weeks = new Map();
  for (const [day, pts] of state.points) {
    const w = weekStart(day);
    weeks.set(w, (weeks.get(w) || 0) + pts);
  }
  return weeks;
}

export function bestWeek() {
  let best = 0;
  for (const v of weekTotals().values()) best = Math.max(best, v);
  return best;
}

export const isLearned = card => (card.correctDays?.length || 0) >= 2;
export const wordsLearned = () => [...state.cards.values()].filter(c => !c.retired && isLearned(c)).length;
export const wordsMet = () => [...state.cards.values()].filter(c => !c.retired && (c.introduced || c.srs.state !== 'new')).length;

// ---- verbs ----
export const cellMastered = cell => (cell?.days.length || 0) >= 2;

export function cellStage(cell) {
  if (!cell || !cell.count) return 0;
  if (cellMastered(cell)) return 3;
  return cell.count >= 3 ? 2 : 1;
}

export function personsFor(tenseId) {
  return tenseId === 'imperativ' ? state.verbData.impPersons : state.verbData.persons;
}

export function tenseMastered(verb, tenseId) {
  if (!verb.forms[tenseId]) return false;
  return personsFor(tenseId).every(p => cellMastered(state.mastery.get(`${verb.id}|${tenseId}|${p}`)));
}

export const verbStars = verb => state.verbData.tenses.filter(t => tenseMastered(verb, t.id)).length;

// A verb is fully mastered when every tense it has is mastered, except the optional perfect simplu.
export const verbMastered = verb => state.verbData.tenses
  .filter(t => !t.advanced && verb.forms[t.id])
  .every(t => tenseMastered(verb, t.id));

export function verbSummary() {
  let stars = 0, mastered = 0;
  for (const v of state.verbs.values()) {
    stars += verbStars(v);
    if (verbMastered(v)) mastered++;
  }
  return { stars, mastered };
}

// ---- badges (all based on cumulative progress, so they only go up) ----
export function badges() {
  const learned = wordsLearned();
  const met = wordsMet();
  const total = totalPoints();
  const { stars, mastered } = verbSummary();
  const best = bestWeek();
  const hasCustom = [...state.cards.values()].some(c => c.custom);
  const b = (id, icon, name, desc, earned) => ({ id, icon, name, desc, earned });
  return [
    b('met1', '👋', 'Salut!', 'Meet your first word', met >= 1),
    b('learn10', '🌱', 'Primii pași', '10 words learned', learned >= 10),
    b('learn50', '🌿', 'Creștere', '50 words learned', learned >= 50),
    b('learn100', '🌳', 'O sută!', '100 words learned', learned >= 100),
    b('learn200', '🏔️', 'Munte de cuvinte', '200 words learned', learned >= 200),
    b('star1', '⭐', 'Prima stea', 'Master your first verb tense', stars >= 1),
    b('star10', '🌟', 'Constelație', '10 verb tenses mastered', stars >= 10),
    b('star50', '✨', 'Calea Lactee', '50 verb tenses mastered', stars >= 50),
    b('verb1', '🐺', 'Lupul verbelor', 'First verb fully mastered', mastered >= 1),
    b('verb10', '👑', 'Regele verbelor', '10 verbs fully mastered', mastered >= 10),
    b('pts1000', '🎈', 'O mie', '1,000 total points', total >= 1000),
    b('pts5000', '🚀', 'Cinci mii', '5,000 total points', total >= 5000),
    b('pts25000', '🏆', 'Campion', '25,000 total points', total >= 25000),
    b('week500', '📈', 'Săptămână grozavă', '500 points in one week', best >= 500),
    b('custom', '✏️', 'Creativ', 'Add your own card', hasCustom),
  ];
}
