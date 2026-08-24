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
  narrativeArcs?: string[];
  activePlotHooks?: string[];
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
    category?: 'souvenir' | 'reflexion' | 'secret' | 'objectif';
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
  timeline?: { timeRange: string; summary: string }[];
  choices?: string[];
  newCharacters?: CharacterProfile[];
  newLocations?: LocationProfile[];
  updatedCharacters?: CharacterUpdate[];
  updatedLocations?: LocationUpdate[];
  newAgendaEvents?: AgendaEvent[];
  updatedAgendaEvents?: AgendaEventUpdate[];
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
