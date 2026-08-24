import { StateCreator } from 'zustand';
import { GameState, Task, OfflineRecapResponse, GameStatus } from '../../types';
import { GameStore } from '../useGameState';
import { DeterministicRulesEngine } from '../../engine/rulesEngine';

export interface TimeSlice {
  epochRealTime: number;
  lastUpdateTime: number;
  currentTask: Task | null;
  autopilotMode: GameState['autopilotMode'];
  gameStatus: GameStatus;
  epilogueSummary?: string;
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
  gameStatus: 'active',
  epilogueSummary: undefined,
  loaded: false,

  setLoaded: (val) => set({ loaded: val }),

  setCurrentTask: (task) => {
    get().dispatchGameAction({ type: 'SET_TASK', payload: { task } });
  },

  setAutopilotMode: (mode) => {
    get().dispatchGameAction({ type: 'SET_AUTOPILOT_MODE', payload: { mode } });
  },

  /**
   * Universal Time Cost (Coût temporel universel)
   * Advances in-game time by explicit minutes, applying realistic vital drain via rulesEngine.
   */
  consumeGameTime: (minutes: number, reason?: string) => {
    get().dispatchGameAction({ type: 'ADVANCE_TIME', payload: { minutes, reason } });
  },

  addOfflineRecap: (recap, events, diaryEntry) => {
    get().dispatchGameAction({
      type: 'PROCESS_OFFLINE_RECAP',
      payload: {
        narrativeRecap: recap,
        events: events || [],
        diaryEntry: diaryEntry
      }
    });
  }
});
