import { h, clear, answerInput, diacriticsBar, speakerButton, shuffle, pick, animate } from '../ui.js';
import { activeCards, getSettings, saveCard, state } from '../store.js';
import { review, isDue, retrievability } from '../srs.js';
import { checkAnswer, norm } from '../answer.js';
import { speak, hasVoice } from '../tts.js';
import { dayKey } from '../day.js';
import { award } from '../points.js';
import { cheer, confetti, mascot, sound } from '../fx.js';

const SESSION_SIZE = 20;
const MAX_RETRIES = 2;
const GENDER = { m: 'masculine', f: 'feminine', n: 'neuter' };

function plan() {
  const today = dayKey();
  const s = getSettings();
  const cards = activeCards();
  const due = cards.filter(c => isDue(c.srs, today))
    // Lowest recall probability first: the cards most at risk of being forgotten.
    .sort((a, b) => retrievability(a.srs, today) - retrievability(b.srs, today));
  const fresh = cards.filter(c => c.srs.state === 'new').sort((a, b) => a.order - b.order);
  const nNew = Math.min(s.newPerSession, fresh.length);
  const nRev = Math.min(SESSION_SIZE - nNew, due.length);
  return {
    due: due.slice(0, nRev),
    fresh: fresh.slice(0, nNew),
    learned: cards.filter(c => c.srs.state === 'review'),
  };
}

function pickExercise(card, relaxed) {
  const voice = hasVoice() && 'listen';
  let opts;
  if (relaxed) opts = ['flash-ro', 'flash-en', 'mc-ro', 'mc-en', 'type-en', 'type-ro', voice];
  else if (card.srs.s < 4) opts = ['mc-ro', 'mc-en', 'flash-ro'];
  else if (card.srs.s < 15) opts = ['flash-ro', 'flash-en', 'type-en', 'type-ro', 'mc-en'];
  else opts = ['type-en', 'type-en', 'flash-en', 'type-ro', voice];
  return pick(opts.filter(Boolean));
}

// Interleave reviews with new cards: meet → (a few cards later) recognition test → typed EN→RO.
function buildQueue(due, fresh) {
  const R = due.map(card => ({ card, kind: 'test', ex: pickExercise(card), srs: true }));
  const out = [], pending = [];
  let r = 0, n = 0;
  while (r < R.length || n < fresh.length || pending.length) {
    const ready = pending.findIndex(p => p.at <= out.length);
    if (ready >= 0) { out.push(pending.splice(ready, 1)[0].item); continue; }
    if (n < fresh.length && (out.length % 3 === 0 || r >= R.length)) {
      const card = fresh[n++];
      out.push({ card, kind: 'meet' });
      pending.push({ item: { card, kind: 'test', ex: 'mc-ro', srs: true }, at: out.length + (R.length ? 2 : 1) });
      pending.push({ item: { card, kind: 'test', ex: 'type-en', srs: false }, at: out.length + 6 });
      continue;
    }
    if (r < R.length) { out.push(R[r++]); continue; }
    pending.sort((a, b) => a.at - b.at);
    out.push(pending.shift().item);
  }
  return out;
}

function distractors(card, field, n = 3) {
  const main = norm(card[field][0]);
  const accepted = new Set(card[field].map(norm));
  const others = activeCards().filter(c => c.id !== card.id);
  const tiers = [
    others.filter(c => c.deck === card.deck && c.type === card.type),
    others.filter(c => c.type === card.type),
    others,
  ];
  const chosen = [], seen = new Set();
  for (const tier of tiers) {
    for (const c of shuffle(tier)) {
      if (chosen.length >= n) return chosen;
      const t = norm(c[field][0]);
      if (seen.has(t) || accepted.has(t) || c[field].some(x => norm(x) === main)) continue;
      seen.add(t);
      chosen.push(c[field][0]);
    }
  }
  return chosen;
}

