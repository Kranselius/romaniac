import { h, clear, answerInput, diacriticsBar, speakerButton, shuffle, pick, animate } from '../ui.js';
import { state, getSettings, setMeta, recordVerbCorrect } from '../store.js';
import { checkAnswer, norm, stripDiacritics } from '../answer.js';
import { speak, hasVoice } from '../tts.js';
import { award } from '../points.js';
import { cheer, confetti, mascot, sound, toast } from '../fx.js';
import { cellStage, personsFor, tenseMastered, verbStars } from '../progress.js';
import { tileSet, joinTiles, sentenceFor } from '../conjugation.js';

const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const PERSON_LABEL = { eu: 'eu', tu: 'tu', el: 'el/ea', noi: 'noi', voi: 'voi', ei: 'ei/ele', tu_neg: 'tu', voi_neg: 'voi' };
const MODES = [
  { id: 'table', label: '📋 Table', len: 1 },
  { id: 'rapid', label: '⚡ Rapid fire', len: 8 },
  { id: 'tiles', label: '🧩 Tiles', len: 4 },
  { id: 'sentence', label: '💬 Sentence', len: 4 },
  { id: 'listen', label: '👂 Listen', len: 4, voice: true },
];

const tenseById = id => state.verbData.tenses.find(t => t.id === id);
const simplify = s => stripDiacritics(norm(s));

function promptLabel(tense, person) {
  if (tense === 'imperativ') return `${PERSON_LABEL[person]} · imperativ${person.endsWith('_neg') ? ' negativ' : ''}`;
  return `${PERSON_LABEL[person]} · ${tenseById(tense).label}`;
}

// ================= picker =================
export function renderVerbPicker(root) {
  let anyLevel = false;
  const verbs = [...state.verbs.values()];
  const list = h('div', { class: 'verb-list' });
  const search = h('input', {
    type: 'search', class: 'search', placeholder: 'Search verbs…', 'aria-label': 'Search verbs in Romanian or English',
    autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
  });

  const draw = () => {
    clear(list);
    const q = simplify(search.value);
    for (const [lvl, label] of LEVELS) {
      const matches = verbs.filter(v => v.level === lvl && (!q || simplify(v.inf).includes(q) || v.en.toLowerCase().includes(q)))
        .sort((a, b) => a.inf.localeCompare(b.inf, 'ro'));
      if (!matches.length) continue;
      list.append(h('h3', { class: 'level-head' }, label));
      for (const v of matches) {
        const stars = verbStars(v);
        list.append(h('a', { class: 'verb-row', href: `#/verb/${v.id}` },
          h('span', { class: 'verb-inf' }, v.inf),
          h('span', { class: 'verb-en' }, v.en),
          stars ? h('span', { class: 'verb-stars' }, `★${stars}`) : null));
      }
    }
    if (!list.children.length) list.append(h('p', { class: 'muted center' }, 'No verbs match that search.'));
  };
  search.addEventListener('input', draw);

  const surprise = () => {
    const pool = anyLevel ? verbs : verbs.filter(v => v.level === 'beginner');
    location.hash = `#/verb/${pick(pool).id}`;
  };

  root.append(h('section', { class: 'screen verb-picker' },
    h('h1', {}, 'Verb mode'),
    h('p', { class: 'muted' }, 'Pick a verb and practice it as long as you like.'),
    h('div', { class: 'surprise-row' },
      h('button', { class: 'btn primary big', onclick: surprise }, '🎲 Surprise me'),
      h('label', { class: 'check' },
        h('input', { type: 'checkbox', onchange: e => { anyLevel = e.target.checked; } }), ' any level')),
    search,
    list));
  draw();
}

