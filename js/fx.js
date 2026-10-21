// Feel-good effects: sounds, confetti, toasts, encouragement and the mascot.
import { h, pick, animate } from './ui.js';
import { getSettings } from './store.js';

// ---- sounds (synthesized, no files) ----
let ctx;
function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sound = {
  correct() { if (!getSettings().sound) return; tone(784, 0, 0.18, 'triangle'); tone(1175, 0.09, 0.28, 'triangle'); },
  pop() { if (!getSettings().sound) return; tone(660, 0, 0.12, 'sine', 0.12); },
  celebrate() {
    if (!getSettings().sound) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.15));
  },
};

// ---- encouragement ----
export const ENCOURAGEMENT = ['Bravo!', 'Foarte bine!', 'Super!', 'Excelent!', 'Ești pe val!', 'Perfect!', 'Grozav!'];
let lastCheer = '';
export function cheer() {
  let c;
  do { c = pick(ENCOURAGEMENT); } while (c === lastCheer);
  lastCheer = c;
  return c;
}

// ---- toasts ----
export function toast(message, { action, onAction, duration = 3000 } = {}) {
  const host = document.getElementById('toasts');
  const el = h('div', { class: 'toast' }, h('span', {}, message));
  if (action) {
    el.classList.add('toast-action');
    el.append(
      h('button', { type: 'button', onclick: () => { onAction?.(); el.remove(); } }, action),
      h('button', { type: 'button', class: 'toast-close', 'aria-label': 'Dismiss', onclick: () => el.remove() }, '✕'));
  }
  host.append(el);
  if (duration) setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, duration);
  return el;
}

// ---- confetti ----
export function confetti() {
  const canvas = h('canvas', { class: 'confetti' });
  document.body.append(canvas);
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width = innerWidth * dpr;
  const H = canvas.height = innerHeight * dpr;
  const c = canvas.getContext('2d');
  const colors = ['#2f56b0', '#ffd23f', '#e8505b', '#4cc38a', '#ff9f43', '#7c6cf0'];
  const parts = Array.from({ length: 160 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 22 * dpr,
    vy: (-Math.random() * 20 - 6) * dpr,
    r: (4 + Math.random() * 5) * dpr,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    color: pick(colors),
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
  }));
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    c.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.55 * dpr;
      p.vx *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      c.save();
      c.globalAlpha = Math.max(0, 1 - t / 2800);
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      if (p.shape === 'rect') c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      else { c.beginPath(); c.arc(0, 0, p.r * 0.7, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    if (t < 2800) requestAnimationFrame(frame); else canvas.remove();
  })(start);
}

// ---- mascot: Lupi the friendly wolf ----
const WOLF_SVG = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M18 42 L24 8 L44 30 Z" fill="#8a94a8"/><path d="M24 16 L28 30 L38 30 Z" fill="#f6b7c1"/>
  <path d="M82 42 L76 8 L56 30 Z" fill="#8a94a8"/><path d="M76 16 L72 30 L62 30 Z" fill="#f6b7c1"/>
  <ellipse cx="50" cy="56" rx="36" ry="33" fill="#9aa4b8"/>
  <ellipse cx="50" cy="70" rx="22" ry="18" fill="#f4efe6"/>
  <g class="eyes"><ellipse cx="37" cy="50" rx="5" ry="6" fill="#2d2a3e"/><ellipse cx="63" cy="50" rx="5" ry="6" fill="#2d2a3e"/>
  <circle cx="38.5" cy="48" r="1.8" fill="#fff"/><circle cx="64.5" cy="48" r="1.8" fill="#fff"/></g>
  <ellipse cx="50" cy="63" rx="6" ry="4.5" fill="#2d2a3e"/>
  <path class="mouth" d="M42 72 Q50 80 58 72" stroke="#2d2a3e" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="28" cy="64" r="5" fill="#f6b7c1" opacity=".7"/><circle cx="72" cy="64" r="5" fill="#f6b7c1" opacity=".7"/>
  <path d="M30 88 Q50 98 70 88 L66 96 Q50 102 34 96 Z" fill="#ffd23f"/>
</svg>`;

export function mascot() {
  if (!getSettings().mascot) return { el: null, react() {} };
  const bubble = h('div', { class: 'mascot-bubble' });
  const face = h('div', { class: 'mascot-face', html: WOLF_SVG });
  const el = h('div', { class: 'mascot' }, bubble, face);
  let timer;
  return {
    el,
    react(mood, text) {
      el.dataset.mood = mood;
      animate(face, mood === 'oops' ? 'tilt' : 'hop');
      if (text) {
        bubble.textContent = text;
        bubble.classList.add('show');
        clearTimeout(timer);
        timer = setTimeout(() => bubble.classList.remove('show'), 1600);
      }
    },
  };
}
