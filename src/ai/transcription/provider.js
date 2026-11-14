// TranscriptionProvider contract. Swap implementations without touching UI or data.
//
// Live provider (listens to the microphone while we record):
//   { id, kind: 'live', label, privacyNote, isAvailable(): boolean,
//     start({ lang, onUpdate(text) }): LiveSession }
//   LiveSession: { stop(): Promise<TranscriptionResult>, abort(): void }
//
// File provider (planned: Whisper via API or locally):
//   { id, kind: 'file', label, privacyNote, isAvailable(): boolean,
//     transcribe(blob, { lang }): Promise<TranscriptionResult> }

/**
 * @typedef {Object} TranscriptionResult
 * @property {string} text
 * @property {number|null} confidence  average 0..1, null when unknown
 * @property {string} lang
 * @property {string} provider
 * @property {string|null} error      engine error code, when transcription failed
 */

import { createWebSpeechProvider } from './webSpeechProvider.js';

/** Returns the best available provider, or null (voice entries then keep audio only). */
export function selectTranscriptionProvider(win = window) {
  const candidates = [createWebSpeechProvider(win)];
  return candidates.find((p) => p.isAvailable()) ?? null;
}
