import { h } from '../ui.js';
import { getSettings, todayPoints } from '../store.js';
import { weekPoints, bestWeek, level } from '../progress.js';
import { dayKey } from '../day.js';

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...kids);
  return el;
};

function greeting() {
  const hr = new Date().getHours();
  if (hr >= 4 && hr < 11) return 'Bună dimineața!';
  if (hr >= 18 || hr < 4) return 'Bună seara!';
  return 'Bună ziua!';
}

export function progressRing(points, goal, goalOn) {
  const R = 52, C = 2 * Math.PI * R;
  const frac = goalOn ? Math.min(1, points / goal) : 1;
  const ring = svg('svg', { viewBox: '0 0 120 120', class: 'ring' },
    svg('circle', { cx: 60, cy: 60, r: R, class: 'ring-track' }),
    svg('circle', {
      cx: 60, cy: 60, r: R, class: 'ring-fill' + (goalOn && points >= goal ? ' done' : '') + (points ? '' : ' hidden'),
      'stroke-dasharray': `${C * frac} ${C}`, transform: 'rotate(-90 60 60)',
    }));
  return h('div', { class: 'ring-wrap' }, ring,
    h('div', { class: 'ring-label' },
      h('div', { class: 'ring-points' }, points),
      h('div', { class: 'ring-sub' }, goalOn ? `of ${goal} today` : 'points today')));
}

export function weekChart() {
  const week = weekPoints();
  const today = dayKey();
  const s = getSettings();
  const max = Math.max(...week.map(d => d.points), s.goalOn ? s.dailyGoal : 0, 50);
  const W = 320, H = 150, top = 22, base = 120, bw = 30, gap = (W - 7 * bw) / 7;
  const el = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'week-chart', role: 'img', 'aria-label': 'Points per day this week' });
  if (s.goalOn) {
    const gy = base - (s.dailyGoal / max) * (base - top);
    el.append(svg('line', { x1: 0, x2: W, y1: gy, y2: gy, class: 'goal-line' }));
  }
  week.forEach((d, i) => {
    const x = gap / 2 + i * (bw + gap);
    const bh = (d.points / max) * (base - top);
    if (d.points > 0) {
      el.append(svg('rect', { x, y: base - bh, width: bw, height: Math.max(bh, 4), rx: 8, class: 'bar' + (d.day === today ? ' today' : '') }));
      el.append(svg('text', { x: x + bw / 2, y: base - bh - 6, class: 'bar-val' }, String(d.points)));
    }
    el.append(svg('text', { x: x + bw / 2, y: base + 20, class: 'bar-day' + (d.day === today ? ' today' : '') }, DAY_LABELS[i]));
  });
  const weekTotal = week.reduce((a, d) => a + d.points, 0);
  const best = bestWeek();
  return h('div', { class: 'card week' },
    h('div', { class: 'week-head' },
      h('h2', {}, 'This week'),
      h('span', { class: 'week-total' }, `${weekTotal} pts`)),
    el,
    best > 0 ? h('div', { class: 'best-week' }, weekTotal >= best ? '🏆 This is your best week so far!' : `🏆 Best week: ${best} pts — fun to beat!`) : null);
}

export function renderHome(root) {
  const s = getSettings();
  const pts = todayPoints();
  const lv = level();
  root.append(
    h('section', { class: 'screen home' },
      h('div', { class: 'hello' },
        h('h1', {}, greeting()),
        h('a', { class: 'level-chip', href: '#/progress' }, `Nivel ${lv.level} · ${lv.name}`)),
      h('div', { class: 'card today' },
        progressRing(pts, s.dailyGoal, s.goalOn),
        h('p', { class: 'today-msg' },
          s.goalOn && pts >= s.dailyGoal ? 'Goal reached — every extra point is a bonus! 🎉'
            : pts > 0 ? 'Nice work today. Keep it fun!' : 'Ready when you are. 😊')),
      h('div', { class: 'big-buttons' },
        h('a', { class: 'big-btn blue', href: '#/practice' }, h('span', { class: 'big-emoji' }, '📚'), 'Practice words'),
        h('a', { class: 'big-btn yellow', href: '#/verbs' }, h('span', { class: 'big-emoji' }, '🐺'), 'Verb mode'),
        h('a', { class: 'big-btn ilr', href: '#/ilr' }, h('span', { class: 'big-emoji' }, '🎓'), 'ILR Mode')),
      weekChart(),
    ));
}
