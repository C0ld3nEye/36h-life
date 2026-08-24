import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { saveGameStateToIDB, clearGameStateFromIDB } from './dbPersistence';

export interface SyncStatus {
  state: 'synced' | 'saving' | 'error' | 'offline' | 'guest';
  lastSavedAt?: number;
  errorMessage?: string;
  isQuotaExhausted?: boolean;
}

let syncStatusListener: ((status: SyncStatus) => void) | null = null;
let currentStatus: SyncStatus = { state: 'offline' };

export function onSyncStatusChange(callback: (status: SyncStatus) => void) {
  syncStatusListener = callback;
  callback(currentStatus);
  return () => {
    syncStatusListener = null;
  };
}

function updateStatus(status: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...status };
  if (syncStatusListener) {
    syncStatusListener(currentStatus);
  }
}

export function cleanObjectForFirestore(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObjectForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'function' && key !== 'loaded' && value !== undefined) {
      clean[key] = cleanObjectForFirestore(value);
    }
  }
  return clean;
}

// Compute semantic signature so we never make redundant Firestore writes
function computeStateSignature(state: any): string {
  if (!state) return '';
  const narrativeCount = Array.isArray(state.narrativeHistory) ? state.narrativeHistory.length : 0;
  const lastNarrative = narrativeCount > 0 ? state.narrativeHistory[narrativeCount - 1]?.id || '' : '';
  const diaryCount = Array.isArray(state.diary) ? state.diary.length : 0;
  const lastDiary = diaryCount > 0 ? state.diary[diaryCount - 1]?.id || '' : '';
  const agendaCount = Array.isArray(state.agenda) ? state.agenda.length : 0;
  const lastAgenda = agendaCount > 0 ? state.agenda[agendaCount - 1]?.id || '' : '';
  const charsCount = state.characters ? Object.keys(state.characters).length : 0;
  const locsCount = state.locations ? Object.keys(state.locations).length : 0;
  const plotCount = Array.isArray(state.plotLeads) ? state.plotLeads.length : 0;
  const msgCount = Array.isArray(state.messages) ? state.messages.length : 0;
  const checking = state.bank?.checking ?? 0;
  const savings = state.bank?.savings ?? 0;
  const debts = state.bank?.debts ?? 0;
  const txCount = Array.isArray(state.bank?.transactions) ? state.bank.transactions.length : 0;
  const currentTask = state.currentTask ? `${state.currentTask.description}_${state.currentTask.endTimeReal}` : 'none';
  const lastUpdate = state.lastUpdateTime || 0;
  
  return `${narrativeCount}|${lastNarrative}|${diaryCount}|${lastDiary}|${agendaCount}|${lastAgenda}|${charsCount}|${locsCount}|${plotCount}|${msgCount}|${checking}|${savings}|${debts}|${txCount}|${currentTask}|${lastUpdate}`;
}

let saveTimeout: any = null;
let lastSavedSignature = '';
let isQuotaExhausted = false;

