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

// Retrieve relevant episodic memories via semantic similarity and keyword relevance
export async function retrieveRelevantMemories(
  query: string,
  memories: EpisodicMemory[] = [],
  topK = 4
): Promise<EpisodicMemory[]> {
  if (!memories || memories.length === 0) return [];
  if (!query || query.trim().length === 0) return memories.slice(-topK);

  const queryEmbedding = await getEmbedding(query);
  const qTokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = memories.map(mem => {
    let score = 0;

    // 1. Vector cosine similarity if embedding is available
    if (queryEmbedding && mem.embedding && mem.embedding.length > 0) {
      const cos = cosineSimilarity(queryEmbedding, mem.embedding);
      score += cos * 2.0; // Primary semantic signal
    }

    // 2. Keyword & tag boost
    const summaryLower = (mem.summary || '').toLowerCase();
    const tagMatchCount = (mem.tags || []).filter(t => query.toLowerCase().includes(t.toLowerCase())).length;
    score += tagMatchCount * 0.4;

    const matchedTokens = qTokens.filter(t => summaryLower.includes(t)).length;
    score += matchedTokens * 0.2;

    // 3. Importance weighting
    if (mem.importance === 'critique') score += 0.3;
    else if (mem.importance === 'haute') score += 0.15;

    return { memory: mem, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.memory);
}
