const DB_NAME = 'SimDeVieDB';
const STORE_NAME = 'gameState';
const KEY = 'current_state';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGameStateToIDB(data: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, KEY);
      // If data has narrative history, also keep a safety backup
      if (Array.isArray(data?.narrativeHistory) && data.narrativeHistory.length > 1) {
        store.put(data, 'backup_state');
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB save failed:", err);
  }
}

export async function loadGameStateFromIDB(): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let primaryData: any = null;
      let backupData: any = null;

      const reqPrimary = store.get(KEY);
      reqPrimary.onsuccess = () => { primaryData = reqPrimary.result; };

      const reqBackup = store.get('backup_state');
      reqBackup.onsuccess = () => { backupData = reqBackup.result; };

      tx.oncomplete = () => {
        const countP = Array.isArray(primaryData?.narrativeHistory) ? primaryData.narrativeHistory.length : 0;
        const countB = Array.isArray(backupData?.narrativeHistory) ? backupData.narrativeHistory.length : 0;
        if (countB > countP) {
          resolve(backupData);
        } else {
          resolve(primaryData || backupData);
        }
      };
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("IndexedDB load failed:", err);
    return null;
  }
}

export async function clearGameStateFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("IndexedDB clear failed:", err);
  }
}
