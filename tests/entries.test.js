import { test, assert } from './harness.js';
import { openDatabase, deleteDatabase } from '../src/data/db.js';
import { createEntryRepository } from '../src/data/entryRepository.js';
import { createAudioRepository } from '../src/data/audioRepository.js';
import { createEntryService } from '../src/services/entryService.js';
import { buildTimeline } from '../src/core/timeline.js';
import { dayKey } from '../src/core/text.js';

let counter = 0;

/** Fresh database per test; `clock` returns successive times starting at `start`. */
async function setup(start = '2026-03-15T09:30:00.000Z') {
  const name = `pamietam-test-${Date.now()}-${counter++}`;
  const db = await openDatabase(name);
  let t = new Date(start).getTime();
  const clock = () => new Date(t);
  const advance = (ms) => { t += ms; };
  const service = createEntryService({
    entries: createEntryRepository(db),
    audio: createAudioRepository(db),
    clock,
  });
  return {
    service,
    advance,
    async teardown() { db.close(); await deleteDatabase(name); },
  };
}

const fakeRecording = () => ({
  blob: new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  durationMs: 42000,
});

test('tworzy wpis tekstowy', async () => {
  const { service, teardown } = await setup();
  try {
    const entry = await service.createTextEntry({
      space: 'personal',
      content: 'Dzisiaj wpadł mi do głowy pomysł na aplikację, która będzie pamiętać moje myśli.',
      tags: '#pomysł, aplikacja',
    });
    const saved = await service.getEntry(entry.id);
    assert.equal(saved.source, 'text');
    assert.equal(saved.space, 'personal');
    assert.equal(saved.title, '');
    assert.equal(saved.transcript, null);
    assert.equal(saved.audioId, null);
    assert.deepEqual(saved.tags, ['pomysł', 'aplikacja']);
    assert.equal((await service.listEntries('personal')).length, 1);
  } finally { await teardown(); }
});

test('tworzy wpis głosowy z nagraniem i transkrypcją', async () => {
  const { service, teardown } = await setup();
  try {
    const text = 'Dzisiaj wpadł mi do głowy pomysł na aplikację, która będzie pamiętać moje myśli.';
    const entry = await service.createVoiceEntry({
      space: 'personal',
      recording: fakeRecording(),
      transcription: { text, confidence: 0.91, lang: 'pl-PL', provider: 'fake' },
    });
    const saved = await service.getEntry(entry.id);
    assert.equal(saved.source, 'voice');
    assert.equal(saved.content, text);
    assert.equal(saved.transcript.original, text);
    assert.equal(saved.transcript.confidence, 0.91);
    assert.equal(saved.transcript.provider, 'fake');

    const audio = await service.getAudio(saved.audioId);
    assert.equal(audio.entryId, saved.id);
    assert.equal(audio.durationMs, 42000);
    assert.equal(audio.blob.size, 5);
    assert.equal(audio.recordedAt, saved.createdAt);
    assert.deepEqual([...new Uint8Array(await audio.blob.arrayBuffer())], [1, 2, 3, 4, 5]);
  } finally { await teardown(); }
});

test('wpis głosowy bez transkrypcji zachowuje samo nagranie', async () => {
  const { service, teardown } = await setup();
  try {
    const entry = await service.createVoiceEntry({ space: 'personal', recording: fakeRecording(), transcription: null });
    assert.equal(entry.content, '');
    assert.equal(entry.transcript, null);
    assert.ok(await service.getAudio(entry.audioId));
  } finally { await teardown(); }
});

test('tekstowy i głosowy wpis mają ten sam kształt Entry', async () => {
  const { service, teardown } = await setup();
  try {
    const a = await service.createTextEntry({ space: 'personal', content: 'x' });
    const b = await service.createVoiceEntry({ space: 'personal', recording: fakeRecording(), transcription: { text: 'x' } });
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  } finally { await teardown(); }
});

test('edycja transkrypcji nie niszczy oryginału', async () => {
  const { service, advance, teardown } = await setup();
  try {
    const entry = await service.createVoiceEntry({
      space: 'personal',
      recording: fakeRecording(),
      transcription: { text: 'w kilometrze 12 450 brakuje pokazania wpustu', confidence: 0.7 },
    });
    advance(60_000);
    const updated = await service.updateEntry(entry.id, {
      title: '  Uwaga S17 ',
      content: 'W km 12+450 brakuje pokazania wpustu.',
      tags: '#uwaga',
      transcript: { original: 'próba nadpisania' },
      createdAt: '1999-01-01T00:00:00.000Z',
    });
    assert.equal(updated.title, 'Uwaga S17');
    assert.equal(updated.content, 'W km 12+450 brakuje pokazania wpustu.');
    assert.equal(updated.transcript.original, 'w kilometrze 12 450 brakuje pokazania wpustu');
    assert.equal(updated.createdAt, entry.createdAt);
    assert.ok(updated.updatedAt > entry.updatedAt, 'updatedAt should move forward');
    assert.equal(updated.audioId, entry.audioId);
  } finally { await teardown(); }
});

test('zapisuje datę utworzenia i grupuje wpisy na osi czasu', async () => {
  const { service, advance, teardown } = await setup('2026-03-15T09:30:00.000Z');
  try {
    const first = await service.createTextEntry({ space: 'personal', content: 'Pierwszy pomysł na aplikację' });
    assert.equal(first.createdAt, '2026-03-15T09:30:00.000Z');
    advance(2 * 3600_000);
    await service.createTextEntry({ space: 'personal', content: 'Ten sam dzień' });
    advance(89 * 86400_000);
    await service.createTextEntry({ space: 'personal', content: 'Pierwszy prototyp' });

    const months = buildTimeline(await service.listEntries('personal'));
    assert.equal(months.length, 2);
    assert.equal(months[0].days[0].entries[0].content, 'Pierwszy prototyp', 'newest first');
    assert.equal(months[1].days.length, 1);
    assert.equal(months[1].days[0].entries.length, 2);
    assert.equal(months[1].days[0].key, dayKey(first.createdAt));
  } finally { await teardown(); }
});

test('przestrzenie Osobiste i Praca są rozdzielone', async () => {
  const { service, teardown } = await setup();
  try {
    await service.createTextEntry({ space: 'personal', content: 'refleksja' });
    await service.createTextEntry({ space: 'work', content: 'sprawdzić uzgodnienia' });
    const personal = await service.listEntries('personal');
    const work = await service.listEntries('work');
    assert.deepEqual(personal.map((e) => e.content), ['refleksja']);
    assert.deepEqual(work.map((e) => e.content), ['sprawdzić uzgodnienia']);
    await assert.rejects(() => service.createTextEntry({ space: 'inne', content: 'x' }));
  } finally { await teardown(); }
});

test('usuwa wpis razem z nagraniem', async () => {
  const { service, teardown } = await setup();
  try {
    const keep = await service.createTextEntry({ space: 'personal', content: 'zostaje' });
    const entry = await service.createVoiceEntry({ space: 'personal', recording: fakeRecording(), transcription: { text: 'do usunięcia' } });
    await service.deleteEntry(entry.id);
    assert.equal(await service.getEntry(entry.id), null);
    assert.equal(await service.getAudio(entry.audioId), null);
    assert.deepEqual((await service.listEntries('personal')).map((e) => e.id), [keep.id]);
  } finally { await teardown(); }
});
