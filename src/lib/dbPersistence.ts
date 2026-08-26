const DB_NAME = 'SimDeVieDB';
const STORE_NAME = 'gameState';
const KEY = 'current_state';

/** Version du schéma de sauvegarde. Incrémenter lors d'ajouts de champs obligatoires. */
const SCHEMA_VERSION = 2;

/**
 * Migre un état sauvegardé vers la version courante du schéma.
 * Ajoute les valeurs par défaut des champs manquants sans effacer les données existantes.
 */
function migrateState(raw: any): any {
  if (!raw) return raw;

  const version = raw.__schemaVersion ?? 1;

  // v1 → v2 : ajout des champs plotLeads, rumors, messages, episodicMemories, diary
  if (version < 2) {
    if (!Array.isArray(raw.plotLeads)) raw.plotLeads = [];
    if (!Array.isArray(raw.rumors)) raw.rumors = [];
    if (!Array.isArray(raw.messages)) raw.messages = [];
    if (!Array.isArray(raw.episodicMemories)) raw.episodicMemories = [];
    if (!Array.isArray(raw.diary)) raw.diary = [];
    if (!Array.isArray(raw.agenda)) raw.agenda = [];
    if (!Array.isArray(raw.inventory)) raw.inventory = [];
    if (!raw.bank) raw.bank = { checking: 0, savings: 0, debts: 0, transactions: [] };
    if (!raw.vitals) raw.vitals = { energy: 70, mood: 60, mindset: 60, hunger: 60, hygiene: 70 };
    if (!raw.skills) raw.skills = {};
    if (!raw.characters) raw.characters = {};
    if (!raw.locations) raw.locations = {};
    if (!raw.favorsNetwork || typeof raw.favorsNetwork !== 'object') raw.favorsNetwork = {};
    if (!Array.isArray(raw.marketTrends)) raw.marketTrends = [];
  }

  if (!raw.favorsNetwork || typeof raw.favorsNetwork !== 'object') raw.favorsNetwork = {};
  if (!Array.isArray(raw.marketTrends)) raw.marketTrends = [];

  raw.__schemaVersion = SCHEMA_VERSION;
  return raw;
}

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

/**
 * Merges two game states (e.g. local offline state vs remote Firestore state)
 * resolving timestamp conflicts and preventing data loss.
 */
