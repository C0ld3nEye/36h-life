import { 
  GameState, ActionResponse, InventoryItem, 
  InventoryUpdate, GameStatus, GameAction 
} from '../types';
import { findMatchingInventoryItemIndex } from '../lib/utils';

export interface ValidatedRuleOutcome {
  validatedResponse: ActionResponse;
  ruleViolations: string[];
  autoCorrected: boolean;
  moneyChangesAllowed: boolean;
  inventoryChangesAllowed: boolean;
  vitalsChangesAllowed: boolean;
}

/**
 * Deterministic Rules Engine (Moteur de règles déterministe)
 * Centralizes all validation, precondition checks, and game status transitions.
 */
export class DeterministicRulesEngine {
  
  /**
   * Evaluates the global game status: 'active' | 'victory' | 'timeout' | 'breakdown'
   */
  public static evaluateGameStatus(state: GameState): { status: GameStatus; reason?: string } {
    const now = Date.now();
    const elapsedRealMs = now - (state.epochRealTime || now);
    const elapsedGameHours = elapsedRealMs / (60 * 60 * 1000); // In our real-time scale, 1 real hr = 1 game hr (or scaled)

    // 1. Mental or physical breakdown (vital collapse)
    if ((state.vitals.mindset !== undefined && state.vitals.mindset <= 0) || 
        (state.vitals.energy <= 0 && state.vitals.hunger <= 0)) {
      return {
        status: 'breakdown',
        reason: "Épuisement total. Votre équilibre mental et physique a atteint un seuil critique. Vous devez impérativement vous reposer et reprendre des forces."
      };
    }

    // 2. 36h cycle completion (Only evaluated once, before player continues in open-ended mode)
    if (!state.hasAcknowledgedEpilogue && elapsedGameHours >= 36) {
      if (state.vitals.mindset >= 35 && state.vitals.energy >= 15 && state.bank.checking >= 0) {
        return {
          status: 'victory',
          reason: "Cycle initial de 36 heures accompli avec succès ! Vous avez su préserver votre stabilité financière, maintenir votre lucidité et poser les bases de votre vie dans la cité."
        };
      } else {
        return {
          status: 'timeout',
          reason: "Le premier cycle de 36 heures est arrivé à son terme. Bien que le rythme fut éprouvant, vous avez franchi ce premier cap d'acclimatation."
        };
      }
    }

    return { status: 'active' };
  }

