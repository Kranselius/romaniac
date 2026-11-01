import { h, clear, answerInput, diacriticsBar, shuffle, animate } from '../ui.js';
import { state, getSettings, recordMastery } from '../store.js';
import { checkAnswer, norm } from '../answer.js';
import { speak } from '../tts.js';
import { award } from '../points.js';
import { cheer, mascot, sound, confetti } from '../fx.js';
import { cellMastered } from '../progress.js';

const ROUND = 10;
export const grammarKey = item => `ilr|${item.id}`;

// The Romanian to read aloud after an item: an explicit `say`, the filled-in sentence, or the answer.
function spoken(item) {
  if (item.say) return item.say;
  if (!item.prompt.includes('___')) return item.answer[0];
  return item.prompt.replace(/\s*\([^)]*\)\s*$/, '').replace('___', item.answer[0]);
}

// Least-practiced items first, mastered ones last, so each round focuses on what's new.
function pickRound(all) {
  const weighted = all.map(entry => {
    const cell = state.mastery.get(grammarKey(entry.it));
    return { entry, w: (cellMastered(cell) ? 1000 : 0) + (cell?.count || 0) + Math.random() };
  });
  return shuffle(weighted.sort((a, b) => a.w - b.w).slice(0, ROUND).map(x => x.entry));
}

/** @param {{title:string, lessons:object[], back:string}} scope */
export function renderGrammar(root, scope) {
  const all = scope.lessons.flatMap(l => (l.grammar || []).flatMap(g => g.items.map(it => ({ it, g }))));
  if (!all.length) {
    root.append(h('section', { class: 'screen' }, h('div', { class: 'card center' },
      h('h1', {}, 'No grammar drills yet'), h('a', { class: 'btn primary big', href: scope.back }, 'Back'))));
    return;
  }
  startRound(root, scope, all);
}

function startRound(root, scope, all) {
  clear(root);
  const sess = { items: pickRound(all), i: 0, retried: new Set(), points: 0, correct: 0, answered: 0 };
  const m = mascot();
  const fill = h('div', { class: 'progress-fill' });
  const stage = h('div', { class: 'stage' });
  root.append(h('section', { class: 'screen practice' },
    h('div', { class: 'scope-title' }, '🎓 ', scope.title, ' · grammar'),
    h('div', { class: 'top-row' }, h('div', { class: 'progress-bar' }, fill), m.el),
    stage));

  const next = () => {
    if (!stage.isConnected) return;
    fill.style.width = `${(sess.i / sess.items.length) * 100}%`;
    if (sess.i >= sess.items.length) return finish(root, scope, all, sess);
    clear(stage);
    renderItem(stage, sess.items[sess.i++], { sess, next, m });
  };
  next();
}

