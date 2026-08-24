import { z } from 'zod';
import { 
  ActionRequest, ActionResponse, 
  OfflineRecapRequest, OfflineRecapResponse, 
  TaskProgressRequest, TaskProgressResponse, 
  GameState 
} from '../types';

// ==========================================
// STRICT ZOD SCHEMAS FOR LLM JSON VALIDATION
// ==========================================

const VitalsImpactSchema = z.object({
  energy: z.number().optional(),
  hunger: z.number().optional(),
  hygiene: z.number().optional(),
  mood: z.number().optional(),
  mindset: z.number().optional()
}).partial();

const MoneyImpactSchema = z.object({
  checkingDelta: z.number().default(0),
  savingsDelta: z.number().default(0),
  debtsDelta: z.number().default(0),
  reason: z.string().optional()
}).partial();

const InventoryUpdateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: z.enum(['nourriture', 'boisson', 'hygiene', 'clefs_pass', 'technologie', 'vetements', 'outils', 'livres_documents', 'divers']).optional(),
  quantityDelta: z.number(),
  location: z.enum(['personnage', 'appartement']).default('personnage'),
  description: z.string().optional(),
  freshness: z.enum(['frais', 'entame', 'sec', 'perime']).optional(),
  consumable: z.boolean().optional()
});

const CharacterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  locationEncountered: z.string().default('Ville'),
  relationshipStatus: z.enum(['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu']).default('neutre'),
  age: z.string().optional(),
  appearance: z.string().optional(),
  occupation: z.string().optional(),
  background: z.string().optional(),
  financialRelation: z.string().optional(),
  pendingItems: z.array(z.string()).optional(),
  upcomingEvents: z.array(z.string()).optional(),
  notes: z.string().default(''),
  imageUrl: z.string().optional()
});

const LocationProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre']).optional(),
  planetOrSystem: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  description: z.string().default(''),
  keyFeatures: z.array(z.string()).optional(),
  associatedCharacters: z.array(z.string()).optional(),
  notes: z.string().optional(),
  discoveredGameDate: z.number().default(() => Date.now()),
  imageUrl: z.string().optional(),
  isCurrentLocation: z.boolean().optional(),
  accessLevel: z.enum(['libre', 'ticket_requis', 'pass_securite', 'ferme_nuit', 'inconnu']).optional()
});

const CharacterUpdateSchema = z.object({
  id: z.string(),
  relationshipStatus: z.enum(['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu']).optional(),
  age: z.string().optional(),
  appearance: z.string().optional(),
  occupation: z.string().optional(),
  background: z.string().optional(),
  financialRelation: z.string().optional(),
  pendingItems: z.array(z.string()).optional(),
  upcomingEvents: z.array(z.string()).optional(),
  notesAppend: z.string().optional(),
  notesReplace: z.string().optional()
});

const LocationUpdateSchema = z.object({
  id: z.string(),
  category: z.enum(['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre']).optional(),
  planetOrSystem: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  description: z.string().optional(),
  keyFeatures: z.array(z.string()).optional(),
  associatedCharacters: z.array(z.string()).optional(),
  isCurrentLocation: z.boolean().optional(),
  accessLevel: z.enum(['libre', 'ticket_requis', 'pass_securite', 'ferme_nuit', 'inconnu']).optional(),
  notesAppend: z.string().optional(),
  notesReplace: z.string().optional()
});

const AgendaEventSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  dateGameStr: z.string().optional(),
  category: z.enum(['travail', 'rdv', 'personnel', 'finance', 'urgent']).default('personnel'),
  characterId: z.string().optional(),
  locationId: z.string().optional(),
  completed: z.boolean().default(false),
  createdAtGameDate: z.number().optional()
});

const AgendaEventUpdateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  dateGameStr: z.string().optional(),
  category: z.enum(['travail', 'rdv', 'personnel', 'finance', 'urgent']).optional(),
  completed: z.boolean().optional()
});

