import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, signInAnonymously } from './firebase';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { MainScreen } from './components/MainScreen';
import { FoldersScreen } from './components/FoldersScreen';
import { AgendaScreen } from './components/AgendaScreen';
import { BankScreen } from './components/BankScreen';
import { SleepModal } from './components/SleepModal';
import { EpilogueModal } from './components/EpilogueModal';
import { soundEngine } from './lib/audio';
import { useGameStore } from './state/useGameState';
import { api } from './lib/api';
import { loadGameStateFromIDB, mergeGameStates } from './lib/dbPersistence';
import { triggerCloudSave, subscribeToCloudChanges } from './lib/cloudSync';
import { getAtmosphereForHour } from './lib/atmosphere';
import { getGameDateInfo, cn } from './lib/utils';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'folders' | 'agenda' | 'bank'>('home');
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  
  const { tick, autopilotMode, addOfflineRecap, loaded, loadState, setLoaded, epochRealTime } = useGameStore();
  const isSyncingFromRemoteRef = useRef(false);
  const isCheckingOfflineRef = useRef(false);

  const dateInfo = getGameDateInfo(epochRealTime);
  const atmosphere = getAtmosphereForHour(dateInfo.gameHourOfDay);

  // 1. Initial State Loading & Multi-Device Resolution
  useEffect(() => {
    let isMounted = true;

    const getSnapshotTimestamp = (st: any): number => {
      if (!st) return 0;
      let maxTime = st.lastUpdateTime || st.epochRealTime || 0;
      if (Array.isArray(st.narrativeHistory) && st.narrativeHistory.length > 0) {
        const lastMsg = st.narrativeHistory[st.narrativeHistory.length - 1];
        if (lastMsg && lastMsg.timestamp) {
          maxTime = Math.max(maxTime, lastMsg.timestamp);
        }
      }
      if (Array.isArray(st.bank?.transactions) && st.bank.transactions.length > 0) {
        const lastTx = st.bank.transactions[0];
        if (lastTx && lastTx.timestamp) {
          maxTime = Math.max(maxTime, lastTx.timestamp);
        }
      }
      return maxTime;
    };

    const getSnapshotNarrativeCount = (st: any): number => {
      if (!st || !Array.isArray(st.narrativeHistory)) return 0;
      return st.narrativeHistory.length;
    };

    const getBestStateToLoad = async (firestoreState: any) => {
      const localSaved = localStorage.getItem('local_game_state');
      let localParsed: any = null;
      if (localSaved) {
        try { localParsed = JSON.parse(localSaved); } catch (e) { /* ignore */ }
      }

      const idbState = await loadGameStateFromIDB();

      const localCandidate = idbState || localParsed;

      // If both firestore and local exist, merge them to prevent offline overwrites
      if (firestoreState && localCandidate) {
        const merged = mergeGameStates(localCandidate, firestoreState);
        const localTime = getSnapshotTimestamp(localCandidate);
        const firestoreTime = getSnapshotTimestamp(firestoreState);

        // If local offline session is newer, sync merged state up to Firestore
        if (localTime > firestoreTime) {
          setTimeout(() => {
            triggerCloudSave(merged, true);
          }, 1000);
        }
        return merged;
      }

      const candidates = [
        { source: 'firestore', data: firestoreState },
        { source: 'indexedDB', data: idbState },
        { source: 'localStorage', data: localParsed }
      ].filter(c => c.data && typeof c.data === 'object');

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        const timeA = getSnapshotTimestamp(a.data);
        const timeB = getSnapshotTimestamp(b.data);
        // If timestamps differ by more than 1 second, prioritize the newer state
        if (Math.abs(timeB - timeA) > 1000) {
          return timeB - timeA;
        }
        const countA = getSnapshotNarrativeCount(a.data);
        const countB = getSnapshotNarrativeCount(b.data);
        return countB - countA;
      });

      return candidates[0].data;
    };

    // Guarantee that loaded is set to true within 1.5s maximum to avoid any loading screen deadlock
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && !useGameStore.getState().loaded) {
        setLoaded(true);
      }
    }, 1500);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (isMounted) {
            const firestoreState = docSnap.exists() ? docSnap.data()?.gameState : null;
            const stateToLoad = await getBestStateToLoad(firestoreState);
            if (stateToLoad) {
              isSyncingFromRemoteRef.current = true;
              loadState(stateToLoad);
              setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
            } else {
              setLoaded(true);
            }
          }
        } catch (err: any) {
          console.warn("Could not read game state from Firestore (falling back to local storage):", err?.message || err);
          const stateToLoad = await getBestStateToLoad(null);
          if (stateToLoad && isMounted) {
            try { 
              isSyncingFromRemoteRef.current = true;
              loadState(stateToLoad); 
              setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
            } catch (e) { /* ignore */ }
          }
          if (isMounted) setLoaded(true);
        }
      } else {
        // Disconnected mode (pure local IndexedDB / localStorage, 0 cloud calls)
        setUser(null);
        const stateToLoad = await getBestStateToLoad(null);
        if (stateToLoad && isMounted) {
          try { 
            isSyncingFromRemoteRef.current = true;
            loadState(stateToLoad); 
            setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
          } catch (e) { /* ignore */ }
        }
        if (isMounted) setLoaded(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      unsubscribeAuth();
    };
  }, [loadState, setLoaded]);

  // 2. Real-time Live Synchronization between PC & Mobile
  useEffect(() => {
    if (!user || !loaded) return;

    const unsubscribeRemote = subscribeToCloudChanges(
      user,
      (remoteState) => {
        if (!remoteState) return;
        const currentState = useGameStore.getState();
        
        const localUpdateTime = currentState.lastUpdateTime || 0;
        const remoteUpdateTime = remoteState.lastUpdateTime || 0;
        
        // Update if remote state is strictly newer or has been merged
        if (remoteUpdateTime >= localUpdateTime) {
          isSyncingFromRemoteRef.current = true;
          loadState(remoteState);
          setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
        }
      },
      () => useGameStore.getState()
    );

    return () => {
      unsubscribeRemote();
    };
  }, [user, loaded, loadState]);

  // 3. State change subscriber with Smart Semantic Throttling (Saves to IndexedDB immediately, Firestore on real progress)
  useEffect(() => {
    if (!loaded) return;

    const unsub = useGameStore.subscribe((state) => {
      if (isSyncingFromRemoteRef.current) return;
      triggerCloudSave(state, false);
    });

    return () => {
      unsub();
    };
  }, [loaded]);

  // 4. Tick loop (10s interval for local simulation only)
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      tick();
    }, 10000);
    return () => clearInterval(interval);
  }, [tick, loaded]);

  // 5. Handle Offline logic & Return Check
  useEffect(() => {
    if (!loaded) return;

    const handleOfflineCheck = async () => {
      if (isCheckingOfflineRef.current) return;
      
      const now = Date.now();
      const lastSleepTimeStr = localStorage.getItem('last_sleep_time');
      const lastActiveTimeStr = localStorage.getItem('last_active_time');
      const state = useGameStore.getState();

      let lastRecordedTime = 0;
      if (lastSleepTimeStr) {
        lastRecordedTime = parseInt(lastSleepTimeStr, 10);
      } else if (lastActiveTimeStr) {
        lastRecordedTime = parseInt(lastActiveTimeStr, 10);
      } else if (state.lastUpdateTime) {
        lastRecordedTime = state.lastUpdateTime;
      }

      if (lastRecordedTime > 0) {
        const offlineRealMinutes = (now - lastRecordedTime) / 60000;
        
        // CASE 1: If there is an active ongoing task
        if (state.currentTask) {
          if (now < state.currentTask.endTimeReal) {
            // User returned BEFORE the long task has finished:
            // STRICTLY NO "réveil" message or offline recap. The task is still underway.
            localStorage.removeItem('last_sleep_time');
            localStorage.setItem('last_active_time', now.toString());
            return;
          } else {
            // User returned AFTER the long task has finished:
            isCheckingOfflineRef.current = true;
            try {
              // Immediately clear task from local state so TopBar won't try to complete it simultaneously
              useGameStore.getState().setCurrentTask(null);

              const res = await api.getOfflineRecap({
                state,
                offlineRealMinutes,
                autopilotMode
              });

              useGameStore.getState().dispatchGameAction({
                type: 'PROCESS_OFFLINE_RECAP',
                payload: res
              });
            } catch (err) {
              console.error("Failed to fetch offline task completion recap", err);
            } finally {
              isCheckingOfflineRef.current = false;
            }
          }
        } else if (offlineRealMinutes >= 15) { // CASE 2: Regular absence >= 15 minutes without active task
          isCheckingOfflineRef.current = true;
          try {
            const res = await api.getOfflineRecap({
              state,
              offlineRealMinutes,
              autopilotMode
            });
            
            useGameStore.getState().dispatchGameAction({
              type: 'PROCESS_OFFLINE_RECAP',
              payload: res
            });
          } catch (err) {
            console.error("Failed to fetch offline recap", err);
          } finally {
            isCheckingOfflineRef.current = false;
          }
        }

        localStorage.removeItem('last_sleep_time');
        localStorage.setItem('last_active_time', now.toString());
      }
    };

    // Check immediately on load/reconnect
    handleOfflineCheck();

    // Track active presence continuously (local storage only, zero firestore writes)
    const updateActiveTime = () => {
      localStorage.setItem('last_active_time', Date.now().toString());
    };
    const activeInterval = setInterval(updateActiveTime, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleOfflineCheck();
      } else {
        localStorage.setItem('last_active_time', Date.now().toString());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("force_offline_check", handleOfflineCheck);
    return () => {
      clearInterval(activeInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("force_offline_check", handleOfflineCheck);
    };
  }, [autopilotMode, addOfflineRecap, loaded]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center bg-[#020617] w-full h-screen font-sans text-sky-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-t-2 border-sky-400 animate-spin" />
          <span className="text-sm tracking-widest uppercase font-semibold">Chargement de votre aventure...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 flex justify-center bg-gradient-to-b transition-colors duration-1000 w-full h-[100dvh] font-sans text-slate-200 overflow-hidden overscroll-none touch-none",
      atmosphere.skyGradient
    )}>
      <div className="w-full max-w-md h-full bg-transparent relative shadow-2xl overflow-hidden flex flex-col border-x border-white/5 overscroll-none">
        <TopBar 
          onSleep={() => setShowSleepModal(true)} 
          onNavigateToAgenda={() => setCurrentTab('agenda')}
        />
        
        <div className="flex-1 overflow-hidden relative min-h-0">
          {currentTab === 'home' && <MainScreen />}
          {currentTab === 'folders' && <FoldersScreen />}
          {currentTab === 'agenda' && <AgendaScreen />}
          {currentTab === 'bank' && <BankScreen />}
        </div>
        
        <BottomNav 
          currentTab={currentTab} 
          onTabChange={setCurrentTab} 
        />
        
        {showSleepModal && (
          <SleepModal 
            onClose={() => setShowSleepModal(false)}
            onSleep={() => setShowSleepModal(false)}
          />
        )}

        <EpilogueModal />
      </div>
    </div>
  );
}
