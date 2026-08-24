import { ActionRequest, ActionResponse, OfflineRecapRequest, OfflineRecapResponse, TaskProgressRequest, TaskProgressResponse, GameState } from '../types';

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
    // Expanded sliding narrative history window to take full advantage of context
    narrativeHistory: (state.narrativeHistory || []).slice(-30),
    // Episodic memories for vector RAG retrieval
    episodicMemories: state.episodicMemories || [],
    // Characters & Locations metadata (without heavy image data if any)
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

    const res = await fetchWithRetry('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedReq)
    }, 1, 45000);
    return res.json();
  },

  async getOfflineRecap(req: OfflineRecapRequest): Promise<OfflineRecapResponse> {
    const sanitizedReq = {
      offlineRealMinutes: req.offlineRealMinutes,
      autopilotMode: req.autopilotMode,
      state: sanitizeStatePayload(req.state)
    };

    const res = await fetchWithRetry('/api/offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedReq)
    }, 1, 45000);
    return res.json();
  },

  async generateVisual(prompt: string, type: 'character' | 'location', seed?: string): Promise<{ imageUrl: string }> {
    const res = await fetchWithRetry('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type, seed })
    }, 1, 30000);
    return res.json();
  },

  async generateIntrospection(state: any): Promise<{ title: string; content: string; mood: string; category?: string; milestone?: boolean }> {
    const res = await fetchWithRetry('/api/introspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: sanitizeStatePayload(state) })
    }, 1, 15000);
    return res.json();
  },

  async getTaskProgress(req: TaskProgressRequest): Promise<TaskProgressResponse> {
    const sanitizedReq = {
      task: req.task,
      progressPercent: req.progressPercent,
      state: sanitizeStatePayload(req.state)
    };

    const res = await fetchWithRetry('/api/task-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedReq)
    }, 1, 15000);
    return res.json();
  }
};
