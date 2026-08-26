import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { offlineRecapSchema } from '../schemas';
import { safeParseOfflineRecap, buildDynamicOfflineFallback } from '../parsers';
import { getGameDateInfoServer } from '../timeService';
import { getEmbedding } from '../memoryEmbeddings';

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
      currentTask,
      plotLeads,
      messages
    } = state || {};

    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    const inventoryApartmentFood = (inventory || [])
      .filter((i: any) => i.location === 'appartement' && /(nourriture|boisson)/i.test(i.category || ''))
      .map((i: any) => i.name)
      .join(', ') || 'Aucune provision dans le studio';

    const leadsList = (plotLeads || []).map((pl: any) => `• [ID: ${pl.id}] ${pl.title} (${pl.status}) : ${pl.qualitativeStage || ''}`).join('\n') || "Aucune piste active.";
    const charactersList = characters ? Object.values(characters).slice(0, 6).map((c: any) => `• ${c.name} (${c.relationshipStatus || 'neutre'} | ${c.occupation || ''}${c.currentLocationId ? ` | Localisation: ${c.currentLocationId}` : ''})`).join('\n') : "Aucun contact particulier.";
    const locationsList = locations ? Object.values(locations).slice(0, 6).map((l: any) => `• ${l.name} (${l.district || 'Saint-Michel'}${l.isCurrentLocation ? ' ★ Lieu actuel' : ''})`).join('\n') : "Quartier Saint-Michel";
    const messagesList = (messages || []).slice(-3).map((m: any) => `• De ${m.senderName} : "${m.content || m.fullContent || m.preview}"`).join('\n') || "Aucun message en attente.";

    const prompt = `Tu es le Directeur Narratif d'une simulation de vie ultra-réaliste dans la cité de Saint-Michel (cycle planétaire de 36 heures).
Le joueur s'est absenté du jeu pendant ${Math.round(offlineRealMinutes)} minutes réelles (équivalant à ${Math.round(offlineGameMinutes)} minutes de jeu, soit environ ${offlineHours.toFixed(1)} heures).

=== POSTURE AUTOPILOTE DU JOUEUR : "${autopilotMode.toUpperCase()}" ===
${autopilotMode === 'prudent' ? '• PRUDENT : Évite tout risque, reste en sécurité au calme ou dans son studio, préserve son argent (0 € DE DÉPENSES STRICTEMENT EXIGÉ).' : ''}
${autopilotMode === 'normal' ? '• NORMAL : Gère ses besoins de base de manière équilibrée, cuisine ce qui est disponible. Dépenses quasi-nulles (0 € si des provisions existent, ou max 10 € pour un repas modeste si le frigo était strictement vide).' : ''}
${autopilotMode === 'curieux' ? '• CURIEUX : Flâne dans les ruelles, observe la vie du quartier, prend un café ou une collation simple (dépenses plafonnées à 5 € maximum).' : ''}

=== ÉTAT DU JOUEUR AVANT L'ABSENCE ===
- Besoins vitaux :
  • Énergie : ${vitals?.energy ?? 50}/100 | Faim : ${vitals?.hunger ?? 50}/100 | Hygiène : ${vitals?.hygiene ?? 50}/100
  • Humeur : ${vitals?.mood ?? 50}/100 | Mindset : ${vitals?.mindset ?? 50}/100
- Finances : Courant: ${bank?.checking ?? 0} € | Épargne: ${bank?.savings ?? 0} € | Dettes: ${bank?.debts ?? 0} €
- Provisions dans le studio : ${inventoryApartmentFood}
- Activité en cours au départ : ${currentTask ? `"${currentTask.description}" (durée prévue: ${currentTask.durationMinutes} min)` : 'Temps libre'}
- Date & Heure actuelles à l'arrivée : ${gameTimeInfo.fullDisplay} [${gameTimeInfo.cyclePhase}]

=== CONTEXTE RELATIONNEL, LIEUX & INTRIGUES EN COURS ===
[LIEUX CONNUS]
${locationsList}

[CONTACTS]
${charactersList}

[DERNIERS MESSAGES REÇUS]
${messagesList}

[PISTES ET OPPORTUNITÉS]
${leadsList}

=== RÈGLES STRICTES DE RECAPITULATIF HORS-LIGNE & MONDE ASYNCHRONE (« LIVING CITY ») ===
1. **PROTECTION FINANCIÈRE ABSOLUE** :
   - En mode 'prudent' : 'moneyImpact.checkingDelta' DOIT ÊTRE STRICTEMENT ÉGAL À 0.
   - En mode 'normal' : 'moneyImpact.checkingDelta' doit être de 0 € si le joueur avait déjà des provisions, et au maximum de -10 € si le frigo était vide.
   - En mode 'curieux' : 'moneyImpact.checkingDelta' plafonné à -5 € maximum.
   - Ne vide JAMAIS le compte en banque du joueur en son absence.
2. **BESOINS VITAUX** :
   - Si l'absence dure plusieurs heures, le personnage s'est reposé : énergie positive (+20 à +60), faim légèrement en baisse (-5 à -15).
3. **INVENTAIRE** :
   - Si le personnage a cuisiné des provisions du studio, déduis-les dans 'inventoryUpdates' avec 'quantityDelta: -1'.
4. **ÉVÉNEMENTS ASYNCHRONES DU MONDE (LIVING CITY)** :
   - Si l'absence dépasse 30 minutes de jeu, génère 1 message SMS spontané dans 'newMessages' d'un contact (ex: prise de nouvelles, proposition, rumeur ou relance).
   - Si une piste d'intrigue était très urgente et que l'absence est de plusieurs heures, tu peux faire évoluer son statut ou la passer en 'expire' dans 'updatedPlotLeads' avec un motif dans 'expiredReason'.
   - Si l'absence dépasse 2 heures de jeu, mentionne 1 ou 2 potins/évolutions relationnelles entre PNJ dans 'socialEvents' et d'éventuelles tendances économiques locales dans 'newMarketTrends'.

Génère un récapitulatif narratif riche, élégant et chronologique en français au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, offlineRecapSchema, 0.7);
    const parsed = safeParseOfflineRecap(aiResponse.text, offlineHours, offlineGameMinutes, state, autopilotMode);

    if (parsed.episodicMemory && parsed.episodicMemory.summary && (!parsed.episodicMemory.embedding || parsed.episodicMemory.embedding.length === 0)) {
      try {
        const emb = await getEmbedding(parsed.episodicMemory.summary);
        if (emb && Array.isArray(emb)) {
          parsed.episodicMemory.embedding = emb;
        }
      } catch (embErr) {
        console.warn("Offline memory embedding non-fatal error:", embErr);
      }
    }

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
    res.status(503).json({ ...fallback, _fallback: true, _error: error?.message || 'Erreur IA' });
  }
}
