import { create } from 'zustand';
import { 
  GameState, ActionResponse, Task,
  PlotLead, RumorEntry, ContactMessage,
  GameAction, InventoryUpdate
} from '../types';
import { resetCloudAndLocalData } from '../lib/cloudSync';
import { DeterministicRulesEngine } from '../engine/rulesEngine';

import { TimeSlice, createTimeSlice } from './slices/createTimeSlice';
import { InventorySlice, createInventorySlice } from './slices/createInventorySlice';
import { MentalSlice, createMentalSlice } from './slices/createMentalSlice';
import { BankSlice, createBankSlice } from './slices/createBankSlice';
import { WorldSlice, createWorldSlice } from './slices/createWorldSlice';

export const GAME_TIME_MULTIPLIER = 1;

export interface GameStore extends TimeSlice, InventorySlice, MentalSlice, BankSlice, WorldSlice {
  loadState: (state: Partial<GameState>) => void;
  resetGame: () => Promise<void>;
  continueGameAfterEpilogue: () => void;
  recoverFromBreakdown: () => void;
  dispatchGameAction: (action: GameAction) => { success: boolean; error?: string };
  processActionResponse: (res: ActionResponse) => void;
  tick: () => void;
}

export const INITIAL_STATE: GameState = {
  epochRealTime: Date.now(),
  gameStatus: 'active',
  epilogueSummary: undefined,
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
  inventory: [
    {
      id: 'item-pass-clefs',
      name: 'Trousseau de clés & Pass magnétique',
      category: 'clefs_pass',
      quantity: 1,
      location: 'personnage',
      description: 'Clés de votre studio n°304 et badge d\'accès de l\'immeuble Saint-Michel.',
      valueEstimate: 0
    },
    {
      id: 'item-terminal-portable',
      name: 'Communicateur portable',
      category: 'technologie',
      quantity: 1,
      location: 'personnage',
      description: 'Terminal personnel holographique permettant d\'accéder à votre compte en banque, vos messages et votre agenda.',
      valueEstimate: 200
    },
    {
      id: 'item-bouteille-eau',
      name: 'Gourde d\'eau filtrée',
      category: 'boisson',
      quantity: 1,
      location: 'personnage',
      description: 'Gourde isotherme pleine d\'eau fraîche.',
      freshness: 'frais',
      consumable: true,
      valueEstimate: 2
    },
    {
      id: 'item-cafe-moulu',
      name: 'Paquet de café torréfié artisanal (250g)',
      category: 'boisson',
      quantity: 1,
      location: 'appartement',
      description: 'Café offert par le propriétaire pour votre emménagement. Sent très bon.',
      freshness: 'sec',
      consumable: true,
      valueEstimate: 8
    },
    {
      id: 'item-pates',
      name: 'Paquet de pâtes (500g)',
      category: 'nourriture',
      quantity: 2,
      location: 'appartement',
      description: 'Provisions de base dans le placard au-dessus de l\'évier.',
      freshness: 'sec',
      consumable: true,
      valueEstimate: 3
    },
    {
      id: 'item-sauce-tomate',
      name: 'Bocal de coulis de tomates & herbes',
      category: 'nourriture',
      quantity: 1,
      location: 'appartement',
      description: 'Bocal dans le placard de la kitchenette.',
      freshness: 'sec',
      consumable: true,
      valueEstimate: 2
    },
    {
      id: 'item-oeufs',
      name: 'Boîte de 6 œufs fermiers',
      category: 'nourriture',
      quantity: 1,
      location: 'appartement',
      description: 'Dans le bac du petit réfrigérateur.',
      freshness: 'frais',
      consumable: true,
      valueEstimate: 3
    },
    {
      id: 'item-beurre',
      name: 'Plaquette de beurre demi-sel',
      category: 'nourriture',
      quantity: 1,
      location: 'appartement',
      description: 'Dans le réfrigérateur.',
      freshness: 'frais',
      consumable: true,
      valueEstimate: 2
    },
    {
      id: 'item-gel-douche',
      name: 'Gel douche & savon végétal',
      category: 'hygiene',
      quantity: 1,
      location: 'appartement',
      description: 'Posé sur l\'étagère de la cabine de douche.',
      freshness: 'frais',
      consumable: false,
      valueEstimate: 4
    },
    {
      id: 'item-trousse-outils',
      name: 'Boîte à outils d\'urgence (tournevis, pince, multimètre)',
      category: 'outils',
      quantity: 1,
      location: 'appartement',
      description: 'Petite boîte en métal rangée sous l\'évier pour les menues réparations.',
      valueEstimate: 35
    }
  ],
  characters: {
    'char-leo': {
      id: 'char-leo',
      name: 'Léo Mercier',
      locationEncountered: 'Mon Appartement (Studio principal)',
      relationshipStatus: 'amical',
      age: '26 ans',
      appearance: 'Souriant, style décontracté, cheveux bruns ébouriffés, porte souvent une veste en jean.',
      occupation: 'Technicien de maintenance & voisin de palier',
      background: 'Un voisin très chaleureux qui habite juste en face. Il vous a aidé à porter vos derniers cartons le jour de votre emménagement et vous a laissé son contact.',
      financialRelation: 'Aucune',
      pendingItems: [],
      upcomingEvents: ['Café d\'accueil à l\'occasion'],
      notes: 'Ami et voisin serviable. Toujours partant pour donner un coup de main ou partager un verre.'
    }
  },
  locations: {
    'loc-appartement': {
      id: 'loc-appartement',
      name: 'Mon Appartement (Studio principal)',
      category: 'domicile',
      planetOrSystem: 'Terre (Système Solaire)',
      city: 'Néo-Paris',
      district: 'Quartier Résidentiel Saint-Michel',
      description: 'Un studio lumineux de 28m² sous les toits, avec une kitchenette bien équipée, un coin salon-bureau, une salle d\'eau et un lit douillet près de la baie vitrée.',
      keyFeatures: ['Kitchenette fonctionnelle', 'Bureau de travail & terminal', 'Lit confortable', 'Salle de bain avec douche'],
      associatedCharacters: ['char-leo'],
      notes: 'Votre havre de paix. Vous pouvez vous y reposer, cuisiner et planifier vos journées.',
      discoveredGameDate: Date.now(),
      isCurrentLocation: true,
      accessLevel: 'libre',
      transitRoutes: []
    },
    'loc-cafe-lumina': {
      id: 'loc-cafe-lumina',
      name: 'Bistro & Terrasse Néo-Lumina',
      category: 'commerce',
      planetOrSystem: 'Terre (Système Solaire)',
      city: 'Néo-Paris',
      district: 'Quartier Résidentiel Saint-Michel',
      description: 'Un bistrot chaleureux et animé avec terrasse vitrée chauffée et bar à café torréfié artisanal. Le lieu idéal pour croiser des riverains ou travailler au calme.',
      keyFeatures: ['Café aromatique', 'Terrasse panoramique', 'Réseau haut débit gratuit', 'Plats du jour abordables'],
      associatedCharacters: ['char-leo'],
      notes: 'Endroit parfait pour boire un verre avec Léo ou faire de nouvelles rencontres.',
      discoveredGameDate: Date.now(),
      isCurrentLocation: false,
      accessLevel: 'libre',
      transitRoutes: [
        { mode: 'a_pied', label: 'À pied depuis le studio', durationGameMinutes: 8, costCredits: 0, description: '500m le long de l\'avenue pavée Saint-Michel.' }
      ]
    },
    'loc-hub-transport': {
      id: 'loc-hub-transport',
      name: 'Gare Centrale & Spatioport Fluvial',
      category: 'lieu_clef',
      planetOrSystem: 'Terre (Système Solaire)',
      city: 'Néo-Paris',
      district: 'Centre Urbain & Plateforme Multimodale',
      description: 'Immense dôme de verre et d\'acier régulant les monorails à sustentation magnétique, les navettes atmosphériques régionales et le terminal des navettes suborbitales vers les stations en orbite.',
      keyFeatures: ['Monorails Inter-Quartiers', 'Navettes Régionales & Suborbitales', 'Bornes de change de crédits', 'Consignes sécurisées'],
      discoveredGameDate: Date.now(),
      isCurrentLocation: false,
      accessLevel: 'libre',
      transitRoutes: [
        { mode: 'monorail', label: 'Monorail Ligne 4 Express', durationGameMinutes: 15, costCredits: 4, description: 'Trajet direct rapide depuis la station Saint-Michel.' }
      ]
    }
  },
  bank: {
    checking: 500,
    savings: 1000,
    savingsRate: 0.02,
    debts: 0,
    debtRate: 0.05,
    recurringBills: [
      {
        id: 'bill-loyer',
        name: 'Loyer',
        amount: 350,
        nextDueDate: Date.now() + 30 * 36 * 60 * 60 * 1000
      }
    ],
    transactions: [
      {
        id: 'init-2',
        timestamp: Date.now(),
        label: 'Solde de départ - Épargne',
        amount: 1000,
        account: 'savings',
        category: 'virement'
      },
      {
        id: 'init-1',
        timestamp: Date.now() - 1000,
        label: 'Solde de départ - Courant',
        amount: 500,
        account: 'checking',
        category: 'virement'
      }
    ]
  },
  diary: [
    {
      id: 'diary-init',
      gameDate: Date.now(),
      title: 'Premier jour d\'un nouveau départ',
      content: 'Les cartons sont enfin déballés dans mon nouveau studio du quartier Saint-Michel. Léo, mon voisin de palier, m\'a donné un coup de main salvateur. Les journées de 36 heures ici sont vertigineuses, mais le calme de ce soir me donne bon espoir. Il est temps de me construire un avenir solide.',
      category: 'souvenir',
      mood: 'Serein & Motivé',
      milestone: true,
      isPersonal: false
    }
  ],
  episodicMemories: [
    {
      id: 'mem-init',
      timestamp: Date.now(),
      gameDateStr: 'Lundi 01/01/2100',
      summary: 'Emménagement réussi dans le studio du quartier Saint-Michel avec l\'aide de Léo, voisin de palier chaleureux.',
      importance: 'haute',
      tags: ['emménagement', 'studio', 'Saint-Michel', 'Léo', 'début']
    }
  ],
  agenda: [],
  currentTask: null,
  narrativeHistory: [
    {
      role: 'model',
      content: 'Vous voilà fraîchement installé(e) dans votre studio du quartier Saint-Michel ! Les derniers cartons sont déballés, notamment grâce à Léo, votre sympathique voisin de palier qui vous a prêté un précieux coup de main.\n\nUne nouvelle vie commence sur cette planète avec des journées de 36 heures. Fort(e) de vos notions en cuisine, en bricolage et en communication, tout votre avenir reste à écrire. Que souhaitez-vous faire pour bien démarrer ?',
      timestamp: Date.now()
    }
  ],
  autopilotMode: 'normal',
  choices: [
    "Envoyer un message à Léo pour le remercier et lui proposer un café.",
    "Se préparer un bon petit-déjeuner dans la kitchenette.",
    "Jeter un œil au dossier 'Banque' pour vérifier vos finances.",
    "Sortir explorer le quartier Saint-Michel."
  ],
  lastUpdateTime: Date.now(),
  plotLeads: [],
  rumors: [],
  messages: [
    {
      id: 'msg-leo-welcome',
      senderId: 'char-leo',
      senderName: 'Léo Mercier',
      preview: 'Bien installé dans le studio ? Passe au café quand t\'as un moment !',
      content: 'Salut voisin ! J\'espère que tu as bien récupéré de ton emménagement. Si tu es libre un de ces jours autour du zénith ou en fin de journée, passe au Bistro Néo-Lumina, le premier café est pour moi ! Fais-moi signe.',
      timestampReal: Date.now() - 3600000,
      timestampGameDateStr: 'Jour 1 à 09:15',
      read: false,
      replyOptions: [
        'Merci Léo ! Avec grand plaisir, je passerai dès que possible.',
        'Salut, j\'ai encore quelques démarches mais je note l\'invitation avec plaisir !',
        'Bien reçu. À très vite au bistro !'
      ]
    }
  ]
};

