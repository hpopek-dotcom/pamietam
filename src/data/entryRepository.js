import { request, transaction } from './db.js';

export function createEntryRepository(db) {
  const store = (tx) => tx.objectStore('entries');

  return {
    async put(entry) {
      await transaction(db, ['entries'], 'readwrite', (tx) => request(store(tx).put(entry)));
      return entry;
    },

    get(id) {
      return transaction(db, ['entries'], 'readonly', async (tx) => (await request(store(tx).get(id))) ?? null);
    },

    /** All entries of one space, newest first. */
    async listBySpace(space) {
      const items = await transaction(db, ['entries'], 'readonly',
        (tx) => request(store(tx).index('space').getAll(space)));
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    delete(id) {
      return transaction(db, ['entries'], 'readwrite', (tx) => request(store(tx).delete(id)));
    },
  };
}
