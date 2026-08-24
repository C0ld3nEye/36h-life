import { GoogleGenAI } from '@google/genai';
import { EpisodicMemory } from '../src/types';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Calculate cosine similarity between two float vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate embedding for a text query or memory chunk using Gemini Embedding API
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null;
  try {
    const response: any = await (getAI().models as any).embedContent({
      model: 'text-embedding-004',
      contents: text.trim(),
    });

    if (response && response.embedding && Array.isArray(response.embedding.values)) {
      return response.embedding.values;
    }
  } catch (err: any) {
    // Fallback: silently handle quota or offline mode
    console.warn("Embedding generation note (fallback active):", err?.message || err);
  }
  return null;
}

// Retrieve relevant episodic memories via semantic similarity, keyword matching, and temporal recency weighting
export async function retrieveRelevantMemories(
  query: string,
  memories: EpisodicMemory[] = [],
  topK = 4
): Promise<EpisodicMemory[]> {
  if (!memories || memories.length === 0) return [];
  if (!query || query.trim().length === 0) return memories.slice(-topK);

  const queryEmbedding = await getEmbedding(query);
  const qTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const now = Date.now();

  const scored = memories.map(mem => {
    let semanticScore = 0;

    // 1. Vector cosine similarity if embedding is available
    if (queryEmbedding && mem.embedding && mem.embedding.length > 0) {
      const cos = cosineSimilarity(queryEmbedding, mem.embedding);
      semanticScore += cos * 2.5; // Primary semantic signal
    }

    // 2. Keyword & tag boost
    const summaryLower = (mem.summary || '').toLowerCase();
    const tagMatchCount = (mem.tags || []).filter(t => query.toLowerCase().includes(t.toLowerCase())).length;
    semanticScore += tagMatchCount * 0.5;

    const matchedTokens = qTokens.filter(t => summaryLower.includes(t)).length;
    semanticScore += matchedTokens * 0.3;

    // 3. Intrinsic importance weighting
    let importanceBoost = 0;
    if (mem.importance === 'critique') importanceBoost = 0.4;
    else if (mem.importance === 'haute') importanceBoost = 0.2;

    // 4. Temporal Decay Weighting (recency factor on 36-hour planet scale)
    // 1 real hour = 1 in-game hour
    const memoryTimestamp = mem.timestamp || now;
    const elapsedMs = Math.max(0, now - memoryTimestamp);
    const elapsedGameHours = elapsedMs / (3600 * 1000);

    // Half-life calculation based on memory importance:
    // Standard memories have a half-life of 36h (1 in-game day)
    // High importance memories half-life = 144h (4 in-game days)
    // Critical memories half-life = 720h (20 in-game days)
    const halfLifeHours = mem.importance === 'critique' ? 720 : (mem.importance === 'haute' ? 144 : 36);
    const recencyFactor = Math.pow(0.5, elapsedGameHours / halfLifeHours);

    // Strong recency boost for events that occurred in the immediate past (within 2 in-game hours)
    // Facts from 2 hours ago must prime over ancient baseline facts
    let immediatePastBonus = 0;
    if (elapsedGameHours <= 2) {
      immediatePastBonus = 0.6;
    } else if (elapsedGameHours <= 6) {
      immediatePastBonus = 0.3;
    } else if (elapsedGameHours <= 12) {
      immediatePastBonus = 0.15;
    }

    // Composite weighted score: semantic signal modulated by temporal decay + immediate past bonus + importance
    const compositeScore = ((semanticScore + importanceBoost) * (0.55 + 0.45 * recencyFactor)) + immediatePastBonus;

    return { memory: mem, score: compositeScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.memory);
}
