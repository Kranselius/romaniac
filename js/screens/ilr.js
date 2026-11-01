import { h, answerInput, diacriticsBar } from '../ui.js';
import { state, lessonById, lessonCards, addCustomCard, deleteCard } from '../store.js';
import { isLearned, cellMastered } from '../progress.js';
import { speak, hasVoice } from '../tts.js';
import { toast } from '../fx.js';
import { renderPractice } from './practice.js';
import { renderGrammar, grammarKey } from './grammar.js';

const RECENT = 2; // "Review before next class" covers the last two lessons

const lessonName = l => `Lecția ${l.number}`;

// A scope is one lesson, "all" (everything so far) or "recent" (before next class).
function resolveScope(id) {
  const lessons = state.lessons;
  if (id === 'all') return { id, lessons, title: 'Everything so far' };
  if (id === 'recent') {
    const recent = lessons.slice(-RECENT);
    const span = recent.length > 1 ? `Lecția ${recent[0].number}–${recent.at(-1).number}` : lessonName(recent[0] || { number: '' });
    return { id, lessons: recent, title: `Before next class · ${span}` };
  }
  const lesson = lessonById(id);
  return lesson && { id, lessons: [lesson], lesson, title: `${lessonName(lesson)} · ${lesson.title}` };
}

function scopeCards(scope) {
  const byId = new Map();
  for (const l of scope.lessons) for (const c of lessonCards(l)) byId.set(c.id, c);
  return [...byId.values()];
}

function stats(scope) {
  const cards = scopeCards(scope);
  const items = scope.lessons.flatMap(l => (l.grammar || []).flatMap(g => g.items));
  return {
    words: cards.length,
    learned: cards.filter(isLearned).length,
    items: items.length,
    mastered: items.filter(it => cellMastered(state.mastery.get(grammarKey(it)))).length,
  };
}

function progressBlock(scope) {
  const s = stats(scope);
  const total = s.words + s.items;
  const frac = total ? (s.learned + s.mastered) / total : 0;
  return h('div', { class: 'lesson-progress' },
    h('div', { class: 'level-bar' }, h('div', { class: 'level-fill', style: { width: `${Math.round(frac * 100)}%` } })),
    h('div', { class: 'muted small' }, `${s.learned}/${s.words} words learned`, s.items ? ` · ${s.mastered}/${s.items} grammar mastered` : ''));
}

// ================= lesson list =================
export function renderIlrHome(root) {
  const lessons = state.lessons;
  const screen = h('section', { class: 'screen ilr-home' },
    h('h1', {}, '🎓 ILR Mode'),
    h('p', { class: 'muted' }, 'Practice what you learn in class, lesson by lesson.'));
  root.append(screen);

  if (!lessons.length) {
    screen.append(h('div', { class: 'card center' },
      h('div', { class: 'start-emoji' }, '📒'),
      h('h2', {}, 'No lessons yet'),
      h('p', {}, 'After class, put the lesson’s PDFs and notes in your ilr folder and ask Claude Code to add the lesson.')));
    return;
  }

  screen.append(h('div', { class: 'scope-buttons' },
    h('a', { class: 'btn primary big', href: '#/ilr/recent' }, '⏰ Review before next class'),
    h('a', { class: 'btn secondary big', href: '#/ilr/all' }, '📚 Everything so far')));

  for (const l of lessons) {
    screen.append(h('a', { class: 'lesson-row card', href: `#/ilr/${l.id}` },
      h('div', { class: 'lesson-num' }, l.number),
      h('div', { class: 'lesson-info' },
        h('div', { class: 'lesson-title' }, `${lessonName(l)} · ${l.title}`),
        h('div', { class: 'muted small' }, l.topic),
        progressBlock(resolveScope(l.id)))));
  }
}

// ================= lesson page (or all / recent) =================
export function renderIlrScope(root, id) {
  const scope = resolveScope(id);
  if (!scope || !scope.lessons.length) { location.hash = '#/ilr'; return; }
  const s = stats(scope);
  const verbIds = [...new Set(scope.lessons.flatMap(l => l.verbs || []))].filter(v => state.verbs.has(v));

  root.append(h('section', { class: 'screen ilr-lesson' },
    h('div', { class: 'card' },
      h('h1', {}, scope.title),
      scope.lesson ? h('p', { class: 'muted' }, scope.lesson.topic) : h('p', { class: 'muted' }, scope.lessons.map(lessonName).join(', ')),
      progressBlock(scope)),
    h('div', { class: 'stack' },
      h('a', { class: 'btn primary big', href: `#/ilr/${id}/practice` }, `📚 Practice words (${s.words})`),
      s.items ? h('a', { class: 'btn secondary big', href: `#/ilr/${id}/grammar` }, `🧠 Grammar drills (${s.items})`) : null,
      scope.lesson ? h('a', { class: 'btn plain big', href: `#/ilr/${id}/sheet` }, '📄 Lesson sheet') : null),
    verbIds.length ? h('div', { class: 'card' },
      h('h2', {}, 'Verbs'),
      h('div', { class: 'verb-chips' }, verbIds.map(v => h('a', { class: 'chip toggle', href: `#/verb/${v}` }, state.verbs.get(v).inf)))) : null,
    scope.lesson ? addToLesson(scope.lesson) : null));
}

