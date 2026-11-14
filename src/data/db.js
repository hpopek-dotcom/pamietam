// IndexedDB access. All stores of the long-term data model are declared up front
// so later modules (projects, tasks, checklists…) need no migration.

export const DB_NAME = 'pamietam';
export const DB_VERSION = 1;

export const STORES = {
  entries: { keyPath: 'id', indexes: ['space', 'createdAt', 'updatedAt'] },
  audio: { keyPath: 'id', indexes: ['entryId'] },
  attachments: { keyPath: 'id', indexes: ['entryId'] },
  relations: { keyPath: 'id', indexes: ['fromId', 'toId'] },
  projects: { keyPath: 'id', indexes: ['space'] },
  tasks: { keyPath: 'id', indexes: ['space', 'projectId'] },
  checklistTemplates: { keyPath: 'id' },
  checklistInstances: { keyPath: 'id', indexes: ['projectId'] },
  calendarEvents: { keyPath: 'id' },
  people: { keyPath: 'id' },
  meta: { keyPath: 'key' },
};

export function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openDatabase(name = DB_NAME) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const tx = req.transaction;
      for (const [storeName, def] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(storeName)
          ? tx.objectStore(storeName)
          : db.createObjectStore(storeName, { keyPath: def.keyPath });
        for (const index of def.indexes ?? []) {
          if (!store.indexNames.contains(index)) store.createIndex(index, index);
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Baza danych jest zablokowana przez inną kartę aplikacji.'));
  });
}

export function deleteDatabase(name) {
  return request(indexedDB.deleteDatabase(name));
}

/**
 * Runs `work` inside one transaction; resolves with its result after commit.
 * `work` must only await IndexedDB requests, otherwise the transaction auto-commits.
 */
export function transaction(db, storeNames, mode, work) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transakcja przerwana'));
    Promise.resolve()
      .then(() => work(tx))
      .then((value) => { result = value; }, (err) => {
        try { tx.abort(); } catch { /* already finished */ }
        reject(err);
      });
  });
}
