import { GoogleGenAI, Schema } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
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

// Configured model chain: Flash Lite (gemini-3.5-flash-lite / gemini-3.1-flash-lite)
export const DEFAULT_PRIMARY_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').replace(/^models\//, '');

export async function generateWithModelFallback(prompt: string, schema: Schema, temperature = 0.7) {
  const modelsToTry = [
    DEFAULT_PRIMARY_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
  ]
    .filter(Boolean)
    .map(m => m.replace(/^models\//, ''))
    .filter((m, idx, self) => self.indexOf(m) === idx);

  let lastErr: any = null;
  for (const modelName of modelsToTry) {
    // 1. Try with full structured schema
    try {
      const config: any = {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature,
      };

      const callPromise = getAI().models.generateContent({
        model: modelName,
        contents: prompt,
        config
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 18000)
      );

      const res = await Promise.race([callPromise, timeoutPromise]);
      if (res && res.text) {
        return res;
      }
    } catch (err: any) {
      // 2. If schema issue on this model, retry immediately without strict schema (JSON mime type only)
      try {
        const fallbackConfig: any = {
          responseMimeType: 'application/json',
          temperature,
        };

        const callPromise = getAI().models.generateContent({
          model: modelName,
          contents: prompt,
          config: fallbackConfig
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout fallback on model ${modelName}`)), 18000)
        );

        const res = await Promise.race([callPromise, timeoutPromise]);
        if (res && res.text) {
          return res;
        }
      } catch (retryErr: any) {
        console.warn(`Request with model '${modelName}' encountered an issue:`, retryErr?.message || retryErr);
        lastErr = retryErr;
      }
    }
  }
  throw lastErr;
}
