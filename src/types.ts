export type Vitals = {
  energy: number;
  hunger: number;
  hygiene: number;
  mood: number;
  mindset: number; // 0 = Tendu (rouge), 50 = Équilibré, 100 = À l'aise (vert)
};

export type Skill = {
  name: string;
  level: number;
  practicePoints: number;
  lastPracticedGameDate: number;
};

export type ItemCategory = 'nourriture' | 'boisson' | 'hygiene' | 'clefs_pass' | 'technologie' | 'vetements' | 'outils' | 'livres_documents' | 'divers';

export type InventoryItem = {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  description?: string;
  location: 'personnage' | 'appartement'; // Dans la poche/sac ou dans le studio (frigo/placard/bureau)
  freshness?: 'frais' | 'entame' | 'sec' | 'perime';
  consumable?: boolean;
  valueEstimate?: number;
};

export type InventoryUpdate = {
  id?: string;
  name: string;
  category?: ItemCategory;
  quantityDelta: number; // positive to add, negative to consume/remove
  location: 'personnage' | 'appartement';
  description?: string;
  freshness?: 'frais' | 'entame' | 'sec' | 'perime';
  consumable?: boolean;
};

export type SocialTie = {
  targetCharacterId: string;
  targetCharacterName: string;
  relationshipType: 'ami' | 'associe' | 'rival' | 'famille' | 'creancier' | 'amoureux';
  dynamicSummary: string;
};

export type FavorRecord = {
  characterId: string;
  characterName?: string;
  balance: number; // > 0: le PNJ nous doit une faveur, < 0: on lui doit une faveur
  lastFavorDescription?: string;
  lastUpdatedGameDate?: number;
};

export type MarketTrend = {
  id: string;
  category: 'nourriture' | 'technologie' | 'transport' | 'energie' | 'loyer' | 'divers';
  label: string;
  priceMultiplier: number; // e.g. 1.25 (+25%), 0.85 (-15%)
  reason: string;
  district?: string;
  expiresAtGameDate: number;
};

export type CharacterProfile = {
  id: string;
  name: string;
  locationEncountered: string;
  relationshipStatus: 'amical' | 'amoureux' | 'professionnel' | 'conflictuel' | 'neutre' | 'inconnu';
  age?: string;
  appearance?: string;
  occupation?: string;
  background?: string;
  financialRelation?: string;
  pendingItems?: string[];
  upcomingEvents?: string[];
  notes: string;
  imageUrl?: string;
  currentLocationId?: string;
  schedule?: { phase: CyclePhaseKey; locationId: string; activityDescription?: string }[];
  socialTies?: SocialTie[];
  favorBalance?: number;
};

export type TransitRoute = {
  mode: 'a_pied' | 'monorail' | 'navette' | 'transorbital' | 'teleporteur';
  label: string;
  durationGameMinutes: number;
  costCredits?: number;
  description?: string;
};

export type LocationProfile = {
  id: string;
  name: string;
  category?: 'domicile' | 'travail' | 'commerce' | 'interet' | 'lieu_clef' | 'autre';
  planetOrSystem?: string; // ex: "Terre (Système Solaire)", "Mars", "Station Orbitale"
  city?: string; // ex: "Néo-Paris", "Cité Dôme"
  district?: string; // ex: "Quartier Lumina", "Secteur Commercial"
  description: string;
  keyFeatures?: string[];
  associatedCharacters?: string[];
  notes?: string;
  discoveredGameDate: number;
  imageUrl?: string;
  isCurrentLocation?: boolean;
  transitRoutes?: TransitRoute[];
  accessLevel?: 'libre' | 'ticket_requis' | 'pass_securite' | 'ferme_nuit' | 'inconnu';
  openingHours?: { openHour: number; closeHour: number }; // In 36-hour cycle (e.g. 10 to 28)
  temporaryStatus?: { isClosed: boolean; reason?: string; untilGameDate?: number };
};

export type CharacterUpdate = {
  id: string;
  relationshipStatus?: CharacterProfile['relationshipStatus'];
  age?: string;
  appearance?: string;
  occupation?: string;
  background?: string;
  financialRelation?: string;
  pendingItems?: string[];
  upcomingEvents?: string[];
  notesAppend?: string;
  notesReplace?: string;
  currentLocationId?: string;
  socialTies?: SocialTie[];
  favorDelta?: number;
};

export type LocationUpdate = {
  id: string;
  category?: LocationProfile['category'];
  planetOrSystem?: string;
  city?: string;
  district?: string;
  description?: string;
  keyFeatures?: string[];
  associatedCharacters?: string[];
  isCurrentLocation?: boolean;
  transitRoutes?: TransitRoute[];
  accessLevel?: LocationProfile['accessLevel'];
  openingHours?: { openHour: number; closeHour: number };
  temporaryStatus?: { isClosed: boolean; reason?: string; untilGameDate?: number };
  notesAppend?: string;
  notesReplace?: string;
};