function extrasFor(card) {
  if (card.type === 'noun' && card.gender) {
    return h('div', { class: 'extras' },
      h('span', { class: `chip g-${card.gender}` }, GENDER[card.gender]),
      card.def && h('span', { class: 'chip' }, `the: ${card.def}`),
      card.plural && h('span', { class: 'chip' }, `plural: ${card.plural}`));
  }
  if (card.type === 'adjective' && card.forms) {
    const [msg, fsg, mpl, fpl] = card.forms;
    return h('table', { class: 'adj-forms' },
      h('tr', {}, h('th', {}), h('th', {}, 'sg'), h('th', {}, 'pl')),
      h('tr', {}, h('th', {}, 'm'), h('td', {}, msg), h('td', {}, mpl)),
      h('tr', {}, h('th', {}, 'f'), h('td', {}, fsg), h('td', {}, fpl)));
  }
  if (card.type === 'verb' && card.verb && state.verbs.has(card.verb)) {
    return h('div', { class: 'extras' }, h('span', { class: 'chip' }, '🐺 Conjugate it in Verb mode'));
  }
  return null;
}

export function renderPractice(root) {
  const p = plan();
  const s = getSettings();
  const size = p.due.length + p.fresh.length;
  const screen = h('section', { class: 'screen practice-start' });
  root.append(screen);

  if (p.due.length) {
    screen.append(h('div', { class: 'card center' },
      h('div', { class: 'start-emoji' }, '📚'),
      h('h1', {}, `A session of ${size} is ready`),
      p.fresh.length ? h('p', {}, `Including ${p.fresh.length} new word${p.fresh.length > 1 ? 's' : ''} to meet.`) : null,
      h('button', { class: 'btn primary big', onclick: () => start(root, buildQueue(p.due, p.fresh), 'srs') }, 'Start')));
    return;
  }

  const options = [];
  if (p.fresh.length) {
    options.push(h('button', { class: 'btn primary big', onclick: () => start(root, buildQueue([], p.fresh), 'srs') },
      `✨ Learn ${p.fresh.length} new word${p.fresh.length > 1 ? 's' : ''}`));
  }
  if (p.learned.length) {
    options.push(h('button', { class: 'btn secondary big', onclick: () => start(root, relaxedQueue(p.learned), 'relaxed') },
      '🌿 Relaxed review'));
  }
  if (!p.learned.length && p.fresh.length) {
    screen.append(h('div', { class: 'card center' },
      h('div', { class: 'start-emoji' }, '🌱'),
      h('h1', {}, 'Let’s begin!'),
      h('p', {}, 'Meet your first Romanian words. Each one is introduced before you are asked about it.'),
      ...options));
    return;
  }
  screen.append(h('div', { class: 'card center' },
    h('div', { class: 'start-emoji' }, '🌤️'),
    h('h1', {}, 'All caught up!'),
    h('p', {}, [
      'Nothing is scheduled right now.',
      p.fresh.length && p.learned.length ? 'Want to meet new words, or play with ones you know?' : p.fresh.length ? 'Want to meet some new words?' : '',
      p.learned.length ? 'Relaxed review earns points without changing your schedule.' : '',
      !p.fresh.length && s.newPerSession === 0 ? 'New words are set to 0 per session — you can change that in Settings.' : '',
      !options.length ? 'Come back any time. 😊' : '',
    ].filter(Boolean).join(' ')),
    ...options));
}

function relaxedQueue(learned) {
  return shuffle(learned).slice(0, SESSION_SIZE).map(card => ({ card, kind: 'test', ex: pickExercise(card, true), srs: false, relaxed: true }));
}