export function triggerCloudSave(state: any, immediate = false) {
  if (!state) return;

  // 1. Immediately backup to local IndexedDB and localStorage (Zero risk of data loss)
  try {
    const cleanState = cleanObjectForFirestore(state);
    saveGameStateToIDB(cleanState);
    try {
      localStorage.setItem('local_game_state', JSON.stringify(cleanState));
    } catch (e) {
      // LocalStorage quota fallback
    }
  } catch (e) {
    console.warn("Failed local backup:", e);
  }

  // 2. Check if user is logged in with a real Google account
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    updateStatus({ state: 'guest' });
    return;
  }

  if (isQuotaExhausted) {
    updateStatus({ state: 'offline', isQuotaExhausted: true, errorMessage: 'Quota cloud journalier atteint. Sauvegarde locale active.' });
    return;
  }

  const newSignature = computeStateSignature(state);
  if (newSignature === lastSavedSignature) {
    // No meaningful change to save to Firestore
    return;
  }

  updateStatus({ state: 'saving' });

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  const performWrite = async () => {
    try {
      const user = auth.currentUser;
      if (!user || user.isAnonymous) {
        updateStatus({ state: 'guest' });
        return;
      }

      const cleanState = cleanObjectForFirestore(state);
      const docRef = doc(db, 'users', user.uid);
      
      await setDoc(docRef, {
        uid: user.uid,
        gameState: cleanState,
        narrativeCount: Array.isArray(cleanState.narrativeHistory) ? cleanState.narrativeHistory.length : 0,
        updatedAt: serverTimestamp()
      }, { merge: true });

      lastSavedSignature = newSignature;
      updateStatus({
        state: 'synced',
        lastSavedAt: Date.now(),
        errorMessage: undefined
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded') || errMsg.includes('quota')) {
        console.warn("Firestore write quota reached. Switched seamlessly to local storage persistence.");
        isQuotaExhausted = true;
        updateStatus({
          state: 'offline',
          isQuotaExhausted: true,
          errorMessage: 'Quota cloud journalier atteint. Sauvegarde locale active.'
        });
      } else {
        console.warn("Error saving to Firestore:", errMsg);
        updateStatus({
          state: 'error',
          errorMessage: errMsg
        });
      }
    }
  };

  if (immediate) {
    performWrite();
  } else {
    // Debounce by 2500ms to batch rapid sequential actions and conserve Firestore quotas
    saveTimeout = setTimeout(performWrite, 2500);
  }
}

export function subscribeToCloudChanges(
  user: User | null,
  onRemoteUpdate: (remoteState: any) => void
): () => void {
  if (!user || user.isAnonymous) return () => {};

  try {
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (snapshot) => {
      // Ignore local optimistic writes originated by this device
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.gameState) {
          const remoteState = data.gameState;
          const remoteSignature = computeStateSignature(remoteState);
          
          if (remoteSignature && remoteSignature !== lastSavedSignature) {
            lastSavedSignature = remoteSignature;
            onRemoteUpdate(remoteState);
            updateStatus({
              state: user.isAnonymous ? 'guest' : 'synced',
              lastSavedAt: Date.now()
            });
          }
        }
      }
    }, (error) => {
      console.warn("Firestore snapshot listener error:", error.message);
      if (error.message.includes('resource-exhausted') || error.message.includes('Quota')) {
        isQuotaExhausted = true;
        updateStatus({ state: 'offline', isQuotaExhausted: true });
      }
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach snapshot listener:", err);
    return () => {};
  }
}

export async function resetCloudAndLocalData(freshState: any): Promise<void> {
  if (!freshState) return;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  // 1. Clear IndexedDB completely
  await clearGameStateFromIDB();

  const cleanState = cleanObjectForFirestore(freshState);

  // 2. Put the fresh clean state into IndexedDB and LocalStorage
  await saveGameStateToIDB(cleanState);
  try {
    localStorage.setItem('local_game_state', JSON.stringify(cleanState));
    localStorage.removeItem('last_sleep_time');
    localStorage.removeItem('last_active_time');
  } catch (e) {
    console.warn("Failed resetting localStorage:", e);
  }

  // 3. Update signature so no lingering writes or checks overwrite the reset
  lastSavedSignature = computeStateSignature(freshState);

  // 4. Overwrite Firestore document if user is signed in with Google
  const currentUser = auth.currentUser;
  if (currentUser && !currentUser.isAnonymous) {
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      await setDoc(docRef, {
        uid: currentUser.uid,
        gameState: cleanState,
        narrativeCount: 1,
        updatedAt: serverTimestamp()
      }); // Clean overwrite (no merge: true) to wipe all previous sub-properties
      updateStatus({
        state: 'synced',
        lastSavedAt: Date.now(),
        errorMessage: undefined
      });
    } catch (err: any) {
      console.warn("Error resetting cloud state:", err);
    }
  } else {
    updateStatus({ state: 'guest' });
  }
}
