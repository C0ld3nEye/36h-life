import { StateCreator } from 'zustand';
import { GameState, Skill } from '../../types';
import { GameStore } from '../useGameState';

export interface MentalSlice {
  vitals: GameState['vitals'];
  skills: Record<string, Skill>;
  updateVitals: (impact: Partial<GameState['vitals']>) => void;
}

export const createMentalSlice: StateCreator<GameStore, [], [], MentalSlice> = (set) => ({
  vitals: {
    energy: 100,
    hunger: 100,
    hygiene: 100,
    mood: 100,
    mindset: 50
  },
  skills: {
    'cuisine': {
      name: 'Cuisine',
      level: 1,
      practicePoints: 20,
      lastPracticedGameDate: Date.now()
    },
    'communication': {
      name: 'Communication',
      level: 1,
      practicePoints: 30,
      lastPracticedGameDate: Date.now()
    },
    'bricolage': {
      name: 'Bricolage',
      level: 1,
      practicePoints: 15,
      lastPracticedGameDate: Date.now()
    }
  },

  updateVitals: (impact) => set((state) => {
    const newVitals = { ...state.vitals };
    if (impact.energy !== undefined) newVitals.energy = Math.max(0, Math.min(100, Math.round((newVitals.energy + impact.energy) * 10) / 10));
    if (impact.hunger !== undefined) newVitals.hunger = Math.max(0, Math.min(100, Math.round((newVitals.hunger + impact.hunger) * 10) / 10));
    if (impact.hygiene !== undefined) newVitals.hygiene = Math.max(0, Math.min(100, Math.round((newVitals.hygiene + impact.hygiene) * 10) / 10));
    if (impact.mood !== undefined) newVitals.mood = Math.max(0, Math.min(100, Math.round((newVitals.mood + impact.mood) * 10) / 10));
    if (impact.mindset !== undefined) newVitals.mindset = Math.max(0, Math.min(100, Math.round((newVitals.mindset + impact.mindset) * 10) / 10));
    return { vitals: newVitals, lastUpdateTime: Date.now() };
  })
});