function start(root, items, mode) {
  clear(root);
  const sess = { items, i: 0, graded: new Set(), retries: new Map(), wrong: false, points: 0, correct: 0, answered: 0, mode };
  const m = mascot();
  const fill = h('div', { class: 'progress-fill' });
  const stage = h('div', { class: 'stage' });
  root.append(h('section', { class: 'screen practice' },
    h('div', { class: 'top-row' }, h('div', { class: 'progress-bar' }, fill), m.el),
    stage));

  const next = () => {
    if (!stage.isConnected) return; // the user left mid-session
    fill.style.width = `${(sess.i / sess.items.length) * 100}%`;
    if (sess.i >= sess.items.length) return finish(root, sess);
    const item = sess.items[sess.i++];
    clear(stage);
    const render = item.kind === 'meet' ? renderMeet : EXERCISES[item.ex] || EXERCISES['mc-ro'];
    render(stage, item, { sess, next, m });
  };
  next();
}

async function grade(item, ok, rating, ctx) {
  const { sess } = ctx;
  const card = item.card;
  const today = dayKey();
  let pts = 0;
  if (item.srs && !sess.graded.has(card.id)) {
    sess.graded.add(card.id);
    const special = card.srs.ivl >= 21 || (card.srs.lastRating === 1 && card.srs.last < today);
    if (ok) pts = special ? 15 : 10;
    card.srs = review(card.srs, rating, today);
  } else if (ok) {
    pts = 10;
  }
  card.history.push({ t: Date.now(), ex: item.ex, ok, ...(item.relaxed ? { relaxed: true } : {}) });
  if (card.history.length > 200) card.history.splice(0, card.history.length - 200);
  if (ok && !card.correctDays.includes(today)) card.correctDays.push(today);
  await saveCard(card);

  sess.answered++;
  if (ok) sess.correct++;
  else {
    sess.wrong = true;
    const n = sess.retries.get(card.id) || 0;
    if (n < MAX_RETRIES) {
      sess.retries.set(card.id, n + 1);
      const ex = item.ex.startsWith('flash') ? item.ex : item.ex === 'mc-ro' ? 'mc-ro' : 'mc-en';
      sess.items.splice(Math.min(sess.i + 3, sess.items.length), 0, { card, kind: 'test', ex, srs: false, relaxed: item.relaxed });
    }
  }
  if (pts) {
    sess.points += pts;
    await award(pts);
  }
  return pts;
}

// ---------- feedback ----------
function showFeedback(box, { ok, exact, answer, pts }, ctx, card) {
  clear(box);
  box.className = 'feedback ' + (ok ? 'good' : 'oops');
  if (ok) {
    const c = cheer();
    box.append(h('div', { class: 'fb-title' }, c, pts ? h('span', { class: 'pts-pop' }, `+${pts}`) : null));
    if (!exact) box.append(h('div', { class: 'fb-detail' }, 'Spelling: ', h('b', {}, answer)));
    sound.correct();
    ctx.m.react('happy', c);
  } else {
    box.append(h('div', { class: 'fb-title' }, 'Almost! The answer is:'), h('div', { class: 'fb-answer' }, answer));
    ctx.m.react('oops', 'Data viitoare!');
  }
  animate(box, ok ? 'pop' : 'shake');
  speak(card.ro[0]);
}

// Typed exercises keep focus in the (read-only) input so the phone keyboard stays open;
// Enter there continues.
function continueButton(ctx, focus = true) {
  const btn = h('button', { class: 'btn primary big continue', onclick: ctx.next }, 'Continue');
  if (focus) setTimeout(() => btn.focus({ preventScroll: true }), 30);
  return btn;
}

// ---------- meet the word ----------
function renderMeet(stage, item, ctx) {
  const { card } = item;
  speak(card.ro[0]);
  stage.append(h('div', { class: 'ex-card meet pop-in' },
    h('div', { class: 'ex-kind' }, '✨ Meet a new word'),
    h('div', { class: 'prompt ro' }, card.ro[0], speakerButton(card.ro[0])),
    h('div', { class: 'meaning' }, card.en[0]),
    extrasFor(card),
    h('button', {
      class: 'btn primary big', onclick: async e => {
        e.currentTarget.disabled = true;
        card.introduced ||= dayKey();
        await saveCard(card);
        ctx.sess.points += 5;
        sound.pop();
        await award(5);
        ctx.next();
      },
    }, 'Got it!  +5')));
}

