import { getAI } from './aiClient';

export const CHARACTER_PORTRAIT_FALLBACKS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&h=400&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=400&q=80"
];

export const LOCATION_FALLBACKS = [
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&h=400&q=80",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&h=400&q=80",
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&h=400&q=80",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=400&q=80",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&h=400&q=80"
];

export function getDeterministicFallback(prompt: string, type: 'character' | 'location'): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  if (type === 'character') {
    return CHARACTER_PORTRAIT_FALLBACKS[positiveHash % CHARACTER_PORTRAIT_FALLBACKS.length];
  }
  return LOCATION_FALLBACKS[positiveHash % LOCATION_FALLBACKS.length];
}

export async function generateImageHelper(prompt: string, type: 'character' | 'location', seed?: string): Promise<string> {
  const fallbackUrl = getDeterministicFallback(seed || prompt, type);

  let stylePrompt = "";
  if (type === 'character') {
    stylePrompt = `High quality cinematic portrait of a person: ${prompt}. Atmospheric lighting, sharp focus on face, digital art portrait style, clean dark backdrop.`;
  } else {
    stylePrompt = `Cinematic wide shot architectural illustration: ${prompt}. Detailed Parisian style futuristic environment, rich lighting, realistic concept art.`;
  }

  // Strictly use configured image models: gemini-3.1-flash-lite-image followed by gemini-3.1-flash-image
  const imageModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];

  for (const imgModel of imageModels) {
    try {
      const callPromise = getAI().models.generateContent({
        model: imgModel,
        contents: {
          parts: [{ text: stylePrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: type === 'character' ? '1:1' : '16:9',
          },
        },
      });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Image generation timeout for ${imgModel}`)), 12000)
      );
      const response = await Promise.race([callPromise, timeoutPromise]) as any;
      if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/jpeg';
            return `data:${mime};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Image Generation] Attempt with ${imgModel} failed:`, err?.message || err);
    }
  }

  return fallbackUrl;
}

export async function attachVisualsToEntities(data: any) {
  try {
    if (data.newCharacters && Array.isArray(data.newCharacters) && data.newCharacters.length > 0) {
      // Traitement séquentiel par lots de 2 pour éviter les erreurs 429 (rate limit Gemini)
      const CONCURRENCY_LIMIT = 2;
      const chars = data.newCharacters.filter((char: any) => !char.imageUrl || char.imageUrl.includes('picsum.photos'));
      
      for (let i = 0; i < chars.length; i += CONCURRENCY_LIMIT) {
        const batch = chars.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(batch.map(async (char: any) => {
          try {
            const prompt = `${char.name}, ${char.age || ''}, ${char.occupation || ''}, ${char.appearance || ''}, ${char.background || ''}`;
            char.imageUrl = await generateImageHelper(prompt, 'character', char.id || char.name);
          } catch (e) {
            char.imageUrl = getDeterministicFallback(char.name || 'char', 'character');
          }
        }));
      }
    }
  } catch (err) {
    console.warn("Non-fatal error in attachVisualsToEntities:", err);
  }
}
