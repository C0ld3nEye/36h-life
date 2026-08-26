import { getGameDateInfoServer } from './timeService';

export function safeParseActionResponse(rawText: string, defaultAction = ''): any {
  if (!rawText || typeof rawText !== 'string') {
    return {
      isDangerous: false,
      narrative: defaultAction ? `Vous poursuivez posément votre geste ("${defaultAction}"). L'atmosphère de Saint-Michel reste calme et le temps s'écoule au rythme du cycle.` : "L'atmosphère reste calme et le temps s'écoule au rythme du cycle.",
      choices: ["Prendre un instant pour observer les environs", "Consulter votre agenda et vos notes", "Passer à l'action"]
    };
  }

  let clean = rawText.trim();
  // Strip code fences
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // Continue to repair and regex extraction
  }

  // Try finding JSON between first { and last }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = clean.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (e) {
      try {
        const repaired = candidate
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([^\\])"\s*\n\s*"/g, '$1", "');
        const parsed = JSON.parse(repaired);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e2) {
        console.debug("Candidate JSON repair failed:", (e2 as Error)?.message);
      }
    }
  }

  // Advanced Regex Field Extraction
  const result: any = {
    isDangerous: false,
    choices: [],
    newAgendaEvents: []
  };

  const dangerMatch = clean.match(/"?isDangerous"?\s*:\s*(true|false)/i);
  if (dangerMatch) {
    result.isDangerous = dangerMatch[1].toLowerCase() === 'true';
  }

  const dangerWarnMatch = clean.match(/"?dangerWarning"?\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (dangerWarnMatch) {
    result.dangerWarning = dangerWarnMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }

  let narrativeFound = "";
  const narrativeQuoteMatch = clean.match(/"?narrative"?\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (narrativeQuoteMatch) {
    narrativeFound = narrativeQuoteMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  } else {
    const narrativeBlockMatch = clean.match(/"?narrative"?\s*:\s*([^,}\]]+?)(?:,\s*"?choices"?|,\s*"?isDangerous"?|,\s*"?vitalsImpact"?|,\s*"?newAgendaEvents"?|$)/is);
    if (narrativeBlockMatch) {
      narrativeFound = narrativeBlockMatch[1].replace(/^["']|["']$/g, '').trim();
    }
  }

  if (narrativeFound) {
    narrativeFound = narrativeFound
      .replace(/(?:,\s*)?(?:choices|newAgendaEvents|newCharacters|newLocations|vitalsImpact|moneyImpact|skillsImpact|isDangerous|dangerWarning)\s*:\s*.*$/is, '')
      .replace(/^[\{\}\[\]"']+|[\{\}\[\]"']+$/g, '')
      .trim();
  }

  result.narrative = narrativeFound || (defaultAction ? `Vous poursuivez posément votre geste ("${defaultAction}"). L'atmosphère reste calme.` : "Vous poursuivez votre action dans le calme.");

  const choicesMatch = clean.match(/"?choices"?\s*:\s*\[(.*?)\]/s);
  if (choicesMatch) {
    const rawItems = choicesMatch[1].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    result.choices = rawItems
      .map(item => item.replace(/^[^\w\sÀ-ÿ"']+|[^\w\sÀ-ÿ"']+$/g, '').replace(/^["']|["']$/g, '').trim())
      .filter(item => item.length > 2 && !item.includes(':'));
  }

  if (!result.choices || result.choices.length === 0) {
    result.choices = ["Prendre un instant pour observer les environs", "Consulter votre agenda et vos notes", "Passer à l'action"];
  }

  const agendaMatch = clean.match(/"?newAgendaEvents"?\s*:\s*\[(.*?)\]/s);
  if (agendaMatch) {
    try {
      const parsedEvents = JSON.parse(`[${agendaMatch[1]}]`);
      if (Array.isArray(parsedEvents)) {
        result.newAgendaEvents = parsedEvents;
      }
    } catch (e) {
      const titleMatch = agendaMatch[1].match(/"?title"?\s*:\s*"([^"]+)"/i);
      const descMatch = agendaMatch[1].match(/"?description"?\s*:\s*"([^"]+)"/i);
      if (titleMatch) {
        result.newAgendaEvents = [{
          id: `ev-${Date.now()}`,
          title: titleMatch[1],
          description: descMatch ? descMatch[1] : "Événement planifié",
          dateGameStr: "Prochainement",
          category: 'rdv',
          completed: false
        }];
      }
    }
  }

  const charMatch = clean.match(/"?newCharacters"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (charMatch) {
    try {
      const parsedChars = JSON.parse(charMatch[1]);
      if (Array.isArray(parsedChars) && parsedChars.length > 0) result.newCharacters = parsedChars;
    } catch (e) {
      console.debug("Parse repair attempt failed (newCharacters):", (e as Error)?.message);
    }
  }

  const locMatch = clean.match(/"?newLocations"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (locMatch) {
    try {
      const parsedLocs = JSON.parse(locMatch[1]);
      if (Array.isArray(parsedLocs) && parsedLocs.length > 0) result.newLocations = parsedLocs;
    } catch (e) {
      console.debug("Parse repair attempt failed (newLocations):", (e as Error)?.message);
    }
  }

  const updateCharMatch = clean.match(/"?updatedCharacters"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (updateCharMatch) {
    try {
      const parsedUpdates = JSON.parse(updateCharMatch[1]);
      if (Array.isArray(parsedUpdates) && parsedUpdates.length > 0) result.updatedCharacters = parsedUpdates;
    } catch (e) {
      console.debug("Parse repair attempt failed (updatedCharacters):", (e as Error)?.message);
    }
  }

  const updateLocMatch = clean.match(/"?updatedLocations"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (updateLocMatch) {
    try {
      const parsedLocUpdates = JSON.parse(updateLocMatch[1]);
      if (Array.isArray(parsedLocUpdates) && parsedLocUpdates.length > 0) result.updatedLocations = parsedLocUpdates;
    } catch (e) {
      console.debug("Parse repair attempt failed (updatedLocations):", (e as Error)?.message);
    }
  }

  const moneyMatch = clean.match(/"?moneyImpact"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (moneyMatch) {
    try {
      const parsedMoney = JSON.parse(moneyMatch[1]);
      if (parsedMoney && typeof parsedMoney === 'object') result.moneyImpact = parsedMoney;
    } catch (e) {
      console.debug("Parse repair attempt failed (moneyImpact):", (e as Error)?.message);
    }
  }

  const vitalsMatch = clean.match(/"?vitalsImpact"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (vitalsMatch) {
    try {
      const parsedVitals = JSON.parse(vitalsMatch[1]);
      if (parsedVitals && typeof parsedVitals === 'object') result.vitalsImpact = parsedVitals;
    } catch (e) {
      console.debug("Parse repair attempt failed (vitalsImpact):", (e as Error)?.message);
    }
  }

  const plotLeadMatch = clean.match(/"?newPlotLeads"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (plotLeadMatch) {
    try {
      const parsedLeads = JSON.parse(plotLeadMatch[1]);
      if (Array.isArray(parsedLeads) && parsedLeads.length > 0) result.newPlotLeads = parsedLeads;
    } catch (e) {
      console.debug("Parse repair attempt failed (newPlotLeads):", (e as Error)?.message);
    }
  }

  const updatePlotMatch = clean.match(/"?updatedPlotLeads"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (updatePlotMatch) {
    try {
      const parsedUp = JSON.parse(updatePlotMatch[1]);
      if (Array.isArray(parsedUp) && parsedUp.length > 0) result.updatedPlotLeads = parsedUp;
    } catch (e) {
      console.debug("Parse repair attempt failed (updatedPlotLeads):", (e as Error)?.message);
    }
  }

  const msgMatch = clean.match(/"?newMessages"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (msgMatch) {
    try {
      const parsedMsg = JSON.parse(msgMatch[1]);
      if (Array.isArray(parsedMsg) && parsedMsg.length > 0) result.newMessages = parsedMsg;
    } catch (e) {
      console.debug("Parse repair attempt failed (newMessages):", (e as Error)?.message);
    }
  }

  const rumorMatch = clean.match(/"?newRumors"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (rumorMatch) {
    try {
      const parsedRumors = JSON.parse(rumorMatch[1]);
      if (Array.isArray(parsedRumors) && parsedRumors.length > 0) result.newRumors = parsedRumors;
    } catch (e) {
      console.debug("Parse repair attempt failed (newRumors):", (e as Error)?.message);
    }
  }

  const invMatch = clean.match(/"?inventoryUpdates"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (invMatch) {
    try {
      const parsedInv = JSON.parse(invMatch[1]);
      if (Array.isArray(parsedInv) && parsedInv.length > 0) result.inventoryUpdates = parsedInv;
    } catch (e) {
      console.debug("Parse repair attempt failed (inventoryUpdates):", (e as Error)?.message);
    }
  }

  const skillsMatch = clean.match(/"?skillsImpact"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (skillsMatch) {
    try {
      const parsedSkills = JSON.parse(skillsMatch[1]);
      if (Array.isArray(parsedSkills) && parsedSkills.length > 0) result.skillsImpact = parsedSkills;
    } catch (e) {
      console.debug("Parse repair attempt failed (skillsImpact):", (e as Error)?.message);
    }
  }

  const diaryMatch = clean.match(/"?diaryEntry"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (diaryMatch) {
    try {
      const parsedDiary = JSON.parse(diaryMatch[1]);
      if (parsedDiary && typeof parsedDiary === 'object') result.diaryEntry = parsedDiary;
    } catch (e) {
      console.debug("Parse repair attempt failed (diaryEntry):", (e as Error)?.message);
    }
  }

  const memoryMatch = clean.match(/"?episodicMemory"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (memoryMatch) {
    try {
      const parsedMemory = JSON.parse(memoryMatch[1]);
      if (parsedMemory && typeof parsedMemory === 'object') result.episodicMemory = parsedMemory;
    } catch (e) {
      console.debug("Parse repair attempt failed (episodicMemory):", (e as Error)?.message);
    }
  }

  const taskSummaryMatch = clean.match(/"?taskSummary"?\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (taskSummaryMatch) {
    result.taskSummary = taskSummaryMatch[1].trim();
  }

  const hooksMatch = clean.match(/"?activePlotHooks"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (hooksMatch) {
    try {
      const parsedHooks = JSON.parse(hooksMatch[1]);
      if (Array.isArray(parsedHooks) && parsedHooks.length > 0) result.activePlotHooks = parsedHooks;
    } catch (e) {
      console.debug("Parse repair attempt failed (activePlotHooks):", (e as Error)?.message);
    }
  }

  const trendsMatch = clean.match(/"?newMarketTrends"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (trendsMatch) {
    try {
      const parsedTrends = JSON.parse(trendsMatch[1]);
      if (Array.isArray(parsedTrends) && parsedTrends.length > 0) result.newMarketTrends = parsedTrends;
    } catch (e) {
      console.debug("Parse repair attempt failed (newMarketTrends):", (e as Error)?.message);
    }
  }

  const durationMatch = clean.match(/"?durationMinutes"?\s*:\s*(\d+)/);
  if (durationMatch) {
    result.durationMinutes = parseInt(durationMatch[1], 10);
  }

  const adjustMatch = clean.match(/"?taskTimeAdjustmentMinutes"?\s*:\s*(-?\d+)/);
  if (adjustMatch) {
    result.taskTimeAdjustmentMinutes = parseInt(adjustMatch[1], 10);
  }

  return result;
}

export function buildDynamicOfflineFallback(state: any, offlineHours: number, offlineGameMinutes: number, autopilotMode: string = 'normal'): any {
  const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);
  const minutes = Math.max(1, Math.round(offlineGameMinutes));

  let narrative = "";
  let events: string[] = [];
  let diaryTitle = "";
  let diaryContent = "";

  if (state?.currentTask) {
    const taskDesc = state.currentTask.description || 'votre occupation en cours';
    narrative = `Durant ces ${minutes} minutes, vous avez mené à son terme l'activité engagée (${taskDesc}). Vous avez pris le temps de ranger vos affaires, de reprendre votre souffle et de vous réadapter au rythme du quartier Saint-Michel sous les reflets de ${gameTimeInfo.cyclePhase} (${gameTimeInfo.timeStr}). Tout est désormais en ordre pour la suite de vos projets.`;
    events = [`Achèvement réussi de "${taskDesc}"`, "Rangement et retour au calme"];
    diaryTitle = `Fin de ${taskDesc}`;
    diaryContent = `J'ai pu mener à terme ${taskDesc}. Les choses avancent pas à pas dans cette nouvelle vie de 36 heures.`;
  } else if (minutes < 60) {
    if (autopilotMode === 'curieux') {
      narrative = `Pendant ces ${minutes} minutes d'absence, vous avez laissé vos pas vous guider à travers les rues de Saint-Michel. Vous avez pris le temps d'observer les enseignes locales et l'animation qui évolue sous la lumière de ${gameTimeInfo.cyclePhase} (${gameTimeInfo.timeStr}), échangeant un bref signe de tête avec des passants avant de vous arrêter un instant pour apprécier l'atmosphère singulière de ce cycle planétaire.`;
      events = ["Flânerie et observation du quartier", "Repérage des commerces et ambiance locale"];
      diaryTitle = `Petite escapade (${minutes} min)`;
      diaryContent = `Une brève déambulation de ${minutes} minutes dans le quartier. L'ambiance à ${gameTimeInfo.timeStr} a un charme particulier.`;
    } else if (autopilotMode === 'prudent') {
      narrative = `Durant ces ${minutes} minutes, vous êtes resté(e) méthodique : vous avez vérifié vos affaires, jeté un œil à votre budget et pris un moment pour vous poser tranquillement. Alors que le cycle affiche ${gameTimeInfo.timeStr} (${gameTimeInfo.cyclePhase}), vous avez retrouvé une parfaite sérénité pour poursuivre vos démarches sans précipitation.`;
      events = ["Vérification des affaires et budget", "Moment de calme et de concentration"];
      diaryTitle = `Organisation et sérénité`;
      diaryContent = `Prendre ${minutes} minutes pour se recentrer et garder le contrôle sur ses priorités.`;
    } else {
      narrative = `Pendant ces ${minutes} minutes, vous avez pris le temps de vaquer à vos occupations du moment : vous avez conclu votre précédente tâche, fait quelques pas pour vous dégourdir les jambes et savouré une courte pause au calme. À cette heure du cycle (${gameTimeInfo.timeStr} - ${gameTimeInfo.cyclePhase}), l'effervescence urbaine suit son cours et vous êtes fin prêt(e) pour votre prochaine action.`;
      events = ["Finalisation des occupations immédiates", "Courte pause détente"];
      diaryTitle = `Tranche de vie (${minutes} min)`;
      diaryContent = `Ces ${minutes} minutes m'ont permis de souffler un peu avant de reprendre la suite de ma journée.`;
    }
  } else if (offlineHours <= 5) {
    narrative = `Ces ${offlineHours} heures ont été bien mises à profit. Vous avez géré vos nécessités courantes, pris un repas simple et vous êtes reposé(e) quelques instants. L'heure planétaire affiche désormais ${gameTimeInfo.timeStr} (${gameTimeInfo.cyclePhase}), baignant votre environnement d'une lumière caractéristique.`;
    events = ["Repas et entretien personnel", "Pause repos et réflexion", "Préparation des activités à venir"];
    diaryTitle = `Quelques heures de respiration`;
    diaryContent = `Une demi-journée bien occupée. Le temps s'écoule différemment avec ces 36 heures, mais j'y trouve peu à peu mon équilibre.`;
  } else {
    narrative = `Après ${offlineHours} heures d'absence, vous émergez d'une longue et profonde période de repos. Votre organisme a pleinement récupéré, profitant de ce cycle de 36 heures pour recharger vos énergies. À l'extérieur, le quartier de Saint-Michel vit au rythme de ${gameTimeInfo.cyclePhase} (${gameTimeInfo.timeStr}) et une nouvelle phase de votre journée s'ouvre devant vous.`;
    events = ["Grand cycle de sommeil réparateur", "Restauration complète de l'énergie", "Réveil au calme à Saint-Michel"];
    diaryTitle = `Grand repos réparateur`;
    diaryContent = `Un sommeil profond et régénérant de plusieurs heures. Je me réveille revigoré(e) et prêt(e) à affronter les défis du quartier.`;
  }

  return {
    narrativeRecap: narrative,
    events: events,
    choices: [
      "Faire le point sur ses affaires et son budget",
      "Sortir explorer les alentours",
      "Consulter ses messages ou l'agenda"
    ],
    vitalsImpact: offlineHours >= 3 
      ? { energy: 50, hunger: -15, hygiene: -5, mood: 15, mindset: 10 }
      : { energy: 5, hunger: -8, hygiene: -2, mood: 5, mindset: 5 },
    moneyImpact: { checkingDelta: 0, savingsDelta: 0, debtsDelta: 0, reason: "Dépenses évitées durant l'absence" },
    diaryEntry: {
      title: diaryTitle,
      content: diaryContent,
      mood: "Serein & Motivé",
      category: "absence",
      milestone: false
    }
  };
}

export function safeParseOfflineRecap(rawText: string, offlineHours: number, offlineGameMinutes: number, state?: any, autopilotMode?: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: any = null;
  try {
    const directParsed = JSON.parse(clean);
    if (directParsed && typeof directParsed === 'object' && directParsed.narrativeRecap) {
      parsed = directParsed;
    }
  } catch (e) {
    console.debug("Direct JSON parse failed in safeParseOfflineRecap:", (e as Error)?.message);
  }

  if (!parsed) {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const braceParsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
        if (braceParsed && typeof braceParsed === 'object' && braceParsed.narrativeRecap) {
          parsed = braceParsed;
        }
      } catch (e) {
        console.debug("Brace JSON parse failed in safeParseOfflineRecap:", (e as Error)?.message);
      }
    }
  }

  const fallback = buildDynamicOfflineFallback(state, offlineHours, offlineGameMinutes, autopilotMode);

  if (!parsed) {
    let narrativeFound = "";
    const narrativeMatch = clean.match(/"?narrativeRecap"?\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (narrativeMatch) {
      narrativeFound = narrativeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    }

    if (narrativeFound && narrativeFound.length > 20) {
      parsed = {
        ...fallback,
        narrativeRecap: narrativeFound
      };
    } else {
      parsed = fallback;
    }
  }

  if (!parsed.inventoryUpdates || parsed.inventoryUpdates.length === 0) {
    const invMatch = clean.match(/"?inventoryUpdates"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
    if (invMatch) {
      try {
        const parsedInv = JSON.parse(invMatch[1]);
        if (Array.isArray(parsedInv) && parsedInv.length > 0) {
          parsed.inventoryUpdates = parsedInv;
        }
      } catch (e) {
        console.debug("Parse repair attempt failed (offline inventoryUpdates):", (e as Error)?.message);
      }
    }
  }

  return parsed;
}

export function safeParseTaskProgress(rawText: string, taskDesc: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    console.debug("Direct JSON parse failed in safeParseTaskProgress:", (e as Error)?.message);
  }

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.debug("Brace JSON parse failed in safeParseTaskProgress:", (e as Error)?.message);
    }
  }

  let snippet = "";
  const match = clean.match(/"?narrativeSnippet"?\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (match) {
    snippet = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  }

  return {
    narrativeSnippet: snippet || `Vous poursuivez "${taskDesc}" avec régularité et attention.`,
    choices: ["Accélérer le rythme pour gagner du temps", "Prendre une brève pause pour souffler", "Maintenir un rythme régulier"]
  };
}

export function safeParseIntrospection(rawText: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    console.debug("Direct JSON parse failed in safeParseIntrospection:", (e as Error)?.message);
  }

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.debug("Brace JSON parse failed in safeParseIntrospection:", (e as Error)?.message);
    }
  }

  let content = "";
  const contentMatch = clean.match(/"?content"?\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (contentMatch) {
    content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  }

  return {
    title: "Pensées intimes & Réflexions",
    content: content || "Je prends un moment pour contempler le chemin parcouru. Chaque étape compte pour forger mon avenir dans ce quartier.",
    mood: "Pensif",
    category: "reflexion",
    milestone: false
  };
}
