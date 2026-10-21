import { h, answerInput, diacriticsBar } from '../ui.js';
import { state, getSettings, saveSettings, exportData, importData, addCustomCard, deleteCard } from '../store.js';
import { speak, hasVoice, setRate } from '../tts.js';
import { toast } from '../fx.js';
import { checkBadges } from '../points.js';
import { dayKey } from '../day.js';

const splitList = s => s.split(/[;\/]/).map(x => x.trim()).filter(Boolean);

function stepper(value, { min, max, step, format = v => v }, onChange) {
  let v = value;
  const out = h('span', { class: 'step-value' }, format(v));
  const set = nv => { v = Math.min(max, Math.max(min, nv)); out.textContent = format(v); onChange(v); };
  return h('div', { class: 'stepper' },
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'Less', onclick: () => set(v - step) }, '−'),
    out,
    h('button', { class: 'step-btn', type: 'button', 'aria-label': 'More', onclick: () => set(v + step) }, '+'));
}

function toggle(checked, onChange) {
  return h('label', { class: 'switch' },
    h('input', { type: 'checkbox', checked, onchange: e => onChange(e.target.checked) }),
    h('span', { class: 'slider' }));
}

const row = (label, control, note, stacked = false) => h('div', { class: 'set-row' + (stacked ? ' stacked' : '') },
  h('div', { class: 'set-label' }, label, note ? h('div', { class: 'muted small' }, note) : null), control);

export function renderSettings(root) {
  const s = getSettings();
  const save = patch => saveSettings(patch);

  const goalStepper = stepper(s.dailyGoal, { min: 20, max: 1000, step: 10, format: v => `${v} pts` }, v => save({ dailyGoal: v }));
  goalStepper.classList.toggle('disabled', !s.goalOn);

  const rateLabel = h('span', { class: 'step-value' }, `${s.ttsRate.toFixed(2)}×`);
  const rateSlider = h('input', {
    type: 'range', min: 0.5, max: 1.3, step: 0.05, value: s.ttsRate, class: 'range',
    oninput: e => { const r = Number(e.target.value); rateLabel.textContent = `${r.toFixed(2)}×`; setRate(r); },
    onchange: e => save({ ttsRate: Number(e.target.value) }),
  });

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: onImport });

  root.append(h('section', { class: 'screen settings' },
    h('h1', {}, 'Settings'),

    h('div', { class: 'card' },
      h('h2', {}, 'Practice'),
      row('Daily goal', h('div', { class: 'row-gap' }, toggle(s.goalOn, v => { save({ goalOn: v }); goalStepper.classList.toggle('disabled', !v); }), goalStepper),
        'Gentle and optional. Reaching it means confetti; missing it means nothing at all.', true),
      row('New words per session', stepper(s.newPerSession, { min: 0, max: 15, step: 1 }, v => save({ newPerSession: v }))),
      row('Lenient diacritics', toggle(s.lenient, v => save({ lenient: v })), 'Accept answers with missing ă â î ș ț (the correct spelling is always shown).'),
      row('Sound effects', toggle(s.sound, v => save({ sound: v }))),
      row('Show Lupi the wolf', toggle(s.mascot, v => save({ mascot: v })))),

    h('div', { class: 'card' },
      h('h2', {}, 'Voice'),
      hasVoice()
        ? h('div', {},
          row('Speech speed', h('div', { class: 'row-gap' }, rateSlider, rateLabel)),
          h('button', { class: 'btn secondary', onclick: () => speak('Bună ziua! Ce mai faci?') }, '🔊 Test voice'))
        : h('p', {}, 'No Romanian voice found on this device, so listening exercises are hidden. To add one on Android: Settings → search “Text-to-speech” → Preferred engine: Speech Services by Google → ⚙ → Install voice data → Română. Then restart the app.')),

    h('div', { class: 'card' },
      h('h2', {}, 'Add your own card'),
      customCardForm()),

    h('div', { class: 'card' },
      h('h2', {}, 'My cards'),
      customCardList()),

    h('div', { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'muted small' }, 'Your progress lives only on this phone. Export a backup now and then to keep it safe.',
        state.meta.persisted === false ? ' (The browser did not grant persistent storage, so backups are extra important.)' : ''),
      h('div', { class: 'row-gap wrap' },
        h('button', { class: 'btn primary', onclick: onExport }, '⬇ Export progress'),
        h('button', { class: 'btn secondary', onclick: () => fileInput.click() }, '⬆ Import backup'),
        fileInput))));
}

