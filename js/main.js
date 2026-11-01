import { initStore, state, setMeta, getSettings, todayPoints } from './store.js';
import { initTTS, hasVoice, setRate, speak } from './tts.js';
import { onPoints, checkBadges } from './points.js';
import { h, clear, animate } from './ui.js';
import { toast } from './fx.js';
import { renderHome } from './screens/home.js';
import { renderPractice } from './screens/practice.js';
import { renderVerbPicker, renderVerbDrill } from './screens/verbs.js';
import { renderProgress } from './screens/progress.js';
import { renderSettings } from './screens/settings.js';
import { renderIlrHome, renderIlrScope, renderIlrSheet, renderIlrPractice, renderIlrGrammar } from './screens/ilr.js';

const app = document.getElementById('app');
const backBtn = document.getElementById('back');
const pointsChip = document.getElementById('points-chip');

const ROUTES = [
  [/^#?\/?$/, () => renderHome(app), false],
  [/^#\/practice$/, () => renderPractice(app), true],
  [/^#\/verbs$/, () => renderVerbPicker(app), true],
  [/^#\/verb\/([\w-]+)$/, m => renderVerbDrill(app, m[1]), true, '#/verbs'],
  [/^#\/progress$/, () => renderProgress(app), true],
  [/^#\/settings$/, () => renderSettings(app), true],
  [/^#\/ilr$/, () => renderIlrHome(app), true],
  [/^#\/ilr\/([\w-]+)$/, m => renderIlrScope(app, m[1]), true, '#/ilr'],
  [/^#\/ilr\/([\w-]+)\/practice$/, m => renderIlrPractice(app, m[1]), true, m => `#/ilr/${m[1]}`],
  [/^#\/ilr\/([\w-]+)\/grammar$/, m => renderIlrGrammar(app, m[1]), true, m => `#/ilr/${m[1]}`],
  [/^#\/ilr\/([\w-]+)\/sheet$/, m => renderIlrSheet(app, m[1]), true, m => `#/ilr/${m[1]}`],
];

function route() {
  window.speechSynthesis?.cancel();
  clear(app);
  window.scrollTo(0, 0);
  const hash = location.hash || '#/';
  for (const [re, render, showBack, backTo] of ROUTES) {
    const m = hash.match(re);
    if (m) {
      backBtn.classList.toggle('hidden', !showBack);
      backBtn.dataset.to = (typeof backTo === 'function' ? backTo(m) : backTo) || '#/';
      document.body.dataset.route = hash.split('/')[1] || 'home';
      render(m);
      return;
    }
  }
  location.hash = '#/';
}

function updatePointsChip(total = todayPoints()) {
  pointsChip.querySelector('b').textContent = total;
  animate(pointsChip, 'pop');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Reload only when the user asked for the new version — not when the very first
  // service worker takes control on first launch.
  let userAsked = false;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const offer = worker => toast('✨ New version ready', {
      action: 'Tap to refresh', duration: 0,
      onAction: () => { userAsked = true; worker.postMessage({ type: 'SKIP_WAITING' }); },
    });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(err => console.warn('SW registration failed', err));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !userAsked) return;
    reloading = true;
    location.reload();
  });
}

async function voiceTipOnce() {
  if (hasVoice() || state.meta.voiceTipShown) return;
  await setMeta('voiceTipShown', true);
  const close = () => dlg.remove();
  const dlg = h('div', { class: 'modal-wrap', onclick: e => { if (e.target === dlg) close(); } },
    h('div', { class: 'modal pop-in' },
      h('div', { class: 'start-emoji' }, '🔊'),
      h('h2', {}, 'Want to hear Romanian?'),
      h('p', {}, 'Your phone has no Romanian voice yet. You can add one for free:'),
      h('ol', {},
        h('li', {}, 'Open Android Settings and search for “Text-to-speech”.'),
        h('li', {}, 'Choose “Speech Services by Google” as the engine.'),
        h('li', {}, 'Tap ⚙ → Install voice data → Română.'),
        h('li', {}, 'Restart Romaniac.')),
      h('p', { class: 'muted small' }, 'Until then, listening exercises are simply hidden. You can find this tip again in Settings.'),
      h('button', { class: 'btn primary big', onclick: close }, 'Got it')));
  document.body.append(dlg);
}

async function main() {
  try {
    await initStore();
  } catch (err) {
    console.error(err);
    app.replaceChildren(h('div', { class: 'card center' }, h('h1', {}, 'Oops'), h('p', {}, 'Romaniac could not open its storage. ' + (err.message || ''))));
    return;
  }
  window.romaniac = { state, speak }; // handy for debugging in DevTools
  setRate(getSettings().ttsRate);
  backBtn.addEventListener('click', () => { location.hash = backBtn.dataset.to || '#/'; });
  onPoints(updatePointsChip);
  updatePointsChip();
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    updatePointsChip();
    if (document.body.dataset.route === 'home' || document.body.dataset.route === '') route();
  });
  route();
  registerServiceWorker();
  await initTTS();
  // Re-render once voices are known so audio-only exercises appear.
  if (hasVoice() && !/verb\/|practice/.test(location.hash)) route();
  voiceTipOnce();
  checkBadges();
}

main();
