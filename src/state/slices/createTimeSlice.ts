import { StateCreator } from 'zustand';
import { GameState, Task, OfflineRecapResponse } from '../../types';
import { GameStore } from '../useGameState';

export interface TimeSlice {
  epochRealTime: number;
  lastUpdateTime: number;
  currentTask: Task | null;
  autopilotMode: GameState['autopilotMode'];
  loaded: boolean;
  setLoaded: (val: boolean) => void;
  setCurrentTask: (task: Task | null) => void;
  setAutopilotMode: (mode: GameState['autopilotMode']) => void;
  consumeGameTime: (minutes: number, reason?: string) => void;
  addOfflineRecap: (recap: string, events?: string[], diaryEntry?: OfflineRecapResponse['diaryEntry']) => void;
}

export const createTimeSlice: StateCreator<GameStore, [], [], TimeSlice> = (set, get) => ({
  epochRealTime: Date.now(),
  lastUpdateTime: Date.now(),
  currentTask: null,
  autopilotMode: 'normal',
  loaded: false,

  setLoaded: (val) => set({ loaded: val }),

  setCurrentTask: (task) => set({ 
    currentTask: task, 
    lastUpdateTime: Date.now() 
  }),

  setAutopilotMode: (mode) => set({ 
    autopilotMode: mode, 
    lastUpdateTime: Date.now() 
  }),

  /**
   * Universal Time Cost (Coût temporel universel)
   * Advances in-game time by explicit minutes, applying realistic vital drain.
   */
  consumeGameTime: (minutes: number, reason?: string) => {
    if (minutes <= 0) return;
    const state = get();
    const now = Date.now();
    const hours = minutes / 60;

    // Realistic vital impact for time expenditure
    const energyDrain = Math.round(hours * 2.5 * 10) / 10;
    const hungerDrain = Math.round(hours * 4.0 * 10) / 10;
    const hygieneDrain = Math.round(hours * 1.5 * 10) / 10;

    const newVitals = {
      ...state.vitals,
      energy: Math.max(0, state.vitals.energy - energyDrain),
      hunger: Math.max(0, state.vitals.hunger - hungerDrain),
      hygiene: Math.max(0, state.vitals.hygiene - hygieneDrain)
    };

    set({
      vitals: newVitals,
      lastUpdateTime: now
    });
  },

  addOfflineRecap: (recap, events, diaryEntry) => set((state) => {
    const newDiaryEntries = [...state.diary];

    if (diaryEntry && diaryEntry.content) {
      newDiaryEntries.push({
        id: `diary-${Math.random().toString(36).substring(7)}`,
        gameDate: Date.now(),
        title: diaryEntry.title || "Chronique d'absence & Retour",
        content: diaryEntry.content,
        category: diaryEntry.category || 'absence',
        mood: diaryEntry.mood || 'Reposé & Serein',
        milestone: diaryEntry.milestone || false,
        isPersonal: false
      });
    } else {
      const diaryContent = events && events.length > 0 
        ? events.map(e => `• ${e}`).join('\n')
        : recap.substring(0, 150) + "...";
        
      newDiaryEntries.push({
        id: `diary-${Math.random().toString(36).substring(7)}`,
        gameDate: Date.now(),
        title: "Chronique d'absence",
        content: `Faits survenus durant la période hors-ligne :\n${diaryContent}`,
        category: 'absence',
        mood: 'Reposé',
        milestone: false,
        isPersonal: false
      });
    }

    return {
      diary: newDiaryEntries,
      narrativeHistory: [...state.narrativeHistory, { role: 'model', content: `[RÉCAPITULATIF HORS-LIGNE]\n${recap}`, timestamp: Date.now() }],
      lastUpdateTime: Date.now()
    };
  })
});
