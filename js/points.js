// Awarding points, with daily-goal confetti and new-badge toasts. Points are never removed.
import { addPointsRaw, getSettings, state, setMeta } from './store.js';
import { dayKey } from './day.js';
import { badges } from './progress.js';
import { confetti, sound, toast } from './fx.js';

const listeners = new Set();
export const onPoints = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export async function award(n) {
  if (n <= 0) return;
  const total = await addPointsRaw(n);
  listeners.forEach(fn => fn(total));

  const s = getSettings();
  const today = dayKey();
  if (s.goalOn && total >= s.dailyGoal && state.meta.goalCelebrated !== today) {
    await setMeta('goalCelebrated', today);
    setTimeout(() => {
      confetti();
      sound.celebrate();
      toast(`🎉 Daily goal reached — ${total} points!`, { duration: 3500 });
    }, 500);
  }
  await checkBadges();
}

export async function checkBadges() {
  const known = new Set(state.meta.badgesSeen || []);
  const fresh = badges().filter(b => b.earned && !known.has(b.id));
  if (!fresh.length) return;
  await setMeta('badgesSeen', [...known, ...fresh.map(b => b.id)]);
  fresh.forEach((b, i) => setTimeout(() => toast(`${b.icon} New badge: ${b.name}`, { duration: 3500 }), 900 + i * 700));
}
