import { request, transaction } from './db.js';

export function createAudioRepository(db) {
  const store = (tx) => tx.objectStore('audio');

  return {
    async put(recording) {
      await transaction(db, ['audio'], 'readwrite', (tx) => request(store(tx).put(recording)));
      return recording;
    },

    get(id) {
      return transaction(db, ['audio'], 'readonly', async (tx) => (await request(store(tx).get(id))) ?? null);
    },

    delete(id) {
      return transaction(db, ['audio'], 'readwrite', (tx) => request(store(tx).delete(id)));
    },
  };
}
