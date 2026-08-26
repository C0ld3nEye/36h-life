import { StateCreator } from 'zustand';
import { 
  CharacterProfile, LocationProfile, DiaryEntry, 
  AgendaEvent, PlotLead, RumorEntry, ContactMessage, 
  EpisodicMemory, FavorRecord, MarketTrend
} from '../../types';
import { GameStore } from '../useGameState';

export interface WorldSlice {
  characters: Record<string, CharacterProfile>;
  locations: Record<string, LocationProfile>;
  diary: DiaryEntry[];
  episodicMemories: EpisodicMemory[];
  agenda: AgendaEvent[];
  plotLeads: PlotLead[];
  rumors: RumorEntry[];
  messages: ContactMessage[];
  favorsNetwork?: Record<string, FavorRecord>;
  marketTrends?: MarketTrend[];
  narrativeHistory: { role: 'user' | 'model'; content: string; timestamp: number }[];
  choices: string[];
  activePlotHooks?: string[];

  addNarrative: (role: 'user' | 'model', rawContent: string) => void;
  setCurrentLocation: (locId: string) => void;
  updateCharacterNotes: (id: string, notes: string) => void;
  updateLocationNotes: (id: string, notes: string) => void;
  deleteCharacter: (id: string) => void;
  deleteLocation: (id: string) => void;
  updateCharacterImage: (id: string, imageUrl?: string) => void;
  updateLocationImage: (id: string, imageUrl?: string) => void;
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => void;
  updateDiaryEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteDiaryEntry: (id: string) => void;
  addAgendaEvent: (event: Omit<AgendaEvent, 'id' | 'createdAtGameDate'>) => void;
  updateAgendaEvent: (id: string, updates: Partial<AgendaEvent>) => void;
  deleteAgendaEvent: (id: string) => void;
  toggleAgendaEventCompleted: (id: string) => void;
  addPlotLead: (lead: Omit<PlotLead, 'id'>) => void;
  updatePlotLead: (id: string, updates: Partial<PlotLead>) => void;
  deletePlotLead: (id: string) => void;
  addPlotLeadClue: (id: string, clue: string) => void;
  addRumor: (rumor: Omit<RumorEntry, 'id'>) => void;
  deleteRumor: (id: string) => void;
  addContactMessage: (msg: Omit<ContactMessage, 'id'>) => void;
  markMessageAsRead: (id: string) => void;
  replyToContactMessage: (id: string, replyText: string) => void;
  deleteContactMessage: (id: string) => void;
}