const PlotLeadSchema = z.object({
  title: z.string(),
  category: z.enum(['emploi', 'mystere', 'quartier', 'personnel', 'finance']).default('personnel'),
  status: z.enum(['actif', 'en_pause', 'resolu', 'abandonne']).default('actif'),
  qualitativeStage: z.string().default('Découverte'),
  clues: z.array(z.string()).default([]),
  relatedCharacterIds: z.array(z.string()).optional(),
  relatedLocationIds: z.array(z.string()).optional(),
  discoveredGameDateStr: z.string().optional(),
  notes: z.string().optional()
});

const RumorEntrySchema = z.object({
  text: z.string(),
  source: z.string().default('Bruit de couloir'),
  credibility: z.enum(['faible', 'plausible', 'averee']).default('plausible'),
  discoveredGameDateStr: z.string().optional(),
  district: z.string().optional()
});

const ContactMessageSchema = z.object({
  senderId: z.string().default('inconnu'),
  senderName: z.string().default('Contact'),
  senderAvatar: z.string().optional(),
  preview: z.string().default('Nouveau message'),
  content: z.string(),
  timestampGameDateStr: z.string().optional(),
  attachedAgendaEventId: z.string().optional(),
  replyOptions: z.array(z.string()).optional()
});

export const ActionResponseSchema = z.object({
  isDangerous: z.boolean().default(false),
  dangerWarning: z.string().optional(),
  narrative: z.string().default("Vous marquez une brève pause, attentif au flux paisible des événements."),
  taskSummary: z.string().optional(),
  durationMinutes: z.number().optional(),
  taskTimeAdjustmentMinutes: z.number().optional(),
  choices: z.array(z.string()).default([
    "Observer attentivement la situation et vos options",
    "Consulter vos affaires et vos notes",
    "Passer calmement à l'action"
  ]),
  vitalsImpact: VitalsImpactSchema.optional(),
  moneyImpact: MoneyImpactSchema.optional(),
  inventoryUpdates: z.array(InventoryUpdateSchema).optional(),
  newCharacters: z.array(CharacterProfileSchema).optional(),
  newLocations: z.array(LocationProfileSchema).optional(),
  skillsImpact: z.array(z.object({ name: z.string(), practicePointsDelta: z.number() })).optional(),
  updatedCharacters: z.array(CharacterUpdateSchema).optional(),
  updatedLocations: z.array(LocationUpdateSchema).optional(),
  newAgendaEvents: z.array(AgendaEventSchema).optional(),
  updatedAgendaEvents: z.array(AgendaEventUpdateSchema).optional(),
  newPlotLeads: z.array(PlotLeadSchema).optional(),
  updatedPlotLeads: z.array(z.object({
    id: z.string(),
    qualitativeStage: z.string().optional(),
    newClues: z.array(z.string()).optional(),
    status: z.enum(['actif', 'en_pause', 'resolu', 'abandonne']).optional()
  })).optional(),
  newRumors: z.array(RumorEntrySchema).optional(),
  newMessages: z.array(ContactMessageSchema).optional(),
  activePlotHooks: z.array(z.string()).optional(),
  episodicMemory: z.object({
    id: z.string().optional(),
    timestamp: z.number().optional(),
    gameDateStr: z.string().optional(),
    summary: z.string(),
    importance: z.enum(['haute', 'moyenne', 'critique']).default('moyenne'),
    tags: z.array(z.string()).default([]),
    embedding: z.array(z.number()).optional()
  }).optional(),
  diaryEntry: z.object({
    title: z.string(),
    content: z.string(),
    category: z.enum(['souvenir', 'reflexion', 'secret', 'objectif']).optional(),
    mood: z.string().optional(),
    milestone: z.boolean().optional()
  }).optional()
}).passthrough();