export function sanitizeChoices(rawChoices: any): string[] {
  if (!Array.isArray(rawChoices)) return [];
  return rawChoices
    .map(c => {
      if (typeof c === 'string') return c.trim();
      if (c && typeof c === 'object') {
        return (c.text || c.choice || c.label || c.title || JSON.stringify(c)).trim();
      }
      return String(c || '').trim();
    })
    .filter(c => c.length > 0);
}

export function sanitizeNarrativeHistory(rawHistory: any): GameState['narrativeHistory'] {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter(Boolean)
    .map(m => {
      const role = m?.role === 'user' ? 'user' : 'model';
      let content = "";
      if (typeof m?.content === 'string') {
        content = m.content;
      } else if (m?.content && typeof m.content === 'object') {
        content = (m.content as any).text || (m.content as any).narrative || JSON.stringify(m.content);
      } else {
        content = String(m?.content || '');
      }
      const timestamp = typeof m?.timestamp === 'number' && !isNaN(m.timestamp) ? m.timestamp : Date.now();
      return { role, content, timestamp };
    });
}

export function sanitizeTask(task: any): Task | null {
  if (!task || typeof task !== 'object') return null;
  if (!task.startTimeReal || isNaN(task.startTimeReal) || !task.endTimeReal || isNaN(task.endTimeReal)) {
    return null;
  }
  return {
    id: String(task.id || Math.random().toString(36).substr(2, 9)),
    description: typeof task.description === 'string' ? task.description : String(task.description || 'Activité en cours'),
    startTimeReal: task.startTimeReal,
    endTimeReal: task.endTimeReal,
    durationMinutes: typeof task.durationMinutes === 'number' ? task.durationMinutes : Math.max(1, Math.round((task.endTimeReal - task.startTimeReal) / 60000)),
    paused: !!task.paused,
    lastInteractionTimeReal: task.lastInteractionTimeReal || Date.now()
  };
}