function renderItem(stage, entry, ctx) {
  const { it, g } = entry;
  const fb = h('div', { class: 'feedback' });
  const actions = h('div', { class: 'actions' });
  const ruleBox = h('div', { class: 'rule-box hidden' },
    h('p', {}, g.rule),
    g.examples?.length ? h('ul', {}, g.examples.map(e => h('li', {}, h('b', { class: 'ro' }, e.ro), ' — ', e.en))) : null);
  let answered = false;

  const done = async (ok, shownAnswer) => {
    const { sess, m } = ctx;
    sess.answered++;
    if (ok) {
      sess.correct++;
      sess.points += 10;
      await recordMastery(grammarKey(it));
      await award(10);
    } else if (!sess.retried.has(it.id)) {
      sess.retried.add(it.id);
      sess.items.splice(Math.min(sess.i + 3, sess.items.length), 0, entry);
    }
    if (!fb.isConnected) return;
    fb.className = 'feedback ' + (ok ? 'good' : 'oops');
    if (ok) {
      const c = cheer();
      fb.replaceChildren(h('div', { class: 'fb-title' }, c, h('span', { class: 'pts-pop' }, '+10')),
        ...(shownAnswer ? [h('div', { class: 'fb-detail' }, 'Spelling: ', h('b', {}, shownAnswer))] : []));
      sound.correct();
      m.react('happy', c);
    } else {
      fb.replaceChildren(h('div', { class: 'fb-title' }, 'Almost! The answer is:'), h('div', { class: 'fb-answer' }, it.answer[0]));
      m.react('oops', 'Data viitoare!');
    }
    animate(fb, ok ? 'pop' : 'shake');
    speak(spoken(it));
  };

  const cont = (focus = true) => {
    const btn = h('button', { class: 'btn primary big continue', onclick: ctx.next }, 'Continue');
    if (focus) setTimeout(() => btn.focus({ preventScroll: true }), 30);
    return btn;
  };

  let body;
  if (it.kind === 'type') {
    const input = answerInput({ placeholder: 'Type in Romanian…' });
    const submit = async (giveUp = false) => {
      if (answered) return ctx.next();
      if (!giveUp && !input.value.trim()) return;
      answered = true;
      input.readOnly = true;
      const res = giveUp ? { ok: false } : checkAnswer(input.value, it.answer, { lang: 'ro', lenient: getSettings().lenient });
      input.classList.add(res.ok ? 'right' : 'wrong');
      animate(input, res.ok ? 'pop' : 'shake');
      actions.replaceChildren(cont(false));
      await done(res.ok, res.ok && !res.exact ? res.answer : null);
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    actions.append(
      h('button', { class: 'btn primary big', onclick: () => submit() }, 'Check'),
      h('button', { class: 'btn link', onclick: () => submit(true) }, 'Show me'));
    body = [input, diacriticsBar()];
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  } else if (it.kind === 'choice') {
    const buttons = shuffle(it.options).map(opt => h('button', {
      class: 'btn option ro',
      onclick: async e => {
        if (answered) return;
        answered = true;
        const ok = it.answer.some(a => norm(a) === norm(opt));
        buttons.forEach(b => {
          b.disabled = true;
          if (it.answer.some(a => norm(a) === norm(b.textContent))) b.classList.add('right');
        });
        if (!ok) e.currentTarget.classList.add('wrong');
        else animate(e.currentTarget, 'pop');
        await done(ok);
        actions.replaceChildren(cont());
      },
    }, opt));
    body = [h('div', { class: 'options' }, buttons)];
  } else {
    // order: rebuild the sentence from its scrambled words
    const words = it.answer[0].split(' ');
    let pool = shuffle(words.map((text, key) => ({ text, key })));
    for (let n = 0; n < 5 && pool.map(t => t.text).join(' ') === it.answer[0]; n++) pool = shuffle(pool);
    const placed = [];
    const answerRow = h('div', { class: 'tile-answer' });
    const poolRow = h('div', { class: 'tile-pool' });
    const draw = () => {
      answerRow.replaceChildren(...(placed.length ? placed.map(t => h('button', {
        class: 'tile placed', onclick: () => { if (answered) return; placed.splice(placed.indexOf(t), 1); draw(); },
      }, t.text)) : [h('span', { class: 'muted' }, 'Tap the words in order')]));
      poolRow.replaceChildren(...pool.map(t => h('button', {
        class: 'tile' + (placed.includes(t) ? ' used' : ''), disabled: placed.includes(t) || answered,
        onclick: () => { placed.push(t); sound.pop(); draw(); },
      }, t.text)));
    };
    const submit = async () => {
      if (answered) return ctx.next();
      if (!placed.length) return;
      answered = true;
      const built = norm(placed.map(t => t.text).join(' '));
      const ok = it.answer.some(a => norm(a) === built);
      draw();
      animate(answerRow, ok ? 'pop' : 'shake');
      actions.replaceChildren(cont());
      await done(ok);
    };
    actions.append(h('button', { class: 'btn primary big', onclick: submit }, 'Check'));
    draw();
    body = [answerRow, poolRow];
  }

  stage.append(h('div', { class: 'ex-card pop-in' },
    h('div', { class: 'ex-kind' }, '🧠 ', g.title),
    it.instruction ? h('div', { class: 'instruction' }, it.instruction) : null,
    h('div', { class: `prompt ${it.kind === 'order' || it.promptLang === 'en' ? '' : 'ro'}` }, it.prompt),
    h('button', {
      class: 'btn link rule-toggle', type: 'button',
      onclick: () => { ruleBox.classList.toggle('hidden'); animate(ruleBox, 'flip-in'); },
    }, '💡 Rule'),
    ruleBox,
    ...body,
    fb, actions));
}

async function finish(root, scope, all, sess) {
  clear(root);
  const perfect = sess.answered > 0 && sess.correct === sess.answered;
  root.append(h('section', { class: 'screen done' },
    h('div', { class: 'card center pop-in' },
      h('div', { class: 'start-emoji' }, perfect ? '🌟' : '🧠'),
      h('h1', {}, perfect ? 'Flawless!' : 'Round complete!'),
      h('div', { class: 'big-points' }, `+${sess.points}`, h('small', {}, ' points')),
      h('p', {}, `${sess.correct} of ${sess.answered} answers correct.`),
      h('div', { class: 'stack' },
        h('button', { class: 'btn primary big', onclick: () => startRound(root, scope, all) }, 'Another round'),
        h('a', { class: 'btn secondary big', href: scope.back }, 'Back to lesson')))));
  if (perfect) { confetti(); sound.celebrate(); }
}