// ---------- flashcards ----------
function renderFlash(dir) {
  return (stage, item, ctx) => {
    const { card } = item;
    const front = dir === 'ro' ? card.ro[0] : card.en[0];
    const back = dir === 'ro' ? card.en[0] : card.ro[0];
    const answerBox = h('div', { class: 'flash-back hidden' }, h('div', { class: `prompt small ${dir === 'ro' ? '' : 'ro'}` }, back), extrasFor(card));
    const fb = h('div', { class: 'feedback' });
    const actions = h('div', { class: 'actions' });
    const rate = async (rating) => {
      actions.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const ok = rating > 1;
      const pts = await grade(item, ok, rating, ctx);
      if (ok) {
        const c = cheer();
        fb.className = 'feedback good';
        fb.replaceChildren(h('div', { class: 'fb-title' }, c, pts ? h('span', { class: 'pts-pop' }, `+${pts}`) : null));
        sound.correct();
        ctx.m.react('happy', c);
        animate(fb, 'pop');
      } else {
        fb.className = 'feedback oops';
        fb.replaceChildren(h('div', { class: 'fb-title' }, 'No worries — it will come back soon.'));
        ctx.m.react('oops');
      }
      setTimeout(ctx.next, ok ? 750 : 1100);
    };
    const reveal = h('button', {
      class: 'btn primary big', onclick: () => {
        answerBox.classList.remove('hidden');
        animate(answerBox, 'flip-in');
        speak(card.ro[0]);
        actions.replaceChildren(
          h('button', { class: 'btn rate again', onclick: () => rate(1) }, 'Again'),
          h('button', { class: 'btn rate good', onclick: () => rate(3) }, 'Good'),
          h('button', { class: 'btn rate easy', onclick: () => rate(4) }, 'Easy'));
      },
    }, 'Show answer');
    actions.append(reveal);
    stage.append(h('div', { class: 'ex-card flash pop-in' },
      h('div', { class: 'ex-kind' }, dir === 'ro' ? '🃏 What does it mean?' : '🃏 How do you say it in Romanian?'),
      h('div', { class: `prompt ${dir === 'ro' ? 'ro' : ''}` }, front, dir === 'ro' ? speakerButton(card.ro[0]) : null),
      answerBox, fb, actions));
  };
}

// ---------- multiple choice ----------
function renderMC(dir) {
  return (stage, item, ctx) => {
    const { card } = item;
    const field = dir === 'ro' ? 'en' : 'ro';
    const correct = card[field][0];
    const options = shuffle([correct, ...distractors(card, field)]);
    const fb = h('div', { class: 'feedback' });
    const actions = h('div', { class: 'actions' });
    const buttons = options.map(opt => h('button', {
      class: `btn option ${dir === 'ro' ? '' : 'ro'}`,
      onclick: async e => {
        const ok = opt === correct;
        buttons.forEach(b => {
          b.disabled = true;
          if (b.textContent === correct) b.classList.add('right');
        });
        if (!ok) e.currentTarget.classList.add('wrong');
        else animate(e.currentTarget, 'pop');
        const pts = await grade(item, ok, ok ? 3 : 1, ctx);
        if (!fb.isConnected) return;
        showFeedback(fb, { ok, exact: true, answer: correct, pts }, ctx, card);
        actions.append(continueButton(ctx));
      },
    }, opt));
    stage.append(h('div', { class: 'ex-card mc pop-in' },
      h('div', { class: 'ex-kind' }, dir === 'ro' ? '🎯 Choose the meaning' : '🎯 Choose the Romanian'),
      h('div', { class: `prompt ${dir === 'ro' ? 'ro' : ''}` }, dir === 'ro' ? card.ro[0] : card.en[0]),
      h('div', { class: 'options' }, buttons),
      fb, actions));
  };
}

