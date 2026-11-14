// Live transcription through the browser's Web Speech API.
// Chrome stops recognition after a pause, so the session restarts it until stop() is called.

const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'language-not-supported', 'audio-capture', 'network']);
const MAX_QUICK_RESTARTS = 5;
const STOP_TIMEOUT_MS = 2500;

/** Android Chrome sometimes re-sends the whole utterance as a longer final result. */
function appendFinal(finals, text, confidence) {
  const last = finals[finals.length - 1];
  if (last && text.toLowerCase().startsWith(last.text.toLowerCase())) {
    finals[finals.length - 1] = { text, confidence };
  } else {
    finals.push({ text, confidence });
  }
}

export function createWebSpeechProvider(win = window) {
  const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;

  return {
    id: 'web-speech',
    kind: 'live',
    label: 'Rozpoznawanie mowy przeglądarki',
    privacyNote: 'Transkrypcję wykonuje przeglądarka. W Chrome dźwięk jest w tym celu wysyłany do serwerów Google. Nagranie i tekst zapisują się tylko na tym urządzeniu.',
    isAvailable: () => Boolean(Recognition),

    start({ lang = 'pl-PL', onUpdate } = {}) {
      const finals = [];
      let interim = '';
      let rec = null;
      let stopping = false;
      let error = null;
      let quickRestarts = 0;
      let lastStart = 0;
      let finish;
      const ended = new Promise((resolve) => { finish = resolve; });

      const currentText = () => [...finals.map((f) => f.text), interim.trim()].filter(Boolean).join(' ');

      function result() {
        const text = currentText();
        const scored = finals.filter((f) => typeof f.confidence === 'number' && f.confidence > 0);
        const confidence = scored.length
          ? scored.reduce((sum, f) => sum + f.confidence, 0) / scored.length
          : null;
        return { text, confidence, lang, provider: 'web-speech', error: text ? null : error };
      }

      function launch() {
        rec = new Recognition();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onresult = (event) => {
          interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0].transcript.trim();
            if (!text) continue;
            if (res.isFinal) appendFinal(finals, text, res[0].confidence);
            else interim += ' ' + text;
          }
          onUpdate?.(currentText());
        };

        rec.onerror = (event) => {
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          error = event.error;
        };

        rec.onend = () => {
          // Text that was still interim when the engine stopped is kept as spoken.
          if (interim.trim()) { appendFinal(finals, interim.trim(), null); interim = ''; }
          const now = Date.now();
          quickRestarts = now - lastStart < 1000 ? quickRestarts + 1 : 0;
          const fatal = FATAL_ERRORS.has(error) || quickRestarts >= MAX_QUICK_RESTARTS;
          if (stopping || fatal) {
            finish();
          } else {
            try { lastStart = now; rec.start(); } catch { finish(); }
          }
        };

        lastStart = Date.now();
        rec.start();
      }

      launch();

      return {
        async stop() {
          stopping = true;
          try { rec.stop(); } catch { finish(); }
          await Promise.race([ended, new Promise((r) => setTimeout(r, STOP_TIMEOUT_MS))]);
          return result();
        },
        abort() {
          stopping = true;
          try { rec.abort(); } catch { /* not running */ }
          finish();
        },
      };
    },
  };
}
