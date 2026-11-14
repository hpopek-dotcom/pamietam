import { createEntry, createAudioRecording, EDITABLE_FIELDS, SOURCES } from '../core/model.js';
import { parseTags } from '../core/text.js';

/**
 * Domain operations on entries. Text and voice both produce the same Entry shape;
 * a voice entry additionally keeps its original audio and raw transcript.
 */
export function createEntryService({ entries, audio, clock = () => new Date() }) {
  return {
    async createTextEntry({ space, title = '', content = '', tags = [] }) {
      const entry = createEntry({
        space,
        source: SOURCES.TEXT,
        title: title.trim(),
        content,
        tags: parseTags(tags),
      }, clock());
      return entries.put(entry);
    },

    /**
     * @param {Object} input
     * @param {{blob: Blob, mimeType?: string, durationMs?: number, recordedAt?: string}} input.recording
     * @param {{text: string, confidence?: number|null, lang?: string, provider?: string}|null} input.transcription
     * @param {string} [input.content] user-corrected text; defaults to the transcript
     */
    async createVoiceEntry({ space, title = '', content, tags = [], recording, transcription }) {
      const now = clock();
      const rawText = transcription?.text ?? '';
      const entry = createEntry({
        space,
        source: SOURCES.VOICE,
        title: title.trim(),
        content: content ?? rawText,
        tags: parseTags(tags),
        transcript: transcription ? {
          original: rawText,
          confidence: transcription.confidence ?? null,
          lang: transcription.lang ?? 'pl-PL',
          provider: transcription.provider ?? 'unknown',
          createdAt: now.toISOString(),
        } : null,
      }, now);

      if (recording?.blob) {
        const rec = createAudioRecording({
          entryId: entry.id,
          ...recording,
          recordedAt: recording.recordedAt ?? now.toISOString(),
        });
        await audio.put(rec);
        entry.audioId = rec.id;
      }
      return entries.put(entry);
    },

    /** Applies user edits. System fields and the original transcript are never touched. */
    async updateEntry(id, changes) {
      const entry = await entries.get(id);
      if (!entry) throw new Error('Nie znaleziono wpisu');
      const updated = { ...entry };
      for (const field of EDITABLE_FIELDS) {
        if (!(field in changes)) continue;
        if (field === 'tags') updated.tags = parseTags(changes.tags);
        else if (field === 'title') updated.title = String(changes.title ?? '').trim();
        else updated[field] = changes[field];
      }
      updated.updatedAt = clock().toISOString();
      return entries.put(updated);
    },

    async deleteEntry(id) {
      const entry = await entries.get(id);
      if (!entry) return;
      if (entry.audioId) await audio.delete(entry.audioId);
      await entries.delete(id);
    },

    getEntry: (id) => entries.get(id),
    getAudio: (id) => audio.get(id),
    listEntries: (space) => entries.listBySpace(space),
  };
}
