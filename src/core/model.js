// Domain model: plain objects + factories. No DOM, no storage.

export const SCHEMA_VERSION = 1;

export const SPACES = Object.freeze({ PERSONAL: 'personal', WORK: 'work' });
export const SOURCES = Object.freeze({ TEXT: 'text', VOICE: 'voice' });

export function newId() {
  return crypto.randomUUID();
}

/**
 * @typedef {Object} Transcript
 * @property {string} original     raw speech-to-text result, never edited
 * @property {number|null} confidence  0..1 when the engine reports it
 * @property {string} lang
 * @property {string} provider
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Entry
 * @property {string} id
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} schemaVersion
 * @property {'personal'|'work'} space
 * @property {string} type
 * @property {'text'|'voice'} source
 * @property {string} title
 * @property {string} content
 * @property {Transcript|null} transcript
 * @property {string|null} audioId
 * @property {string[]} attachmentIds
 * @property {string[]} tags
 * @property {string|null} category
 * @property {string|null} projectId
 * @property {string|null} taskId
 * @property {string[]} people
 * @property {string|null} location
 * @property {string|null} eventDate
 * @property {string|null} dueDate
 * @property {number|null} importance
 * @property {string|null} aiSummary
 * @property {Object|null} aiClassification
 */

/** @returns {Entry} */
export function createEntry(fields = {}, now = new Date()) {
  const iso = now.toISOString();
  const space = fields.space ?? SPACES.PERSONAL;
  if (!Object.values(SPACES).includes(space)) throw new Error(`Unknown space: ${space}`);
  return {
    id: newId(),
    createdAt: iso,
    updatedAt: iso,
    schemaVersion: SCHEMA_VERSION,
    space,
    type: 'note',
    source: SOURCES.TEXT,
    title: '',
    content: '',
    transcript: null,
    audioId: null,
    attachmentIds: [],
    tags: [],
    category: null,
    projectId: null,
    taskId: null,
    people: [],
    location: null,
    eventDate: null,
    dueDate: null,
    importance: null,
    aiSummary: null,
    aiClassification: null,
    ...fields,
    space,
  };
}

/** Fields the user may change through the editor. Everything else is system- or AI-owned. */
export const EDITABLE_FIELDS = ['title', 'content', 'tags', 'category'];

export function createAudioRecording({ entryId, blob, mimeType, durationMs, recordedAt }) {
  return {
    id: newId(),
    entryId,
    blob,
    mimeType: mimeType || blob.type || 'audio/webm',
    durationMs: durationMs ?? null,
    recordedAt: recordedAt ?? new Date().toISOString(),
    size: blob.size,
  };
}
