// Expands tools/verb-sources.mjs into complete tables in data/verbs.json.
// Run: npm run build:verbs   (then: npm test)
import { writeFileSync } from 'node:fs';
import { SOURCES } from './verb-sources.mjs';

export const PERSONS = ['eu', 'tu', 'el', 'noi', 'voi', 'ei'];
export const IMP_PERSONS = ['tu', 'voi', 'tu_neg', 'voi_neg'];

export const TENSES = [
  { id: 'prezent', label: 'prezent' },
  { id: 'perfect_compus', label: 'perfect compus' },
  { id: 'imperfect', label: 'imperfect' },
  { id: 'viitor', label: 'viitor' },
  { id: 'viitor_popular', label: 'viitor popular' },
  { id: 'conjunctiv', label: 'conjunctiv prezent' },
  { id: 'conditional', label: 'condițional prezent' },
  { id: 'imperativ', label: 'imperativ' },
  { id: 'mmcp', label: 'mai-mult-ca-perfectul' },
  { id: 'perfect_simplu', label: 'perfect simplu', advanced: true },
];

const zip = (keys, vals) => Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
const slug = s => 'a-' + s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');

function expand(v) {
  const { inf, pres, s3, part, impf, ps, x } = v;
  const subjBare = x.subj || [pres[0], pres[1], s3, pres[3], pres[4], s3];
  const ps3 = x.ps3 || (ps.endsWith('a') ? ps.slice(0, -1) + 'ă' : ps.endsWith('â') ? ps.slice(0, -1) + 'î' : ps);
  const mm = x.mmcp || ps;
  const forms = {
    prezent: zip(PERSONS, pres),
    perfect_compus: zip(PERSONS, ['am', 'ai', 'a', 'am', 'ați', 'au'].map(a => `${a} ${part}`)),
    imperfect: zip(PERSONS, ['m', 'i', '', 'm', 'ți', 'u'].map(e => impf + e)),
    viitor: zip(PERSONS, ['voi', 'vei', 'va', 'vom', 'veți', 'vor'].map(a => `${a} ${inf}`)),
    viitor_popular: zip(PERSONS, subjBare.map(f => `o să ${f}`)),
    conjunctiv: zip(PERSONS, subjBare.map(f => `să ${f}`)),
    conditional: zip(PERSONS, ['aș', 'ai', 'ar', 'am', 'ați', 'ar'].map(a => `${a} ${inf}`)),
    mmcp: zip(PERSONS, ['sem', 'seși', 'se', 'serăm', 'serăți', 'seră'].map(e => mm + e)),
    perfect_simplu: zip(PERSONS, [ps + 'i', ps + 'și', ps3, ps + 'răm', ps + 'răți', ps + 'ră']),
  };
  if (!x.noImp) {
    const voi = x.impVoi || pres[4];
    forms.imperativ = zip(IMP_PERSONS, [v.imp, voi, `nu ${inf}`, `nu ${voi}`]);
  }
  return {
    id: slug(inf),
    inf: `a ${inf}`,
    en: v.en,
    group: v.g,
    level: v.lvl,
    ...(x.noImp ? { missing: ['imperativ'] } : {}),
    forms,
    sentence: { c: v.c },
  };
}

export function buildAll() {
  return {
    persons: PERSONS,
    impPersons: IMP_PERSONS,
    tenses: TENSES,
    verbs: SOURCES.map(expand),
  };
}

if (process.argv[1]?.endsWith('build-verbs.mjs')) {
  const data = buildAll();
  const out = new URL('../data/verbs.json', import.meta.url);
  writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
  console.log(`Wrote ${data.verbs.length} verbs to data/verbs.json`);
}
