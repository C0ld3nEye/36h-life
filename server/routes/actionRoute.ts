import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { actionResponseSchema } from '../schemas';
import { safeParseActionResponse } from '../parsers';
import { attachVisualsToEntities } from '../imageService';
import { getGameDateInfoServer } from '../timeService';
import { retrieveRelevantMemories, getEmbedding, EpisodicMemoryItem } from '../memoryEmbeddings';

export async function handleActionRoute(req: Request, res: Response): Promise<void> {
  try {
    const { action, state, force } = req.body;
    if (!action || !state) {
      res.status(400).json({ error: "Action and state are required" });
      return;
    }

    const {
      vitals,
      skills,
      bank,
      narrativeHistory,
      characters,
      locations,
      diary,
      agenda,
      inventory,
      currentTask,
      plotLeads,
      rumors,
      messages,
      activePlotHooks,
      episodicMemories
    } = state;

    const gameTimeInfo = getGameDateInfoServer(state.epochRealTime);

    // Retrieve RAG Memories
    const rawMemories: EpisodicMemoryItem[] = episodicMemories || [];
    let relevantMemoriesStr = "";
    if (rawMemories.length > 0) {
      try {
        const topMemories = await retrieveRelevantMemories(action, rawMemories, 4);
        if (topMemories.length > 0) {
          relevantMemoriesStr = topMemories.map(m => `• [${m.importance.toUpperCase()} - ${m.gameDateStr || 'Passé'}] ${m.summary} (${m.tags?.join(', ') || ''})`).join('\n');
        }
      } catch (err) {
        console.warn("Vector RAG memory retrieval non-fatal error:", err);
      }
    }

    // Prepare compressed narrative history (30 most recent entries)
    const compressedHistory = (narrativeHistory || [])
      .slice(-30)
      .map((m: any) => `${m.role === 'user' ? 'Joueur' : 'Narrateur'}: ${typeof m.content === 'string' ? m.content : (m.content?.text || JSON.stringify(m.content))}`)
      .join('\n');

    // Canonical directory formatting
    const charactersList = characters ? Object.values(characters).map((c: any) => {
      const scheduleStr = Array.isArray(c.schedule) && c.schedule.length > 0 
        ? ` | Routine: ${c.schedule.map((s: any) => typeof s === 'string' ? s : `${s.phase}: ${s.locationId}`).join(' ; ')}` 
        : '';
      const locStr = c.currentLocationId ? ` | Localisation actuelle: [${c.currentLocationId}]` : '';
      return `• [ID: ${c.id}] ${c.name} (${c.age || 'Âge non précisé'} | ${c.occupation || 'Profession non précisée'} | ${c.relationshipStatus || 'neutre'}${locStr}${scheduleStr}) - ${c.appearance || ''} | ${c.background || ''} | Notes: ${c.notes || ''}`;
    }).join('\n') : "Aucun personnage rencontré pour l'instant.";

    const locationsList = locations ? Object.values(locations).map((l: any) => {
      const isCurrent = l.isCurrentLocation ? " ★ LIEU ACTUEL DU JOUEUR ★" : "";
      const hours = l.openingHours ? ` | Horaires: ${l.openingHours.openHour}h00 à ${l.openingHours.closeHour}h00` : "";
      const tempStatus = l.temporaryStatus?.isClosed ? ` | FERMÉ TEMPORAIREMENT (${l.temporaryStatus.reason || 'Travaux'})` : "";
      return `• [ID: ${l.id}] ${l.name}${isCurrent} (${l.district || 'Saint-Michel'} | ${l.category || 'interet'}${hours}${tempStatus}) : ${l.description || ''} (Caractéristiques: ${l.keyFeatures?.join(', ') || 'Néant'}) - Notes: ${l.notes || ''}`;
    }).join('\n') : "Aucun lieu répertorié.";

    const inventoryPlayer = (inventory || []).filter((i: any) => i.location === 'personnage').map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Rien sur soi';
    const inventoryApartment = (inventory || []).filter((i: any) => i.location === 'appartement').map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Placards et frigo vides';

    const leadsList = (plotLeads || []).map((pl: any) => `• [ID: ${pl.id}] ${pl.title} (${pl.category || 'piste'}, statut: ${pl.status}) : ${pl.qualitativeStage || ''}${pl.expiryWarningText ? ` | Délai: ${pl.expiryWarningText}` : ''} | Indices: ${(pl.clues || []).join(' ; ')}`).join('\n') || "Aucune piste active.";
    const rumorsList = (rumors || []).map((r: any) => `• "${r.text}" (Source: ${r.source || 'Inconnue'}, Quartier: ${r.district || 'Saint-Michel'}, Crédibilité: ${r.credibility})`).join('\n') || "Aucun bruit de couloir.";
    const messagesList = (messages || []).slice(-5).map((m: any) => `• De ${m.senderName} : "${m.content || m.fullContent || m.preview}" (${m.replied ? 'Répondu' : 'En attente'})`).join('\n') || "Aucun message récent.";
    const agendaList = (agenda || []).filter((e: any) => !e.completed).map((e: any) => `• [ID: ${e.id}] ${e.title} (${e.category || 'personnel'}, Échéance: ${e.dateGameStr || 'Dans le cycle'}) : ${e.description || ''}`).join('\n') || "Aucun rendez-vous ou échéance prévu.";
    const skillsList = skills && Object.keys(skills).length > 0 ? Object.values(skills).map((s: any) => `• ${s.name} (Niveau ${s.level}, ${Math.round(s.practicePoints)}% maîtrise)`).join(', ') : "Notions élémentaires générales";
    const favorsList = Object.values(characters || {})
      .filter((c: any) => (c.favorBalance && c.favorBalance !== 0) || (c.socialTies && c.socialTies.length > 0))
      .map((c: any) => {
        const ties = (c.socialTies || []).map((t: any) => `${t.targetCharacterName} (${t.relationshipType}: ${t.dynamicSummary})`).join('; ');
        const favorText = c.favorBalance > 0 ? `Nous doit une faveur (+${c.favorBalance})` : (c.favorBalance < 0 ? `On lui est redevable (${c.favorBalance})` : `Neutre`);
        return `• ${c.name} : ${favorText}${ties ? ` | Liens : ${ties}` : ''}`;
      }).join('\n') || "Aucun lien de faveur ou réseau social majeur consigné.";

    const marketTrendsList = (state?.marketTrends || [])
      .map((t: any) => `• ${t.label} : Multiplicateur x${t.priceMultiplier} (${t.reason})`)
      .join('\n') || "Marché stable à Saint-Michel, prix réguliers.";

    const prompt = `Tu es le Directeur Narratif et Maître du Jeu d'une simulation de vie ultra-réaliste, immersive et cinématographique, se déroulant dans la cité de Saint-Michel.

=== CADRE TEMPOREL & ATMOSPHÉRIQUE DE 36 HEURES ===
- Date & Heure actuelles du jeu : ${gameTimeInfo.fullDisplay}
- Phase atmosphérique : ${gameTimeInfo.cyclePhase} (${gameTimeInfo.cycleSubtext})
- Ambiance céleste & lumineuse : ${gameTimeInfo.cycleDetails}
RÈGLE TEMPORELLE ABSOLUE : Les journées font exactement 36 HEURES. Adapte toujours la luminosité, les ombres, la fatigue et les bruits de la ville à cette heure spécifique.

=== ÉTAT COMPLET DU JOUEUR ===
- Besoins vitaux :
  • Énergie : ${vitals?.energy ?? 50}/100
  • Satiété / Faim : ${vitals?.hunger ?? 50}/100
  • Hygiène : ${vitals?.hygiene ?? 50}/100
  • Humeur : ${vitals?.mood ?? 50}/100
  • Mindset (État d'esprit) : ${vitals?.mindset ?? 50}/100 (0=Tendu/Rouge, 50=Équilibré, 100=À l'aise/Vert)
- Finances :
  • Compte courant : ${bank?.checking ?? 0} €
  • Épargne : ${bank?.savings ?? 0} €
  • Dettes : ${bank?.debts ?? 0} €
- Compétences & Savoir-faire : ${skillsList}
- Inventaire actuel :
  • Sur soi (Poches / Sac) : ${inventoryPlayer}
  • Dans le studio (Frigo & Placards) : ${inventoryApartment}
- Tâche en cours : ${currentTask ? `"${currentTask.description}" (Fin prévue dans environ ${Math.max(1, Math.round((currentTask.endTimeReal - Date.now()) / 60000))} min)` : 'Aucune tâche active (libre)'}
- Agenda & Rendez-vous :
${agendaList}

=== RÉPERTOIRE CANONIQUE DES PERSONNAGES, LIEUX & RÉSEAU SOCIAL ===
[PERSONNAGES CONNUS]
${charactersList}

[RÉSEAU SOCIAL, RELATIONS CROISÉES & FAVEURS]
${favorsList}

[CLIMAT ÉCONOMIQUE & TENDANCES DU MARCHÉ]
${marketTrendsList}

[LIEUX CONNUS]
${locationsList}

[PISTES ET INTRIGUES]
${leadsList}

[RUMEURS]
${rumorsList}

[MESSAGES RÉCENTS]
${messagesList}

${relevantMemoriesStr ? `[SOUVENIRS ÉPISODIQUES EXTRAITS PAR RAG]\n${relevantMemoriesStr}\n` : ''}

=== HISTORIQUE NARRATIF RÉCENT ===
${compressedHistory}

=== ACTION DU JOUEUR ===
"${action}"

=== RÈGLES CRITIQUES D'EXÉCUTION, NARRATION & INVENTAIRE TEXTUEL ===
1. **INVENTAIRE 100% TEXTUEL, CUISINE & REVENTE D'OBJETS** :
   - L'inventaire est exclusivement piloté par le texte.
   - **Cuisine & Repas** : Si le joueur cuisine ou consomme des ingrédients, renvoie DANS 'inventoryUpdates' **CHACUN des ingrédients utilisés avec quantityDelta: -1** et applique le bonus de faim/satiété dans 'vitalsImpact.hunger' (+20 à +60).
   - **Achats** : Si le joueur achète un objet, déduis l'argent dans 'moneyImpact.checkingDelta' avec libellé dans 'moneyImpact.reason' et ajoute l'objet dans 'inventoryUpdates' (+1).
   - **Revente & Mont-de-piété** : Si le joueur vend, troque ou met en gage un objet de son inventaire (ex: *"Je vends ma vieille montre au mont-de-piété"*), tu DOIS retirer l'objet possédé dans 'inventoryUpdates' (quantityDelta: -1) ET créditer le compte bancaire dans 'moneyImpact.checkingDelta' (+15 à +150 €) avec un motif explicite.

2. **ÉCOSYSTÈME SOCIAL, RELATIONS PNJ-PNJ & SOLIDARITÉ** :
   - Les PNJ ont des liens entre eux ('socialTies' : ami, rival, associé, créancier). Fais évoluer leurs dynamiques dans les dialogues et rumeurs.
   - Si le joueur rend un service à un PNJ, accorde 'favorDelta: +1' dans 'updatedCharacters'.
   - Si le joueur est en détresse (Faim < 20, Énergie < 15, Mindset < 20, ou découvert bancaire critique) et sollicite ou croise un ami lui devant une faveur ('favorBalance > 0'), le PNJ peut offrir spontanément son aide (repas chaud, hébergement, prêt d'argent) avec 'favorDelta: -1'.

3. **STYLE NARRATIF DIRECT & SANS CLICHÉS (RÈGLE ABSOLUE)** :
   - **INTERDICTION STRICTE DES CLICHÉS POÉTIQUES RÉPÉTITIFS** : Ne JAMAIS commencer systématiquement chaque réponse par des formules toutes faites sur la météo ou la lumière (ex: "La lumière dorée vient caresser votre visage...", "Les rayons du soleil baignent...").
   - Sois **direct, vivant, ancré dans le réel et percutant** : décris immédiatement le résultat concret de l'action du joueur, ses gestes réels, ou la réaction spontanée de son interlocuteur.

4. **IMMERSION & PHYSIOLOGIE DU CYCLE DE 36 HEURES** :
   - Intègre l'écoulement naturel du temps (journées de 36 heures) dans le rythme des activités, des pauses et des fatigues corporelles.
   - Module le regard du protagoniste selon son Mindset (0=Tendu, 100=Confiant).

5. **ESTIMATION SYSTÉMATIQUE DE DURÉE & GESTION DES TÂCHES LONGUES** :
   - Évalue TOUJOURS la durée réaliste en minutes de jeu dans 'durationMinutes'.
   - **SI UNE TÂCHE EST DÉJÀ EN COURS** : Ne crée pas de nouvelle tâche, propose 3 approches dans 'choices' et ajuste le temps restant via 'taskTimeAdjustmentMinutes' (-30 à +20 min).
   - **SI AUCUNE TÂCHE N'EST EN COURS** : Fournis un 'taskSummary' court si l'action représente une activité substantielle (>= 15 min).

6. **MONDE VIVANT ET ASYNCHRONE (« LIVING CITY »)** :
   - SMS et messages spontanés dans 'newMessages'.
   - Péremption déterministe des pistes ('PlotLeads' en statut 'expire').
   - Déplacements des PNJ ('currentLocationId') selon les 6 phases du cycle de 36 heures.
   - Fluctuations économiques locales dans 'newMarketTrends' si un événement urbain affecte les prix.

Génère la réponse au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, actionResponseSchema, 0.7);
    const parsed = safeParseActionResponse(aiResponse.text, action);

    // Vector Embedding generation for new episodic memory
    if (parsed.episodicMemory && parsed.episodicMemory.summary && (!parsed.episodicMemory.embedding || parsed.episodicMemory.embedding.length === 0)) {
      try {
        const emb = await getEmbedding(parsed.episodicMemory.summary);
        if (emb && Array.isArray(emb)) {
          parsed.episodicMemory.embedding = emb;
        }
      } catch (embErr) {
        console.warn("Embedding generation non-fatal error:", embErr);
      }
    }

    await attachVisualsToEntities(parsed);

    res.json(parsed);
  } catch (error: any) {
    console.error("Action error:", error);
    const fallbackParsed = safeParseActionResponse("", req.body?.action || '');
    res.status(503).json({ ...fallbackParsed, _fallback: true, _error: error?.message || 'Erreur IA' });
  }
}