function onExport() {
  const blob = new Blob([JSON.stringify(exportData())], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `romaniac-backup-${dayKey()}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup saved 💾');
}

async function onImport(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file could not be read.'); return; }
  if (data?.app !== 'romaniac') { toast('That file is not a Romaniac backup.'); return; }
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'an unknown date';
  if (!confirm(`Replace ALL current progress with the backup from ${when}? This cannot be undone.`)) return;
  try {
    await importData(data);
    location.reload();
  } catch (err) {
    toast(err.message || 'Import failed.');
  }
}

function customCardForm() {
  const type = h('select', { class: 'select' },
    ['noun', 'verb', 'adjective', 'phrase', 'other'].map(t => h('option', { value: t }, t)));
  const ro = answerInput({ placeholder: 'Romanian, e.g. câine' });
  const en = h('input', { type: 'text', class: 'answer-input', placeholder: 'English, e.g. dog / the dog', autocomplete: 'off' });
  const gender = h('select', { class: 'select' }, h('option', { value: 'm' }, 'masculine'), h('option', { value: 'f' }, 'feminine'), h('option', { value: 'n' }, 'neuter'));
  const def = answerInput({ placeholder: 'definite, e.g. câinele' });
  const plural = answerInput({ placeholder: 'plural, e.g. câini' });
  const forms = ['m sg', 'f sg', 'm pl', 'f pl'].map(p => answerInput({ placeholder: p }));
  const nounBox = h('div', { class: 'form-extra' }, h('label', {}, 'Gender'), gender, def, plural);
  const adjBox = h('div', { class: 'form-extra hidden' }, h('label', {}, 'Forms'), h('div', { class: 'grid2' }, forms));
  const sync = () => {
    nounBox.classList.toggle('hidden', type.value !== 'noun');
    adjBox.classList.toggle('hidden', type.value !== 'adjective');
  };
  type.addEventListener('change', sync);

  const submit = async () => {
    const roList = splitList(ro.value), enList = splitList(en.value);
    if (!roList.length || !enList.length) { toast('Please fill in both Romanian and English.'); return; }
    const card = { type: type.value, ro: roList, en: enList };
    if (type.value === 'noun') {
      card.gender = gender.value;
      if (def.value.trim()) card.def = def.value.trim();
      if (plural.value.trim()) card.plural = plural.value.trim();
    }
    if (type.value === 'adjective' && forms.every(f => f.value.trim())) card.forms = forms.map(f => f.value.trim());
    await addCustomCard(card);
    [ro, en, def, plural, ...forms].forEach(i => { i.value = ''; });
    toast(`Added “${roList[0]}” ⭐`);
    await checkBadges();
    const list = document.getElementById('custom-list');
    if (list) list.replaceWith(customCardList());
  };

  sync();
  return h('div', { class: 'custom-form' },
    h('label', {}, 'Type'), type,
    h('label', {}, 'Romanian (separate alternatives with /; the first is the main form)'), ro,
    h('label', {}, 'English (alternatives with /)'), en,
    nounBox, adjBox,
    diacriticsBar(),
    h('button', { class: 'btn primary big', onclick: submit }, 'Add card'));
}

function customCardList() {
  const cards = [...state.cards.values()].filter(c => c.custom).sort((a, b) => a.order - b.order);
  const list = h('div', { id: 'custom-list', class: 'custom-list' });
  if (!cards.length) list.append(h('p', { class: 'muted small' }, 'No custom cards yet. They appear in practice like any other new word.'));
  for (const c of cards) {
    list.append(h('div', { class: 'custom-row' },
      h('span', { class: 'ro' }, c.ro[0]), h('span', { class: 'muted' }, ` — ${c.en[0]}`),
      h('button', {
        class: 'btn link small', onclick: async () => {
          if (!confirm(`Delete “${c.ro[0]}” and its progress?`)) return;
          await deleteCard(c.id);
          list.replaceWith(customCardList());
        },
      }, 'Delete')));
  }
  return list;
}