// ================= drill =================
export function renderVerbDrill(root, verbId) {
  const verb = state.verbs.get(verbId);
  if (!verb) { location.hash = '#/verbs'; return; }

  const available = state.verbData.tenses.filter(t => verb.forms[t.id]).map(t => t.id);
  let selected = (state.meta.verbTenses || ['prezent']).filter(t => available.includes(t));
  if (!selected.length) selected = ['prezent'];

  const modes = MODES.filter(m => !m.voice || hasVoice());
  const st = { modeIdx: 0, count: 0, combo: 0, last: null };
  const m = mascot();

  const stage = h('div', { class: 'stage verb-stage' });
  const comboEl = h('div', { class: 'combo' });
  const modeTabs = h('div', { class: 'mode-tabs' });
  const tenseChips = h('div', { class: 'tense-chips' });
  const grid = h('div', { class: 'mastery' });
  const starsEl = h('span', { class: 'verb-stars big' });

  root.append(h('section', { class: 'screen verb-drill' },
    h('div', { class: 'verb-head card' },
      h('div', { class: 'verb-title' }, h('h1', { class: 'ro' }, verb.inf), speakerButton(verb.inf), starsEl),
      h('div', { class: 'muted' }, verb.en, ' · ', h('span', { class: 'chip' }, verb.group), ' ', h('span', { class: 'chip' }, verb.level))),
    h('details', { class: 'tense-box' }, h('summary', {}, 'Tenses to practice'), tenseChips),
    modeTabs,
    h('div', { class: 'top-row' }, comboEl, m.el),
    stage,
    h('details', { class: 'mastery-box', open: true }, h('summary', {}, 'Mastery grid'), grid)));

  // ---- tenses ----
  const drawTenseChips = () => {
    clear(tenseChips);
    for (const id of available) {
      const t = tenseById(id);
      tenseChips.append(h('button', {
        class: 'chip toggle' + (selected.includes(id) ? ' on' : ''),
        onclick: () => {
          if (selected.includes(id)) { if (selected.length > 1) selected = selected.filter(x => x !== id); }
          else selected = [...selected, id];
          setMeta('verbTenses', selected);
          drawTenseChips();
          renderMode();
        },
      }, t.label, t.advanced ? ' (adv.)' : ''));
    }
  };

  // ---- modes ----
  const drawModeTabs = () => {
    clear(modeTabs);
    modes.forEach((mode, i) => modeTabs.append(h('button', {
      class: 'mode-tab' + (i === st.modeIdx ? ' on' : ''),
      onclick: () => { st.modeIdx = i; st.count = 0; renderMode(); },
    }, mode.label)));
  };

  const drawCombo = () => {
    comboEl.textContent = st.combo >= 2 ? `🔥 Combo ×${st.combo}` : '';
    comboEl.classList.toggle('hot', st.combo >= 5);
  };

  const drawGrid = () => {
    clear(grid);
    const table = h('table', { class: 'grid' },
      h('tr', {}, h('th', {}), ...state.verbData.persons.map(p => h('th', {}, PERSON_LABEL[p]))));
    for (const t of state.verbData.tenses) {
      if (!verb.forms[t.id]) continue;
      const persons = personsFor(t.id);
      const done = tenseMastered(verb, t.id);
      const cells = persons.map(p => {
        const cell = state.mastery.get(`${verb.id}|${t.id}|${p}`);
        const label = t.id === 'imperativ' ? { tu: 'tu', voi: 'voi', tu_neg: 'nu tu', voi_neg: 'nu voi' }[p] : '';
        return h('td', { class: `cell s${cellStage(cell)}${label ? ' labelled' : ''}`, title: `${promptLabel(t.id, p)}: ${verb.forms[t.id][p]} (${cell?.count || 0}×)` }, label);
      });
      while (cells.length < 6) cells.push(h('td', { class: 'cell none' }));
      table.append(h('tr', {}, h('th', { class: 'tense-label' }, done ? '⭐ ' : '', t.label), ...cells));
    }
    grid.append(table, h('div', { class: 'legend' },
      h('span', { class: 'cell s1' }), ' started ', h('span', { class: 'cell s2' }), ' practiced ', h('span', { class: 'cell s3' }), ' mastered (2+ days)'));
    const stars = verbStars(verb);
    starsEl.textContent = stars ? `★${stars}` : '';
  };

  // ---- scoring ----
  const correct = async (tense, person) => {
    st.combo++;
    const extra = Math.min(10, 2 * Math.floor(st.combo / 5));
    const was = tenseMastered(verb, tense);
    await recordVerbCorrect(verb.id, tense, person);
    await award(10 + extra);
    drawCombo();
    if (!was && tenseMastered(verb, tense)) {
      await award(25);
      confetti();
      sound.celebrate();
      toast(`⭐ ${verb.inf} · ${tenseById(tense).label} mastered! +25`, { duration: 4000 });
    } else {
      sound.correct();
    }
    drawGrid();
    const c = cheer();
    m.react('happy', c);
    return { pts: 10 + extra, cheer: c };
  };
  const wrong = () => {
    st.combo = 0; // quietly
    drawCombo();
    m.react('oops');
  };

  const randomPrompt = () => {
    let tense, person, tries = 0;
    do {
      tense = pick(selected);
      person = pick(personsFor(tense));
    } while (st.last === `${tense}|${person}` && tries++ < 10);
    st.last = `${tense}|${person}`;
    return { tense, person, form: verb.forms[tense][person] };
  };

  const check = (input, form) => checkAnswer(input, [form], { lang: 'ro', lenient: getSettings().lenient, kind: 'form' });

  // Each rendered drill gets a token, so a late callback (e.g. after speech) can't skip ahead.
  const advance = tok => {
    if (tok !== st.token) return;
    st.count++;
    if (st.count >= modes[st.modeIdx].len) {
      st.count = 0;
      st.modeIdx = (st.modeIdx + 1) % modes.length;
    }
    renderMode();
  };

  const feedback = (box, ok, res, pts, cheerText) => {
    box.className = 'feedback ' + (ok ? 'good' : 'oops');
    box.replaceChildren(ok
      ? h('div', { class: 'fb-title' }, cheerText, h('span', { class: 'pts-pop' }, `+${pts}`), !res.exact ? h('div', { class: 'fb-detail' }, 'Spelling: ', h('b', {}, res.answer)) : null)
      : h('div', {}, h('div', { class: 'fb-title' }, 'The form is:'), h('div', { class: 'fb-answer' }, res.answer)));
    animate(box, ok ? 'pop' : 'shake');
  };

  // ---- drill modes ----
  const DRILLS = {
    table() {
      const tok = st.token, next = () => advance(tok);
      const tense = pick(selected.length > 1 ? selected.filter(t => t !== st.lastTable) : selected);
      st.lastTable = tense;
      const persons = personsFor(tense);
      const rows = persons.map(p => {
        const form = verb.forms[tense][p];
        const input = answerInput({ placeholder: '…', 'aria-label': promptLabel(tense, p) });
        const hint = h('div', { class: 'cell-hint' });
        const slot = h('div', { class: 'table-slot' }, input, hint);
        const row = { p, form, input, slot, hint, done: false, missed: false };
        const submit = async () => {
          if (row.done || !input.value.trim()) return;
          const res = check(input.value, form);
          speak(form);
          if (res.ok) {
            row.done = true;
            const flip = h('div', { class: 'flipped' + (row.missed ? ' was-missed' : '') }, form);
            slot.replaceChildren(flip);
            animate(flip, 'flip-pop');
            if (!row.missed) await correct(tense, p); else sound.pop();
            focusNext();
            if (rowsState.every(r => r.done)) finishTable();
          } else {
            row.missed = true;
            wrong();
            hint.textContent = `→ ${form}`;
            animate(input, 'shake');
            input.select();
          }
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        input.addEventListener('blur', e => {
          const to = e.relatedTarget;
          if (input.value.trim() && (!to || to.matches('.conj-table input'))) submit();
        });
        return row;
      });
      const rowsState = rows;
      const focusNext = () => rows.find(r => !r.done)?.input.focus({ preventScroll: true });
      const actions = h('div', { class: 'actions' });
      const finishTable = () => {
        actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, 'Next drill ▶'));
        actions.firstChild.focus({ preventScroll: true });
      };
      const label = tense === 'imperativ' ? ['tu', 'voi', 'nu · tu', 'nu · voi'] : null;
      stage.append(h('div', { class: 'ex-card pop-in' },
        h('div', { class: 'ex-kind' }, `📋 Fill the table · ${tenseById(tense).label}`),
        h('div', { class: 'conj-table' }, rows.map((r, i) => h('div', { class: 'conj-row' },
          h('div', { class: 'conj-person' }, label ? label[i] : PERSON_LABEL[r.p]), r.slot))),
        diacriticsBar(),
        actions));
      setTimeout(focusNext, 50);
    },

    rapid() {
      const tok = st.token, next = () => advance(tok);
      const pr = randomPrompt();
      const input = answerInput({ placeholder: 'Type the form…' });
      const fb = h('div', { class: 'feedback' });
      const actions = h('div', { class: 'actions' });
      let answered = false;
      const submit = async () => {
        if (answered) return next();
        if (!input.value.trim()) return;
        answered = true;
        input.readOnly = true;
        const res = check(input.value, pr.form);
        if (res.ok) {
          input.classList.add('right');
          animate(input, 'pop');
          const { pts, cheer: c } = await correct(pr.tense, pr.person);
          feedback(fb, true, res, pts, c);
          await speak(pr.form);
          setTimeout(next, hasVoice() ? 150 : 900);
        } else {
          input.classList.add('wrong');
          animate(input, 'shake');
          wrong();
          feedback(fb, false, res);
          speak(pr.form);
          actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, 'Next'));
        }
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      actions.append(h('button', { class: 'btn primary big', onclick: submit }, 'Check'));
      stage.append(h('div', { class: 'ex-card pop-in' },
        h('div', { class: 'ex-kind' }, `⚡ Rapid fire · ${st.count + 1}/${modes[st.modeIdx].len}`),
        h('div', { class: 'prompt' }, promptLabel(pr.tense, pr.person)),
        input, diacriticsBar(), fb, actions));
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    },

    tiles() {
      const tok = st.token, next = () => advance(tok);
      const pr = randomPrompt();
      const { target, extras } = tileSet(pr.form, verb.forms[pr.tense]);
      const pool = shuffle([...target, ...extras]).map((t, i) => ({ ...t, key: i }));
      const placed = [];
      const answerRow = h('div', { class: 'tile-answer' });
      const poolRow = h('div', { class: 'tile-pool' });
      const fb = h('div', { class: 'feedback' });
      const actions = h('div', { class: 'actions' });
      let answered = false;
      const draw = () => {
        answerRow.replaceChildren(...(placed.length ? placed.map(t => h('button', {
          class: 'tile placed', onclick: () => { if (answered) return; placed.splice(placed.indexOf(t), 1); draw(); },
        }, t.text)) : [h('span', { class: 'muted' }, 'Tap tiles to build the form')]));
        poolRow.replaceChildren(...pool.map(t => h('button', {
          class: 'tile' + (placed.includes(t) ? ' used' : ''), disabled: placed.includes(t) || answered,
          onclick: () => { placed.push(t); sound.pop(); draw(); },
        }, t.text)));
      };
      const submit = async () => {
        if (answered) return next();
        if (!placed.length) return;
        answered = true;
        const ok = norm(joinTiles(placed)) === norm(pr.form);
        const res = { ok, exact: true, answer: pr.form };
        draw();
        if (ok) {
          animate(answerRow, 'pop');
          const { pts, cheer: c } = await correct(pr.tense, pr.person);
          feedback(fb, true, res, pts, c);
        } else {
          animate(answerRow, 'shake');
          wrong();
          feedback(fb, false, res);
        }
        speak(pr.form);
        actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, 'Next'));
        actions.firstChild.focus({ preventScroll: true });
      };
      actions.append(h('button', { class: 'btn primary big', onclick: submit }, 'Check'));
      draw();
      stage.append(h('div', { class: 'ex-card pop-in' },
        h('div', { class: 'ex-kind' }, '🧩 Build the form'),
        h('div', { class: 'prompt' }, promptLabel(pr.tense, pr.person)),
        answerRow, poolRow, fb, actions));
    },

    sentence() {
      const tok = st.token, next = () => advance(tok);
      const pr = randomPrompt();
      const { before, after } = sentenceFor(verb, pr.tense, pr.person);
      const input = answerInput({ class: 'answer-input inline', placeholder: '___', size: Math.max(6, pr.form.length + 1) });
      const fb = h('div', { class: 'feedback' });
      const actions = h('div', { class: 'actions' });
      let answered = false;
      const submit = async () => {
        if (answered) return next();
        if (!input.value.trim()) return;
        answered = true;
        input.readOnly = true;
        const res = check(input.value, pr.form);
        if (res.ok) {
          input.classList.add('right');
          const { pts, cheer: c } = await correct(pr.tense, pr.person);
          feedback(fb, true, res, pts, c);
        } else {
          input.classList.add('wrong');
          animate(input, 'shake');
          wrong();
          feedback(fb, false, res);
        }
        speak(`${before}${pr.form}${after}`);
        actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, 'Next'));
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      actions.append(h('button', { class: 'btn primary big', onclick: submit }, 'Check'));
      const tenseText = pr.tense === 'imperativ' ? `imperativ${pr.person.endsWith('_neg') ? ', negativ' : ''}` : tenseById(pr.tense).label;
      stage.append(h('div', { class: 'ex-card pop-in' },
        h('div', { class: 'ex-kind' }, '💬 Fill the gap'),
        h('div', { class: 'sentence ro' }, before, input, after),
        h('div', { class: 'sentence-hint' }, `(${verb.inf} · ${tenseText})`),
        diacriticsBar(), fb, actions));
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    },

    listen() {
      const tok = st.token, next = () => advance(tok);
      const pr = randomPrompt();
      speak(pr.form);
      const input = answerInput({ placeholder: 'Type what you hear…' });
      const fb = h('div', { class: 'feedback' });
      const actions = h('div', { class: 'actions' });
      let answered = false;
      const submit = async () => {
        if (answered) return next();
        if (!input.value.trim()) return;
        answered = true;
        input.readOnly = true;
        const res = check(input.value, pr.form);
        if (res.ok) {
          input.classList.add('right');
          const { pts, cheer: c } = await correct(pr.tense, pr.person);
          feedback(fb, true, res, pts, c);
        } else {
          input.classList.add('wrong');
          animate(input, 'shake');
          wrong();
          feedback(fb, false, res);
        }
        fb.append(h('div', { class: 'fb-detail' }, promptLabel(pr.tense, pr.person)));
        speak(pr.form);
        actions.replaceChildren(h('button', { class: 'btn primary big', onclick: next }, 'Next'));
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      actions.append(h('button', { class: 'btn primary big', onclick: submit }, 'Check'));
      stage.append(h('div', { class: 'ex-card pop-in' },
        h('div', { class: 'ex-kind' }, `👂 Listen and type · ${tenseById(pr.tense).label}`),
        h('div', { class: 'prompt' }, h('button', { class: 'btn listen-big', type: 'button', onclick: () => { speak(pr.form); input.focus(); } }, '🔊 Play again')),
        input, diacriticsBar(), fb, actions));
      setTimeout(() => input.focus({ preventScroll: true }), 50);
    },
  };

  function renderMode() {
    st.token = (st.token || 0) + 1;
    clear(stage);
    drawModeTabs();
    DRILLS[modes[st.modeIdx].id]();
  }

  drawTenseChips();
  drawCombo();
  drawGrid();
  renderMode();
}