export type BankTransaction = {
  id: string;
  timestamp: number;
  label: string;
  amount: number;
  account: 'checking' | 'savings' | 'debts';
  category?: 'virement' | 'salaire' | 'facture' | 'depense' | 'interets' | 'remboursement';
};

export type BankAccount = {
  checking: number;
  savings: number;
  savingsRate: number; // e.g., 0.02 for 2% weekly
  debts: number;
  debtRate: number; // e.g., 0.05 for 5% weekly
  recurringBills: { id: string; name: string; amount: number; nextDueDate: number }[];
  transactions?: BankTransaction[];
  lastInterestWeek?: number;
};

export type DiaryEntry = {
  id: string;
  gameDate: number; // Timestamp in game time
  title?: string;
  content: string;
  category?: 'reflexion' | 'souvenir' | 'absence' | 'objectif' | 'secret';
  mood?: string; // e.g. "Serein", "Mélancolique", "Déterminé", "Fatigué", "Agité", "Soulagé"
  isPersonal?: boolean; // Written manually by the player
  milestone?: boolean; // True if this marks a significant life milestone
};

export type AgendaEvent = {
  id: string;
  title: string;
  description?: string;
  dateGameStr?: string; // e.g. "Jour 3 - 14:00" or "Tous les lundis à 09:00"
  category?: 'travail' | 'rdv' | 'personnel' | 'finance' | 'urgent';
  characterId?: string;
  locationId?: string;
  completed?: boolean;
  createdAtGameDate?: number;
};

export type AgendaEventUpdate = {
  id: string;
  title?: string;
  description?: string;
  dateGameStr?: string;
  category?: AgendaEvent['category'];
  completed?: boolean;
};

export type Task = {
  id: string;
  description: string;
  startTimeReal: number;
  endTimeReal: number;
  durationMinutes?: number;
  paused: boolean;
  notifiedMilestones?: number[]; // Track milestones e.g. [25, 50, 75]
  lastInteractionTimeReal?: number;
};

export type TaskProgressRequest = {
  task: Task;
  state: GameState;
  progressPercent: number;
};

export type TaskProgressResponse = {
  narrativeSnippet: string;
  choices?: string[];
  vitalsImpact?: Partial<Vitals>;
  taskTimeAdjustmentMinutes?: number;
};

export type EpisodicMemory = {
  id: string;
  timestamp: number;
  gameDateStr: string;
  summary: string;
  importance: 'haute' | 'moyenne' | 'critique';
  tags: string[];
  embedding?: number[];
};

// Architecture preparation for Future Addition 2: Ambiance visuelle du Cycle 36h
export type CyclePhaseKey = 'aube' | 'matin' | 'zenith' | 'apres_midi' | 'crepuscule' | 'nuit';

export type CycleAtmosphereTheme = {
  key: CyclePhaseKey;
  phaseName: string;
  subtext: string;
  skyGradient: string;
  ambientTone: string; // Tailwind color token or hex
  glowColor: string;
  accentBorder: string;
  lightingDescription: string;
};

// Architecture preparation for Future Addition 3: Journal des Intrigues & Rumeurs
export type PlotLeadStatus = 'actif' | 'en_pause' | 'resolu' | 'abandonne' | 'expire';

export type PlotLead = {
  id: string;
  title: string;
  category: 'emploi' | 'mystere' | 'quartier' | 'personnel' | 'finance';
  status: PlotLeadStatus;
  qualitativeStage: string; // Qualitative status e.g. "Premiers indices recueillis", "En attente d'un retour", "Sur le point d'aboutir" (No numbers)
  clues: string[];
  relatedCharacterIds?: string[];
  relatedLocationIds?: string[];
  discoveredGameDateStr?: string;
  notes?: string;
  expiresAtGameDate?: number; // Game timestamp when this lead expires if not investigated
  expiryWarningText?: string; // Qualitative warning e.g. "L'offre d'emploi expire ce soir"
  expiredReason?: string; // Explanation if the lead expired/missed e.g. "Le poste a été pourvu par un autre candidat"
};

export type RumorEntry = {
  id: string;
  text: string;
  source: string; // e.g. "Entendu au Bistro Saint-Michel", "Discussion entre voisins"
  credibility: 'faible' | 'plausible' | 'averee';
  discoveredGameDateStr?: string;
  district?: string;
};

// Architecture preparation for Future Addition 4: Contacts & Messages asynchrones
export type ContactMessage = {
  id: string;
  senderId: string; // Character ID or 'system' / 'inconnu'
  senderName: string;
  senderAvatar?: string;
  preview: string;
  content: string;
  timestampReal: number;
  timestampGameDateStr?: string;
  read: boolean;
  replied?: boolean;
  attachedAgendaEventId?: string;
  replyOptions?: string[]; // Qualitative quick responses the player can choose
};

