// Answer checking: case/whitespace/punctuation-insensitive, cedilla ≡ comma-below,
// optional leniency for missing diacritics.
const CEDILLA = { 'ş': 'ș', 'Ş': 'Ș', 'ţ': 'ț', 'Ţ': 'Ț' };

export function norm(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[şŞţŢ]/g, c => CEDILLA[c])
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.!?,;:…"„“”«»¡¿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const stripDiacritics = s => s.replace(/[ăâ]/g, 'a').replace(/î/g, 'i').replace(/ș/g, 's').replace(/ț/g, 't');

const PRONOUNS = /^(eu|tu|el|ea|noi|voi|ei|ele) /;

// Optional prefixes the learner may add or leave out.
function variants(s, lang, kind) {
  const out = new Set([s]);
  // "please (formal)" also accepts "please"
  const bare = s.replace(/\s*\([^)]*\)/g, '').trim();
  if (bare) out.add(bare);
  for (const v of [...out]) {
    if (lang === 'en') out.add(v.replace(/^(the|a|an|to) /, ''));
    else {
      if (kind === 'verb') out.add(v.replace(/^a /, ''));
      if (kind === 'form') out.add(v.replace(PRONOUNS, ''));
    }
  }
  return new Set([...out].map(v => v.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()));
}

/**
 * @param {string} input
 * @param {string[]} expected accepted answers, first is the main form
 * @param {{lang:'ro'|'en', lenient?:boolean, kind?:'verb'|'form'|''}} opts
 * @returns {{ok:boolean, exact:boolean, answer:string}}
 */
export function checkAnswer(input, expected, { lang = 'ro', lenient = false, kind = '' } = {}) {
  const inVars = variants(norm(input), lang, kind);
  if (![...inVars].some(Boolean)) return { ok: false, exact: false, answer: expected[0] };
  for (const e of expected) {
    const eVars = variants(norm(e), lang, kind);
    for (const v of inVars) if (eVars.has(v)) return { ok: true, exact: true, answer: e };
  }
  if (lenient && lang === 'ro') {
    for (const e of expected) {
      const eVars = [...variants(norm(e), lang, kind)].map(stripDiacritics);
      for (const v of inVars) if (eVars.includes(stripDiacritics(v))) return { ok: true, exact: false, answer: e };
    }
  }
  return { ok: false, exact: false, answer: expected[0] };
}