export const OfflineRecapResponseSchema = z.object({
  narrativeRecap: z.string().default("Durant votre absence, la vie a suivi son cours régulier."),
  vitalsImpact: VitalsImpactSchema.optional(),
  moneyImpact: MoneyImpactSchema.optional(),
  inventoryUpdates: z.array(InventoryUpdateSchema).optional(),
  skillsImpact: z.array(z.object({ name: z.string(), practicePointsDelta: z.number() })).optional(),
  events: z.array(z.string()).default([]),
  timeline: z.array(z.object({ timeRange: z.string(), summary: z.string() })).optional(),
  choices: z.array(z.string()).default([
    "Faire le point sur vos activités",
    "Consulter vos messages récents",
    "Poursuivre votre journée"
  ]),
  newCharacters: z.array(CharacterProfileSchema).optional(),
  newLocations: z.array(LocationProfileSchema).optional(),
  updatedCharacters: z.array(CharacterUpdateSchema).optional(),
  updatedLocations: z.array(LocationUpdateSchema).optional(),
  newAgendaEvents: z.array(AgendaEventSchema).optional(),
  updatedAgendaEvents: z.array(AgendaEventUpdateSchema).optional(),
  newPlotLeads: z.array(PlotLeadSchema).optional(),
  updatedPlotLeads: z.array(z.object({
    id: z.string(),
    qualitativeStage: z.string().optional(),
    newClues: z.array(z.string()).optional(),
    status: z.enum(['actif', 'en_pause', 'resolu', 'abandonne']).optional()
  })).optional(),
  newRumors: z.array(RumorEntrySchema).optional(),
  newMessages: z.array(ContactMessageSchema).optional(),
  activePlotHooks: z.array(z.string()).optional(),
  episodicMemory: z.object({
    id: z.string().optional(),
    timestamp: z.number().optional(),
    gameDateStr: z.string().optional(),
    summary: z.string(),
    importance: z.enum(['haute', 'moyenne', 'critique']).default('moyenne'),
    tags: z.array(z.string()).default([]),
    embedding: z.array(z.number()).optional()
  }).optional(),
  diaryEntry: z.object({
    title: z.string(),
    content: z.string(),
    category: z.enum(['absence', 'souvenir', 'reflexion']).optional(),
    mood: z.string().optional(),
    milestone: z.boolean().optional()
  }).optional()
}).passthrough();

export const TaskProgressResponseSchema = z.object({
  narrativeSnippet: z.string().default("L'activité se poursuit méthodiquement."),
  choices: z.array(z.string()).optional(),
  vitalsImpact: VitalsImpactSchema.optional(),
  taskTimeAdjustmentMinutes: z.number().optional()
}).passthrough();