function addToLesson(lesson) {
  const ro = answerInput({ placeholder: 'Romanian, e.g. pepene / pepenele' });
  const en = h('input', { type: 'text', class: 'answer-input', placeholder: 'English, e.g. melon', autocomplete: 'off' });
  const type = h('select', { class: 'select' }, ['phrase', 'noun', 'verb', 'adjective', 'other'].map(t => h('option', { value: t }, t)));
  const list = h('div', { class: 'custom-list' });
  const split = v => v.split(/[;\/]/).map(x => x.trim()).filter(Boolean);

  const drawList = () => {
    const mine = [...state.cards.values()].filter(c => c.custom && c.deck === lesson.id && !c.retired);
    list.replaceChildren(...(mine.length ? mine.map(c => h('div', { class: 'custom-row' },
      h('span', { class: 'ro' }, c.ro[0]), h('span', { class: 'muted' }, ` — ${c.en[0]}`),
      h('button', {
        class: 'btn link small', onclick: async () => {
          if (!confirm(`Delete “${c.ro[0]}” and its progress?`)) return;
          await deleteCard(c.id);
          drawList();
        },
      }, 'Delete'))) : [h('p', { class: 'muted small' }, 'Words you add here are practiced with this lesson.')]));
  };
  const add = async () => {
    const r = split(ro.value), e = split(en.value);
    if (!r.length || !e.length) { toast('Please fill in both Romanian and English.'); return; }
    await addCustomCard({ deck: lesson.id, ilr: true, type: type.value, ro: r, en: e });
    ro.value = en.value = '';
    toast(`Added “${r[0]}” to ${lessonName(lesson)} ⭐`);
    drawList();
    ro.focus();
  };
  drawList();
  return h('div', { class: 'card' },
    h('h2', {}, '✏️ Add to lesson'),
    h('div', { class: 'custom-form' },
      ro, en, type, diacriticsBar(),
      h('div', { class: 'muted small' }, 'Separate alternatives with /'),
      h('button', { class: 'btn primary big', onclick: add }, 'Add')),
    h('h3', {}, 'Added by you'),
    list);
}

// ================= lesson sheet =================
export function renderIlrSheet(root, id) {
  const lesson = lessonById(id);
  if (!lesson) { location.hash = '#/ilr'; return; }
  const cards = lessonCards(lesson);
  const say = text => (hasVoice() ? { class: 'say', onclick: () => speak(text) } : {});
  const group = (title, list, row) => list.length
    ? h('div', { class: 'card sheet' }, h('h2', {}, title), h('table', { class: 'sheet-table' }, list.map(row))) : null;

  const nouns = cards.filter(c => c.type === 'noun');
  const adjs = cards.filter(c => c.type === 'adjective');
  const rest = cards.filter(c => c.type !== 'noun' && c.type !== 'adjective');
  const verbs = (lesson.verbs || []).map(v => state.verbs.get(v)).filter(Boolean);

  root.append(h('section', { class: 'screen ilr-sheet' },
    h('h1', {}, `${lessonName(lesson)} · ${lesson.title}`),
    h('p', { class: 'muted' }, lesson.topic),
    group('Phrases and words', rest, c => h('tr', {},
      h('td', { class: 'ro' }, h('span', say(c.ro[0]), c.ro[0])), h('td', {}, c.en[0]))),
    group('Nouns', nouns, c => h('tr', {},
      h('td', { class: 'ro' }, h('span', say(c.ro[0]), c.ro[0]), ' ', h('span', { class: `chip g-${c.gender}` }, c.gender)),
      h('td', {}, c.en[0], h('div', { class: 'muted small' }, [c.def, c.plural && `pl. ${c.plural}`].filter(Boolean).join(' · '))))),
    group('Adjectives', adjs, c => h('tr', {},
      h('td', { class: 'ro' }, h('span', say(c.ro[0]), c.ro[0])),
      h('td', {}, c.en[0], c.forms ? h('div', { class: 'muted small' }, c.forms.join(' · ')) : null))),
    verbs.length ? group('Verbs', verbs, v => h('tr', {},
      h('td', { class: 'ro' }, h('a', { href: `#/verb/${v.id}` }, v.inf)), h('td', {}, v.en))) : null,
    ...(lesson.grammar || []).map(g => h('div', { class: 'card sheet' },
      h('h2', {}, g.title),
      h('p', {}, g.rule),
      g.examples?.length ? h('ul', {}, g.examples.map(e => h('li', {}, h('span', { ...say(e.ro), class: 'ro say' }, e.ro), ' — ', e.en))) : null))));
}

// ================= practice / grammar entry points =================
export function renderIlrPractice(root, id) {
  const scope = resolveScope(id);
  if (!scope || !scope.lessons.length) { location.hash = '#/ilr'; return; }
  renderPractice(root, { title: scope.title, cards: () => scopeCards(scope), newCap: 10, back: `#/ilr/${id}` });
}

export function renderIlrGrammar(root, id) {
  const scope = resolveScope(id);
  if (!scope || !scope.lessons.length) { location.hash = '#/ilr'; return; }
  renderGrammar(root, { title: scope.title, lessons: scope.lessons, back: `#/ilr/${id}` });
}

