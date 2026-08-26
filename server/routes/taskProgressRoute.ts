import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { taskProgressSchema } from '../schemas';
import { safeParseTaskProgress } from '../parsers';
import { getGameDateInfoServer } from '../timeService';

export async function handleTaskProgressRoute(req: Request, res: Response): Promise<void> {
  try {
    const { task, progressPct, elapsedMinutes, state } = req.body;
    if (!task) {
      res.status(400).json({ error: "Task is required" });
      return;
    }

    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    // Construire le contexte du lieu actuel et des PNJ présents
    const locations: any[] = state?.locations ? Object.values(state.locations) : [];
    const currentLocation: any = locations.find((l: any) => l.isCurrentLocation);
    const locationContext = currentLocation
      ? `Lieu actuel : "${currentLocation.name}" (${currentLocation.district || 'Saint-Michel'}) — ${currentLocation.description || ''}`
      : 'Lieu : Quartier Saint-Michel';

    const characters: any[] = state?.characters ? Object.values(state.characters) : [];
    const nearbyCharacters = characters
      .filter((c: any) => currentLocation && (c.currentLocationId === currentLocation.id || c.locationEncountered === currentLocation.name))
      .slice(0, 3)
      .map((c: any) => `${c.name} (${c.occupation || c.relationshipStatus || 'présent'})`)
      .join(', ');
    const nearbyContext = nearbyCharacters
      ? `PNJ potentiellement présents : ${nearbyCharacters}`
      : '';

    // Piste active liée à la tâche en cours (si applicable)
    const plotLeads = state?.plotLeads || [];
    const activePlot = plotLeads.find((p: any) => p.status === 'actif');
    const plotContext = activePlot
      ? `Contexte d'intrigue lié : "${activePlot.title}" — ${activePlot.qualitativeStage || ''}`
      : '';

    const prompt = `Tu es le Directeur Narratif d'une simulation de vie dans la cité de Saint-Michel (cycle diurne de 36 heures).
Le joueur est actuellement occupé par la tâche suivante :
- Activité : "${task.description}"
- Progression actuelle : ${Math.round(progressPct)}%
- Temps écoulé : ${Math.round(elapsedMinutes)} minutes de jeu
- Date & Heure actuelles : ${gameTimeInfo.fullDisplay} [${gameTimeInfo.cyclePhase}]

=== CONTEXTE ENVIRONNEMENTAL ===
${locationContext}
${nearbyContext ? nearbyContext + '\n' : ''}${plotContext ? plotContext + '\n' : ''}
=== INSTRUCTION ===
Décris un court micro-événement concret, vivant et ancré dans l'action (2-3 phrases directes, sans cliché poétique répétitif sur la lumière ou la météo) qui survient pendant cette activité.
Si des PNJ sont présents, tu peux les faire intervenir naturellement.
Propose 3 choix naturels pour interagir ou poursuivre.

Génère la réponse au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, taskProgressSchema, 0.7);
    const parsed = safeParseTaskProgress(aiResponse.text, task.description);

    res.json(parsed);
  } catch (error: any) {
    console.error("Task progress error:", error);
    const fallback = safeParseTaskProgress("", req.body?.task?.description || 'Activité en cours');
    res.json(fallback);
  }
}
