import { StateCreator } from 'zustand';
import { GameState, InventoryItem, InventoryUpdate } from '../../types';
import { GameStore } from '../useGameState';
import { DeterministicRulesEngine } from '../../engine/rulesEngine';

export interface InventorySlice {
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  moveInventoryItem: (id: string, targetLocation: 'personnage' | 'appartement') => void;
  applyInventoryUpdates: (updates: InventoryUpdate[]) => void;
  consumeInventoryItem: (id: string, quantity?: number) => { success: boolean; message: string; vitals?: Partial<GameState['vitals']> };
}

export const createInventorySlice: StateCreator<GameStore, [], [], InventorySlice> = (set, get) => ({
  inventory: [],

  addInventoryItem: (item) => set((state) => {
    const currentInventory = [...(state.inventory || [])];
    const newItem: InventoryItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      quantity: item.quantity || 1
    };
    return { inventory: [...currentInventory, newItem], lastUpdateTime: Date.now() };
  }),

  updateInventoryItem: (id, updates) => set((state) => {
    const currentInventory = [...(state.inventory || [])];
    const idx = currentInventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      currentInventory[idx] = { ...currentInventory[idx], ...updates };
    }
    return { inventory: currentInventory, lastUpdateTime: Date.now() };
  }),

  deleteInventoryItem: (id) => set((state) => ({
    inventory: (state.inventory || []).filter(i => i.id !== id),
    lastUpdateTime: Date.now()
  })),

  moveInventoryItem: (id, targetLocation) => set((state) => {
    const currentInventory = [...(state.inventory || [])];
    const idx = currentInventory.findIndex(i => i.id === id);
    if (idx !== -1) {
      currentInventory[idx] = { ...currentInventory[idx], location: targetLocation };
    }
    return { inventory: currentInventory, lastUpdateTime: Date.now() };
  }),

  applyInventoryUpdates: (updates) => set((state) => {
    if (!updates || updates.length === 0) return {};
    const currentInventory = [...(state.inventory || [])];
    
    updates.forEach(update => {
      if (!update.name) return;
      const updateNameLower = update.name.trim().toLowerCase();
      const existingIdx = currentInventory.findIndex(item => 
        (update.id && item.id === update.id) ||
        (item.name.trim().toLowerCase() === updateNameLower && item.location === (update.location || 'personnage'))
      );

      if (existingIdx !== -1) {
        const existing = { ...currentInventory[existingIdx] };
        existing.quantity = Math.max(0, existing.quantity + update.quantityDelta);
        if (update.category) existing.category = update.category;
        if (update.description) existing.description = update.description;
        if (update.freshness) existing.freshness = update.freshness;
        if (update.consumable !== undefined) existing.consumable = update.consumable;

        if (existing.quantity <= 0) {
          currentInventory.splice(existingIdx, 1);
        } else {
          currentInventory[existingIdx] = existing;
        }
      } else if (update.quantityDelta > 0) {
        currentInventory.push({
          id: update.id || `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: update.name.trim(),
          category: update.category || 'divers',
          quantity: update.quantityDelta,
          location: update.location || 'personnage',
          description: update.description,
          freshness: update.freshness,
          consumable: update.consumable ?? false
        });
      }
    });

    return { inventory: currentInventory, lastUpdateTime: Date.now() };
  }),

  consumeInventoryItem: (id, quantityToConsume = 1) => {
    const state = get();
    const currentInventory = [...(state.inventory || [])];
    
    // Deterministic validation
    const validation = DeterministicRulesEngine.validateConsumption(currentInventory, id, quantityToConsume);
    if (!validation.valid || !validation.item) {
      return { success: false, message: validation.error || "Objet introuvable." };
    }

    const item = validation.item;
    const qty = validation.qtyToConsume;
    const idx = currentInventory.findIndex(i => i.id === id);

    let vitalsImpact: Partial<GameState['vitals']> = {};
    let message = `Vous avez utilisé ${item.name}.`;

    if (item.category === 'nourriture') {
      const hungerGain = 25 * qty;
      const energyGain = 10 * qty;
      const moodGain = 5 * qty;
      vitalsImpact = {
        hunger: Math.min(100, state.vitals.hunger + hungerGain),
        energy: Math.min(100, state.vitals.energy + energyGain),
        mood: Math.min(100, state.vitals.mood + moodGain)
      };
      message = `Vous avez dégusté ${item.name}.`;
    } else if (item.category === 'boisson') {
      const hungerGain = 10 * qty;
      const energyGain = 15 * qty;
      const moodGain = 10 * qty;
      vitalsImpact = {
        hunger: Math.min(100, state.vitals.hunger + hungerGain),
        energy: Math.min(100, state.vitals.energy + energyGain),
        mood: Math.min(100, state.vitals.mood + moodGain)
      };
      message = `Vous avez bu ${item.name}.`;
    } else if (item.category === 'hygiene') {
      vitalsImpact = {
        hygiene: Math.min(100, state.vitals.hygiene + 40),
        mood: Math.min(100, state.vitals.mood + 10)
      };
      message = `Vous avez utilisé ${item.name} pour votre toilette.`;
    }

    if (item.consumable !== false) {
      item.quantity -= qty;
      if (item.quantity <= 0) {
        currentInventory.splice(idx, 1);
      } else {
        currentInventory[idx] = item;
      }
    }

    set({
      inventory: currentInventory,
      vitals: { ...state.vitals, ...vitalsImpact },
      lastUpdateTime: Date.now()
    });

    return { success: true, message, vitals: vitalsImpact };
  }
});
