import { h } from '../ui.js';
import { state } from '../store.js';
import { totalPoints, level, bestWeek, wordsLearned, wordsMet, verbSummary, badges } from '../progress.js';

export function renderProgress(root) {
  const total = totalPoints();
  const lv = level(total);
  const { stars, mastered } = verbSummary();
  const stat = (value, label) => h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label));

  root.append(h('section', { class: 'screen progress' },
    h('h1', {}, 'Progress'),
    h('div', { class: 'card level-card' },
      h('div', { class: 'level-num' }, lv.level),
      h('div', { class: 'level-info' },
        h('div', { class: 'level-name' }, `Nivel ${lv.level} · ${lv.name}`),
        h('div', { class: 'level-bar' }, h('div', { class: 'level-fill', style: { width: `${Math.round(lv.frac * 100)}%` } })),
        h('div', { class: 'muted small' }, `${total} points · ${lv.to - total} to level ${lv.level + 1}`))),
    h('div', { class: 'stats' },
      stat(wordsLearned(), 'words learned'),
      stat(wordsMet(), 'words met'),
      stat(stars, 'verb tenses ⭐'),
      stat(mastered, 'verbs mastered'),
      stat(bestWeek(), 'best week'),
      stat(total, 'total points')),
    h('p', { class: 'muted small' }, 'A word counts as learned once you have answered it correctly on two different days. A verb tense earns a star when every person is mastered (correct on two different days); a verb is fully mastered when all its tenses are — perfect simplu is optional.'),
    h('h2', {}, 'Badges'),
    h('div', { class: 'badges' }, badges().map(b => h('div', { class: 'badge' + (b.earned ? ' earned' : '') },
      h('div', { class: 'badge-icon' }, b.icon),
      h('div', { class: 'badge-name' }, b.name),
      h('div', { class: 'badge-desc' }, b.desc)))),
    h('p', { class: 'muted small center' }, `${state.verbs.size} verbs · ${[...state.cards.values()].filter(c => !c.retired).length} cards`)));
}