  /**
   * Validates and sanitizes an action response against current state.
   */
  public static validateAction(currentState: GameState, raw: ActionResponse): ValidatedRuleOutcome {
    const violations: string[] = [];
    let autoCorrected = false;
    const validated: ActionResponse = { ...raw };

    // --- 1. FINANCIAL RULE VALIDATION ---
    let moneyChangesAllowed = true;
    if (raw.moneyImpact) {
      const checkingDelta = raw.moneyImpact.checkingDelta ?? 0;
      const savingsDelta = raw.moneyImpact.savingsDelta ?? 0;

      const currentChecking = currentState.bank?.checking ?? 0;
      const currentSavings = currentState.bank?.savings ?? 0;

      // Rule: Expense cannot exceed available checking + safety buffer (-100€)
      if (checkingDelta < 0 && (currentChecking + checkingDelta < -100)) {
        violations.push(`Fonds insuffisants sur le compte courant (${currentChecking}€) pour débiter ${Math.abs(checkingDelta)}€.`);
        
        if (currentSavings >= Math.abs(checkingDelta)) {
          violations.push(`Le montant de ${Math.abs(checkingDelta)}€ nécessite un virement depuis le livret d'épargne.`);
        }
        
        const maxSpendable = Math.max(0, currentChecking + 100);
        if (maxSpendable > 0) {
          validated.moneyImpact = {
            ...raw.moneyImpact,
            checkingDelta: -maxSpendable,
            reason: `${raw.moneyImpact.reason || 'Dépense'} (Plafonné au solde disponible)`
          };
          autoCorrected = true;
        } else {
          validated.moneyImpact = undefined;
          moneyChangesAllowed = false;
        }
      }

      if (savingsDelta < 0 && (currentSavings + savingsDelta < 0)) {
        violations.push(`Solde insuffisant sur le livret d'épargne (${currentSavings}€) pour débiter ${Math.abs(savingsDelta)}€.`);
        validated.moneyImpact = {
          ...validated.moneyImpact,
          savingsDelta: -currentSavings
        };
        autoCorrected = true;
      }
    }

    // --- 2. INVENTORY RULE VALIDATION ---
    let inventoryChangesAllowed = true;
    if (raw.inventoryUpdates && raw.inventoryUpdates.length > 0) {
      const currentInv = currentState.inventory || [];
      const sanitizedUpdates: InventoryUpdate[] = [];

      for (const update of raw.inventoryUpdates) {
        if (!update.name) continue;
        const matchIdx = findMatchingInventoryItemIndex(
          currentInv,
          update.name,
          update.id,
          update.location
        );
        const existingItem = matchIdx !== -1 ? currentInv[matchIdx] : undefined;

        if (update.quantityDelta < 0) {
          if (!existingItem) {
            violations.push(`Tentative de retrait de l'objet "${update.name}" non trouvé dans l'inventaire.`);
            autoCorrected = true;
            continue;
          }

          // If item exists, ensure we target its exact ID and location for the state update
          sanitizedUpdates.push({
            ...update,
            id: existingItem.id,
            name: existingItem.name,
            location: existingItem.location
          });
        } else if (update.quantityDelta > 0) {
          sanitizedUpdates.push({
            id: existingItem?.id || update.id || `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: existingItem ? existingItem.name : update.name.trim(),
            category: update.category || existingItem?.category || 'divers',
            quantityDelta: Math.min(99, Math.max(1, update.quantityDelta)),
            location: update.location || existingItem?.location || 'personnage',
            description: update.description || existingItem?.description,
            freshness: update.freshness || existingItem?.freshness,
            consumable: update.consumable ?? existingItem?.consumable ?? false
          });
        }
      }

      validated.inventoryUpdates = sanitizedUpdates;
    }

    // --- 3. VITALS & MINDSET RULE VALIDATION ---
    let vitalsChangesAllowed = true;
    const sanitizedVitals = { ...(raw.vitalsImpact || {}) };

    // Safety net: if food items were consumed with quantityDelta < 0, ensure hunger is replenished
    const consumedFood = (validated.inventoryUpdates || []).filter(u => 
      (u.quantityDelta || 0) < 0 && /(oeuf|œuf|omelette|pâte|pasta|pain|repas|aliment|nourriture|café|plat|sauce)/i.test(u.name || '')
    );
    if (consumedFood.length > 0 && (sanitizedVitals.hunger === undefined || sanitizedVitals.hunger <= 0)) {
      const isLargeMeal = consumedFood.some(u => Math.abs(u.quantityDelta || 0) >= 3 || /(omelette|pâte|pasta|plat|repas)/i.test(u.name || ''));
      sanitizedVitals.hunger = isLargeMeal ? 70 : 50;
      if (sanitizedVitals.mood === undefined || sanitizedVitals.mood <= 0) {
        sanitizedVitals.mood = 5;
      }
    }

    if (raw.vitalsImpact || consumedFood.length > 0) {
      if (sanitizedVitals.mindset !== undefined) {
        sanitizedVitals.mindset = Math.max(-25, Math.min(25, sanitizedVitals.mindset));
      }
      if (sanitizedVitals.energy !== undefined) {
        sanitizedVitals.energy = Math.max(-50, Math.min(100, sanitizedVitals.energy));
      }
      if (sanitizedVitals.hunger !== undefined) {
        sanitizedVitals.hunger = Math.max(-50, Math.min(100, sanitizedVitals.hunger));
      }
      if (sanitizedVitals.hygiene !== undefined) {
        sanitizedVitals.hygiene = Math.max(-50, Math.min(100, sanitizedVitals.hygiene));
      }
      if (sanitizedVitals.mood !== undefined) {
        sanitizedVitals.mood = Math.max(-30, Math.min(30, sanitizedVitals.mood));
      }

      validated.vitalsImpact = sanitizedVitals;
    }

    // --- 4. TASK DURATION VALIDATION ---
    if (raw.durationMinutes !== undefined && raw.durationMinutes !== null) {
      if (raw.durationMinutes <= 0) {
        validated.durationMinutes = undefined;
      } else {
        validated.durationMinutes = Math.min(480, Math.max(1, Math.round(raw.durationMinutes)));
      }
    }

    // --- 5. CHOICES SANITIZATION ---
    if (raw.choices && Array.isArray(raw.choices)) {
      validated.choices = raw.choices
        .map(c => typeof c === 'string' ? c.trim() : String(c || '').trim())
        .filter(c => c.length > 2);
      if (validated.choices.length === 0) {
        validated.choices = [
          "Prendre un instant pour observer les environs",
          "Consulter votre agenda et vos notes",
          "Passer à l'action"
        ];
      }
    }

    return {
      validatedResponse: validated,
      ruleViolations: violations,
      autoCorrected,
      moneyChangesAllowed,
      inventoryChangesAllowed,
      vitalsChangesAllowed
    };
  }

  /**
   * Validates item consumption.
   */
  public static validateConsumption(
    inventory: InventoryItem[],
    itemId: string,
    quantity = 1
  ): { valid: boolean; item?: InventoryItem; error?: string; qtyToConsume: number } {
    const item = inventory.find(i => i.id === itemId);
    if (!item) {
      return { valid: false, error: "Cet objet n'est pas dans votre inventaire.", qtyToConsume: 0 };
    }
    if (item.quantity <= 0) {
      return { valid: false, error: "Vous ne possédez plus cet objet.", qtyToConsume: 0 };
    }
    const qtyToConsume = Math.min(item.quantity, Math.max(1, quantity));
    return { valid: true, item, qtyToConsume };
  }

  /**
   * Validates bank transfer.
   */
  public static validateTransfer(
    bank: GameState['bank'],
    from: 'checking' | 'savings',
    to: 'checking' | 'savings' | 'debts',
    amount: number
  ): { valid: boolean; error?: string } {
    if (amount <= 0 || isNaN(amount)) {
      return { valid: false, error: "Le montant du virement doit être supérieur à 0 €." };
    }
    if (from === to) {
      return { valid: false, error: "Les comptes source et destination doivent être différents." };
    }
    if (from === 'checking' && bank.checking < amount) {
      return { valid: false, error: `Solde insuffisant sur le compte courant (${bank.checking} € disponible).` };
    }
    if (from === 'savings' && bank.savings < amount) {
      return { valid: false, error: `Solde insuffisant sur le livret d'épargne (${bank.savings} € disponible).` };
    }
    return { valid: true };
  }

  /**
   * Validates loan request.
   */
  public static validateLoan(
    bank: GameState['bank'],
    amount: number
  ): { valid: boolean; error?: string } {
    if (amount <= 0 || isNaN(amount)) {
      return { valid: false, error: "Le montant du crédit doit être supérieur à 0 €." };
    }
    if (amount > 10000) {
      return { valid: false, error: "Le montant maximal d'emprunt accordé par la banque est de 10 000 €." };
    }
    if (bank.debts + amount > 25000) {
      return { valid: false, error: "Capacité d'endettement maximale atteinte (limite globale : 25 000 €)." };
    }
    return { valid: true };
  }

  /**
   * Validates time advancement and calculates vital drains.
   */
  public static validateTimeAdvance(
    state: GameState,
    minutes: number
  ): { valid: boolean; minutes: number; vitalDrain: Partial<GameState['vitals']>; error?: string } {
    if (minutes <= 0 || isNaN(minutes)) {
      return { valid: false, minutes: 0, vitalDrain: {}, error: "La durée d'avancement doit être positive." };
    }
    const clampedMinutes = Math.min(1440, Math.max(1, Math.round(minutes)));
    const hours = clampedMinutes / 60;

    const energyDrain = Math.round(hours * 2.5 * 10) / 10;
    const hungerDrain = Math.round(hours * 4.0 * 10) / 10;
    const hygieneDrain = Math.round(hours * 1.5 * 10) / 10;

    return {
      valid: true,
      minutes: clampedMinutes,
      vitalDrain: {
        energy: -energyDrain,
        hunger: -hungerDrain,
        hygiene: -hygieneDrain
      }
    };
  }
}
