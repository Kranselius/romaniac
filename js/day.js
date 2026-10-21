// Day keys ("YYYY-MM-DD") with the day rolling over at 04:00 local time.
export const ROLLOVER_HOUR = 4;

const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function dayKey(date = new Date()) {
  const d = new Date(date);
  if (d.getHours() < ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return fmt(d);
}

export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key, n) {
  const d = keyToDate(key);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

// Weeks run Monday–Sunday.
export function weekStart(key) {
  const offset = (keyToDate(key).getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function weekDays(key) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
