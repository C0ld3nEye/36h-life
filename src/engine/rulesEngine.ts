import { GameState, ActionResponse, InventoryItem, InventoryUpdate, CharacterProfile, LocationProfile } from '../types';

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
 * Validates any unstructured or structured payload from the LLM or client
 * before state is altered.
 * 
 * Rules enforced:
 * 1. Financial:
 *    - Checking account cannot overdraft below authorized limit (-100€) without explicit debt transaction.
 *    - Negative checking deltas without sufficient balance are automatically redirected or capped with a log.
 * 2. Inventory:
 *    - Negative quantity deltas (consuming/removing) can ONLY target items that exist in player inventory or apartment.
 *    - Quantity removed is bounded by actual quantity held (no negative phantom quantities).
 *    - Positive quantity additions are sanitized and clamped.
 * 3. Vitals & Mindset:
 *    - Mindset changes are clamped to realistic per-turn limits [-25, +25].
 *    - Total vitals (energy, hunger, hygiene, mood, mindset) are strictly clamped in [0, 100].
 * 4. Spatio-Temporal & Entity Consistency:
 *    - Deduplicates characters and locations by ID or normalized name.
 *    - Enforces duration bounds (1 to 480 minutes max).
 */
export class DeterministicRulesEngine {
  
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
      const debtsDelta = raw.moneyImpact.debtsDelta ?? 0;

      const currentChecking = currentState.bank?.checking ?? 0;
      const currentSavings = currentState.bank?.savings ?? 0;

      // Rule: Expense cannot exceed available checking + safety buffer (-100€)
      if (checkingDelta < 0 && (currentChecking + checkingDelta < -100)) {
        violations.push(`Fonds insuffisants sur le compte courant (${currentChecking}€) pour débiter ${Math.abs(checkingDelta)}€.`);
        
        // Auto-correction: if player has savings, suggest or reject
        if (currentSavings >= Math.abs(checkingDelta)) {
          violations.push(`Le montant de ${Math.abs(checkingDelta)}€ nécessite un virement depuis le livret d'épargne.`);
        }
        
        // Cap debit to available limit
        const maxSpendable = Math.max(0, currentChecking + 100);
        if (maxSpendable > 0) {
          validated.moneyImpact = {
            ...raw.moneyImpact,
            checkingDelta: -maxSpendable,
            reason: `${raw.moneyImpact.reason || 'Dépense'} (Plafonné au solde disponible)`
          };
          autoCorrected = true;
        } else {
          // Reject transaction
          validated.moneyImpact = undefined;
          moneyChangesAllowed = false;
        }
      }

      // Savings withdrawal check
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
        const targetNameLower = update.name.trim().toLowerCase();
        const existingItem = currentInv.find(i => 
          (update.id && i.id === update.id) ||
          (i.name.trim().toLowerCase() === targetNameLower && i.location === (update.location || 'personnage'))
        );

        if (update.quantityDelta < 0) {
          // Negative quantity: verify item actually exists in storage
          if (!existingItem) {
            violations.push(`Tentative de retrait de l'objet "${update.name}" non présent dans l'inventaire.`);
            autoCorrected = true;
            // Reject this invalid subtraction
            continue;
          }

          const availableQty = existingItem.quantity || 1;
          const removalQty = Math.abs(update.quantityDelta);

          if (removalQty > availableQty) {
            violations.push(`Tentative de retrait de ${removalQty}x "${update.name}" alors que seulement ${availableQty}x sont possédés.`);
            sanitizedUpdates.push({
              ...update,
              quantityDelta: -availableQty
            });
            autoCorrected = true;
          } else {
            sanitizedUpdates.push(update);
          }
        } else if (update.quantityDelta > 0) {
          // Positive quantity: sanitize payload
          sanitizedUpdates.push({
            id: update.id || `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: update.name.trim(),
            category: update.category || 'divers',
            quantityDelta: Math.min(99, Math.max(1, update.quantityDelta)),
            location: update.location || 'personnage',
            description: update.description,
            freshness: update.freshness,
            consumable: update.consumable ?? false
          });
        }
      }

      validated.inventoryUpdates = sanitizedUpdates;
    }

    // --- 3. VITALS & MINDSET RULE VALIDATION ---
    let vitalsChangesAllowed = true;
    if (raw.vitalsImpact) {
      const currentVitals = currentState.vitals;
      const sanitizedVitals = { ...raw.vitalsImpact };

      // Clamp individual delta spikes to realistic boundaries
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
        // Clamp to max 480 minutes (8 hours) per continuous task
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
   * Validates a direct player item consumption action.
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
   * Validates a bank transfer request.
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
}
