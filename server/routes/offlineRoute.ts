import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { offlineRecapSchema } from '../schemas';
import { safeParseOfflineRecap, buildDynamicOfflineFallback } from '../parsers';
import { getGameDateInfoServer } from '../timeService';

export async function handleOfflineRoute(req: Request, res: Response): Promise<void> {
  try {
    const { offlineDurationMs, state, autopilotMode = 'normal' } = req.body;
    const offlineRealMinutes = (offlineDurationMs || 0) / 60000;
    const offlineHours = offlineRealMinutes / 60;
    const offlineGameMinutes = offlineRealMinutes * 1; // 1 real min = 1 game min

    if (offlineGameMinutes < 1) {
      res.json({
        narrativeRecap: "Vous n'avez été absent(e) que quelques instants. Tout est parfaitement calme à Saint-Michel.",
        events: ["Pause éclair", "Reprise immédiate"],
        choices: ["Poursuivre votre activité", "Consulter vos notes", "Observer autour de vous"],
        vitalsImpact: { energy: 0, hunger: 0, hygiene: 0, mood: 0, mindset: 0 },
        moneyImpact: { checkingDelta: 0, savingsDelta: 0, debtsDelta: 0, reason: "Aucune dépense" }
      });
      return;
    }

    const {
      vitals,
      skills,
      bank,
      narrativeHistory,
      characters,
      locations,
      inventory,
      currentTask
    } = state || {};

    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    const inventoryApartmentFood = (inventory || [])
      .filter((i: any) => i.location === 'appartement' && /(nourriture|boisson)/i.test(i.category || ''))
      .map((i: any) => i.name)
      .join(', ') || 'Aucune provision dans le studio';

    const prompt = `Tu es le Directeur Narratif d'une simulation de vie ultra-réaliste dans la cité de Saint-Michel (cycle planétaire de 36 heures).
Le joueur s'est absenté du jeu pendant ${Math.round(offlineRealMinutes)} minutes réelles (équivalant à ${Math.round(offlineGameMinutes)} minutes de jeu, soit environ ${offlineHours.toFixed(1)} heures).

=== POSTURE AUTOPILOTE DU JOUEUR : "${autopilotMode.toUpperCase()}" ===
${autopilotMode === 'prudent' ? '• PRUDENT : Évite tout risque, reste en sécurité au calme ou dans son studio, préserve son argent (0 € DE DÉPENSES STRICTEMENT EXIGÉ).' : ''}
${autopilotMode === 'normal' ? '• NORMAL : Gère ses besoins de base de manière équilibrée, cuisine ce qui est disponible. Dépenses quasi-nulles (0 € si des provisions existent, ou max 10 € pour un repas modeste si le frigo était strictement vide).' : ''}
${autopilotMode === 'curieux' ? '• CURIEUX : Flâne dans les ruelles, observe la vie du quartier, prend un café ou une collation simple (dépenses plafonnées à 5 € maximum).' : ''}

=== ÉTAT DU JOUEUR AVANT L'ABSENCE ===
- Énergie : ${vitals?.energy ?? 50}/100 | Faim : ${vitals?.hunger ?? 50}/100 | Hygiène : ${vitals?.hygiene ?? 50}/100
- Compte en banque : ${bank?.checking ?? 0} €
- Provisions dans le studio : ${inventoryApartmentFood}
- Activité en cours au départ : ${currentTask ? `"${currentTask.description}" (durée prévue: ${currentTask.durationMinutes} min)` : 'Temps libre'}
- Date & Heure actuelles à l'arrivée : ${gameTimeInfo.fullDisplay} [${gameTimeInfo.cyclePhase}]

=== RÈGLES STRICTES DE RECAPITULATIF HORS-LIGNE ===
1. **PROTECTION FINANCIÈRE ABSOLUE** :
   - En mode 'prudent' : 'moneyImpact.checkingDelta' DOIT ÊTRE STRICTEMENT ÉGAL À 0.
   - En mode 'normal' : 'moneyImpact.checkingDelta' doit être de 0 € si le joueur avait déjà des provisions, et au maximum de -10 € si le frigo était vide.
   - En mode 'curieux' : 'moneyImpact.checkingDelta' plafonné à -5 € maximum.
   - Ne vide JAMAIS le compte en banque du joueur en son absence.
2. **BESOINS VITAUX** :
   - Si l'absence dure plusieurs heures, le personnage s'est reposé : énergie positive (+20 à +60), faim légèrement en baisse (-5 à -15).
3. **INVENTAIRE** :
   - Si le personnage a cuisiné des provisions du studio, déduis-les dans 'inventoryUpdates' avec 'quantityDelta: -1'.

Génère un récapitulatif narratif riche, élégant et chronologique en français au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, offlineRecapSchema, 0.7);
    const parsed = safeParseOfflineRecap(aiResponse.text, offlineHours, offlineGameMinutes, state, autopilotMode);

    // 🔒 SÉCURITÉ DÉTERMINISTE : Clamp programmatique des finances post-parsing,
    // indépendamment du contenu narratif ou des éventuelles hallucinations du LLM.
    if (parsed.moneyImpact) {
      const checking = parsed.moneyImpact.checkingDelta ?? 0;
      const savings = parsed.moneyImpact.savingsDelta ?? 0;
      if (autopilotMode === 'prudent') {
        // Mode prudent : zéro dépense absolue
        if (checking < 0) parsed.moneyImpact.checkingDelta = 0;
        if (savings < 0) parsed.moneyImpact.savingsDelta = 0;
      } else if (autopilotMode === 'normal') {
        // Mode normal : max 10€ de dépense
        if (checking < -10) parsed.moneyImpact.checkingDelta = -10;
      } else if (autopilotMode === 'curieux') {
        // Mode curieux : max 5€ de dépense
        if (checking < -5) parsed.moneyImpact.checkingDelta = -5;
      }
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("Offline recap error:", error);
    const offlineRealMinutes = (req.body?.offlineDurationMs || 0) / 60000;
    const offlineHours = offlineRealMinutes / 60;
    const fallback = buildDynamicOfflineFallback(req.body?.state, offlineHours, offlineRealMinutes, req.body?.autopilotMode);
    res.json(fallback);
  }
}