// ---------- typed answer / listen and type ----------
function renderTyped(kind) {
  return (stage, item, ctx) => {
    const { card } = item;
    const answerLang = kind === 'type-ro' ? 'en' : 'ro';
    const expected = answerLang === 'ro' ? card.ro : card.en;
    const input = answerInput({ placeholder: answerLang === 'ro' ? 'Type in Romanian…' : 'Type in English…', lang: answerLang === 'ro' ? 'ro' : 'en' });
    const fb = h('div', { class: 'feedback' });
    const actions = h('div', { class: 'actions' });
    let answered = false;

    const submit = async (giveUp = false) => {
      if (answered) return ctx.next();
      if (!giveUp && !input.value.trim()) return;
      answered = true;
      input.readOnly = true;
      const res = giveUp ? { ok: false, exact: false, answer: expected[0] }
        : checkAnswer(input.value, expected, { lang: answerLang, lenient: answerLang === 'ro' && getSettings().lenient, kind: card.type === 'verb' ? 'verb' : '' });
      input.classList.add(res.ok ? 'right' : 'wrong');
      const pts = await grade(item, res.ok, res.ok ? 3 : 1, ctx);
      if (!input.isConnected) return; // already moved on
      const shown = answerLang === 'ro' ? res.answer : expected[0];
      showFeedback(fb, { ...res, answer: kind === 'listen' ? `${card.ro[0]} — ${card.en[0]}` : shown, pts }, ctx, card);
      actions.replaceChildren(continueButton(ctx, false));
      if (res.ok) animate(input, 'pop'); else animate(input, 'shake');
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

    let prompt;
    if (kind === 'listen') {
      speak(card.ro[0]);
      prompt = h('div', { class: 'prompt' }, h('button', { class: 'btn listen-big', type: 'button', onclick: () => { speak(card.ro[0]); input.focus(); } }, '🔊 Play again'));
    } else {
      prompt = h('div', { class: `prompt ${kind === 'type-ro' ? 'ro' : ''}` }, kind === 'type-ro' ? card.ro[0] : card.en[0]);
    }
    actions.append(
      h('button', { class: 'btn primary big', onclick: () => submit() }, 'Check'),
      h('button', { class: 'btn link', onclick: () => submit(true) }, 'Show me'));
    stage.append(h('div', { class: 'ex-card typed pop-in' },
      h('div', { class: 'ex-kind' }, kind === 'listen' ? '👂 Listen and type' : kind === 'type-ro' ? '✏️ Type the meaning' : '✏️ Type it in Romanian'),
      prompt,
      input,
      answerLang === 'ro' ? diacriticsBar() : null,
      fb, actions));
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
}

const EXERCISES = {
  'flash-ro': renderFlash('ro'),
  'flash-en': renderFlash('en'),
  'mc-ro': renderMC('ro'),
  'mc-en': renderMC('en'),
  'type-en': renderTyped('type-en'),
  'type-ro': renderTyped('type-ro'),
  'listen': renderTyped('listen'),
};

async function finish(root, sess) {
  clear(root);
  const perfect = !sess.wrong && sess.answered > 0;
  if (perfect) {
    sess.points += 20;
    await award(20);
  }
  root.append(h('section', { class: 'screen done' },
    h('div', { class: 'card center pop-in' },
      h('div', { class: 'start-emoji' }, perfect ? '🌟' : '🎉'),
      h('h1', {}, perfect ? 'Perfect session!' : 'Session complete!'),
      h('div', { class: 'big-points' }, `+${sess.points}`, h('small', {}, ' points')),
      sess.answered ? h('p', {}, `${sess.correct} of ${sess.answered} answers correct${perfect ? ' — including a +20 perfect bonus!' : '. Lovely work.'}`) : null,
      h('div', { class: 'stack' },
        h('a', { class: 'btn primary big', href: '#/' }, 'Home'),
        h('button', { class: 'btn secondary big', onclick: () => { clear(root); renderPractice(root); } }, 'Keep going')))));
  if (perfect) { confetti(); sound.celebrate(); }
}
