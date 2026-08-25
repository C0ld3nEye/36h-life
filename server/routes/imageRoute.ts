import { Request, Response } from 'express';
import { generateImageHelper } from '../imageService';

export async function handleImageRoute(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, type = 'character', seed } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const imageUrl = await generateImageHelper(prompt, type, seed);
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Image generation failed" });
  }
}