export function mergeGameStates(local: any, remote: any): any {
  if (!local) return remote;
  if (!remote) return local;

  const localTime = Number(local.lastUpdateTime || local.epochRealTime || 0);
  const remoteTime = Number(remote.lastUpdateTime || remote.epochRealTime || 0);
  const isLocalNewer = localTime >= remoteTime;

  const primary = isLocalNewer ? local : remote;
  const secondary = isLocalNewer ? remote : local;

  // 1. Merge Narrative History (deduplicate by content + timestamp proximity)
  const mergedNarrative = [...(primary.narrativeHistory || [])];
  const existingContents = new Set(mergedNarrative.map(n => typeof n?.content === 'string' ? n.content.trim() : ''));
  if (Array.isArray(secondary.narrativeHistory)) {
    secondary.narrativeHistory.forEach((n: any) => {
      const contentStr = typeof n?.content === 'string' ? n.content.trim() : '';
      if (contentStr && !existingContents.has(contentStr)) {
        existingContents.add(contentStr);
        mergedNarrative.push(n);
      }
    });
  }
  // Sort narrative chronologically by timestamp
  mergedNarrative.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));

  // 2. Merge Diary (deduplicate by id or title+gameDate)
  const mergedDiary = [...(primary.diary || [])];
  const diaryKeys = new Set(mergedDiary.map(d => d.id || `${d.title}_${d.gameDate}`));
  if (Array.isArray(secondary.diary)) {
    secondary.diary.forEach((d: any) => {
      const key = d.id || `${d.title}_${d.gameDate}`;
      if (!diaryKeys.has(key)) {
        diaryKeys.add(key);
        mergedDiary.push(d);
      }
    });
  }

  // 3. Merge Episodic Memories
  const mergedMemories = [...(primary.episodicMemories || [])];
  const memoryKeys = new Set(mergedMemories.map(m => m.id || m.summary));
  if (Array.isArray(secondary.episodicMemories)) {
    secondary.episodicMemories.forEach((m: any) => {
      const key = m.id || m.summary;
      if (!memoryKeys.has(key)) {
        memoryKeys.add(key);
        mergedMemories.push(m);
      }
    });
  }

  // 4. Merge Characters (dictionary union with notes merge)
  const mergedCharacters = { ...(secondary.characters || {}), ...(primary.characters || {}) };
  if (secondary.characters && primary.characters) {
    Object.keys(secondary.characters).forEach(id => {
      if (primary.characters[id]) {
        const secNotes = secondary.characters[id].notes || '';
        const priNotes = primary.characters[id].notes || '';
        if (secNotes && !priNotes.includes(secNotes)) {
          mergedCharacters[id].notes = `${priNotes}\n${secNotes}`.trim();
        }
      }
    });
  }

  // 5. Merge Locations (dictionary union with notes merge)
  const mergedLocations = { ...(secondary.locations || {}), ...(primary.locations || {}) };
  if (secondary.locations && primary.locations) {
    Object.keys(secondary.locations).forEach(id => {
      if (primary.locations[id]) {
        const secNotes = secondary.locations[id].notes || '';
        const priNotes = primary.locations[id].notes || '';
        if (secNotes && !priNotes.includes(secNotes)) {
          mergedLocations[id].notes = `${priNotes}\n${secNotes}`.trim();
        }
      }
    });
  }

  // 6. Authoritative Inventory (Primary state is authoritative; consumed/renamed items must not be resurrected)
  const mergedInventory = Array.isArray(primary.inventory) 
    ? [...primary.inventory] 
    : (Array.isArray(secondary.inventory) ? [...secondary.inventory] : []);

  // 7. Merge Agenda
  const mergedAgenda = [...(primary.agenda || [])];
  const agendaKeys = new Set(mergedAgenda.map(a => a.id || `${a.title}_${a.dateGameStr}`));
  if (Array.isArray(secondary.agenda)) {
    secondary.agenda.forEach((a: any) => {
      const key = a.id || `${a.title}_${a.dateGameStr}`;
      if (!agendaKeys.has(key)) {
        agendaKeys.add(key);
        mergedAgenda.push(a);
      }
    });
  }

  // 8. Merge Plot Leads
  const mergedPlotLeads = [...(primary.plotLeads || [])];
  const plotKeys = new Set(mergedPlotLeads.map(p => p.id || p.title));
  if (Array.isArray(secondary.plotLeads)) {
    secondary.plotLeads.forEach((p: any) => {
      const key = p.id || p.title;
      if (!plotKeys.has(key)) {
        plotKeys.add(key);
        mergedPlotLeads.push(p);
      }
    });
  }

  // 9. Merge Rumors & Messages
  const mergedRumors = [...(primary.rumors || [])];
  const rumorKeys = new Set(mergedRumors.map(r => r.id || r.text));
  if (Array.isArray(secondary.rumors)) {
    secondary.rumors.forEach((r: any) => {
      const key = r.id || r.text;
      if (!rumorKeys.has(key)) {
        rumorKeys.add(key);
        mergedRumors.push(r);
      }
    });
  }

  const mergedMessages = [...(primary.messages || [])];
  const messageKeys = new Set(mergedMessages.map(m => m.id || `${m.senderName}_${m.content}`));
  if (Array.isArray(secondary.messages)) {
    secondary.messages.forEach((m: any) => {
      const key = m.id || `${m.senderName}_${m.content}`;
      if (!messageKeys.has(key)) {
        messageKeys.add(key);
        mergedMessages.push(m);
      }
    });
  }

  // 10. Merge Bank Transactions
  const mergedTransactions = [...(primary.bank?.transactions || [])];
  const txKeys = new Set(mergedTransactions.map(t => t.id || `${t.timestamp}_${t.amount}`));
  if (Array.isArray(secondary.bank?.transactions)) {
    secondary.bank.transactions.forEach((t: any) => {
      const key = t.id || `${t.timestamp}_${t.amount}`;
      if (!txKeys.has(key)) {
        txKeys.add(key);
        mergedTransactions.push(t);
      }
    });
  }

  return {
    ...primary,
    narrativeHistory: mergedNarrative,
    diary: mergedDiary,
    episodicMemories: mergedMemories,
    characters: mergedCharacters,
    locations: mergedLocations,
    inventory: mergedInventory,
    agenda: mergedAgenda,
    plotLeads: mergedPlotLeads,
    rumors: mergedRumors,
    messages: mergedMessages,
    bank: {
      ...(primary.bank || {}),
      transactions: mergedTransactions
    },
    epochRealTime: (typeof primary.epochRealTime === 'number' && primary.epochRealTime > 0) 
      ? primary.epochRealTime 
      : ((typeof secondary.epochRealTime === 'number' && secondary.epochRealTime > 0) ? secondary.epochRealTime : Date.now()),
    lastUpdateTime: Math.max(localTime, remoteTime, Date.now())
  };
}

export async function saveGameStateToIDB(data: any): Promise<void> {
  try {
    if (!data) return;
    const dataWithTimestamp = {
      ...data,
      lastUpdateTime: data.lastUpdateTime || Date.now()
    };
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(dataWithTimestamp, KEY);
      // If data has narrative history, also keep a safety backup
      if (Array.isArray(dataWithTimestamp?.narrativeHistory) && dataWithTimestamp.narrativeHistory.length > 1) {
        store.put(dataWithTimestamp, 'backup_state');
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
        if (!primaryData && !backupData) {
          resolve(null);
          return;
        }
        if (primaryData && backupData) {
          // Merge primary and backup if they have different information, prioritizing the newest
          const resolved = mergeGameStates(primaryData, backupData);
          resolve(migrateState(resolved));
        } else {
          resolve(migrateState(primaryData || backupData));
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

