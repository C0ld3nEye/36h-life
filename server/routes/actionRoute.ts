import { Request, Response } from 'express';
import { generateWithModelFallback } from '../aiClient';
import { actionResponseSchema } from '../schemas';
import { safeParseActionResponse } from '../parsers';
import { attachVisualsToEntities } from '../imageService';
import { getGameDateInfoServer } from '../timeService';
import { retrieveRelevantMemories, EpisodicMemoryItem } from '../memoryEmbeddings';

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
    const charactersList = characters ? Object.values(characters).map((c: any) => 
      `• [ID: ${c.id}] ${c.name} (${c.age || 'Âge non précisé'} | ${c.occupation || 'Profession non précisée'} | ${c.relationshipStatus || 'neutre'} | ${c.locationEncountered || 'Saint-Michel'}) - ${c.appearance || ''} | ${c.background || ''} | Notes: ${c.notes || ''}`
    ).join('\n') : "Aucun personnage rencontré pour l'instant.";

    const locationsList = locations ? Object.values(locations).map((l: any) => 
      `• [ID: ${l.id}] ${l.name} (${l.district || 'Saint-Michel'} | ${l.category || 'interet'}) : ${l.description || ''} (Caractéristiques: ${l.keyFeatures?.join(', ') || 'Néant'}) - Notes: ${l.notes || ''}`
    ).join('\n') : "Aucun lieu répertorié.";

    const inventoryPlayer = (inventory || []).filter((i: any) => i.location === 'personnage').map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Rien sur soi';
    const inventoryApartment = (inventory || []).filter((i: any) => i.location === 'appartement').map((i: any) => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Placards et frigo vides';

    const leadsList = (plotLeads || []).map((pl: any) => `• [ID: ${pl.id}] ${pl.title} (${pl.category || 'piste'}, ${pl.status}) : ${pl.qualitativeStage || ''} | Indices: ${(pl.clues || []).join(' ; ')}`).join('\n') || "Aucune piste active.";
    const rumorsList = (rumors || []).map((r: any) => `• "${r.text}" (Source: ${r.source || 'Inconnue'}, Quartier: ${r.district || 'Saint-Michel'}, Crédibilité: ${r.credibility})`).join('\n') || "Aucun bruit de couloir.";
    const messagesList = (messages || []).slice(-5).map((m: any) => `• De ${m.senderName} : "${m.content}" (${m.replied ? 'Répondu' : 'En attente'})`).join('\n') || "Aucun message récent.";

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
- Inventaire actuel :
  • Sur soi (Poches / Sac) : ${inventoryPlayer}
  • Dans le studio (Frigo & Placards) : ${inventoryApartment}
- Tâche en cours : ${currentTask ? `"${currentTask.description}" (Fin prévue dans environ ${Math.max(1, Math.round((currentTask.endTimeReal - Date.now()) / 60000))} min)` : 'Aucune tâche active (libre)'}

=== RÉPERTOIRE CANONIQUE DES PERSONNAGES & LIEUX ===
[PERSONNAGES CONNUS]
${charactersList}

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
1. **INVENTAIRE 100% TEXTUEL & MULTI-INGRÉDIENTS** :
   - L'inventaire est exclusivement piloté par le texte.
   - Si le joueur exprime une action de cuisine, de repas ou de boisson mentionnant un ou plusieurs ingrédients (ex: "Je cuisine des pâtes avec de la sauce bolognaise et 2 œufs"), tu DOIS inspecter l'inventaire actuel et renvoyer DANS 'inventoryUpdates' **CHACUN des ingrédients utilisés avec quantityDelta: -1** (ou la quantité exacte consommée).
   - Tout repas ou encas consommé DOIT impérativement s'accompagner d'un bonus de faim/satiété dans 'vitalsImpact.hunger' (+20 à +60 selon la consistance du repas).
   - Si le joueur achète un objet dans un commerce, déduis l'argent dans 'moneyImpact.checkingDelta' avec un libellé clair dans 'moneyImpact.reason' et ajoute l'objet dans 'inventoryUpdates' (+1).

2. **STYLE NARRATIF DIRECT & SANS CLICHÉS (RÈGLE ABSOLUE)** :
   - **INTERDICTION STRICTE DES CLICHÉS POÉTIQUES RÉPÉTITIFS** : Ne JAMAIS commencer systématiquement chaque réponse par des formules toutes faites sur la météo ou la lumière (ex: "La lumière dorée vient caresser votre visage...", "Les rayons du soleil baignent...", "Un vent frais effleure..."). C'est lassant et artificiel.
   - Sois **direct, vivant, ancré dans le réel et percutant** : décris immédiatement le résultat concret de l'action du joueur, ses gestes réels, ou la réaction spontanée de son interlocuteur.
   - N'évoque l'atmosphère céleste ou l'environnement que si le joueur regarde expressément dehors, sort dans la rue après un long moment ou si la situation l'exige vraiment.

3. **IMMERSION & PHYSIOLOGIE DU CYCLE DE 36 HEURES** :
   - Intègre l'écoulement naturel du temps (journées étendues de 36 heures) dans le rythme des activités, des pauses et des fatigues corporelles.
   - Module le regard du protagoniste selon son Mindset :
     • Si Mindset < 30 (Tendu) : fatigue nerveuse, pragmatisme brut, sensibilité aux bruits et au stress.
     • Si Mindset > 70 (Confiant) : clarté d'esprit, fluidité dans les échanges et bonne humeur.

4. **FIDÉLITÉ DE LA MÉMOIRE & PERSONNAGES ORGANIQUES** :
   - Respecte scrupuleusement l'état passé, le solde bancaire, les objets réels et les relations établies.
   - Fais parler les PNJ avec des dialogues naturels, spontanés et réalistes en français.

5. **ESTIMATION SYSTÉMATIQUE DE DURÉE & GESTION DES TÂCHES LONGUES** :
   - Évalue TOUJOURS la durée réaliste en minutes de jeu de l'action dans 'durationMinutes' (ex: 2 min pour saluer ou regarder, 5 min pour boire un café, 10 min pour ranger ses poches, 25 min pour cuisiner, 45 min pour un trajet, 120 à 240 min pour un travail).
   - **SI UNE TÂCHE EST DÉJÀ EN COURS** ('Tâche en cours : ...') :
     • Le joueur est au cœur de son activité. Ses messages sont des micro-actions ou des pensées DANS le cadre de ce travail.
     • Les 3 choix proposés dans 'choices' DOIVENT être des approches directes de la tâche (ex: *"Prendre les outils adaptés et vérifier la sécurité"*, *"Accélérer la cadence pour en finir plus vite"*, *"Faire une pause rapide pour souffler"*).
     • Tu peux ajuster le temps restant de la tâche via 'taskTimeAdjustmentMinutes' (ex: -15 à -30 min pour une méthode efficace, +10 à +20 min si une complication survient).
     • Ne crée pas une nouvelle tâche pour un simple geste pendant le travail : maintiens la tâche active.
   - **SI AUCUNE TÂCHE N'EST EN COURS** :
     • Fournis un 'taskSummary' court (ex: "Travail à l'atelier", "Trajet vers les Docks") si l'action représente une activité substantielle (>= 15 min).
     • Propose 3 choix stimulants et contrastés dans 'choices'.

Génère la réponse au format JSON conforme au schéma.`;

    const aiResponse = await generateWithModelFallback(prompt, actionResponseSchema, 0.7);
    const parsed = safeParseActionResponse(aiResponse.text, action);
    await attachVisualsToEntities(parsed);

    res.json(parsed);
  } catch (error: any) {
    console.error("Action error:", error);
    const fallbackParsed = safeParseActionResponse("", req.body?.action || '');
    res.json(fallbackParsed);
  }
}