function sanitizeStatePayload(state: GameState): Partial<GameState> {
  if (!state) return {};
  return {
    epochRealTime: state.epochRealTime,
    vitals: state.vitals,
    skills: state.skills,
    bank: state.bank,
    currentTask: state.currentTask,
    autopilotMode: state.autopilotMode,
    activePlotHooks: state.activePlotHooks,
    narrativeHistory: (state.narrativeHistory || []).slice(-30),
    episodicMemories: state.episodicMemories || [],
    characters: state.characters ? Object.fromEntries(
      Object.entries(state.characters).map(([k, c]) => [k, { ...c, imageUrl: undefined }])
    ) : {},
    locations: state.locations ? Object.fromEntries(
      Object.entries(state.locations).map(([k, l]) => [k, { ...l, imageUrl: undefined }])
    ) : {},
    agenda: state.agenda || [],
    diary: (state.diary || []).slice(-15)
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, timeoutMs = 45000): Promise<Response> {
  let lastError: any = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (res.ok) return res;
      lastError = new Error(`HTTP error ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < retries) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

export const api = {
  async performAction(req: ActionRequest): Promise<ActionResponse> {
    const sanitizedReq = {
      action: req.action,
      force: req.force,
      state: sanitizeStatePayload(req.state)
    };

    try {
      const res = await fetchWithRetry('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedReq)
      }, 1, 45000);

      const rawJson = await res.json();
      const parsed = ActionResponseSchema.safeParse(rawJson);
      
      if (parsed.success) {
        return parsed.data as ActionResponse;
      } else {
        console.warn("Zod validation warning on ActionResponse, sanitized fallback:", parsed.error);
        return {
          isDangerous: false,
          narrative: typeof rawJson?.narrative === 'string' && rawJson.narrative.length > 5
            ? rawJson.narrative
            : "Vous prenez un instant pour observer la situation dans le quartier. Tout semble calme et sous contrôle.",
          choices: Array.isArray(rawJson?.choices) && rawJson.choices.length > 0
            ? rawJson.choices.filter((c: any) => typeof c === 'string')
            : [
                "Observer les environs et vérifier votre situation",
                "Consulter votre agenda et vos messages",
                "Poursuivre votre journée"
              ]
        };
      }
    } catch (err) {
      console.warn("Network or processing error during performAction, using graceful narrative fallback:", err);
      return {
        isDangerous: false,
        narrative: `Vous poursuivez calmement votre démarche ("${req.action}"). L'environnement autour de vous réagit paisiblement.`,
        choices: [
          "Faire le point sur vos priorités actuelles",
          "Consulter votre dossier personnel et vos finances",
          "Continuer d'explorer les opportunités"
        ]
      };
    }
  },

  async getOfflineRecap(req: OfflineRecapRequest): Promise<OfflineRecapResponse> {
    const sanitizedReq = {
      offlineRealMinutes: req.offlineRealMinutes,
      autopilotMode: req.autopilotMode,
      state: sanitizeStatePayload(req.state)
    };

    try {
      const res = await fetchWithRetry('/api/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedReq)
      }, 1, 45000);

      const rawJson = await res.json();
      const parsed = OfflineRecapResponseSchema.safeParse(rawJson);

      if (parsed.success) {
        return parsed.data as OfflineRecapResponse;
      } else {
        console.warn("Zod validation warning on OfflineRecapResponse:", parsed.error);
        return {
          narrativeRecap: typeof rawJson?.narrativeRecap === 'string'
            ? rawJson.narrativeRecap
            : "Pendant votre absence, la vie quotidienne s'est déroulée en douceur.",
          events: Array.isArray(rawJson?.events) ? rawJson.events : [],
          choices: [
            "Consulter votre agenda et reprendre vos activités",
            "Faire le point sur vos besoins et vos ressources",
            "Envoyer un message à vos connaissances"
          ]
        };
      }
    } catch (err) {
      console.warn("Failed to fetch offline recap from API, generating safe local fallback:", err);
      return {
        narrativeRecap: "Vous reprenez le contrôle après une période de repos. Le calme règne sur votre studio et vos environs.",
        events: ["Période de repos et récupération passive."],
        choices: [
          "Consulter vos messages et votre agenda",
          "Préparer votre prochaine activité",
          "Faire un tour dans le quartier"
        ]
      };
    }
  },

  async generateVisual(prompt: string, type: 'character' | 'location', seed?: string): Promise<{ imageUrl: string }> {
    try {
      const res = await fetchWithRetry('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, seed })
      }, 1, 30000);
      return await res.json();
    } catch (err) {
      console.warn("Visual generation error, returning fallback:", err);
      return { imageUrl: '' };
    }
  },

  async generateIntrospection(state: any): Promise<{ title: string; content: string; mood: string; category?: string; milestone?: boolean }> {
    try {
      const res = await fetchWithRetry('/api/introspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: sanitizeStatePayload(state) })
      }, 1, 15000);
      return await res.json();
    } catch (err) {
      console.warn("Introspection fallback:", err);
      return {
        title: "Pensée fugace",
        content: "Une impression de clarté s'installe alors que vous observez le rythme de la cité.",
        mood: "Serein",
        category: "reflexion"
      };
    }
  },

  async getTaskProgress(req: TaskProgressRequest): Promise<TaskProgressResponse> {
    const sanitizedReq = {
      task: req.task,
      progressPercent: req.progressPercent,
      state: sanitizeStatePayload(req.state)
    };

    try {
      const res = await fetchWithRetry('/api/task-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedReq)
      }, 1, 15000);

      const rawJson = await res.json();
      const parsed = TaskProgressResponseSchema.safeParse(rawJson);
      if (parsed.success) {
        return parsed.data as TaskProgressResponse;
      }
      return {
        narrativeSnippet: typeof rawJson?.narrativeSnippet === 'string'
          ? rawJson.narrativeSnippet
          : "L'activité progresse selon le plan prévu."
      };
    } catch (err) {
      console.warn("Task progress fallback:", err);
      return {
        narrativeSnippet: "L'activité se poursuit normalement sans encombre."
      };
    }
  }
};
