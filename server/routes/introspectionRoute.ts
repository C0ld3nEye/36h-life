import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { introspectionSchema } from '../schemas';
import { safeParseIntrospection } from '../parsers';
import { getGameDateInfoServer } from '../timeService';

export async function handleIntrospectionRoute(req: Request, res: Response): Promise<void> {
  try {
    const { state } = req.body;
    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    // Préparer le contexte canonique partiel pour nourrir l'introspection
    const characters = state?.characters ? Object.values(state.characters) : [];
    const closeCharacters = characters.slice(0, 6)
      .map((c: any) => `${c.name} (${c.relationshipStatus || 'neutre'}, ${c.occupation || 'inconnu'})`)
      .join(', ') || 'Aucune relation établie';

    const plotLeads = state?.plotLeads || [];
    const activePlots = plotLeads.filter((p: any) => p.status === 'actif').slice(0, 3)
      .map((p: any) => `• ${p.title} : ${p.qualitativeStage || 'En cours'}`)
      .join('\n') || 'Aucune piste active.';

    const agendaEvents = state?.agenda || [];
    const upcomingEvents = agendaEvents
      .filter((e: any) => !e.completed)
      .slice(0, 3)
      .map((e: any) => `• ${e.title}${e.dateGameStr ? ` (${e.dateGameStr})` : ''}`)
      .join('\n') || 'Agenda vide.';

    const episodicMemories = state?.episodicMemories || [];
    const recentMemories = episodicMemories.slice(-3)
      .map((m: any) => `• [${m.importance}] ${m.summary}`)
      .join('\n') || '';

    const prompt = `Tu es la voix intérieure du protagoniste dans la cité de Saint-Michel (cycle planétaire de 36 heures).
Date et heure actuelles : ${gameTimeInfo.fullDisplay} [${gameTimeInfo.cyclePhase}].

=== ÉTAT ACTUEL ===
Énergie : ${state?.vitals?.energy ?? 50}/100 | Humeur : ${state?.vitals?.mood ?? 50}/100 | Mindset : ${state?.vitals?.mindset ?? 50}/100
Solde bancaire : ${state?.bank?.checking ?? 0} €

=== PERSONNES PROCHES ===
${closeCharacters}

=== PISTES & INTRIGUES EN COURS ===
${activePlots}

=== AGENDA À VENIR ===
${upcomingEvents}

${recentMemories ? `=== SOUVENIRS RÉCENTS ===\n${recentMemories}\n` : ''}
=== INSTRUCTION ===
Rédige une entrée de journal intime introspective et profonde (3-4 paragraphes en français à la 1ère personne "Je..."), réfléchissant sur les derniers événements, les relations avec les personnes mentionnées, les doutes, les espoirs et les perspectives d'avenir.
La narration doit être directe, ancrée dans le concret du quotidien — sans clichés poétiques sur la lumière ou la météo en début de paragraphe.

Génère la réponse au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, introspectionSchema, 0.75);
    const parsed = safeParseIntrospection(aiResponse.text);

    res.json(parsed);
  } catch (error: any) {
    console.error("Introspection error:", error);
    const fallback = safeParseIntrospection("");
    res.status(503).json({ ...fallback, _fallback: true, _error: error?.message || 'Erreur IA' });
  }
}
