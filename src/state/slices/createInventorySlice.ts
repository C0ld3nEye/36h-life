import { StateCreator } from 'zustand';
import { InventoryItem, InventoryUpdate } from '../../types';
import { GameStore } from '../useGameState';

export interface InventorySlice {
  inventory: InventoryItem[];
  moveInventoryItem: (id: string, targetLocation: 'personnage' | 'appartement') => void;
  deleteInventoryItem: (id: string) => void;
  consumeInventoryItem: (id: string, quantity?: number) => { success: boolean; message: string };
}

export const createInventorySlice: StateCreator<GameStore, [], [], InventorySlice> = (set, get) => ({
  inventory: [],

  moveInventoryItem: (id, targetLocation) => {
    get().dispatchGameAction({
      type: 'MOVE_ITEM',
      payload: { itemId: id, targetLocation }
    });
  },

  deleteInventoryItem: (id) => {
    get().dispatchGameAction({
      type: 'DELETE_ITEM',
      payload: { itemId: id }
    });
  },

  consumeInventoryItem: (id, quantity = 1) => {
    const res = get().dispatchGameAction({
      type: 'CONSUME_ITEM',
      payload: { itemId: id, quantity }
    });
    return {
      success: res.success,
      message: res.error || "Objet consommé avec succès."
    };
  }
});