export type GameStatus = 'active' | 'victory' | 'timeout' | 'breakdown';

export type GameAction =
  | { type: 'PROCESS_ACTION_RESPONSE'; payload: ActionResponse }
  | { type: 'PROCESS_OFFLINE_RECAP'; payload: OfflineRecapResponse }
  | { type: 'CONSUME_ITEM'; payload: { itemId: string; quantity?: number } }
  | { type: 'MOVE_ITEM'; payload: { itemId: string; targetLocation: 'personnage' | 'appartement' } }
  | { type: 'DELETE_ITEM'; payload: { itemId: string } }
  | { type: 'TRANSFER_MONEY'; payload: { from: 'checking' | 'savings'; to: 'checking' | 'savings' | 'debts'; amount: number } }
  | { type: 'TAKE_LOAN'; payload: { amount: number } }
  | { type: 'ADVANCE_TIME'; payload: { minutes: number; reason?: string } }
  | { type: 'SET_CURRENT_LOCATION'; payload: { locationId: string } }
  | { type: 'UPDATE_CHARACTER_NOTES'; payload: { characterId: string; notes: string } }
  | { type: 'UPDATE_LOCATION_NOTES'; payload: { locationId: string; notes: string } }
  | { type: 'DELETE_CHARACTER'; payload: { characterId: string } }
  | { type: 'DELETE_LOCATION'; payload: { locationId: string } }
  | { type: 'UPDATE_CHARACTER_IMAGE'; payload: { characterId: string; imageUrl?: string } }
  | { type: 'UPDATE_LOCATION_IMAGE'; payload: { locationId: string; imageUrl?: string } }
  | { type: 'ADD_DIARY_ENTRY'; payload: Omit<DiaryEntry, 'id'> }
  | { type: 'UPDATE_DIARY_ENTRY'; payload: { id: string; updates: Partial<DiaryEntry> } }
  | { type: 'DELETE_DIARY_ENTRY'; payload: { id: string } }
  | { type: 'ADD_AGENDA_EVENT'; payload: Omit<AgendaEvent, 'id' | 'createdAtGameDate'> }
  | { type: 'UPDATE_AGENDA_EVENT'; payload: { id: string; updates: Partial<AgendaEvent> } }
  | { type: 'DELETE_AGENDA_EVENT'; payload: { id: string } }
  | { type: 'TOGGLE_AGENDA_EVENT'; payload: { id: string } }
  | { type: 'ADD_PLOT_LEAD'; payload: Omit<PlotLead, 'id'> }
  | { type: 'UPDATE_PLOT_LEAD'; payload: { id: string; updates: Partial<PlotLead> } }
  | { type: 'DELETE_PLOT_LEAD'; payload: { id: string } }
  | { type: 'ADD_PLOT_LEAD_CLUE'; payload: { id: string; clue: string } }
  | { type: 'ADD_RUMOR'; payload: Omit<RumorEntry, 'id'> }
  | { type: 'DELETE_RUMOR'; payload: { id: string } }
  | { type: 'ADD_MESSAGE'; payload: Omit<ContactMessage, 'id'> }
  | { type: 'MARK_MESSAGE_READ'; payload: { id: string } }
  | { type: 'REPLY_MESSAGE'; payload: { id: string; replyText: string } }
  | { type: 'DELETE_MESSAGE'; payload: { id: string } }
  | { type: 'SET_AUTOPILOT_MODE'; payload: { mode: GameState['autopilotMode'] } }
  | { type: 'SET_TASK'; payload: { task: Task | null } }
  | { type: 'CANCEL_TASK'; payload?: { reason?: string } }
  | { type: 'ADD_NARRATIVE'; payload: { role: 'user' | 'model'; content: string } };

export type PlotLeadUpdate = {
  id: string;
  qualitativeStage?: string;
  newClues?: string[];
  status?: PlotLeadStatus;
  expiredReason?: string;
  expiresAtGameDate?: number;
  expiryWarningText?: string;
};