export const createWorldSlice: StateCreator<GameStore, [], [], WorldSlice> = (set) => ({
  characters: {},
  locations: {},
  diary: [],
  episodicMemories: [],
  agenda: [],
  plotLeads: [],
  rumors: [],
  messages: [],
  favorsNetwork: {},
  marketTrends: [],
  narrativeHistory: [],
  choices: [],
  activePlotHooks: [],

  addNarrative: (role, rawContent) => set((state) => {
    let content = "";
    if (typeof rawContent === 'string') {
      content = rawContent;
    } else if (rawContent && typeof rawContent === 'object') {
      content = (rawContent as any).text || (rawContent as any).narrative || JSON.stringify(rawContent);
    } else {
      content = String(rawContent || '');
    }

    // Clean any bleeding artifacts
    content = content
      .replace(/(?:,\s*)?(?:")?(?:choices|newAgendaEvents|newCharacters|newLocations|vitalsImpact|moneyImpact|skillsImpact|isDangerous|dangerWarning)(?:")?\s*:\s*[\[{"].*$/is, '')
      .replace(/^[\{\}\[\]"']+|[\{\}\[\]"']+$/g, '')
      .trim();

    return {
      narrativeHistory: [
        ...state.narrativeHistory,
        { role, content, timestamp: Date.now() }
      ],
      lastUpdateTime: Date.now()
    };
  }),

  setCurrentLocation: (locId) => set((state) => {
    const locs = { ...state.locations };
    for (const key in locs) {
      locs[key] = { ...locs[key], isCurrentLocation: key === locId };
    }
    return { locations: locs, lastUpdateTime: Date.now() };
  }),

  updateCharacterNotes: (id, notes) => set((state) => {
    if (!state.characters[id]) return {};
    const chars = { ...state.characters };
    chars[id] = { ...chars[id], notes };
    return { characters: chars, lastUpdateTime: Date.now() };
  }),

  updateLocationNotes: (id, notes) => set((state) => {
    if (!state.locations[id]) return {};
    const locs = { ...state.locations };
    locs[id] = { ...locs[id], notes };
    return { locations: locs, lastUpdateTime: Date.now() };
  }),

  deleteCharacter: (id) => set((state) => {
    if (!state.characters[id]) return {};
    const chars = { ...state.characters };
    delete chars[id];
    return { characters: chars, lastUpdateTime: Date.now() };
  }),

  deleteLocation: (id) => set((state) => {
    if (!state.locations[id]) return {};
    const locs = { ...state.locations };
    delete locs[id];
    return { locations: locs, lastUpdateTime: Date.now() };
  }),

  updateCharacterImage: (id, imageUrl) => set((state) => {
    if (!state.characters[id]) return {};
    const chars = { ...state.characters };
    chars[id] = { ...chars[id], imageUrl };
    return { characters: chars, lastUpdateTime: Date.now() };
  }),

  updateLocationImage: (id, imageUrl) => set((state) => {
    if (!state.locations[id]) return {};
    const locs = { ...state.locations };
    locs[id] = { ...locs[id], imageUrl };
    return { locations: locs, lastUpdateTime: Date.now() };
  }),

  addDiaryEntry: (entry) => set((state) => {
    const newEntry: DiaryEntry = {
      ...entry,
      id: `diary-${Math.random().toString(36).substring(7)}`,
      gameDate: entry.gameDate || Date.now(),
      isPersonal: entry.isPersonal ?? true
    };
    return { diary: [...state.diary, newEntry], lastUpdateTime: Date.now() };
  }),

  updateDiaryEntry: (id, updates) => set((state) => {
    const currentDiary = [...state.diary];
    const idx = currentDiary.findIndex(d => d.id === id);
    if (idx !== -1) {
      currentDiary[idx] = { ...currentDiary[idx], ...updates };
    }
    return { diary: currentDiary, lastUpdateTime: Date.now() };
  }),

  deleteDiaryEntry: (id) => set((state) => ({
    diary: state.diary.filter(d => d.id !== id),
    lastUpdateTime: Date.now()
  })),

  addAgendaEvent: (event) => set((state) => {
    const newEvent: AgendaEvent = {
      ...event,
      id: `ev-${Math.random().toString(36).substring(7)}`,
      completed: false,
      createdAtGameDate: Date.now()
    };
    return { agenda: [...(state.agenda || []), newEvent], lastUpdateTime: Date.now() };
  }),

  updateAgendaEvent: (id, updates) => set((state) => {
    const currentAgenda = [...(state.agenda || [])];
    const idx = currentAgenda.findIndex(e => e.id === id);
    if (idx !== -1) {
      currentAgenda[idx] = { ...currentAgenda[idx], ...updates };
    }
    return { agenda: currentAgenda, lastUpdateTime: Date.now() };
  }),

  deleteAgendaEvent: (id) => set((state) => ({
    agenda: (state.agenda || []).filter(e => e.id !== id),
    lastUpdateTime: Date.now()
  })),

  toggleAgendaEventCompleted: (id) => set((state) => {
    const currentAgenda = [...(state.agenda || [])];
    const idx = currentAgenda.findIndex(e => e.id === id);
    if (idx !== -1) {
      currentAgenda[idx] = {
        ...currentAgenda[idx],
        completed: !currentAgenda[idx].completed
      };
    }
    return { agenda: currentAgenda, lastUpdateTime: Date.now() };
  }),

  addPlotLead: (lead) => set((state) => {
    const newLead: PlotLead = {
      ...lead,
      id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    const plotLeads = Array.isArray(state.plotLeads) ? [newLead, ...state.plotLeads] : [newLead];
    return { plotLeads, lastUpdateTime: Date.now() };
  }),

  updatePlotLead: (id, updates) => set((state) => {
    const plotLeads = (state.plotLeads || []).map(lead => 
      lead.id === id ? { ...lead, ...updates } : lead
    );
    return { plotLeads, lastUpdateTime: Date.now() };
  }),

  deletePlotLead: (id) => set((state) => ({
    plotLeads: (state.plotLeads || []).filter(lead => lead.id !== id),
    lastUpdateTime: Date.now()
  })),

  addPlotLeadClue: (id, clue) => set((state) => {
    const plotLeads = (state.plotLeads || []).map(lead => {
      if (lead.id === id) {
        const clues = lead.clues ? [...lead.clues, clue] : [clue];
        return { ...lead, clues };
      }
      return lead;
    });
    return { plotLeads, lastUpdateTime: Date.now() };
  }),

  addRumor: (rumor) => set((state) => {
    const newRumor: RumorEntry = {
      ...rumor,
      id: `rumor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    const rumors = Array.isArray(state.rumors) ? [newRumor, ...state.rumors] : [newRumor];
    return { rumors, lastUpdateTime: Date.now() };
  }),

  deleteRumor: (id) => set((state) => ({
    rumors: (state.rumors || []).filter(r => r.id !== id),
    lastUpdateTime: Date.now()
  })),

  addContactMessage: (msg) => set((state) => {
    const newMsg: ContactMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    const messages = Array.isArray(state.messages) ? [newMsg, ...state.messages] : [newMsg];
    return { messages, lastUpdateTime: Date.now() };
  }),

  markMessageAsRead: (id) => set((state) => {
    const messages = (state.messages || []).map(m => 
      m.id === id ? { ...m, read: true } : m
    );
    return { messages, lastUpdateTime: Date.now() };
  }),

  replyToContactMessage: (id) => set((state) => {
    const messages = (state.messages || []).map(m => 
      m.id === id ? { ...m, read: true, replied: true } : m
    );
    return { messages, lastUpdateTime: Date.now() };
  }),

  deleteContactMessage: (id) => set((state) => ({
    messages: (state.messages || []).filter(m => m.id !== id),
    lastUpdateTime: Date.now()
  }))
});
