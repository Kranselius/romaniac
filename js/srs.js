// FSRS-4.5 scheduler (day granularity). Ratings: 1 Again, 2 Hard, 3 Good, 4 Easy.
import { addDays, daysBetween } from './day.js';

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
const RETENTION = 0.9;
const MAX_IVL = 3650;

const clampD = d => Math.min(10, Math.max(1, d));
const initD = g => clampD(W[4] - (g - 3) * W[5]);

export const newSrs = () => ({ state: 'new', s: 0, d: 0, due: null, last: null, ivl: 0, reps: 0, lapses: 0, lastRating: null });

export function retrievability(srs, today) {
  if (srs.state !== 'review') return 0;
  const t = Math.max(0, daysBetween(srs.last, today));
  return Math.pow(1 + FACTOR * t / srs.s, DECAY);
}

const intervalFor = s => Math.min(MAX_IVL, Math.max(1, Math.round(s / FACTOR * (Math.pow(RETENTION, 1 / DECAY) - 1))));

export function review(srs, g, today) {
  let { s, d } = srs;
  if (srs.state === 'new') {
    s = W[g - 1];
    d = initD(g);
  } else {
    const r = retrievability(srs, today);
    d = clampD(W[7] * initD(4) + (1 - W[7]) * (d - W[6] * (g - 3)));
    if (g === 1) {
      s = Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]));
    } else {
      const hard = g === 2 ? W[15] : 1;
      const easy = g === 4 ? W[16] : 1;
      s = s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
    }
  }
  const ivl = g === 1 ? 1 : intervalFor(s);
  return {
    state: 'review', s, d, ivl,
    due: addDays(today, ivl),
    last: today,
    reps: srs.reps + 1,
    lapses: srs.lapses + (g === 1 && srs.state === 'review' ? 1 : 0),
    lastRating: g,
  };
}

export const isDue = (srs, today) => srs.state === 'review' && srs.due <= today;