export type GameState = {
  epochRealTime: number; // When the game started in real world time
  vitals: Vitals;
  skills: Record<string, Skill>;
  inventory?: InventoryItem[];
  characters: Record<string, CharacterProfile>;
  locations: Record<string, LocationProfile>;
  bank: BankAccount;
  diary: DiaryEntry[];
  agenda?: AgendaEvent[];
  episodicMemories?: EpisodicMemory[];
  currentTask: Task | null;
  narrativeHistory: { role: 'user' | 'model'; content: string; timestamp: number }[];
  autopilotMode: 'prudent' | 'curieux' | 'normal';
  choices: string[];
  lastUpdateTime: number;
  gameStatus?: GameStatus;
  epilogueSummary?: string;
  hasAcknowledgedEpilogue?: boolean;
  narrativeArcs?: string[];
  newPlotLeads?: Omit<PlotLead, 'id'>[];
  updatedPlotLeads?: PlotLeadUpdate[];
  newRumors?: Omit<RumorEntry, 'id'>[];
  newMessages?: Omit<ContactMessage, 'id' | 'timestampReal' | 'read' | 'replied'>[];
  activePlotHooks?: string[];
  favorsNetwork?: Record<string, FavorRecord>;
  marketTrends?: MarketTrend[];
  // Prepared future fields (backward-compatible)
  plotLeads?: PlotLead[];
  rumors?: RumorEntry[];
  messages?: ContactMessage[];
};

export type ActionRequest = {
  action: string;
  state: GameState;
  force: boolean;
};

export type ActionResponse = {
  isDangerous: boolean;
  dangerWarning?: string;
  narrative?: string;
  taskSummary?: string; // Short summary of the task (e.g., "Se dirige vers le café")
  durationMinutes?: number; // Estimated duration in game time minutes for NEW tasks
  taskTimeAdjustmentMinutes?: number; // Adjust time for CURRENT task
  choices?: string[];
  vitalsImpact?: Partial<Vitals>;
  moneyImpact?: { checkingDelta: number; savingsDelta: number; debtsDelta: number; reason?: string };
  inventoryUpdates?: InventoryUpdate[];
  newCharacters?: CharacterProfile[];
  newLocations?: LocationProfile[];
  skillsImpact?: { name: string; practicePointsDelta: number }[];
  updatedCharacters?: CharacterUpdate[];
  updatedLocations?: LocationUpdate[];
  newAgendaEvents?: AgendaEvent[];
  updatedAgendaEvents?: AgendaEventUpdate[];
  newPlotLeads?: Omit<PlotLead, 'id'>[];
  updatedPlotLeads?: PlotLeadUpdate[];
  newRumors?: Omit<RumorEntry, 'id'>[];
  newMessages?: Omit<ContactMessage, 'id' | 'timestampReal' | 'read' | 'replied'>[];
  newMarketTrends?: Omit<MarketTrend, 'id'>[];
  updatedMarketTrends?: Partial<MarketTrend>[];
  activePlotHooks?: string[];
  episodicMemory?: {
    id?: string;
    timestamp?: number;
    gameDateStr?: string;
    summary: string;
    importance: 'haute' | 'moyenne' | 'critique';
    tags: string[];
    embedding?: number[];
  };
  diaryEntry?: {
    title: string;
    content: string;
    category?: 'souvenir' | 'reflexion' | 'secret' | 'objectif' | 'absence';
    mood?: string;
    milestone?: boolean;
  };
};

export type OfflineRecapRequest = {
  state: GameState;
  offlineRealMinutes: number;
  autopilotMode: 'prudent' | 'curieux' | 'normal';
};

export type OfflineRecapResponse = {
  narrativeRecap: string;
  vitalsImpact?: Partial<Vitals>;
  moneyImpact?: { checkingDelta: number; savingsDelta: number; debtsDelta: number; reason?: string };
  inventoryUpdates?: InventoryUpdate[];
  skillsImpact?: { name: string; practicePointsDelta: number }[];
  events?: string[];
  socialEvents?: string[]; // Autonomous PNJ-to-PNJ gossip, alliances or drama
  timeline?: { timeRange: string; summary: string }[];
  choices?: string[];
  newCharacters?: CharacterProfile[];
  newLocations?: LocationProfile[];
  updatedCharacters?: CharacterUpdate[];
  updatedLocations?: LocationUpdate[];
  newAgendaEvents?: AgendaEvent[];
  updatedAgendaEvents?: AgendaEventUpdate[];
  newPlotLeads?: Omit<PlotLead, 'id'>[];
  updatedPlotLeads?: PlotLeadUpdate[];
  newRumors?: Omit<RumorEntry, 'id'>[];
  newMessages?: Omit<ContactMessage, 'id' | 'timestampReal' | 'read' | 'replied'>[];
  newMarketTrends?: Omit<MarketTrend, 'id'>[];
  activePlotHooks?: string[];
  episodicMemory?: {
    id?: string;
    timestamp?: number;
    gameDateStr?: string;
    summary: string;
    importance: 'haute' | 'moyenne' | 'critique';
    tags: string[];
    embedding?: number[];
  };
  diaryEntry?: {
    title: string;
    content: string;
    category?: 'absence' | 'souvenir' | 'reflexion';
    mood?: string;
    milestone?: boolean;
  };
};
