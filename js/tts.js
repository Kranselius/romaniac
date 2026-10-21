// Romanian text-to-speech via the Web Speech API. Only Romanian text is ever spoken.
let voice = null;
let rate = 0.9;
let initPromise;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  const ro = voices.filter(v => /^ro([-_]|$)/i.test(v.lang));
  voice = ro.find(v => v.localService) || ro[0] || null;
  return voice;
}

export function initTTS() {
  if (initPromise) return initPromise;
  initPromise = new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve(false);
    if (pickVoice()) return resolve(true);
    const onChange = () => { if (pickVoice()) { cleanup(); resolve(true); } };
    const cleanup = () => speechSynthesis.removeEventListener('voiceschanged', onChange);
    speechSynthesis.addEventListener('voiceschanged', onChange);
    setTimeout(() => { cleanup(); resolve(!!pickVoice()); }, 2500);
  });
  return initPromise;
}

export const hasVoice = () => !!voice;
export const setRate = r => { rate = r; };

/** Speak Romanian text. Resolves when finished (or right away when no voice). */
export function speak(text) {
  if (!voice || !text) return Promise.resolve();
  return new Promise(resolve => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ro-RO';
    u.voice = voice;
    u.rate = rate;
    let finished = false;
    const finish = () => { if (!finished) { finished = true; resolve(); } };
    u.onend = finish;
    u.onerror = finish;
    // Fallback in case onend never fires (some Android builds).
    setTimeout(finish, 1200 + text.length * 140 / rate);
    speechSynthesis.speak(u);
  });
}