export const useGameStore = create<GameStore>()((set, get, api) => ({
  ...createTimeSlice(set, get, api),
  ...createInventorySlice(set, get, api),
  ...createMentalSlice(set, get, api),
  ...createBankSlice(set, get, api),
  ...createWorldSlice(set, get, api),

  /**
   * Centralized State Dispatcher (Unique Point of Entry for State Mutations)
   * Validates all preconditions and rules before altering bank, inventory, time, vitals, or world state.
   */
  dispatchGameAction: (action: GameAction) => {
    const currentState = get();

    // Block mutations if game has ended
    if (currentState.gameStatus && currentState.gameStatus !== 'active' && action.type !== 'ADD_NARRATIVE') {
      return { success: false, error: "Le cycle de jeu est terminé." };
    }

    switch (action.type) {
      case 'PROCESS_ACTION_RESPONSE': {
        get().processActionResponse(action.payload);
        return { success: true };
      }

      case 'PROCESS_OFFLINE_RECAP': {
        const recap = action.payload;
        const state = get();
        const newDiaryEntries = [...state.diary];

        if (recap.diaryEntry && recap.diaryEntry.content) {
          newDiaryEntries.push({
            id: `diary-${Math.random().toString(36).substring(7)}`,
            gameDate: Date.now(),
            title: recap.diaryEntry.title || "Chronique d'absence & Retour",
            content: recap.diaryEntry.content,
            category: recap.diaryEntry.category || 'absence',
            mood: recap.diaryEntry.mood || 'Reposé & Serein',
            milestone: recap.diaryEntry.milestone || false,
            isPersonal: false
          });
        } else if (recap.events && recap.events.length > 0) {
          newDiaryEntries.push({
            id: `diary-${Math.random().toString(36).substring(7)}`,
            gameDate: Date.now(),
            title: "Chronique d'absence",
            content: `Faits survenus durant la période hors-ligne :\n${recap.events.map(e => `• ${e}`).join('\n')}`,
            category: 'absence',
            mood: 'Reposé',
            milestone: false,
            isPersonal: false
          });
        }

        const narrativeRecap = recap.narrativeRecap || "Pendant votre absence, la cité a continué de vivre.";
        set({
          diary: newDiaryEntries,
          narrativeHistory: [
            ...state.narrativeHistory,
            { role: 'model', content: `[RÉCAPITULATIF HORS-LIGNE]\n${narrativeRecap}`, timestamp: Date.now() }
          ],
          choices: sanitizeChoices(recap.choices || state.choices),
          lastUpdateTime: Date.now()
        });

        if (recap.vitalsImpact) {
          get().updateVitals(recap.vitalsImpact);
        }
        if (recap.inventoryUpdates && recap.inventoryUpdates.length > 0) {
          recap.inventoryUpdates.forEach(up => {
            get().dispatchGameAction({
              type: 'MOVE_ITEM',
              payload: { itemId: up.id || '', targetLocation: up.location || 'personnage' }
            });
          });
        }

        // Evaluate game status after recap
        const statusEval = DeterministicRulesEngine.evaluateGameStatus(get());
        if (statusEval.status !== 'active') {
          set({ gameStatus: statusEval.status, epilogueSummary: statusEval.reason });
        }

        return { success: true };
      }

      case 'TRANSFER_MONEY': {
        const { from, to, amount } = action.payload;
        const validation = DeterministicRulesEngine.validateTransfer(currentState.bank, from, to, amount);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const now = Date.now();
        const newBank = { ...currentState.bank };
        const txList = newBank.transactions ? [...newBank.transactions] : [];

        if (from === 'checking') newBank.checking -= amount;
        if (from === 'savings') newBank.savings -= amount;

        if (to === 'checking') newBank.checking += amount;
        if (to === 'savings') newBank.savings += amount;
        if (to === 'debts') newBank.debts = Math.max(0, newBank.debts - amount);

        txList.unshift({
          id: `tx-${now}-${Math.random().toString(36).substring(7)}`,
          timestamp: now,
          label: `Virement de ${from === 'checking' ? 'Compte Courant' : 'Livret Épargne'} vers ${to === 'checking' ? 'Compte Courant' : to === 'savings' ? 'Livret Épargne' : 'Remboursement Dette'}`,
          amount: -amount,
          account: from,
          category: 'virement'
        });

        set({ bank: { ...newBank, transactions: txList }, lastUpdateTime: now });
        return { success: true };
      }

      case 'TAKE_LOAN': {
        const { amount } = action.payload;
        const validation = DeterministicRulesEngine.validateLoan(currentState.bank, amount);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const now = Date.now();
        const newBank = {
          ...currentState.bank,
          checking: currentState.bank.checking + amount,
          debts: currentState.bank.debts + amount
        };
        const txList = newBank.transactions ? [...newBank.transactions] : [];

        txList.unshift({
          id: `tx-loan-${now}`,
          timestamp: now,
          label: `Souscription d'emprunt bancaire`,
          amount: amount,
          account: 'checking',
          category: 'virement'
        });

        set({ bank: { ...newBank, transactions: txList }, lastUpdateTime: now });
        return { success: true };
      }

      case 'CONSUME_ITEM': {
        const { itemId, quantity = 1 } = action.payload;
        const inv = currentState.inventory || [];
        const validation = DeterministicRulesEngine.validateConsumption(inv, itemId, quantity);
        if (!validation.valid || !validation.item) {
          return { success: false, error: validation.error || "Impossible de consommer cet objet." };
        }

        const item = validation.item;
        const qtyToConsume = validation.qtyToConsume;
        const updatedInventory = inv.map(i => {
          if (i.id === itemId) {
            return { ...i, quantity: i.quantity - qtyToConsume };
          }
          return i;
        }).filter(i => i.quantity > 0);

        // Apply item effect to vitals
        const vitalsImpact: Partial<GameState['vitals']> = {};
        const lowerName = item.name.toLowerCase();

        if (item.category === 'boisson' || lowerName.includes('eau') || lowerName.includes('café') || lowerName.includes('thé')) {
          vitalsImpact.hunger = 15 * qtyToConsume;
          vitalsImpact.energy = (lowerName.includes('café') || lowerName.includes('thé')) ? 10 * qtyToConsume : 5 * qtyToConsume;
          vitalsImpact.mindset = 3 * qtyToConsume;
        } else if (item.category === 'nourriture') {
          vitalsImpact.hunger = 35 * qtyToConsume;
          vitalsImpact.energy = 10 * qtyToConsume;
          vitalsImpact.mindset = 4 * qtyToConsume;
        } else if (item.category === 'hygiene') {
          vitalsImpact.hygiene = 40 * qtyToConsume;
          vitalsImpact.mood = 15 * qtyToConsume;
          vitalsImpact.mindset = 5 * qtyToConsume;
        }

        set({ inventory: updatedInventory, lastUpdateTime: Date.now() });
        get().updateVitals(vitalsImpact);
        return { success: true };
      }

      case 'MOVE_ITEM': {
        const { itemId, targetLocation } = action.payload;
        const inv = (currentState.inventory || []).map(i => 
          i.id === itemId ? { ...i, location: targetLocation } : i
        );
        set({ inventory: inv, lastUpdateTime: Date.now() });
        return { success: true };
      }

      case 'DELETE_ITEM': {
        const { itemId } = action.payload;
        const inv = (currentState.inventory || []).filter(i => i.id !== itemId);
        set({ inventory: inv, lastUpdateTime: Date.now() });
        return { success: true };
      }

      case 'ADVANCE_TIME': {
        const { minutes, reason } = action.payload;
        const validation = DeterministicRulesEngine.validateTimeAdvance(currentState, minutes);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const now = Date.now();
        get().updateVitals(validation.vitalDrain);

        // Advance in-game epoch time so the calendar date and clock advance
        const currentEpoch = currentState.epochRealTime || now;
        const newEpoch = currentEpoch - ((minutes * 60 * 1000) / GAME_TIME_MULTIPLIER);

        // Check if game duration completed
        const statusEval = DeterministicRulesEngine.evaluateGameStatus(get());
        if (statusEval.status !== 'active') {
          set({ epochRealTime: newEpoch, gameStatus: statusEval.status, epilogueSummary: statusEval.reason, lastUpdateTime: now });
        } else {
          set({ epochRealTime: newEpoch, lastUpdateTime: now });
        }
        return { success: true };
      }

      case 'SET_TASK': {
        set({ currentTask: sanitizeTask(action.payload.task), lastUpdateTime: Date.now() });
        return { success: true };
      }

      case 'CANCEL_TASK': {
        set({ currentTask: null, lastUpdateTime: Date.now() });
        return { success: true };
      }

      case 'SET_AUTOPILOT_MODE': {
        set({ autopilotMode: action.payload.mode, lastUpdateTime: Date.now() });
        return { success: true };
      }

      case 'ADD_NARRATIVE': {
        get().addNarrative(action.payload.role, action.payload.content);
        return { success: true };
      }

      case 'SET_CURRENT_LOCATION': {
        get().setCurrentLocation(action.payload.locationId);
        return { success: true };
      }

      case 'UPDATE_CHARACTER_NOTES': {
        get().updateCharacterNotes(action.payload.characterId, action.payload.notes);
        return { success: true };
      }

      case 'UPDATE_LOCATION_NOTES': {
        get().updateLocationNotes(action.payload.locationId, action.payload.notes);
        return { success: true };
      }

      case 'DELETE_CHARACTER': {
        get().deleteCharacter(action.payload.characterId);
        return { success: true };
      }

      case 'DELETE_LOCATION': {
        get().deleteLocation(action.payload.locationId);
        return { success: true };
      }

      case 'UPDATE_CHARACTER_IMAGE': {
        get().updateCharacterImage(action.payload.characterId, action.payload.imageUrl);
        return { success: true };
      }

      case 'UPDATE_LOCATION_IMAGE': {
        get().updateLocationImage(action.payload.locationId, action.payload.imageUrl);
        return { success: true };
      }

      case 'ADD_DIARY_ENTRY': {
        get().addDiaryEntry(action.payload);
        return { success: true };
      }

      case 'UPDATE_DIARY_ENTRY': {
        get().updateDiaryEntry(action.payload.id, action.payload.updates);
        return { success: true };
      }

      case 'DELETE_DIARY_ENTRY': {
        get().deleteDiaryEntry(action.payload.id);
        return { success: true };
      }

      case 'ADD_AGENDA_EVENT': {
        get().addAgendaEvent(action.payload);
        return { success: true };
      }

      case 'UPDATE_AGENDA_EVENT': {
        get().updateAgendaEvent(action.payload.id, action.payload.updates);
        return { success: true };
      }

      case 'DELETE_AGENDA_EVENT': {
        get().deleteAgendaEvent(action.payload.id);
        return { success: true };
      }

      case 'TOGGLE_AGENDA_EVENT': {
        get().toggleAgendaEventCompleted(action.payload.id);
        return { success: true };
      }

      case 'ADD_PLOT_LEAD': {
        get().addPlotLead(action.payload);
        return { success: true };
      }

      case 'UPDATE_PLOT_LEAD': {
        get().updatePlotLead(action.payload.id, action.payload.updates);
        return { success: true };
      }

      case 'DELETE_PLOT_LEAD': {
        get().deletePlotLead(action.payload.id);
        return { success: true };
      }

      case 'ADD_PLOT_LEAD_CLUE': {
        get().addPlotLeadClue(action.payload.id, action.payload.clue);
        return { success: true };
      }

      case 'ADD_RUMOR': {
        get().addRumor(action.payload);
        return { success: true };
      }

      case 'DELETE_RUMOR': {
        get().deleteRumor(action.payload.id);
        return { success: true };
      }

      case 'ADD_MESSAGE': {
        get().addContactMessage(action.payload);
        return { success: true };
      }

      case 'MARK_MESSAGE_READ': {
        get().markMessageAsRead(action.payload.id);
        return { success: true };
      }

      case 'REPLY_MESSAGE': {
        get().replyToContactMessage(action.payload.id, action.payload.replyText);
        return { success: true };
      }

      case 'DELETE_MESSAGE': {
        get().deleteContactMessage(action.payload.id);
        return { success: true };
      }

      default:
        return { success: false, error: "Action non reconnue." };
    }
  },

  resetGame: async () => {
    const now = Date.now();
    const freshState: GameState = {
      ...INITIAL_STATE,
      epochRealTime: now,
      lastUpdateTime: now,
      gameStatus: 'active',
      epilogueSummary: undefined,
      vitals: {
        energy: 100,
        hunger: 100,
        hygiene: 100,
        mood: 100,
        mindset: 50
      },
      skills: {
        'cuisine': { name: 'Cuisine', level: 1, practicePoints: 20, lastPracticedGameDate: now },
        'communication': { name: 'Communication', level: 1, practicePoints: 30, lastPracticedGameDate: now },
        'bricolage': { name: 'Bricolage', level: 1, practicePoints: 15, lastPracticedGameDate: now }
      },
      bank: {
        checking: 500,
        savings: 1000,
        savingsRate: 0.02,
        debts: 0,
        debtRate: 0.05,
        recurringBills: [
          {
            id: 'bill-loyer',
            name: 'Loyer',
            amount: 350,
            nextDueDate: now + 30 * 36 * 60 * 60 * 1000
          }
        ],
        transactions: [
          { id: 'init-2', timestamp: now, label: 'Solde de départ - Épargne', amount: 1000, account: 'savings', category: 'virement' },
          { id: 'init-1', timestamp: now - 1000, label: 'Solde de départ - Courant', amount: 500, account: 'checking', category: 'virement' }
        ]
      },
      inventory: [...INITIAL_STATE.inventory!],
      characters: { ...INITIAL_STATE.characters },
      locations: { ...INITIAL_STATE.locations },
      diary: [
        {
          id: 'diary-init',
          gameDate: now,
          title: 'Premier jour d\'un nouveau départ',
          content: 'Les cartons sont enfin déballés dans mon nouveau studio du quartier Saint-Michel. Léo, mon voisin de palier, m\'a donné un coup de main salvateur. Les journées de 36 heures ici sont vertigineuses, mais le calme de ce soir me donne bon espoir. Il est temps de me construire un avenir solide.',
          category: 'souvenir',
          mood: 'Serein & Motivé',
          milestone: true,
          isPersonal: false
        }
      ],
      episodicMemories: [
        {
          id: 'mem-init',
          timestamp: now,
          gameDateStr: 'Lundi 01/01/2100',
          summary: 'Emménagement réussi dans le studio du quartier Saint-Michel avec l\'aide de Léo, voisin de palier chaleureux.',
          importance: 'haute',
          tags: ['emménagement', 'studio', 'Saint-Michel', 'Léo', 'début']
        }
      ],
      currentTask: null,
      narrativeHistory: [
        {
          role: 'model',
          content: 'Vous voilà fraîchement installé(e) dans votre studio du quartier Saint-Michel ! Les derniers cartons sont déballés, notamment grâce à Léo, votre sympathique voisin de palier qui vous a prêté un précieux coup de main.\n\nUne nouvelle vie commence sur cette planète avec des journées de 36 heures. Fort(e) de vos notions en cuisine, en bricolage et en communication, tout votre avenir reste à écrire. Que souhaitez-vous faire pour bien démarrer ?',
          timestamp: now
        }
      ],
      autopilotMode: 'normal',
      choices: [
        "Envoyer un message à Léo pour le remercier et lui proposer un café.",
        "Se préparer un bon petit-déjeuner dans la kitchenette.",
        "Jeter un œil au dossier 'Banque' pour vérifier vos finances.",
        "Sortir explorer le quartier Saint-Michel."
      ]
    };

    set({
      ...freshState,
      loaded: true
    });

    await resetCloudAndLocalData(freshState);
  },

  continueGameAfterEpilogue: () => {
    set({
      gameStatus: 'active',
      hasAcknowledgedEpilogue: true,
      lastUpdateTime: Date.now()
    });
  },

  recoverFromBreakdown: () => {
    const state = get();
    const now = Date.now();
    const newVitals = {
      ...state.vitals,
      energy: Math.max(state.vitals.energy, 45),
      hunger: Math.max(state.vitals.hunger, 45),
      mindset: Math.max(state.vitals.mindset || 50, 40),
      mood: Math.max(state.vitals.mood, 45)
    };
    const diaryEntries = [...(state.diary || [])];
    diaryEntries.push({
      id: `diary-${now}`,
      gameDate: now,
      title: "Prise en charge au dispensaire de Saint-Michel",
      content: "Après un épuisement critique, les secours du quartier m'ont transporté d'urgence au dispensaire. Quelques perfusions, un bouillon chaud et un repos sous surveillance m'ont permis de reprendre mes esprits.",
      category: 'absence',
      mood: 'Soulagé & Convalescent',
      milestone: false,
      isPersonal: false
    });

    const newBank = { ...state.bank };
    const txList = newBank.transactions ? [...newBank.transactions] : [];
    // Minor medical stabilization cost (-30€ or added to debts)
    const medicalFee = 30;
    if (newBank.checking >= medicalFee) {
      newBank.checking -= medicalFee;
      txList.unshift({
        id: `tx-${now}-${Math.random().toString(36).substring(7)}`,
        timestamp: now,
        label: "Frais de soins d'urgence (Dispensaire)",
        amount: -medicalFee,
        account: 'checking',
        category: 'depense'
      });
    } else {
      newBank.debts = (newBank.debts || 0) + medicalFee;
      txList.unshift({
        id: `tx-${now}-${Math.random().toString(36).substring(7)}`,
        timestamp: now,
        label: "Dette médicale (Dispensaire de quartier)",
        amount: medicalFee,
        account: 'debts',
        category: 'facture'
      });
    }
    newBank.transactions = txList;

    set({
      gameStatus: 'active',
      hasAcknowledgedEpilogue: true,
      vitals: newVitals,
      bank: newBank,
      diary: diaryEntries,
      narrativeHistory: [
        ...(state.narrativeHistory || []),
        {
          role: 'model',
          content: "🚑 [DISPENSAIRE MÉDICAL DE SAINT-MICHEL]\nVous rouvrez les yeux sur un lit sobre du dispensaire de quartier. L'infirmière de garde vous tend un verre d'eau et une solution électrolytique : « Vous avez frôlé le surmenage aigu. Vos constantes sont stabilisées, mais ménagez-vous désormais ! Pensez à manger et à dormir. »",
          timestamp: now
        }
      ],
      choices: [
        "Remercier l'infirmière et quitter doucement le dispensaire.",
        "Consulter mon communicateur pour faire le point sur mes affaires.",
        "Rentrer directement au studio pour me reposer au calme."
      ],
      lastUpdateTime: now
    });
  },

  loadState: (savedState) => set((state) => {
    const cleanChars = savedState.characters 
      ? { ...savedState.characters } 
      : { ...INITIAL_STATE.characters };

    const cleanLocs = savedState.locations 
      ? { ...savedState.locations } 
      : { ...INITIAL_STATE.locations };

    const rawNarrative = (savedState.narrativeHistory && savedState.narrativeHistory.length > 0)
      ? savedState.narrativeHistory
      : (state.narrativeHistory || []);

    const sanitizedTask = sanitizeTask(savedState.currentTask !== undefined ? savedState.currentTask : state.currentTask);

    return {
      ...state,
      ...savedState,
      epochRealTime: (typeof savedState.epochRealTime === 'number' && savedState.epochRealTime > 0)
        ? savedState.epochRealTime
        : (state.epochRealTime || Date.now()),
      characters: cleanChars,
      locations: cleanLocs,
      diary: Array.isArray(savedState.diary) ? savedState.diary : (state.diary || []),
      episodicMemories: Array.isArray(savedState.episodicMemories) ? savedState.episodicMemories : (state.episodicMemories || INITIAL_STATE.episodicMemories),
      agenda: Array.isArray(savedState.agenda) ? savedState.agenda : (state.agenda || []),
      inventory: Array.isArray(savedState.inventory) ? savedState.inventory : (state.inventory || INITIAL_STATE.inventory),
      narrativeHistory: sanitizeNarrativeHistory(rawNarrative),
      choices: sanitizeChoices(savedState.choices || state.choices || []),
      gameStatus: savedState.gameStatus || 'active',
      epilogueSummary: savedState.epilogueSummary,
      vitals: {
        ...INITIAL_STATE.vitals,
        ...(savedState.vitals || {}),
        mindset: savedState.vitals?.mindset ?? 50
      },
      bank: {
        ...INITIAL_STATE.bank,
        ...(savedState.bank || {}),
        checking: typeof savedState.bank?.checking === 'number' ? savedState.bank.checking : (typeof state.bank?.checking === 'number' ? state.bank.checking : INITIAL_STATE.bank.checking),
        savings: typeof savedState.bank?.savings === 'number' ? savedState.bank.savings : (typeof state.bank?.savings === 'number' ? state.bank.savings : INITIAL_STATE.bank.savings),
        debts: typeof savedState.bank?.debts === 'number' ? savedState.bank.debts : (typeof state.bank?.debts === 'number' ? state.bank.debts : INITIAL_STATE.bank.debts),
        transactions: (savedState.bank?.transactions && savedState.bank.transactions.length > 0)
          ? savedState.bank.transactions
          : (state.bank?.transactions && state.bank.transactions.length > 0 ? state.bank.transactions : INITIAL_STATE.bank.transactions),
        recurringBills: (savedState.bank?.recurringBills && savedState.bank.recurringBills.length > 0)
          ? savedState.bank.recurringBills
          : (state.bank?.recurringBills && state.bank.recurringBills.length > 0 ? state.bank.recurringBills : INITIAL_STATE.bank.recurringBills),
      },
      skills: {
        ...INITIAL_STATE.skills,
        ...(savedState.skills || state.skills || {})
      },
      plotLeads: Array.isArray(savedState.plotLeads) ? savedState.plotLeads : (state.plotLeads || INITIAL_STATE.plotLeads),
      rumors: Array.isArray(savedState.rumors) ? savedState.rumors : (state.rumors || INITIAL_STATE.rumors),
      messages: Array.isArray(savedState.messages) ? savedState.messages : (state.messages || INITIAL_STATE.messages),
      currentTask: sanitizedTask,
      loaded: true
    };
  }),

  /**
   * Deterministic State Mutation via Rules Engine
   */
  processActionResponse: (rawRes) => {
    const currentState = get();
    
    // Strict validation through Deterministic Rule Engine
    const { validatedResponse: res, moneyChangesAllowed } = DeterministicRulesEngine.validateAction(currentState, rawRes);
    const { updateVitals, addNarrative } = get();

    if (res.narrative) {
      addNarrative('model', res.narrative);
    }
    if (res.vitalsImpact) {
      updateVitals(res.vitalsImpact);
    }
    if (moneyChangesAllowed && res.moneyImpact) {
      set((state) => {
        const impact = res.moneyImpact!;
        const checkingDelta = impact.checkingDelta || 0;
        const savingsDelta = impact.savingsDelta || 0;
        const debtsDelta = impact.debtsDelta || 0;
        const reason = impact.reason || 'Opération financière';

        const newBank = {
          ...state.bank,
          checking: state.bank.checking + checkingDelta,
          savings: state.bank.savings + savingsDelta,
          debts: Math.max(0, state.bank.debts + debtsDelta)
        };

        const txList = newBank.transactions ? [...newBank.transactions] : [];
        if (checkingDelta !== 0) {
          txList.unshift({
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            label: reason,
            amount: checkingDelta,
            account: 'checking',
            category: checkingDelta > 0 ? 'salaire' : 'depense'
          });
        }
        if (savingsDelta !== 0) {
          txList.unshift({
            id: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            label: reason,
            amount: savingsDelta,
            account: 'savings',
            category: 'virement'
          });
        }

        return { bank: { ...newBank, transactions: txList }, lastUpdateTime: Date.now() };
      });
    }

    if (res.inventoryUpdates && res.inventoryUpdates.length > 0) {
      set((state) => {
        const currentInv = [...(state.inventory || [])];
        res.inventoryUpdates!.forEach(update => {
          if (!update.name) return;
          const targetNameLower = update.name.trim().toLowerCase();
          const existingIdx = currentInv.findIndex(i => 
            (update.id && i.id === update.id) ||
            (i.name.trim().toLowerCase() === targetNameLower && i.location === (update.location || 'personnage'))
          );

          if (existingIdx !== -1) {
            const currentItem = currentInv[existingIdx];
            const newQty = currentItem.quantity + update.quantityDelta;
            if (newQty <= 0) {
              currentInv.splice(existingIdx, 1);
            } else {
              currentInv[existingIdx] = {
                ...currentItem,
                quantity: newQty,
                description: update.description || currentItem.description,
                freshness: update.freshness || currentItem.freshness,
                consumable: update.consumable !== undefined ? update.consumable : currentItem.consumable
              };
            }
          } else if (update.quantityDelta > 0) {
            currentInv.push({
              id: update.id || `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              name: update.name.trim(),
              category: update.category || 'divers',
              quantity: update.quantityDelta,
              location: update.location || 'personnage',
              description: update.description || 'Objet obtenu',
              freshness: update.freshness,
              consumable: update.consumable ?? false
            });
          }
        });
        return { inventory: currentInv, lastUpdateTime: Date.now() };
      });
    }

    if (res.newCharacters) {
      set((state) => {
        const chars = { ...state.characters };
        res.newCharacters!.forEach(c => {
          if (!c.name) return;
          const existingKey = Object.keys(chars).find(k => 
            k.toLowerCase() === c.id.toLowerCase() || 
            chars[k].name.trim().toLowerCase() === c.name.trim().toLowerCase()
          );

          const targetId = existingKey || c.id;
          chars[targetId] = {
            ...(chars[targetId] || {}),
            ...c,
            id: targetId,
            notes: chars[targetId]?.notes && chars[targetId]?.notes !== c.notes 
              ? `${chars[targetId].notes}\n${c.notes || ''}`.trim()
              : (c.notes || chars[targetId]?.notes || ''),
            imageUrl: c.imageUrl || chars[targetId]?.imageUrl
          };
        });
        return { characters: chars, lastUpdateTime: Date.now() };
      });
    }

    if (res.newLocations) {
      set((state) => {
        const locs = { ...state.locations };
        res.newLocations!.forEach(l => {
          if (!l.name) return;
          const existingKey = Object.keys(locs).find(k => 
            k.toLowerCase() === l.id.toLowerCase() || 
            locs[k].name.trim().toLowerCase() === l.name.trim().toLowerCase()
          );

          const targetId = existingKey || l.id;
          locs[targetId] = {
            ...(locs[targetId] || {}),
            ...l,
            id: targetId,
            notes: locs[targetId]?.notes && locs[targetId]?.notes !== l.notes 
              ? `${locs[targetId].notes}\n${l.notes || ''}`.trim()
              : (l.notes || locs[targetId]?.notes || ''),
            imageUrl: l.imageUrl || locs[targetId]?.imageUrl
          };
        });
        return { locations: locs, lastUpdateTime: Date.now() };
      });
    }
    
    if (res.updatedCharacters) {
      set((state) => {
        const chars = { ...state.characters };
        res.updatedCharacters!.forEach(update => {
          if (chars[update.id]) {
            const char = { ...chars[update.id] };
            if (update.relationshipStatus) char.relationshipStatus = update.relationshipStatus;
            if (update.age) char.age = update.age;
            if (update.appearance) char.appearance = update.appearance;
            if (update.occupation) char.occupation = update.occupation;
            if (update.background) char.background = update.background;
            if (update.financialRelation) char.financialRelation = update.financialRelation;
            if (update.pendingItems) char.pendingItems = update.pendingItems;
            if (update.upcomingEvents) char.upcomingEvents = update.upcomingEvents;
            if (update.notesAppend) char.notes = (char.notes ? char.notes + "\n" : "") + update.notesAppend;
            if (update.notesReplace) char.notes = update.notesReplace;
            chars[update.id] = char;
          }
        });
        return { characters: chars, lastUpdateTime: Date.now() };
      });
    }

    if (res.updatedLocations) {
      set((state) => {
        const locs = { ...state.locations };
        res.updatedLocations!.forEach(update => {
          if (locs[update.id]) {
            const loc = { ...locs[update.id] };
            if (update.category) loc.category = update.category;
            if (update.district) loc.district = update.district;
            if (update.description) loc.description = update.description;
            if (update.keyFeatures) loc.keyFeatures = update.keyFeatures;
            if (update.associatedCharacters) loc.associatedCharacters = update.associatedCharacters;
            if (update.notesAppend) loc.notes = (loc.notes ? loc.notes + "\n" : "") + update.notesAppend;
            if (update.notesReplace) loc.notes = update.notesReplace;
            locs[update.id] = loc;
          }
        });
        return { locations: locs, lastUpdateTime: Date.now() };
      });
    }

    if (res.skillsImpact && res.skillsImpact.length > 0) {
      set((state) => {
        const skills = { ...state.skills };
        res.skillsImpact!.forEach(skillImpact => {
          if (!skillImpact.name) return;
          const rawName = skillImpact.name.trim();
          const existingKey = Object.keys(skills).find(k => 
            k.toLowerCase() === rawName.toLowerCase() || 
            skills[k].name.toLowerCase() === rawName.toLowerCase()
          ) || rawName.toLowerCase();

          const currentSkill = skills[existingKey] ? { ...skills[existingKey] } : {
            name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
            level: 1,
            practicePoints: 0,
            lastPracticedGameDate: Date.now()
          };
          
          const delta = skillImpact.practicePointsDelta || 0;
          currentSkill.practicePoints = Math.max(0, currentSkill.practicePoints + delta);
          currentSkill.lastPracticedGameDate = Date.now();
          
          // Level up logic: 100 points per level
          if (currentSkill.practicePoints >= 100) {
            const levelsGained = Math.floor(currentSkill.practicePoints / 100);
            currentSkill.level += levelsGained;
            currentSkill.practicePoints = currentSkill.practicePoints % 100;
          }
          
          skills[existingKey] = currentSkill;
        });
        return { skills, lastUpdateTime: Date.now() };
      });
    }
    
    const activeTask = get().currentTask;
    if (activeTask) {
      if (res.taskTimeAdjustmentMinutes && res.taskTimeAdjustmentMinutes <= -500) {
        set({ currentTask: null });
      } else if (res.taskTimeAdjustmentMinutes !== undefined && res.taskTimeAdjustmentMinutes !== null && res.taskTimeAdjustmentMinutes !== 0) {
        const adjustmentMs = (res.taskTimeAdjustmentMinutes / GAME_TIME_MULTIPLIER) * 60 * 1000;
        const newEndTime = activeTask.endTimeReal + adjustmentMs;
        if (newEndTime <= Date.now() + 2000) {
          set({ currentTask: null });
        } else {
          set({
            currentTask: {
              ...activeTask,
              endTimeReal: newEndTime,
              lastInteractionTimeReal: Date.now()
            }
          });
        }
      } else if (res.durationMinutes && res.durationMinutes > 0 && res.taskSummary && res.taskSummary !== activeTask.description) {
        const realMinutes = res.durationMinutes / GAME_TIME_MULTIPLIER;
        set({
          currentTask: {
            id: Math.random().toString(36).substr(2, 9),
            description: res.taskSummary,
            startTimeReal: Date.now(),
            endTimeReal: Date.now() + (realMinutes * 60 * 1000),
            durationMinutes: res.durationMinutes,
            paused: false,
            lastInteractionTimeReal: Date.now()
          }
        });
      }
    } else if (res.durationMinutes && res.durationMinutes > 0 && res.narrative) {
      const realMinutes = res.durationMinutes / GAME_TIME_MULTIPLIER;
      const fallbackSummary = res.taskSummary || (res.narrative ? (res.narrative.split(/[\n.!?,]/)[0].substring(0, 35).trim() + '...') : 'Activité en cours');
      set({
        currentTask: {
          id: Math.random().toString(36).substr(2, 9),
          description: fallbackSummary,
          startTimeReal: Date.now(),
          endTimeReal: Date.now() + (realMinutes * 60 * 1000),
          durationMinutes: res.durationMinutes,
          paused: false,
          lastInteractionTimeReal: Date.now()
        }
      });
    }
    
    if (res.newAgendaEvents && res.newAgendaEvents.length > 0) {
      set((state) => {
        const currentAgenda = state.agenda || [];
        const existingIds = new Set(currentAgenda.map(e => e.id));
        const toAdd: any[] = [];
        
        res.newAgendaEvents!.forEach(e => {
          if (!e.title) return;
          const generatedId = e.id || `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const isDuplicate = currentAgenda.some(existing => 
            existing.id === generatedId || 
            (existing.title.trim().toLowerCase() === e.title.trim().toLowerCase() && existing.dateGameStr === e.dateGameStr)
          );
          if (!isDuplicate && !existingIds.has(generatedId)) {
            existingIds.add(generatedId);
            toAdd.push({
              id: generatedId,
              title: e.title.trim(),
              description: e.description || '',
              dateGameStr: e.dateGameStr || 'Date non précisée',
              category: e.category || 'personnel',
              completed: e.completed ?? false,
              createdAtGameDate: e.createdAtGameDate || Date.now()
            });
          }
        });
        return { agenda: [...currentAgenda, ...toAdd], lastUpdateTime: Date.now() };
      });
    }

    if (res.newPlotLeads && res.newPlotLeads.length > 0) {
      set((state) => {
        const current = [...(state.plotLeads || [])];
        res.newPlotLeads!.forEach(lead => {
          current.push({
            ...lead,
            id: `lead-${Date.now()}-${Math.random().toString(36).substring(7)}`
          });
        });
        return { plotLeads: current, lastUpdateTime: Date.now() };
      });
    }

    if (res.updatedPlotLeads && res.updatedPlotLeads.length > 0) {
      set((state) => {
        const current = [...(state.plotLeads || [])];
        res.updatedPlotLeads!.forEach(update => {
          const idx = current.findIndex(l => l.id === update.id);
          if (idx !== -1) {
            const existing = current[idx];
            current[idx] = {
              ...existing,
              qualitativeStage: update.qualitativeStage || existing.qualitativeStage,
              status: update.status || existing.status,
              clues: update.newClues && update.newClues.length > 0 
                ? [...(existing.clues || []), ...update.newClues] 
                : existing.clues
            };
          }
        });
        return { plotLeads: current, lastUpdateTime: Date.now() };
      });
    }

    if (res.newRumors && res.newRumors.length > 0) {
      set((state) => {
        const current = [...(state.rumors || [])];
        res.newRumors!.forEach(rumor => {
          current.push({
            ...rumor,
            id: `rumor-${Date.now()}-${Math.random().toString(36).substring(7)}`
          });
        });
        return { rumors: current, lastUpdateTime: Date.now() };
      });
    }

    if (res.newMessages && res.newMessages.length > 0) {
      set((state) => {
        const current = [...(state.messages || [])];
        res.newMessages!.forEach(msg => {
          current.unshift({
            ...msg,
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestampReal: Date.now(),
            read: false,
            replied: false
          });
        });
        return { messages: current, lastUpdateTime: Date.now() };
      });
    }

    if (res.choices) {
      set({ choices: sanitizeChoices(res.choices), lastUpdateTime: Date.now() });
    } else {
      set({ choices: [], lastUpdateTime: Date.now() });
    }

    if (res.activePlotHooks && res.activePlotHooks.length > 0) {
      set({
        activePlotHooks: res.activePlotHooks,
        lastUpdateTime: Date.now()
      });
    }

    if (res.episodicMemory && res.episodicMemory.summary) {
      set((state) => {
        const currentMemories = state.episodicMemories || [];
        const newMem = {
          id: res.episodicMemory!.id || `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          timestamp: res.episodicMemory!.timestamp || Date.now(),
          gameDateStr: res.episodicMemory!.gameDateStr,
          summary: res.episodicMemory!.summary,
          importance: res.episodicMemory!.importance || 'moyenne',
          tags: res.episodicMemory!.tags || [],
          embedding: res.episodicMemory!.embedding
        };
        return {
          episodicMemories: [...currentMemories, newMem],
          lastUpdateTime: Date.now()
        };
      });
    }

    if (res.diaryEntry && res.diaryEntry.content) {
      set((state) => ({
        diary: [
          ...state.diary,
          {
            id: `diary-${Math.random().toString(36).substring(7)}`,
            gameDate: Date.now(),
            title: res.diaryEntry!.title || "Moment Marquant",
            content: res.diaryEntry!.content,
            category: (res.diaryEntry!.category as any) || 'souvenir',
            mood: res.diaryEntry!.mood || 'Pensif',
            milestone: res.diaryEntry!.milestone ?? true,
            isPersonal: false
          }
        ],
        lastUpdateTime: Date.now()
      }));
    }

    // Evaluate terminal status
    const statusEval = DeterministicRulesEngine.evaluateGameStatus(get());
    if (statusEval.status !== 'active') {
      set({ gameStatus: statusEval.status, epilogueSummary: statusEval.reason });
    }
  },

  tick: () => {
    const state = get();
    const now = Date.now();
    const deltaMs = now - (state.lastUpdateTime || now);
    
    if (state.currentTask && now >= state.currentTask.endTimeReal) {
      set({ currentTask: null });
    }

    // Evaluate Game Status (36h completion, breakdown)
    const statusEval = DeterministicRulesEngine.evaluateGameStatus(state);
    if (statusEval.status !== (state.gameStatus || 'active')) {
      set({ gameStatus: statusEval.status, epilogueSummary: statusEval.reason });
    }

    const deltaDays = deltaMs / (36 * 60 * 60 * 1000);
    const updates: Partial<GameState> = { lastUpdateTime: now };
    
    // Mindset natural homeostasis & passive strain
    const currentMindset = updates.vitals?.mindset ?? state.vitals.mindset ?? 50;
    let newMindset = currentMindset;

    if (newMindset > 50) {
      const naturalDecay = deltaDays * 8;
      newMindset = Math.max(50, newMindset - naturalDecay);
    } else if (newMindset < 50 && (state.vitals.energy > 60 && state.vitals.hunger > 60)) {
      const naturalRecovery = deltaDays * 4;
      newMindset = Math.min(50, newMindset + naturalRecovery);
    }

    if (state.vitals.hunger < 25 || state.vitals.energy < 20) {
      const strain = deltaDays * 12;
      newMindset = Math.max(0, newMindset - strain);
    }

    if (Math.abs(newMindset - currentMindset) > 0.05) {
      updates.vitals = {
        ...(updates.vitals || state.vitals),
        mindset: Math.round(newMindset * 10) / 10
      };
    }

    // Skills decay over time
    if (Object.keys(state.skills).length > 0) {
      const newSkills = { ...state.skills };
      let skillsChanged = false;
      for (const key in newSkills) {
        const skill = newSkills[key];
        const drop = deltaDays * 5; 
        if (drop > 0.01) {
          skill.practicePoints -= drop;
          if (skill.practicePoints < 0) {
            if (skill.level > 1) {
              skill.level -= 1;
              skill.practicePoints = 100 + skill.practicePoints;
            } else {
              skill.practicePoints = 0;
            }
          }
          skillsChanged = true;
        }
      }
      if (skillsChanged) updates.skills = newSkills;
    }
    
    // Banking interest (weekly)
    const realElapsedMs = now - (state.epochRealTime || now);
    const totalGameDays = Math.floor(realElapsedMs / (36 * 60 * 60 * 1000));
    const currentWeek = Math.floor(totalGameDays / 7);
    const lastPaidWeek = state.bank.lastInterestWeek ?? 0;

    if (currentWeek > lastPaidWeek) {
      const weeksToPay = currentWeek - lastPaidWeek;
      const newBank = { ...state.bank, lastInterestWeek: currentWeek };
      const txList = newBank.transactions ? [...newBank.transactions] : [];

      if (newBank.savings > 0) {
        const savingsRate = newBank.savingsRate || 0.02;
        const interest = Math.round(newBank.savings * savingsRate * weeksToPay * 100) / 100;
        if (interest > 0) {
          newBank.savings += interest;
          txList.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: now,
            label: `Intérêts Épargne Hebdomadaires (+${(savingsRate * 100).toFixed(1)}%)`,
            amount: interest,
            account: 'savings',
            category: 'virement'
          });
        }
      }

      if (newBank.debts > 0) {
        const debtRate = newBank.debtRate || 0.05;
        const debtInterest = Math.round(newBank.debts * debtRate * weeksToPay * 100) / 100;
        if (debtInterest > 0) {
          newBank.debts += debtInterest;
          txList.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: now,
            label: `Intérêts sur dette hebdo (${(debtRate * 100).toFixed(1)}%)`,
            amount: -debtInterest,
            account: 'debts',
            category: 'depense'
          });
        }
      }

      newBank.savingsRate = Math.max(0.01, Math.min(0.08, newBank.savingsRate + (Math.random() - 0.5) * 0.002));
      newBank.debtRate = Math.max(0.03, Math.min(0.15, newBank.debtRate + (Math.random() - 0.5) * 0.002));

      newBank.transactions = txList;
      updates.bank = newBank;
    }

    // Recurring bills
    if (state.bank.recurringBills && state.bank.recurringBills.length > 0) {
      let billsChanged = false;
      const currentBank = updates.bank || { ...state.bank };
      const txList = currentBank.transactions ? [...currentBank.transactions] : [];
      const updatedBills = currentBank.recurringBills.map(bill => {
        if (bill.nextDueDate && now >= bill.nextDueDate) {
          billsChanged = true;
          currentBank.checking -= bill.amount;
          txList.unshift({
            id: Math.random().toString(36).substring(7),
            timestamp: now,
            label: `Prélèvement automatique - ${bill.name}`,
            amount: -bill.amount,
            account: 'checking',
            category: 'depense'
          });
          return {
            ...bill,
            nextDueDate: bill.nextDueDate + 30 * 36 * 60 * 60 * 1000
          };
        }
        return bill;
      });

      if (billsChanged) {
        currentBank.recurringBills = updatedBills;
        currentBank.transactions = txList;
        updates.bank = currentBank;
      }
    }

    // Passive decay of vitals over time
    const deltaHours = deltaMs / (3600 * 1000);
    if (deltaHours > 0 && deltaHours < 48) {
      updates.vitals = {
        energy: Math.max(0, Math.min(100, Math.round((state.vitals.energy - 3.5 * deltaHours) * 100) / 100)),
        hunger: Math.max(0, Math.min(100, Math.round((state.vitals.hunger - 10.0 * deltaHours) * 100) / 100)),
        hygiene: Math.max(0, Math.min(100, Math.round((state.vitals.hygiene - 3.0 * deltaHours) * 100) / 100)),
        mood: Math.max(0, Math.min(100, Math.round((state.vitals.mood - 1.0 * deltaHours) * 100) / 100)),
        mindset: state.vitals.mindset ?? 50
      };
    }
    
    set(updates);
  }
}));
