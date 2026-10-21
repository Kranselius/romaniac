// Small DOM helpers shared by the screens.
import { speak, hasVoice } from './tts.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clear = el => { el.replaceChildren(); return el; };

// Text input that the Android keyboard won't "correct".
export function answerInput(attrs = {}) {
  return h('input', {
    type: 'text',
    class: 'answer-input',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
    enterkeyhint: 'done',
    'data-ro': '',
    lang: 'ro',
    ...attrs,
  });
}

// Quick-insert bar for ă â î ș ț. Inserts into the most recently focused answer field.
let lastInput = null;
document.addEventListener('focusin', e => {
  if (e.target.matches?.('input[data-ro]')) lastInput = e.target;
});

export function diacriticsBar() {
  let upper = false;
  const letters = ['ă', 'â', 'î', 'ș', 'ț'];
  const keys = letters.map(l => h('button', { class: 'dia-key', type: 'button', 'data-l': l }, l));
  const shift = h('button', { class: 'dia-key dia-shift', type: 'button', 'aria-label': 'Uppercase' }, '⇧');
  const bar = h('div', { class: 'dia-bar' }, keys, shift);
  // pointerdown + preventDefault keeps focus (and the keyboard) on the input.
  bar.addEventListener('pointerdown', e => e.preventDefault());
  bar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn === shift) {
      upper = !upper;
      shift.classList.toggle('on', upper);
      keys.forEach(k => { k.textContent = upper ? k.dataset.l.toUpperCase() : k.dataset.l; });
      return;
    }
    const usable = el => el && document.contains(el) && !el.disabled && !el.readOnly;
    const input = usable(lastInput) ? lastInput : bar.parentElement?.querySelector('input[data-ro]:not([disabled]):not([readonly])');
    if (!usable(input)) return;
    const ch = btn.textContent;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + ch + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return bar;
}

export function speakerButton(getText, label = 'Listen') {
  if (!hasVoice()) return null;
  return h('button', {
    class: 'speaker', type: 'button', 'aria-label': label,
    onclick: e => { e.stopPropagation(); speak(typeof getText === 'function' ? getText() : getText); },
  }, '🔊');
}

export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function animate(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}
