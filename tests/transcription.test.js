import { test, assert } from './harness.js';
import { createWebSpeechProvider } from '../src/ai/transcription/webSpeechProvider.js';
import { selectTranscriptionProvider } from '../src/ai/transcription/provider.js';

/** Scriptable stand-in for the browser's SpeechRecognition. */
function fakeWindow() {
  const instances = [];
  class FakeRecognition {
    constructor() { instances.push(this); this.started = 0; }
    start() { this.started++; }
    stop() { setTimeout(() => this.onend?.(), 0); }
    abort() { setTimeout(() => this.onend?.(), 0); }
    emit(results, resultIndex = 0) {
      const list = results.map(([text, isFinal, confidence = 0.9]) => Object.assign([{ transcript: text, confidence }], { isFinal }));
      this.onresult?.({ resultIndex, results: list });
    }
  }
  return { win: { webkitSpeechRecognition: FakeRecognition }, instances };
}

test('brak Web Speech API => brak dostawcy transkrypcji', () => {
  assert.equal(selectTranscriptionProvider({}), null);
  assert.equal(createWebSpeechProvider({}).isAvailable(), false);
});

test('transkrypcja łączy wyniki końcowe i liczy pewność', async () => {
  const { win, instances } = fakeWindow();
  const updates = [];
  const session = createWebSpeechProvider(win).start({ lang: 'pl-PL', onUpdate: (t) => updates.push(t) });
  const rec = instances[0];
  assert.equal(rec.lang, 'pl-PL');
  assert.equal(rec.continuous, true);

  rec.emit([['Dzisiaj wpadł mi', false]]);
  rec.emit([['Dzisiaj wpadł mi do głowy pomysł', true, 0.8]]);
  rec.emit([['Dzisiaj wpadł mi do głowy pomysł', true, 0.8], ['na aplikację', true, 1.0]], 1);

  const result = await session.stop();
  assert.equal(result.text, 'Dzisiaj wpadł mi do głowy pomysł na aplikację');
  assert.equal(Math.round(result.confidence * 100), 90);
  assert.equal(result.provider, 'web-speech');
  assert.equal(result.error, null);
  assert.equal(updates[0], 'Dzisiaj wpadł mi');
});

test('po przerwie w mówieniu rozpoznawanie wznawia się samo', async () => {
  const { win, instances } = fakeWindow();
  const session = createWebSpeechProvider(win).start();
  const rec = instances[0];
  rec.emit([['pierwsze zdanie', true]]);
  await new Promise((r) => setTimeout(r, 1100));
  rec.onend();               // engine stopped after silence
  assert.equal(rec.started, 2, 'restarted');
  rec.emit([['drugie zdanie', true]]);
  const result = await session.stop();
  assert.equal(result.text, 'pierwsze zdanie drugie zdanie');
});

test('niedokończony fragment zostaje zachowany po zatrzymaniu', async () => {
  const { win, instances } = fakeWindow();
  const session = createWebSpeechProvider(win).start();
  instances[0].emit([['to jeszcze nie koniec', false]]);
  const result = await session.stop();
  assert.equal(result.text, 'to jeszcze nie koniec');
});

test('powtórzony wynik z Androida nie dubluje tekstu', async () => {
  const { win, instances } = fakeWindow();
  const session = createWebSpeechProvider(win).start();
  const rec = instances[0];
  rec.emit([['jutro muszę', true]]);
  rec.emit([['jutro muszę sprawdzić projekt', true]], 0);
  const result = await session.stop();
  assert.equal(result.text, 'jutro muszę sprawdzić projekt');
});

test('błąd krytyczny kończy sesję i jest raportowany', async () => {
  const { win, instances } = fakeWindow();
  const session = createWebSpeechProvider(win).start();
  const rec = instances[0];
  rec.onerror({ error: 'not-allowed' });
  rec.onend();
  assert.equal(rec.started, 1, 'no restart after fatal error');
  const result = await session.stop();
  assert.equal(result.text, '');
  assert.equal(result.error, 'not-allowed');
});
