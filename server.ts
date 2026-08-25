import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ActionRequest, ActionResponse, OfflineRecapRequest, OfflineRecapResponse, EpisodicMemory } from './src/types';
import { getEmbedding, retrieveRelevantMemories } from './server/memoryEmbeddings';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
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
const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Configured model chain: Flash Lite (gemini-3.5-flash-lite / gemini-3.1-flash-lite)
const DEFAULT_PRIMARY_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').replace(/^models\//, '');

// Atmosphere & Time calculations for the 36-hour planetary day
function getAtmosphericCycleDetails(gameHourOfDay: number) {
  if (gameHourOfDay >= 5 && gameHourOfDay < 10) {
    return {
      phase: "Aube naissante",
      subtext: "Premières lueurs",
      details: "Début de la journée de 36 heures (05:00 - 09:59). Ciel bleuté pâle, lueur d'aube rosée, fraîcheur matinale naissante, réveil progressif du quartier de Saint-Michel."
    };
  }
  if (gameHourOfDay >= 10 && gameHourOfDay < 16) {
    return {
      phase: "Matinée lumineuse",
      subtext: "Plein jour",
      details: "Matinée active (10:00 - 15:59). Soleil haut et net, animation urbaine, échoppes et commerces ouverts, dynamisme du matin."
    };
  }
  if (gameHourOfDay >= 16 && gameHourOfDay < 22) {
    return {
      phase: "Zénith solaire",
      subtext: "Chaleur du cycle",
      details: "Milieu exact du cycle diurne de 36 heures (16:00 - 21:59). Soleil au zénith, intensité lumineuse et chaleur maximales, pic d'activité de la journée."
    };
  }
  if (gameHourOfDay >= 22 && gameHourOfDay < 28) {
    return {
      phase: "Après-midi prolongé",
      subtext: "Lumière dorée",
      details: "Après-midi étiré (22:00 - 27:59). Ombres allongées, teintes ambrées et chaudes, terrasses vivantes, atmosphère d'après-midi qui dure."
    };
  }
  if (gameHourOfDay >= 28 && gameHourOfDay < 32) {
    return {
      phase: "Crépuscule doré",
      subtext: "Déclin du ciel / Fin de journée",
      details: "Fin de journée / Coucher de soleil prolongé (28:00 - 31:59). Ciel pourpre, ambré et orangé, allumage des réverbères et enseignes lumineuses, fraîcheur du soir qui commence à tomber, ambiance de soirée tombante. RÈGLE STRICTE : CE N'EST EN AUCUN CAS LE MATIN OU LE DÉJEUNER DU MATIN !"
    };
  }
  return {
    phase: "Nuit profonde",
    subtext: "Heures calmes",
    details: "Nuit noire (32:00 - 04:59). Ciel nocturne constellé d'étoiles, néons urbains et lanternes, commerces fermés, calme profond dans les rues."
  };
}

function getCalendarDateFromGameDayServer(dayNumber: number) {
  const totalDays = Math.max(0, dayNumber - 1);
  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const months = [
    { name: 'Janvier', days: 31 },
    { name: 'Février', days: 28 },
    { name: 'Mars', days: 31 },
    { name: 'Avril', days: 30 },
    { name: 'Mai', days: 31 },
    { name: 'Juin', days: 30 },
    { name: 'Juillet', days: 31 },
    { name: 'Août', days: 31 },
    { name: 'Septembre', days: 30 },
    { name: 'Octobre', days: 31 },
    { name: 'Novembre', days: 30 },
    { name: 'Décembre', days: 31 },
  ];

  let currentYear = 2100;
  let remainingDays = totalDays;

  while (true) {
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;
    if (remainingDays < daysInYear) break;
    remainingDays -= daysInYear;
    currentYear++;
  }

  const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
  let currentMonthIndex = 0;
  let currentDay = 1;

  for (let m = 0; m < 12; m++) {
    let daysInMonth = months[m].days;
    if (m === 1 && isLeapYear) daysInMonth = 29;
    if (remainingDays < daysInMonth) {
      currentMonthIndex = m;
      currentDay = remainingDays + 1;
      break;
    }
    remainingDays -= daysInMonth;
  }

  const dayName = daysOfWeek[totalDays % 7];
  const dayStr = String(currentDay).padStart(2, '0');
  const monthNumStr = String(currentMonthIndex + 1).padStart(2, '0');
  const dateStr = `${dayStr}/${monthNumStr}/${currentYear}`;
  const fullDisplay = `${dayName} ${dateStr}`;

  return {
    dayName,
    day: currentDay,
    month: currentMonthIndex + 1,
    year: currentYear,
    dateStr,
    fullDisplay,
    monthName: months[currentMonthIndex].name
  };
}

function getGameDateInfoServer(epochRealTime?: number) {
  const realElapsedMs = Date.now() - (epochRealTime || Date.now());
  const gameElapsedMs = realElapsedMs * 1; // 1 real min = 1 game min
  const totalGameMinutes = Math.floor(gameElapsedMs / (1000 * 60));
  const totalGameHours = Math.floor(totalGameMinutes / 60);
  const gameHourOfDay = (8 + totalGameHours) % 36;
  const gameMinuteOfHour = totalGameMinutes % 60;
  const totalDays = Math.floor(gameElapsedMs / (36 * 60 * 60 * 1000));
  const dayNumber = totalDays + 1;

  const cal = getCalendarDateFromGameDayServer(dayNumber);
  const cycle = getAtmosphericCycleDetails(gameHourOfDay);
  const hoursStr = String(gameHourOfDay).padStart(2, '0');
  const minutesStr = String(gameMinuteOfHour).padStart(2, '0');
  const timeStr = `${hoursStr}:${minutesStr}`;
  
  return {
    dayName: cal.dayName,
    dayNumber,
    dateStr: cal.dateStr,
    fullDateStr: cal.fullDisplay,
    gameHourOfDay,
    gameMinuteOfHour,
    timeStr,
    cyclePhase: cycle.phase,
    cycleSubtext: cycle.subtext,
    cycleDetails: cycle.details,
    fullDisplay: `${cal.fullDisplay} à ${timeStr} [${cycle.phase} - ${cycle.subtext}]`
  };
}

async function generateWithModelFallback(prompt: string, schema: Schema, temperature = 0.7) {
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
      // 2. If 400 or schema issue on this model, retry immediately without strict schema (JSON mime type only)
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

function safeParseActionResponse(rawText: string, defaultAction = ''): any {
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
      // Try fixing trailing commas or raw unescaped newlines inside strings
      try {
        const repaired = candidate
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([^\\])"\s*\n\s*"/g, '$1", "');
        const parsed = JSON.parse(repaired);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e2) {}
    }
  }

  // Advanced Regex Field Extraction (Guarantees NO raw JSON keys leak into narrative)
  const result: any = {
    isDangerous: false,
    choices: [],
    newAgendaEvents: []
  };

  // Extract isDangerous
  const dangerMatch = clean.match(/"?isDangerous"?\s*:\s*(true|false)/i);
  if (dangerMatch) {
    result.isDangerous = dangerMatch[1].toLowerCase() === 'true';
  }

  // Extract dangerWarning
  const dangerWarnMatch = clean.match(/"?dangerWarning"?\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (dangerWarnMatch) {
    result.dangerWarning = dangerWarnMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }

  // Extract narrative
  let narrativeFound = "";
  const narrativeQuoteMatch = clean.match(/"?narrative"?\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (narrativeQuoteMatch) {
    narrativeFound = narrativeQuoteMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  } else {
    // Match unquoted or pseudo-yaml narrative
    const narrativeBlockMatch = clean.match(/"?narrative"?\s*:\s*([^,}\]]+?)(?:,\s*"?choices"?|,\s*"?isDangerous"?|,\s*"?vitalsImpact"?|,\s*"?newAgendaEvents"?|$)/is);
    if (narrativeBlockMatch) {
      narrativeFound = narrativeBlockMatch[1].replace(/^["']|["']$/g, '').trim();
    }
  }

  // Strip any raw JSON keys or artifacts that might have bled into narrative
  if (narrativeFound) {
    narrativeFound = narrativeFound
      .replace(/(?:,\s*)?(?:choices|newAgendaEvents|newCharacters|newLocations|vitalsImpact|moneyImpact|skillsImpact|isDangerous|dangerWarning)\s*:\s*.*$/is, '')
      .replace(/^[\{\}\[\]"']+|[\{\}\[\]"']+$/g, '')
      .trim();
  }

  result.narrative = narrativeFound || (defaultAction ? `Vous poursuivez posément votre geste ("${defaultAction}"). L'atmosphère reste calme.` : "Vous poursuivez votre action dans le calme.");

  // Extract choices
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

  // Extract newAgendaEvents if present
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

  // Extract newCharacters if present in raw string
  const charMatch = clean.match(/"?newCharacters"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (charMatch) {
    try {
      const parsedChars = JSON.parse(charMatch[1]);
      if (Array.isArray(parsedChars) && parsedChars.length > 0) {
        result.newCharacters = parsedChars;
      }
    } catch (e) {}
  }

  // Extract newLocations if present in raw string
  const locMatch = clean.match(/"?newLocations"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (locMatch) {
    try {
      const parsedLocs = JSON.parse(locMatch[1]);
      if (Array.isArray(parsedLocs) && parsedLocs.length > 0) {
        result.newLocations = parsedLocs;
      }
    } catch (e) {}
  }

  // Extract updatedCharacters if present in raw string
  const updateCharMatch = clean.match(/"?updatedCharacters"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (updateCharMatch) {
    try {
      const parsedUpdates = JSON.parse(updateCharMatch[1]);
      if (Array.isArray(parsedUpdates) && parsedUpdates.length > 0) {
        result.updatedCharacters = parsedUpdates;
      }
    } catch (e) {}
  }

  // Extract updatedLocations if present in raw string
  const updateLocMatch = clean.match(/"?updatedLocations"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
  if (updateLocMatch) {
    try {
      const parsedLocUpdates = JSON.parse(updateLocMatch[1]);
      if (Array.isArray(parsedLocUpdates) && parsedLocUpdates.length > 0) {
        result.updatedLocations = parsedLocUpdates;
      }
    } catch (e) {}
  }

  // Extract moneyImpact if present in raw string
  const moneyMatch = clean.match(/"?moneyImpact"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (moneyMatch) {
    try {
      const parsedMoney = JSON.parse(moneyMatch[1]);
      if (parsedMoney && typeof parsedMoney === 'object') {
        result.moneyImpact = parsedMoney;
      }
    } catch (e) {}
  }

  // Extract vitalsImpact if present in raw string
  const vitalsMatch = clean.match(/"?vitalsImpact"?\s*:\s*(\{.*?\})(?:,\s*"?\w+"?\s*:|$)/s);
  if (vitalsMatch) {
    try {
      const parsedVitals = JSON.parse(vitalsMatch[1]);
      if (parsedVitals && typeof parsedVitals === 'object') {
        result.vitalsImpact = parsedVitals;
      }
    } catch (e) {}
  }

  // Extract durationMinutes if present
  const durationMatch = clean.match(/"?durationMinutes"?\s*:\s*(\d+)/i);
  if (durationMatch) {
    result.durationMinutes = parseInt(durationMatch[1], 10);
  }

  // Extract taskSummary if present
  const taskSummaryMatch = clean.match(/"?taskSummary"?\s*:\s*"([^"]+)"/i);
  if (taskSummaryMatch) {
    result.taskSummary = taskSummaryMatch[1];
  }

  return result;
}

function buildDynamicOfflineFallback(state: any, offlineHours: number, offlineGameMinutes: number, autopilotMode: string = 'normal'): any {
  const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);
  const minutes = Math.max(1, Math.round(offlineGameMinutes));
  const lastNarrative = state?.narrativeHistory && state.narrativeHistory.length > 0 
    ? state.narrativeHistory[state.narrativeHistory.length - 1].content 
    : '';

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
    diaryEntry: {
      title: diaryTitle,
      content: diaryContent,
      mood: "Serein & Motivé",
      category: "absence",
      milestone: false
    }
  };
}

function safeParseOfflineRecap(rawText: string, offlineHours: number, offlineGameMinutes: number, state?: any, autopilotMode?: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: any = null;
  try {
    const directParsed = JSON.parse(clean);
    if (directParsed && typeof directParsed === 'object' && directParsed.narrativeRecap) {
      parsed = directParsed;
    }
  } catch (e) {}

  if (!parsed) {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const braceParsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
        if (braceParsed && typeof braceParsed === 'object' && braceParsed.narrativeRecap) {
          parsed = braceParsed;
        }
      } catch (e) {}
    }
  }

  const fallback = buildDynamicOfflineFallback(state, offlineHours, offlineGameMinutes, autopilotMode);

  if (!parsed) {
    // Regex field extraction
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

  // Extract or synthesize inventoryUpdates
  if (!parsed.inventoryUpdates || parsed.inventoryUpdates.length === 0) {
    const invMatch = clean.match(/"?inventoryUpdates"?\s*:\s*(\[.*?\])(?:,\s*"?\w+"?\s*:|$)/s);
    if (invMatch) {
      try {
        const parsedInv = JSON.parse(invMatch[1]);
        if (Array.isArray(parsedInv) && parsedInv.length > 0) {
          parsed.inventoryUpdates = parsedInv;
        }
      } catch (e) {}
    }
  }

  // Automatic Grocery-to-Inventory Bridge:
  // If the narrative or moneyImpact indicates grocery/food shopping or restocking the fridge/studio,
  // but inventoryUpdates was omitted, automatically add concrete food & beverage items to the apartment!
  const recapText = `${parsed.narrativeRecap || ''} ${parsed.moneyImpact?.reason || ''}`.toLowerCase();
  const boughtGroceries = /(?:courses|supermarch[ée]|march[ée]|provisions|épicerie|ravitaillement|garde-manger|frigo\s+rempli|plein\s+de\s+vivres)/i.test(recapText);
  if (boughtGroceries && (!parsed.inventoryUpdates || parsed.inventoryUpdates.length === 0)) {
    parsed.inventoryUpdates = [
      {
        id: `groceries-${Date.now()}-1`,
        name: 'Panier de provisions fraîches (légumes, fruits, pain)',
        category: 'nourriture',
        quantityDelta: 1,
        location: 'appartement',
        description: 'Provisions et ingrédients frais achetés lors de vos courses pour la kitchenette.',
        freshness: 'frais',
        consumable: true
      },
      {
        id: `groceries-${Date.now()}-2`,
        name: 'Pack de féculents & conserves (pâtes, riz, sauces)',
        category: 'nourriture',
        quantityDelta: 1,
        location: 'appartement',
        description: 'Réserve d\'aliments secs et sauces pour cuisiner à l\'appartement.',
        freshness: 'sec',
        consumable: true
      },
      {
        id: `groceries-${Date.now()}-3`,
        name: 'Pack d\'eau minérale & jus',
        category: 'boisson',
        quantityDelta: 2,
        location: 'appartement',
        description: 'Boissons et eau filtrée rangées au frais dans la kitchenette.',
        consumable: true
      }
    ];
  }

  return parsed;
}

function safeParseTaskProgress(rawText: string, taskDesc: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {}

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
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

function safeParseIntrospection(rawText: string): any {
  let clean = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {}

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
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

const CHARACTER_PORTRAIT_FALLBACKS = [
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

const LOCATION_FALLBACKS = [
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&h=400&q=80", // Appartement / Domicile
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&h=400&q=80", // Café / Bistrot
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&h=400&q=80", // Ruelle urbaine
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&h=400&q=80", // Bureau / Commerce
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&h=400&q=80"  // Boutique
];

function getDeterministicFallback(prompt: string, type: 'character' | 'location'): string {
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

async function generateImageHelper(prompt: string, type: 'character' | 'location', seed?: string): Promise<string> {
  const fallbackUrl = getDeterministicFallback(seed || prompt, type);

  let stylePrompt = "";
  if (type === 'character') {
    stylePrompt = `High quality cinematic portrait of a person: ${prompt}. Atmospheric lighting, sharp focus on face, digital art portrait style, clean dark backdrop.`;
  } else {
    stylePrompt = `Cinematic wide shot architectural illustration: ${prompt}. Detailed Parisian style futuristic environment, rich lighting, realistic concept art.`;
  }

  // Strictly use Nano Banana 2 Lite as primary, followed by Nano Banana 2
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

async function attachVisualsToEntities(data: any) {
  try {
    if (data.newCharacters && Array.isArray(data.newCharacters) && data.newCharacters.length > 0) {
      await Promise.all(data.newCharacters.map(async (char: any) => {
        if (!char.imageUrl || char.imageUrl.includes('picsum.photos')) {
          try {
            const prompt = `${char.name}, ${char.age || ''}, ${char.occupation || ''}, ${char.appearance || ''}, ${char.background || ''}`;
            char.imageUrl = await generateImageHelper(prompt, 'character', char.id || char.name);
          } catch (e) {
            char.imageUrl = getDeterministicFallback(char.name || 'char', 'character');
          }
        }
      }));
    }

    // Note: newLocations are intentionally created without default illustrations so the user can generate on-demand via the dedicated UI button.
  } catch (err) {
    console.warn("Non-fatal error in attachVisualsToEntities:", err);
  }
}
const actionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isDangerous: { type: Type.BOOLEAN, description: "True if the action is extreme, illegal, or very dangerous." },
    dangerWarning: { type: Type.STRING, description: "A warning message if the action is dangerous, explaining the risks." },
    narrative: { type: Type.STRING, description: "The result of the action, told in second person ('You do x...')." },
    taskSummary: { type: Type.STRING, description: "If a long task is started, provide a 3-5 word summary of the task (e.g., 'Se dirige vers le café', 'Travaille au bureau')." },
    durationMinutes: { type: Type.INTEGER, description: "Estimated duration of the action in game minutes (1 real min = 1 game min) for NEW tasks. DO NOT return this if the player is already doing a task." },
    taskTimeAdjustmentMinutes: { type: Type.INTEGER, description: "Only if a task is currently active: add or remove minutes from the current active task based on this action (e.g., -10 to reduce time left, +10 if it takes longer)." },
    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 pre-generated natural choices to continue the story." },
    vitalsImpact: { 
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER, description: "Delta on energy (-100 to +100). MUST be negative (-1 to -8) for normal waking activities. ONLY positive (+25 to +100) if the player explicitly sleeps, naps, or rests." },
        hunger: { type: Type.INTEGER, description: "Delta on satiety (-100 to +100). MUST be negative (-1 to -6) during daytime. ONLY positive (+20 to +60) if the player explicitly eats a meal/snack or drinks a caloric beverage. NEVER positive without food." },
        hygiene: { type: Type.INTEGER, description: "Delta on hygiene (-100 to +100). Drops (-2 to -15) for dirty or strenuous tasks. ONLY positive (+25 to +100) if the player washes hands, grooms, or showers." },
        mood: { type: Type.INTEGER, description: "Delta on mood (-25 to +25) reflecting emotional experience." },
        mindset: { type: Type.INTEGER, description: "Delta impact on Mindset (-20 to +20). Negative = Tendu/Red, Positive = À l'aise/Green." }
      }
    },
    moneyImpact: {
      type: Type.OBJECT,
      properties: {
        checkingDelta: { type: Type.INTEGER },
        savingsDelta: { type: Type.INTEGER },
        debtsDelta: { type: Type.INTEGER },
        reason: { type: Type.STRING, description: "Precise motif or label for the bank transaction in French (e.g., 'Achat café & croissant', 'Achat ticket de bus', 'Courses au supermarché', 'Achat journal'). ALWAYS provide a clear, specific description!" }
      }
    },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "Item name in French (e.g. 'Paquet de pâtes (500g)', 'Boîte de 6 œufs', 'Café', 'Pass magnétique')." },
          category: { type: Type.STRING, enum: ['nourriture', 'boisson', 'hygiene', 'vetement', 'outils', 'technologie', 'documents', 'clefs_pass', 'divers'] },
          quantityDelta: { type: Type.INTEGER, description: "Positive to add/gain items (e.g. +1, +2), negative to consume/use/drop items (e.g. -1)." },
          location: { type: Type.STRING, enum: ['personnage', 'appartement'], description: "'personnage' for carried items, 'appartement' for items in fridge/cupboards." },
          description: { type: Type.STRING, description: "Brief description of the item." },
          freshness: { type: Type.STRING, enum: ['frais', 'perime', 'sec', 'conserve'] },
          consumable: { type: Type.BOOLEAN }
        },
        required: ["name", "quantityDelta", "location"]
      }
    },
    newCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          locationEncountered: { type: Type.STRING, description: "Precise location where the player met or interacted with them." },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING, description: "e.g. '28 ans', 'Une quarantaine d'années', '65 ans'" },
          appearance: { type: Type.STRING, description: "Detailed physical description: stature, face, gaze, hair, clothes, style, demeanor. NEVER leave empty!" },
          occupation: { type: Type.STRING, description: "Specific profession, job title, or role in the city. NEVER leave empty!" },
          background: { type: Type.STRING, description: "Backstory, personality, origin, motivation, and shared history or impression with the player. NEVER leave empty!" },
          financialRelation: { type: Type.STRING, description: "Debts, loans, contractual deals, or financial arrangements." },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tasks, promises or obligations with this character." },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Scheduled meetings or appointments." },
          notes: { type: Type.STRING, description: "Synthetic summary of interactions and remarks. NEVER leave empty!" }
        },
        required: ["id", "name"]
      }
    },
    newLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING, description: "District or neighborhood name (e.g. 'Quartier Saint-Michel')." },
          description: { type: Type.STRING, description: "Rich, vivid, sensory description: architecture, lighting under the 36-hour cycle, scents, atmosphere, and vibe. NEVER leave empty!" },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 to 5 key amenities or distinct features (e.g. ['Terrasse ombragée', 'Comptoir en zinc', 'Wifi public']). NEVER leave empty!" },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs or names of characters associated with this location." },
          notes: { type: Type.STRING, description: "Practical utility or personal reflection on the place. NEVER leave empty!" },
          discoveredGameDate: { type: Type.INTEGER }
        },
        required: ["id", "name"]
      }
    },
    skillsImpact: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          practicePointsDelta: { type: Type.INTEGER }
        }
      }
    },
    updatedCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING },
          appearance: { type: Type.STRING },
          occupation: { type: Type.STRING },
          background: { type: Type.STRING },
          financialRelation: { type: Type.STRING },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          notesAppend: { type: Type.STRING },
          notesReplace: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    updatedLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING },
          description: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
          notesAppend: { type: Type.STRING },
          notesReplace: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING, description: "e.g. 'Demain 15:00', 'Jour 4 - 09:00', 'Dans 2 jours'" },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["title"]
      }
    },
    updatedAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["id"]
      }
    },
    activePlotHooks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 2 to 4 active forward-looking plot hooks or background threads to maintain continuous narrative momentum (e.g. 'Entretien d'embauche imminent', 'Rumeurs sur les coupures nocturnes')."
    },
    newPlotLeads: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        title: { type: Type.STRING },
        category: { type: Type.STRING, enum: ["emploi", "mystere", "quartier", "personnel", "finance"] },
        status: { type: Type.STRING, enum: ["actif", "en_pause", "resolu"] },
        qualitativeStage: { type: Type.STRING },
        clues: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedCharacterIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedLocationIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        notes: { type: Type.STRING }
      }}
    },
    updatedPlotLeads: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        id: { type: Type.STRING },
        qualitativeStage: { type: Type.STRING },
        newClues: { type: Type.ARRAY, items: { type: Type.STRING } },
        status: { type: Type.STRING, enum: ["actif", "en_pause", "resolu"] }
      }}
    },
    newRumors: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        text: { type: Type.STRING },
        source: { type: Type.STRING },
        credibility: { type: Type.STRING, enum: ["faible", "plausible", "averee"] },
        district: { type: Type.STRING }
      }}
    },
    newMessages: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: {
        senderId: { type: Type.STRING, description: "ID of the character or system" },
        senderName: { type: Type.STRING },
        preview: { type: Type.STRING },
        content: { type: Type.STRING },
        replyOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }}
    },
    episodicMemory: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A concise 1-2 sentence factual episodic memory summary of what just transpired (e.g. 'Le joueur a rencontré Léo au Bistro Saint-Michel et a convenu d'une période d'essai rémunérée 250€/semaine.')" },
        importance: { type: Type.STRING, enum: ['haute', 'moyenne', 'critique'] },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 semantic keywords (e.g. ['Léo', 'travail', 'Bistro Saint-Michel', 'salaire', 'accord'])" }
      },
      description: "Generates a compressed episodic memory chunk when something memorable, contractual, emotional, or significant occurred."
    },
    diaryEntry: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Poetic or evocative title for the journal entry (e.g. 'Embauche inattendue', 'Soirée chez Léo')" },
        content: { type: Type.STRING, description: "First-person reflective journal entry written in the character's voice." },
        category: { type: Type.STRING, enum: ['souvenir', 'reflexion', 'secret', 'objectif'] },
        mood: { type: Type.STRING, description: "Dominant emotional mood (e.g. 'Fier', 'Ému', 'Soulagé', 'Inquiet', 'Motivé')" },
        milestone: { type: Type.BOOLEAN, description: "True if this marks a significant life event" }
      },
      required: ["title", "content"]
    }
  },
  required: ["isDangerous", "narrative", "choices"]
};

app.post('/api/action', async (req, res) => {
  try {
    const { action, state, force } = req.body as ActionRequest;
    const gameTimeInfo = getGameDateInfoServer(state.epochRealTime);
    
    // COMPREHENSIVE CONTEXT INJECTION (Fix memory loss & task-history pollution)
    // 1. Dual Memory Architecture: Smart Narrative History Compression
    // Intermediate micro-turns from tasks shouldn't flood the prompt window and push out macro-story memories.
    const rawHistory = state.narrativeHistory || [];
    
    // Group and compress old task-substeps so key life events and character dialogues remain intact
    const compressedHistory: { role: string; content: string }[] = [];
    let consecutiveTaskSteps = 0;
    let lastTaskSummary = "";

    for (let i = 0; i < rawHistory.length; i++) {
      const msg = rawHistory[i];
      if (!msg) continue;
      const contentStr = typeof msg.content === 'string' ? msg.content : ((msg.content as any)?.text || String(msg.content || ''));
      const isTaskProgress = msg.role === 'model' && contentStr.startsWith('[TÂCHE EN COURS');
      
      // If we are looking at older history (not the immediate last 4 messages) and encounter task sub-steps
      if (isTaskProgress && i < rawHistory.length - 4) {
        consecutiveTaskSteps++;
        const titleMatch = contentStr.match(/\[TÂCHE EN COURS[^:]*:\s*([^\]\n]+)\]/i);
        if (titleMatch) lastTaskSummary = titleMatch[1];
      } else {
        if (consecutiveTaskSteps >= 3) {
          compressedHistory.push({
            role: 'model',
            content: `[Épisode synthétisé : Déroulement et péripéties de l'activité "${lastTaskSummary || 'Activité prolongée'}" (${consecutiveTaskSteps} étapes de routine accomplies).]`
          });
          consecutiveTaskSteps = 0;
          lastTaskSummary = "";
        }
        compressedHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          content: contentStr
        });
      }
    }

    // Expand narrative history window to provide richer dialogue and scene continuity
    const historySlice = compressedHistory.slice(-30);
    const recentHistory = historySlice
      .map(h => `${h.role === 'user' ? 'Joueur' : 'Narrateur'}: ${h.content}`)
      .join('\n\n');

    // 1b. Vector Episodic Memory Retrieval (RAG via Gemini Embeddings)
    const episodicMemories = state.episodicMemories || [];
    let relevantEpisodicMemories: EpisodicMemory[] = [];
    try {
      relevantEpisodicMemories = await retrieveRelevantMemories(action || 'situation actuelle', episodicMemories, 4);
    } catch (embErr) {
      console.warn("Memory retrieval fallback:", embErr);
      relevantEpisodicMemories = episodicMemories.slice(-4);
    }

    const retrievedMemoriesList = relevantEpisodicMemories.length > 0
      ? relevantEpisodicMemories
          .map(m => `• [${m.gameDateStr || 'Souvenir'} | Importance: ${m.importance}] ${m.summary}`)
          .join('\n')
      : "Aucun souvenir ancien spécifique rappelé pour cette action.";

    // 2. Canonical Directory of Characters (ALL characters are injected so the model NEVER recreates existing ones)
    const allCharacters = Object.values(state.characters || {});
    const canonicalCharactersList = allCharacters.length > 0
      ? allCharacters.map(c => 
          `• [ID: "${c.id}"] ${c.name} | Âge: ${c.age || 'Inconnu'} | Rôle: ${c.occupation || 'Non précisé'} | Statut: ${c.relationshipStatus}
  - Lieu de rencontre: ${c.locationEncountered}
  - Apparence: ${c.appearance || 'Non précisée'}
  - Background & Personnalité: ${c.background || 'Non précisé'}
  - Accords financiers: ${c.financialRelation || 'Aucun'}
  - En cours: ${(c.pendingItems && c.pendingItems.length > 0) ? c.pendingItems.join(', ') : 'Rien en suspens'}
  - Événements / RDV: ${(c.upcomingEvents && c.upcomingEvents.length > 0) ? c.upcomingEvents.join(', ') : 'Aucun'}
  - Notes: ${c.notes || 'Aucune note'}`
        ).join('\n')
      : "Aucun personnage enregistré pour l'instant (à part le studio de départ).";

    // 3. Canonical Directory of Locations (ALL locations are injected so the model NEVER recreates duplicate places)
    const allLocations = Object.values(state.locations || {});
    const canonicalLocationsList = allLocations.length > 0
      ? allLocations.map(l => 
          `• [ID: "${l.id}"] ${l.name} (${l.category || 'lieu'}) - Quartier: ${l.district || 'Saint-Michel'}
  - Description: ${l.description}
  - Équipements: ${(l.keyFeatures && l.keyFeatures.length > 0) ? l.keyFeatures.join(', ') : 'Standards'}
  - Personnages associés: ${(l.associatedCharacters && l.associatedCharacters.length > 0) ? l.associatedCharacters.join(', ') : 'Aucun'}
  - Notes: ${l.notes || 'Aucune'}`
        ).join('\n')
      : "Aucun lieu enregistré.";

    // 4. Episodic Life Journal & Major Milestones (Summarized past life events & reflections)
    const diaryEntries = (state.diary || []);
    const milestonesList = diaryEntries
      .filter(d => d.milestone || d.category === 'souvenir')
      .slice(-10)
      .map(d => `- [${d.category || 'jalon'}] ${d.title || 'Souvenir'} (Humeur: ${d.mood || 'Neutre'}) : ${d.content}`)
      .join('\n');
    const recentDiaryReflections = diaryEntries
      .slice(-5)
      .map(d => `- "${d.title || 'Réflexion'}" (${d.mood || 'Pensif'}): ${d.content}`)
      .join('\n');

    const upcomingAgendaList = (state.agenda || [])
      .filter(e => !e.completed)
      .map(e => `- [${(e.category || 'évènement').toUpperCase()}] ${e.title} (${e.dateGameStr || 'Date non précisée'}): ${e.description || ''}`)
      .join('\n');

    // Player Inventory Context (Character pockets vs Apartment storage)
    const characterInventory = (state.inventory || []).filter(i => i.location === 'personnage');
    const apartmentInventory = (state.inventory || []).filter(i => i.location === 'appartement');
    
    const characterInventoryList = characterInventory.length > 0
      ? characterInventory.map(i => `- ${i.name} (x${i.quantity}) [${i.category}]${i.consumable ? ' [Consommable]' : ''}${i.freshness ? ` (${i.freshness})` : ''}: ${i.description || ''}`).join('\n')
      : "Aucun objet sur soi.";
      
    const apartmentInventoryList = apartmentInventory.length > 0
      ? apartmentInventory.map(i => `- ${i.name} (x${i.quantity}) [${i.category}]${i.consumable ? ' [Consommable]' : ''}${i.freshness ? ` (${i.freshness})` : ''}: ${i.description || ''}`).join('\n')
      : "Appartement / Frigo / Placards vides.";

    const playerSkillsList = Object.values(state.skills || {})
      .map(s => `- ${s.name} : Niveau ${s.level} (${s.practicePoints}/100 progression vers niveau suivant)`)
      .join('\n');

    // Missing State Injections (Plot Leads, Rumors, Messages)
    const activePlotLeadsList = (state.plotLeads || [])
      .filter((l: any) => l.status !== 'resolu')
      .map((l: any) => `- [${l.category.toUpperCase()}] ${l.title} (Stade: ${l.qualitativeStage})\n  - Indices: ${(l.clues || []).join(' | ')}\n  - Notes: ${l.notes || 'Aucune'}`)
      .join('\n');
      
    const activeRumorsList = (state.rumors || [])
      .map((r: any) => `- [RUMEUR ${r.credibility.toUpperCase()} - Quartier: ${r.district}] ${r.text} (Source: ${r.source})`)
      .join('\n');
      
    const recentMessagesList = (state.messages || [])
      .slice(0, 5)
      .map((m: any) => `- Message ${m.read ? "lu" : "NON LU"} de ${m.senderName}: "${m.preview}" (Options de réponse suggérées: ${(m.replyOptions || []).join(' | ')})`)
      .join('\n');

    // Bank Account and Finances Context
    const checking = state.bank?.checking ?? 0;
    const savings = state.bank?.savings ?? 0;
    const debts = state.bank?.debts ?? 0;
    const totalNetWorth = checking + savings - debts;
    const recentTransactionsList = (state.bank?.transactions || [])
      .slice(0, 4)
      .map(t => `- [${(t.category || 'transaction').toUpperCase()}] ${t.label}: ${t.amount > 0 ? '+' : ''}${t.amount}€ (${t.account === 'checking' ? 'Compte Courant' : t.account === 'savings' ? 'Épargne' : 'Dettes'})`)
      .join('\n');
    const recurringBillsList = (state.bank?.recurringBills || [])
      .map(b => `- ${b.name}: ${b.amount}€`)
      .join(', ');

    const actionLower = (action || '').toLowerCase();
    const isExplicitTaskEndIntent = (
      /(?:\[tâche\s+(?:achevée|terminée)\]|tâche\s+(?:achevée|terminée)|action\s+achevée|fin\s+de\s+tâche)/i.test(actionLower) ||
      (Boolean(state.currentTask) && /(?:j'ai\s+fini|j'ai\s+terminé|je\s+termine|je\s+finis|je\s+conclus|conclure|terminer\s+le\s+service|finir\s+le\s+shift|quitter\s+le\s+poste|partir\s+du\s+travail|rentrer\s+chez\s+moi|m'en\s+aller|je\s+m'en\s+vais|je\s+m'arrête|arrêter\s+la\s+tâche)/i.test(actionLower))
    );
    const isTaskCompletion = isExplicitTaskEndIntent;

    let taskContext = "";
    if (isTaskCompletion) {
      taskContext = `
🚨🚨🚨 TRANSITION CRITIQUE : CONCLUSION DE TÂCHE / ÉVÉNEMENT & RETOUR IMMÉDIAT EN MODE LIBRE 🚨🚨🚨
- L'action précédente est MAINTENANT 100% TERMINÉE.
- Le joueur N'EST PLUS dans cette tâche. Le temps imparti est écoulé.
- RÈGLES STRICTES DE RE-SWITCH VERS LA VIE LIBRE :
  1. 🛑 INTERDICTION ABSOLUE DE PROLONGER OU RECRÉER LA TÂCHE : 'durationMinutes' DOIT valoir 0 ou null. Ne mets AUCUN nouveau timer.
  2. 🚪 CONCLUSION CONCRÈTE & SORTIE : Décris la fin naturelle et concrète de l'activité (ex: essuyer ses mains, poser son tablier/ses outils, échanger les derniers mots de fin de service avec le responsable ou collègue, percevoir son salaire ou rémunération dans 'moneyImpact.checkingDelta' si c'était un travail rémunéré, franchir la porte pour SORTIR dans la rue au grand air).
  3. 🏙️ LIBERTÉ DE MOUVEMENT & AMBIANCE ACTUELLE : Décris l'endroit où se tient désormais le joueur (la rue animée de Saint-Michel, l'atmosphère de ${gameTimeInfo.timeStr}, la liberté d'action totale).
  4. 🎯 3 CHOIX 100% OUVERTS & INDÉPENDANTS :
     * Propose 3 initiatives variées de vie quotidienne et d'exploration libre (ex: "Aller manger un morceau chaud au bistrot", "Explorer les boutiques de la place", "Rentrer au studio pour se reposer", "Faire le point sur ses finances").
     * 🛑 INTERDICTION FORMELLE de proposer des sous-tâches du travail qui vient de s'achever !
`;
    } else if (state.currentTask) {
      const now = Date.now();
      const totalMins = Math.max(1, Math.round((state.currentTask.endTimeReal - state.currentTask.startTimeReal) / 60000));
      const elapsedMins = Math.max(0, Math.round((now - state.currentTask.startTimeReal) / 60000));
      const timeLeft = Math.max(0, Math.round((state.currentTask.endTimeReal - now) / 60000));
      const progressPercent = Math.min(100, Math.round((elapsedMins / totalMins) * 100));

      taskContext = `
🚨🚨🚨 ATTENTION : UNE ACTION LONGUE EST ACTUELLEMENT EN COURS D'EXÉCUTION 🚨🚨🚨
- Tâche en cours : "${state.currentTask.description}"
- Progression : ~${elapsedMins} min écoulées sur ~${totalMins} min (${progressPercent}%), temps restant estimé : ~${timeLeft} minutes.
- RÈGLES STRICTES ET NON-NÉGOCIABLES POUR CETTE RÉPONSE :
  1. 🛑 INTERDICTION ABSOLUE DE CRÉER UNE NOUVELLE TÂCHE :
     * Ne renvoie AUCUNE valeur pour 'durationMinutes' (laisser vide/null ou 0).
     * Ne remplace PAS l'intitulé en haut. Le joueur est déjà dans cette tâche.
  2. 🚫 COHÉRENCE SPATIO-TEMPORELLE & INTERDICTION D'ARRIVÉE PRÉMATURÉE :
     * S'il reste du temps significatif (> 1 minute restante) : IL EST STRICTEMENT INTERDIT d'annoncer l'arrivée à destination, de dire que le joueur voit la devanture de son but, ou de conclure prématurément l'action !
     * Décris le déroulement intermédiaire réel (la marche dans les rues intermédiaires de Saint-Michel, l'effort physique, un carrefour traversé, un sentiment, une difficulté rencontrée, une pensée).
  3. 🎯 NARRATION DÉDIÉE À L'ACTION EN COURS :
     * Le texte de narration DOIT décrire précisément l'étape actuelle ou la péripétie vécue AU CŒUR de "${state.currentTask.description}".
     * Reste sobre, factuel et centré sur l'action concrète.
     * Si l'action suit simplement son cours sans incident majeur, décris l'avancement calme et propose des choix cohérents pour continuer, accélérer ou faire une pause.
  4. 🎯 LES 3 CHOIX ('choices') DOIVENT ÊTRE STRICTEMENT DES SOUS-ACTIONS DE CETTE TÂCHE :
     * Chaque choix proposé doit être une façon concrète d'avancer, d'optimiser, de bâcler ou de peaufiner "${state.currentTask.description}".
     * INTERDIT de proposer de partir ailleurs ou de faire autre chose sans rapport !
  5. ⏱️ MODULATION DU TEMPS RESTANT ('taskTimeAdjustmentMinutes') :
     * Si le joueur ou le choix accélère / simplifie la tâche : utilise 'taskTimeAdjustmentMinutes' négatif (-5 à -20 minutes).
     * Si le joueur ou le choix soigne méticuleusement / fait une pause / peaufine chaque détail : utilise 'taskTimeAdjustmentMinutes' positif (+5 à +15 minutes).
     * Si le joueur décide d'abandonner ou d'interrompre l'action : 'taskTimeAdjustmentMinutes': -1000 avec des conséquences réelles et tangibles (voir règle 6 ci-dessous).
  6. 💥 CONSÉQUENCES RÉELLES EN CAS D'ABANDON OU INTERRUPTION PRÉMATURÉE :
     * Si le joueur décide d'arrêter prématurément une tâche essentielle (ex: essai professionnel/shift de travail annulé en cours de route, rendez-vous quitté brutalement, tâche bâclée) :
       - Dégrade fortement la relation avec le personnage concerné ('relationshipStatus': 'conflictuel' ou note critique dans 'notesAppend').
       - Applique un malus financier ('moneyImpact') ou moral ('vitalsImpact.mindset': -15 à -25, 'vitalsImpact.mood': -20).
       - Mets à jour l'engagement du personnage dans 'updatedCharacters' pour acter l'échec ou la déception.
`;
    } else {
      taskContext = `
- AUCUNE ACTION LONGUE EN COURS.
- RÈGLE DE DÉCLENCHEMENT DE TÂCHE LONGUE ('durationMinutes' & 'taskSummary') :
  * Ne déclenche une tâche avec durée ('durationMinutes' > 0) QUE pour les actions de fond qui prennent réellement du temps dans la vie réelle (ex: Dormir/Sieste [30 à 480 min], Rédiger un CV/dossier complexe [20 à 45 min], Effectuer un quart de travail/service [60 à 240 min], Faire une séance de sport/musculation [30 à 60 min], Grand trajet urbain [15 à 30 min], Grand nettoyage [30 à 60 min]).
  * Pour TOUTES les actions brèves, courantes, d'observation, de conversation rapide, de déplacement de proximité ou de prise de notes : NE METS PAS de 'durationMinutes' (laisser vide ou 0). Le jeu ne doit PAS bloquer le joueur avec des timers inutiles pour des actions anodines !
  * Si tu déclenches une tâche longue, 'taskSummary' doit être un titre très court de 3 à 5 mots (ex: "Rédaction du CV et lettres", "Trajet vers le centre", "Sommeil réparateur").
`;
    }
    const isAgendaIntent = 
      /(?:ajoute|noter?|inscrit?|inscrire|programm|planifi|enregistr|mettre|rajout|pose).*(?:agenda|calendrier|planning|rendez-vous|rdv|rappel|échéance|réunion|shift|cours|séance|point|entretien)/i.test(actionLower) ||
      /(?:agenda|calendrier|planning).*(?:ajoute|noter?|inscrit?|met|rajout|le\s+rdv|le\s+rendez|mon\s+rdv|mon\s+rendez)/i.test(actionLower) ||
      /(?:j'ajoute|j’ajoute|je\s+note|noter?|ajoute|ajouter|inscrire|enregistrer|planifier).*(?:rdv|rendez-vous|entretien|réunion|planning|agenda)/i.test(actionLower) ||
      /(?:noter|inscrire|ajouter|mettre).*(?:dans\s+l'agenda|dans\s+mon\s+agenda|à\s+l'agenda|à\s+mon\s+agenda)/i.test(actionLower) ||
      /(?:bloque|bloquer).*(?:créneau|date|heure|moment)/i.test(actionLower);

    let agendaPriorityInstruction = "";
    if (isAgendaIntent) {
      agendaPriorityInstruction = `
🚨 ACTION EXPLICITE D'AJOUT DANS L'AGENDA DÉTECTÉE : Le joueur demande d'ajouter ou planifier : "${action}".
TU DOIS OBLIGATOIREMENT :
1. Renseigner le tableau JSON 'newAgendaEvents' avec au moins un objet contenant 'title', 'description', 'dateGameStr' et 'category' ('rdv' | 'travail' | 'personnel' | 'finance' | 'urgent') et 'completed: false'.
2. Si le joueur dit simplement "j'ajoute le rendez-vous" ou similaire, retrouve dans l'historique récent le contexte exact du rendez-vous (avec quel personnage, pour quel motif, à quel endroit et quand) pour lui donner un titre précis et immersif (ex: 'Rendez-vous au café avec Léo').
3. Ne laisse JAMAIS 'newAgendaEvents' vide !
`;
    }

    const activePlotThreadsList = (state.activePlotHooks && state.activePlotHooks.length > 0)
      ? state.activePlotHooks.map(h => `• ${h}`).join('\n')
      : "• Intégration et découverte du quartier Saint-Michel\n• Projets professionnels et autonomie financière\n• Relations de voisinage et mystères locaux";

    const prompt = `
You are the master narrator and game director for an immersive life simulation RPG set on an Earth-like planet with a 36-hour day and slightly advanced tech.
The player interacts through free-form text actions or suggested choices.
${agendaPriorityInstruction}

🌍 DATE, HEURE EXACTE & CYCLE ATMOSPHÉRIQUE ACTUEL (JOURNÉE DE 36 HEURES SUR CETTE PLANÈTE) :
- Date calendaire précise : ${gameTimeInfo.fullDateStr} (Jour ${gameTimeInfo.dayNumber}) à ${gameTimeInfo.timeStr}
- Phase atmosphérique & Luminosité : ${gameTimeInfo.cyclePhase} (${gameTimeInfo.cycleSubtext})
- Description d'ambiance : ${gameTimeInfo.cycleDetails}

📅 FORMAT DES DATES POUR L'AGENDA ('newAgendaEvents.dateGameStr') :
- Renseigne TOUJOURS une date précise avec jour de la semaine, date calendaire (ex: "Mardi 02/01/2100 à 14:00", "Mercredi 03/01/2100 à 09:30", "Lundi 08/01/2100 à 10:00") ou une échéance claire ("Tous les lundis à 08:00").

📅 NOUVELLES FONCTIONNALITÉS ARCHIVISTES (INTÉGRATION DES INTRIGUES, RUMEURS ET MESSAGES) :
- Tu PEUX et DOIS générer ou mettre à jour des Pistes (newPlotLeads, updatedPlotLeads) si le joueur découvre un mystère, une offre d'emploi, ou débute une quête.
- Tu PEUX générer de nouvelles Rumeurs Urbaines (newRumors) si le joueur écoute aux portes, traîne dans un bar, ou capte des bruits de couloir.
- Tu PEUX simuler la réception de messages asynchrones (newMessages) provenant des PNJ connus sur le communicateur du joueur. Fais-le naturellement pour relancer l'intrigue.

⚠️ RÈGLES DE COHÉRENCE TEMPORELLE ABSOLUE & RESPECT DU TEMPS RÉEL (CYCLE DE 36 HEURES) :
1. ⏳ LE JEU S'ÉCOULE EN TEMPS RÉEL (1 MINUTE RÉELLE = 1 MINUTE IN-GAME) :
   - L'heure actuelle en jeu est STRICTEMENT : ${gameTimeInfo.timeStr} (Phase : ${gameTimeInfo.cyclePhase}).
   - 🛑 INTERDICTION ABSOLUE D'AVANCER LE TEMPS OU DE CONCLUS UNE ACTION DANS LE FUTUR INSTANTANÉMENT :
     * Quand le joueur dit "je fais du ménage", "je cuisine", "je lis un livre", "je travaille" ou "je marche vers le parc" : IL NE VIENT PAS DE PASSER 1 HEURE DANS LA SECONDE ! Tu dois décrire LE DÉBUT ou la mise en route concrète de l'action (prendre un chiffon, trier les premiers objets, sortir une casserole), déclencher une tâche longue ('durationMinutes': 30 ou 45, 'taskSummary': 'Grand ménage du studio') et LAISSER LE TEMPS RÉEL S'ÉCOULER.
     * 🛑 INTERDICTION FORMELLE d'écrire "Vous avez passé une heure à tout nettoyer, votre appartement brille..." en un seul message instantané !
   - 🛑 RESPECT SCRUPULEUX DES RENDEZ-VOUS ET ÉCHÉANCES DANS L'AGENDA :
     * Si le joueur a un rendez-vous à 10:00 (ou tout autre horaire futur) et que l'heure actuelle est ${gameTimeInfo.timeStr} (par exemple 08:30 ou 09:00) :
       - IL EST FORMELLEMENT INTERDIT de faire partir le joueur précipitamment pour son rendez-vous comme s'il était déjà l'heure !
       - S'il reste du temps (ex: 1 heure d'avance), constate que le rendez-vous n'est que plus tard, décris ce que le joueur fait pendant ce temps d'attente (préparer ses affaires posément, patienter, s'occuper chez lui), et propose des activités adaptées pour occuper ce créneau sans téléporter le joueur sur le lieu du rendez-vous !
2. AMBIANCE LUMINEUSE SELON L'HEURE (${gameTimeInfo.timeStr}) :
- De 05h00 à 09h59 : Aube naissante (matin frais, lever de soleil progressif, quartier qui s'éveille).
- De 10h00 à 15h59 : Matinée lumineuse (plein jour, commerces actifs, animation matinale).
- De 16h00 à 21h59 : Zénith solaire (milieu exact de la journée de 36 heures, soleil au plus haut, lumière vive).
- De 22h00 à 27h59 : Après-midi prolongé (lumière ambrée et dorée, longue après-midi étirée).
- De 28h00 à 31h59 : CRÉPUSCULE DORÉ / FIN DE JOURNÉE (coucher de soleil éclatant, ciel pourpre et orangé, allumage des réverbères, fraîcheur du soir tombant, ambiance de fin de journée / soirée. ATTENTION : CE N'EST EN AUCUN CAS LE MATIN ! Si l'heure est 29h ou 31h, c'est le crépuscule ou la soirée !).
- De 32h00 à 04h59 : NUIT PROFONDE / HEURES CALMES (obscurité, néons urbains, ciel étoilé, grand calme).

Current Player Context:
- DÉTECTION NATURELLE DU TEMPÉRAMENT : Déduis naturellement le tempérament, la tonalité et la posture du personnage à partir du style de ses messages, de ses choix et de son attitude dans ses dialogues et actions (aucun sélecteur manuel).
- Mode d'action autonome : ${state.autopilotMode || "normal"}
- Vitals (0-100, 100 is optimal): Energy ${state.vitals.energy}%, Hunger ${state.vitals.hunger}%, Hygiene ${state.vitals.hygiene}%, Mood ${state.vitals.mood}%, Mentalité ${state.vitals.mindset ?? 50}/100 (0 = Tendu, 50 = Équilibré, 100 = Serein).
- COMPÉTENCES DU JOUEUR :
${playerSkillsList || "- Cuisine : Niveau 1 (20/100)\n- Communication : Niveau 1 (30/100)\n- Bricolage : Niveau 1 (15/100)"}
- INVENTAIRE DU JOUEUR & APPARTEMENT (FRIGO & PLACARDS) :
  * Sur le personnage (poches, sac) :
${characterInventoryList}
  * Dans l'appartement (kitchenette, frigo, placards, salle de bain) :
${apartmentInventoryList}
- FINANCES DU JOUEUR (EURO €) - VALEURS CANONIQUES RÉELLES :
  * Compte Courant : ${checking}€ | Livret d'Épargne : ${savings}€ | Dettes : ${debts}€ (Patrimoine Net Total : ${totalNetWorth}€)
  * Dernières transactions :
${recentTransactionsList || "Aucune transaction récente."}
  * 🛑 RÈGLE NON-NÉGOCIABLE SUR LES SOLDES BANCAIRES :
    - Si le joueur consulte son solde, regarde son terminal bancaire ou vérifie ses comptes, TU DOIS CITER STRICTEMENT LES CHIFFRES RÉELS CI-DESSUS (Compte Courant : ${checking}€, Épargne : ${savings}€, Total : ${totalNetWorth}€).
    - IL EST STRICTEMENT INTERDIT d'inventer des chiffres fantaisistes (ex: 150€, 155€...) qui ne correspondent pas aux comptes réels !
- DIRECTEUR NARRATIF - ARCS D'ANTICIPATION & INTRIGUES EN COURS :
${activePlotThreadsList}

- PISTES D'ENQUÊTE & PROJETS ACTIFS DU JOUEUR (PLOT LEADS) :
${activePlotLeadsList || "Aucune piste ou projet structuré en cours."}

- RUMEURS LOCALES ENTENDUES :
${activeRumorsList || "Aucune rumeur locale majeure."}

- MESSAGERIE COMMUNICATEUR (MESSAGES RÉCENTS) :
${recentMessagesList || "Aucun message récent."}

- REPERTOIRE CANONIQUE DES PERSONNAGES CONNUS (TOUJOURS RÉUTILISER SANS CRÉER DE DOUBLONS) :
${canonicalCharactersList}
- REPERTOIRE CANONIQUE DES LIEUX CONNUS (TOUJOURS RÉUTILISER SANS CRÉER DE DOUBLONS) :
${canonicalLocationsList}
- MÉMOIRE ÉPISODIQUE RETROUVÉE (RAG VECTORIEL / SOUVENIRS PERTINENTS DE SCÈNES PASSÉES) :
${retrievedMemoriesList}
- JALONS DU JOURNAL INTIME & SOUVENIRS DU PERSONNAGE :
${milestonesList || "Début d'installation dans la cité."}
- Agenda & Événements à venir:
${upcomingAgendaList || "Aucun événement prévu dans l'agenda."}
${taskContext}
- HISTORIQUE NARRATIF COMPLET (ACTIONS & RÉPONSES PRÉCÉDENTES) :
${recentHistory}

The player attempts to do: "${action}"

CRITICAL NARRATIVE & SYSTEM RULES:
1. DANGEROUS ACTIONS: If the action is extremely dangerous, illegal, or fatal, and 'force' is false (current force: ${force}), set 'isDangerous': true and write a clear 'dangerWarning'. Do not provide narrative or impacts.

2. DYNAMISME NARRATIF, IMMERSION QUOTIDIENNE & RESPECT DU TON RÉALISTE :
   - Écris la 'narrative' en français vivant, sobre, percutant et incarné à la 2e personne ("Vous...").
   - 🛑 INTERDICTION ABSOLUE DES CLIFFHANGERS FORCÉS & SUSPENSE ARTIFICIEL :
     * Quand le joueur effectue une action calme ou ordinaire (rédiger son CV, cuisiner, manger, faire ses comptes, faire le ménage, se reposer, marcher tranquillement, regarder son terminal) :
       ❌ NE JAMAIS INVENTER de pas suspects qui s'arrêtent devant la porte, de bruits de clochette angoissants, de silhouettes menaçantes, de coups violents ou d'intrusions soudaines !
       ❌ Ces faux rebondissements systématiques brisent la cohérence et l'immersion.
     * Conclus simplement et logiquement l'étape en cours avec un détail concret (ex: la mise en page du CV prête à l'envoi, l'odeur réconfortante de l'omelette dorée à point dans l'assiette, le calme du studio).
   - 🎣 RELANCE NATURELLE (PAS DE SURJEU) :
     * La fin de chaque message doit simplement ouvrir sur la suite logique de la vie du joueur :
       ✅ Un interlocuteur qui attend sa réponse dans un dialogue.
       ✅ La possibilité de passer à l'étape suivante (ex: poster la candidature, déguster son plat, sortir).
       ✅ Un détail sensoriel ordinaire du quartier ou de l'appartement.
   - ⚡ PROGRESSION DRAMATIQUE & MICRO-ÉVÉNEMENTS :
     * 🛑 INTERDICTION DU SURPLACE : Ne répète jamais ce qui vient d'être dit sans apporter du neuf. Introduis de la personnalité, de l'humour, des anecdotes insolites de la cité ou des pistes d'aventure LORSQUE cela fait sens dans le contexte.
   - 🚫 INTERDICTION FORMELLE DE PARLER DE L'HEURE NUMÉRIQUE DANS LA NARRATION :
     * Ne mentionne JAMAIS l'heure chiffrée (ex: "Il est 14h00", "L'horloge indique 28:00", "À 10h15...") dans le texte narratif.
   - 🚫 INTERDICTION DE LA REDONDANCE SUR LA LUMIÈRE & LA CLARTÉ :
     * Ne parle PAS de la lumière, de la clarté, des reflets solaires ou du ciel à chaque message ! Concentre-toi sur l'action physique, les dialogues, les bruits environnants, les sensations corporelles, les odeurs et les enjeux.
   - 🚫 INTERDICTION ABSOLUE DES QUESTIONS MÉTA DU MAÎTRE DU JEU :
     * Ne JAMAIS terminer la narration par des questions méta ("Que faites-vous maintenant ?", "Que décidez-vous ?"). Termine TOUJOURS dans la scène vivante !
   - Propose 3 choix variés ('choices') avec du relief (des attitudes différentes : audacieux, prudent, curieux, pragmatique).

3. GESTION DES TÂCHES LONGUES, SOUS-ACTIONS & TEMPS RÉEL ('durationMinutes', 'taskSummary', 'taskTimeAdjustmentMinutes') :
   - Quand AUCUNE tâche n'est en cours :
     * Déclenche une tâche longue ('durationMinutes') pour TOUTE action qui s'étale dans la durée (ménage, cuisine élaborée, sommeil, travail, rédaction, marche vers un lieu éloigné, bricolage, lecture soutenue).
     * 🛑 DÉBUT D'ACTION & INTERDICTION FORMELLE D'AUTO-COMPLÉTION IMMÉDIATE :
       - Lorsque le joueur lance une action qui demande du temps (ex: "faire du ménage", "cuisiner", "travailler"), la narration DOIT raconter l'ENTAME ou la première étape (ex: attraper l'éponge et ranger la table basse, allumer le réchaud, enfiler son tablier).
       - IL EST FORMELLEMENT INTERDIT de décrire l'action terminée (ex: "Vous avez récuré tout l'appartement de fond en comble et il est impeccable") dès le premier message ! L'action vient tout juste de commencer, elle prendra sa durée en temps réel.
     * Renseigne 'taskSummary' avec un RÉSUMÉ CONCIS de 3 à 5 mots (ex: "Ménage et rangement du studio", "Rédaction du CV et des lettres", "Sommeil réparateur", "Service au restaurant").
     * Pour les actions ordinaires ou brèves (regarder, parler, boire un verre d'eau, examiner un objet, consultation rapide) : 'durationMinutes' doit rester vide ou 0.
   - Quand une tâche est DÉJÀ en cours :
     * 'durationMinutes' DOIT IMPÉRATIVEMENT RESTER VIDE / 0.
     * La narration DOIT rester au cœur de la tâche en cours (décrire l'avancée concrète, le ressenti, l'effort, un détail intermédiaire).
     * Les 3 choix ('choices') DOIVENT être des sous-actions concrètes de CETTE tâche (ex: standardiser pour aller vite, soigner les détails, faire une courte pause, accélérer).
     * Utilise 'taskTimeAdjustmentMinutes' pour raccourcir (ex: -5 à -15 min) ou allonger (ex: +5 à +15 min) la durée restante selon la démarche du joueur.
     * 🛑 S'il reste du temps sur la tâche, NE CONCLUE PAS la tâche. La conclusion n'interviendra que lorsque le timer atteindra 0 ou que le joueur décidera explicitement d'abandonner.

4. ÉQUILIBRE DES BESOINS VITAUX & ÉNERGIE (CALIBRATION PLANÉTAIRE DU CYCLE DE 36 HEURES) :
   - ⚡ ÉNERGIE ('vitalsImpact.energy') :
     * ⚠️ RAPPEL FONDAMENTAL : Une journée dure 36 HEURES dans cette simulation. Une vie humaine active doit pouvoir tenir environ 24 à 28 heures éveillée sans s'effondrer !
     * Pour une heure ou deux d'activité ordinaire, de marche ou de travail normal : l'énergie ne doit baisser que de -2 à -4 par heure de travail (ex: 2h de travail = -5 à -8 énergie MAX, PAS -30 ou -50 !).
     * 🛑 INTERDICTION D'ÉPUISER LE JOUEUR EN DÉBUT DE JOURNÉE : Un joueur qui commence sa journée à 08h00 et travaille 2 heures ne doit PAS se retrouver avec une batterie vide ou dans le rouge à 10h00 ! Il doit lui rester 85-92% d'énergie.
     * Pour les travaux physiques très intenses ou épuisants : -8 à -15 énergie.
     * Pour le sommeil/repos : 'durationMinutes' (ex: 360 à 480 min pour une nuit réparatrice) restaure l'énergie (+50 à +90).
   - 🍽️ ALIMENTATION & FAIM ('vitalsImpact.hunger') :
     * La faim baisse modérément avec le temps (-2 à -5 par tranche de quelques heures).
     * 🥪 Collation / Encas rapide / Pomme / Boisson / Encas sur le pouce : 'vitalsImpact.hunger': +25 à +35.
     * 🍝 Repas classique / Déjeuner / Dîner / Assiette complète / Manger normalement : 'vitalsImpact.hunger': +55 à +75.
     * 🍖 Festin / Grand banquet / Manger copieusement / Se caler le ventre : 'vitalsImpact.hunger': +85 à +100.
   - 🚿 HYGIÈNE ('vitalsImpact.hygiene') :
     * Décroissance douce (-1 à -3 par heure de travail ou marche).
     * Douche / Toilette complète : +70 à +100.
   - 🧠 MENTALITÉ RÉALISTE ('vitalsImpact.mindset') (0 = Tendu/Accablé, 50 = Équilibré/Neutre, 100 = Pleinement à l'aise/Serein) :
     * 🛑 INTERDICTION DE DONNER DES GAINS DE MENTALITÉ FACILES : Dans la vraie vie, un simple geste anodin ne fait PAS grimper la mentalité.
     * Pour les actions ordinaires ou de routine : 'vitalsImpact.mindset': 0 (ne change rien).
     * Les gains (+5 à +12) sont réservés aux VRAIS accomplissements.
     * Les baisses (-5 à -20) doivent survenir dès qu'il y a du stress, de la frustration, un imprévu désagréable, un refus, un échec, un conflit.
   - Pour les boissons stimulantes (café, thé) : 'vitalsImpact.energy': +4 à +8, 'vitalsImpact.mood': +3 à +8 (mentalité inchangée ou +1 max).

5. AGENDA & FORMAT DE DATE ABSOLU ('newAgendaEvents', 'updatedAgendaEvents') - 🚫 STRICTEMENT AUCUN "DEMAIN" :
   - Date actuelle : Jour ${gameTimeInfo.dayNumber} à ${gameTimeInfo.timeStr}.
   - 🚫 INTERDICTION FORMELLE DE TERMES RELATIFS ("demain", "ce soir", "hier", "dans deux jours") dans 'dateGameStr' !
   - 'dateGameStr' DOIT TOUJOURS ÊTRE AU FORMAT ABSOLU ET PRÉCIS :
     * Si l'événement a lieu plus tard durant ce même cycle : "Jour ${gameTimeInfo.dayNumber} à [HH:MM]" (ex: "Jour ${gameTimeInfo.dayNumber} à 26:30").
     * Si l'événement est pour le cycle suivant (le lendemain) : "Jour ${gameTimeInfo.dayNumber + 1} à [HH:MM]" (ex: "Jour ${gameTimeInfo.dayNumber + 1} à 11:00").
     * Si dans deux cycles : "Jour ${gameTimeInfo.dayNumber + 2} à [HH:MM]".
   - Dès que le joueur demande d'ajouter/noter un événement OU qu'un PNJ fixe un rendez-vous futur :
     * Renseigne 'newAgendaEvents' avec un id unique, un title clair, une description, un dateGameStr absolu, une category ('rdv' | 'travail' | 'personnel' | 'finance' | 'urgent') et 'completed: false'.

6. FICHES PERSONNAGES VIVANTES, ÉVOLUTIVES & SYNCHRONISÉES ('newCharacters', 'updatedCharacters') :
   - 🚫 ANTI-DOUBLONS : Si un personnage existe déjà dans le répertoire canonique ci-dessus, NE LE RECRÉE PAS ! Mets-le à jour dans 'updatedCharacters'.
   - 📝 CRÉATION OBLIGATOIRE : Dès qu'un nouveau personnage intervient (nommé, parlé, rencontré, commerçant ou passant régulier), TU DOIS OBLIGATOIREMENT créer sa fiche complète dans 'newCharacters' avec TOUS ses champs ('id', 'name', 'locationEncountered', 'relationshipStatus', 'age', 'appearance', 'occupation', 'background', 'notes'). Ne laisse AUCUN champ vide !
   - 🤝 ÉVOLUTION SYSTÉMATIQUE DES RELATIONS & PROMESSES ('pendingItems', 'notesAppend', 'upcomingEvents') :
     * Dès qu'un personnage propose de vous aider (ex: un voisin qui promet d'envoyer votre CV à des contacts, un ami qui se renseigne pour un logement), qu'un service est convenu, qu'une promesse est faite ou qu'un engagement est pris : TU DOIS OBLIGATOIREMENT mettre à jour sa fiche dans 'updatedCharacters' !
     * Ajoute concrètement l'action dans 'pendingItems' (ex: ["Transmettre le CV de mon voisin à ses contacts de la station", "Faire un retour sur les candidatures"]) et consigne le détail dans 'notesAppend' (ex: "A accepté de transmettre mon profil/CV à ses connaissances professionnelles.").
     * Le joueur doit pouvoir ouvrir le Dossier Personnages et voir immédiatement ce que chaque PNJ fait ou doit faire !
   - 💼 MÉMOIRE DES CONTRATS & ACCORDS SALARIAUX ('financialRelation', 'notesAppend') :
     * Dès qu'un accord salarial, une rémunération convenue (ex: "250€ par semaine + prime d'intéressement"), un contrat de travail, un loyer, un prêt ou un arrangement financier est négocié avec un PNJ : TU DOIS OBLIGATOIREMENT le consigner dans le champ 'financialRelation' de sa fiche (ex: "Employeur : 250€ / semaine + prime d'intéressement sur performances") et dans 'notesAppend' !
     * Cette mémoire est perpétuelle et servira de base de calcul pour tous vos futurs versements et bilans de performance.
   - 📅 ENGAGEMENTS & RENDEZ-VOUS SYNCHRONISÉS ('pendingItems', 'upcomingEvents') :
     * Dès qu'un personnage vous demande un service, propose un arrangement ou que vous avez une affaire en cours avec lui : renseigne/mets à jour 'pendingItems' (ex: ["Livrer le colis à la boutique", "Rembourser les 50€ avancés", "Valider la première semaine pour prime"]).
     * Dès qu'un rendez-vous ou shift de travail est convenu : renseigne/mets à jour 'upcomingEvents' (ex: ["Service au restaurant Jour 2 à 10:00", "Bilan de fin de semaine"]) ET crée simultanément l'événement dans 'newAgendaEvents' !
     * Lorsque l'événement a eu lieu ou que l'engagement est honoré/annulé, retire-le de 'pendingItems' / 'upcomingEvents' et mets à jour 'updatedAgendaEvents' ('completed: true') !
   - 📖 JALONS DE VIE & JOURNAL INTIME ('diaryEntry') :
     * Pour tout événement marquant (négociation salariale réussie, nouveau job, première paie, rencontre décisive, emménagement), génère TOUJOURS une entrée de journal intime 'diaryEntry' avec 'milestone: true', un titre valorisant et une réflexion personnelle sur cet accomplissement !

7. FICHES LIEUX DÉTAILLÉES ('newLocations', 'updatedLocations') :
   - Dès qu'un nouveau lieu marquant est découvert ou visité, crée sa fiche complète dans 'newLocations' ('id', 'name', 'category', 'district', 'description', 'keyFeatures', 'associatedCharacters', 'notes').

8. GESTION DE L'INVENTAIRE & CUISINE / CONSOMMATION ('inventoryUpdates') :
   - 🍳 RÈGLE ABSOLUE SUR LA CUISINE & REPAS À L'APPARTEMENT :
     * 🛑 IL EST STRICTEMENT INTERDIT de préparer un plat, cuisiner ou manger à la maison si le joueur n'a PAS les ingrédients requis dans l'inventaire de l'appartement (frigo/placards) ou sur lui !
     * Si le joueur veut cuisiner (ex: faire des pâtes, une omelette, un café) et que les ingrédients sont présents :
       - Décris la préparation, applique 'vitalsImpact.hunger' / 'vitalsImpact.energy', améliore la compétence Cuisine dans 'skillsImpact'.
       - ⚡ DÉDUIS PRÉCISÉMENT LE NOMBRE EXACT D'UNITÉS CONSOMMÉES DANS 'inventoryUpdates' :
         * Si le joueur demande une omelette de 4 œufs : déduis 'quantityDelta: -4' sur l'élément des œufs.
         * Si le joueur demande 2 œufs : déduis 'quantityDelta: -2'.
         * Si le joueur demande 3 tranches de pain : déduis 'quantityDelta: -3'.
         * Ne mets JAMAIS une valeur générique de -1 ou -2 si le joueur a expressément précisé un nombre !
     * Si le joueur veut cuisiner alors que le frigo/placards sont vides ou qu'il manque d'ingrédients essentiels : la narration DOIT constater que les placards/frigo sont vides, proposer d'aller faire des courses au supermarché ou manger dehors, et NE PAS augmenter la satiété !
   - 🛒 ACHATS & RÉCUPÉRATION D'OBJETS :
     * Dès que le joueur fait des courses, achète des vivres, trouve ou reçoit un objet, une clé ou un outil :
       - Déduis l'argent dans 'moneyImpact.checkingDelta'.
       - Ajoute les articles dans 'inventoryUpdates' avec 'quantityDelta: +X', 'location': 'personnage' (ou 'appartement' si livré/rangé), 'category', 'freshness', etc.
   - 🧺 RANGEMENT & DÉPLACEMENT D'OBJETS :
     * Si le joueur dépose des courses dans son frigo ou prend un objet pour sortir, effectue les 'inventoryUpdates' adéquats (ex: -1 sur 'personnage', +1 dans 'appartement').

9. COMPÉTENCES & FINANCES (EURO € EXCLUSIF & SYNCHRONISATION BANCAIRE OBLIGATOIRE) :
   - 💶 DEVISE CANONIQUE DU MONDE = L'EURO (€) EXCLUSIVEMENT :
     * 🛑 INTERDICTION FORMELLE d'utiliser les mots "crédit", "crédits", "crédits solaires", "unités" ou toute devise spatiale de science-fiction.
     * Dans cette simulation, la monnaie est STRICTEMENT l'Euro (€). Tous les prix, salaires, rémunérations, courses et pourboires sont exprimés en Euros (€).
   - 💰 SYNCHRONISATION DU COMPTE EN BANQUE ('moneyImpact') :
     * Dès qu'un personnage donne, paie, verse ou remet une somme d'argent au joueur (ex: salaire de 50€, pourboire de 10€, remboursement, gain de mission) : TU DOIS OBLIGATOIREMENT renseigner 'moneyImpact': { 'checkingDelta': +montant, 'reason': 'Rémunération de travail' (ou motif précis) }.
     * Dès que le joueur paie, achète, consomme ou règle une dépense (ex: café à 3€, repas à 18€, courses à 35€) : TU DOIS OBLIGATOIREMENT renseigner 'moneyImpact': { 'checkingDelta': -montant, 'reason': 'Achat...' }.
   - Actions faisant appel à un savoir-faire : renseigne 'skillsImpact' avec 'practicePointsDelta' (+5 à +15 points).

10. GESTION DU TEMPS & PROGRESSION RÉELLE :
    - Pour les actions longues ou soutenues (sommeil, travail, grand trajet, cuisine, grand ménage) : renseigne 'durationMinutes' et décris uniquement la première étape / mise en route. Le joueur vivra le reste de l'action au fil du temps réel.
    - Pour les actions brèves ou instantanées (regarder, poser une question, ouvrir un tiroir, boire un verre) : ne mets pas de durée ('durationMinutes' vide ou 0).

11. SYNCHRONISATION ARCHIVES, PISTES & RUMEURS, ET COMMUNICATEUR ('newPlotLeads', 'newRumors', 'newMessages', 'newAgendaEvents') :
    - 🕵️ INTRIGUES, OFFRES CLANDESTINES & PISTES : Dès qu'une proposition de mission, un message anonyme, une rumeur urbaine ou un secret est évoqué, TU DOIS OBLIGATOIREMENT créer ou mettre à jour la piste dans 'newPlotLeads' ou 'newRumors'.
    - 📱 COMMUNICATEUR : Dès qu'un message ou SMS arrive sur le communicateur du joueur, renseigne 'newMessages' avec l'expéditeur, le contenu et des options de réponse.
    - 📅 RENDEZ-VOUS : Dès qu'un point de rencontre ou une heure de rendez-vous est mentionné, inscris immédiatement l'événement dans 'newAgendaEvents' avec l'heure calculée !

12. Output in strictly valid JSON matching the schema.
    `;

    let responseText = "";
    try {
      const response = await generateWithModelFallback(prompt, actionResponseSchema, 0.7);
      responseText = response.text || '{}';
    } catch (genError) {
      console.error("Gemini model fallback error:", genError);
      return res.json({
        isDangerous: false,
        narrative: `Vous poursuivez votre action ("${action}"). Un mouvement attire votre regard dans la rue tandis qu'un voisin vous adresse un signe de tête engageant.`,
        choices: [
          "Lui répondre et engager la conversation",
          "Vérifier vos affaires et vos notes",
          "Consulter votre agenda"
        ]
      });
    }

    let data = safeParseActionResponse(responseText, action);

    if (!data.isDangerous && !data.narrative) {
      data.narrative = "Vous accomplissez votre geste avec attention, prêt à enchaîner sur la suite.";
    }
    if (!data.choices || data.choices.length === 0) {
      data.choices = ["Prendre un instant pour observer les environs.", "Consulter votre agenda et vos notes.", "Passer à l'action."];
    }

    // Clean up any stray robotic GM meta-questions if the model accidentally included one
    if (data.narrative && !data.isDangerous) {
      data.narrative = data.narrative
        .replace(/\s*(?:Que\s+(?:faites|décidez|voulez|souhaitez)-vous\s*(?:maintenant|à\s+présent)?\s*\??)/gi, '')
        .replace(/\s*(?:Quelle\s+sera\s+votre\s+prochaine\s+initiative\s*\??)/gi, '')
        .replace(/\s*(?:Comment\s+comptez-vous\s+(?:réagir|procéder)\s*\??)/gi, '')
        .replace(/(\d+)\s*(?:crédits?|crédits?\s+solaires?)/gi, '$1 €')
        .replace(/(?:des|les|quelques)\s+crédits?\b/gi, 'des euros')
        .replace(/\bcrédits?\b/gi, 'euros')
        .trim();
    }

    if (data.diaryEntry?.content) {
      data.diaryEntry.content = data.diaryEntry.content
        .replace(/(\d+)\s*(?:crédits?|crédits?\s+solaires?)/gi, '$1 €')
        .replace(/\bcrédits?\b/gi, 'euros');
    }

    // Automatic Narrative-to-Bank Financial Bridge:
    // If the narrative describes money changing hands (salary, wage, advance, payment, purchase)
    // but the model forgot to populate moneyImpact.checkingDelta, automatically capture and apply it!
    if (!data.moneyImpact || (data.moneyImpact.checkingDelta === 0 && !data.moneyImpact.savingsDelta && !data.moneyImpact.debtsDelta)) {
      const narText = data.narrative || '';
      
      // Check for income / wage / salary / advance / cash given to player
      const advanceRegex = /(?:(\d+(?:[.,]\d+)?)\s*(?:€|euros?)\s*(?:d'avance|d'acompte|d'avance\s+sur\s+salaire|de\s+(?:votre\s+)?(?:première\s+)?avance|d'acompte\s+convenu)|(?:avance|acompte|première\s+avance|paie|salaire)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|euros?))/i;
      const advanceMatch = narText.match(advanceRegex) || actionLower.match(advanceRegex);

      const incomeRegex = /(?:paie|payé|donne|rémunér|versé?|reçoit|reçois|reçu|gagné?|poche|glisse|tend|remet)\s+(?:une\s+somme\s+de\s+|un\s+billet\s+de\s+|la\s+somme\s+de\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i;
      const incomeMatch = narText.match(incomeRegex);
      
      if (advanceMatch) {
        const rawVal = parseFloat((advanceMatch[1] || advanceMatch[2]).replace(',', '.'));
        if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 10000) {
          data.moneyImpact = {
            checkingDelta: Math.round(rawVal),
            reason: "Avance sur salaire"
          };
        }
      } else if (incomeMatch) {
        const rawVal = parseFloat(incomeMatch[1].replace(',', '.'));
        if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 10000) {
          data.moneyImpact = {
            checkingDelta: Math.round(rawVal),
            reason: isTaskCompletion || /travail|employeur|patron|service|shift|mission|boulot/i.test(actionLower + ' ' + narText)
              ? "Rémunération de travail"
              : "Somme reçue"
          };
        }
      } else {
        // Check for expense / payment made by player
        const expenseRegex = /(?:payez|achetez|réglez|dépensez|déboursez|coûte|facturé|addition\s+de)\s+(?:la\s+somme\s+de\s+|un\s+total\s+de\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i;
        const expenseMatch = narText.match(expenseRegex);
        if (expenseMatch) {
          const rawVal = parseFloat(expenseMatch[1].replace(',', '.'));
          if (!isNaN(rawVal) && rawVal > 0 && rawVal <= 10000) {
            data.moneyImpact = {
              checkingDelta: -Math.round(rawVal),
              reason: "Dépense effectuée"
            };
          }
        }
      }
    }

    // Sanitize any hallucinated bank balance in narrative to strictly match actual player bank state
    if (data.narrative) {
      const resultingChecking = checking + (data.moneyImpact?.checkingDelta || 0);
      const resultingSavings = savings + (data.moneyImpact?.savingsDelta || 0);
      const resultingTotal = totalNetWorth + (data.moneyImpact?.checkingDelta || 0) + (data.moneyImpact?.savingsDelta || 0);

      data.narrative = data.narrative
        .replace(/(?:portant\s+le\s+solde\s+(?:à|de)\s*|solde\s+(?:actuel\s+)?(?:à|de)\s*|vous\s+disposez\s+(?:désormais\s+)?de\s*|vous\s+avez\s+(?:désormais\s+)?)\d+(?:[.,]\d+)?\s*(?:€|euros?)/gi, (match) => {
          if (/solde/i.test(match)) {
            return `solde du compte courant de ${resultingChecking} €`;
          }
          if (/disposez|avez/i.test(match)) {
            return `vous disposez désormais de ${resultingChecking} € sur votre compte courant`;
          }
          return `${resultingChecking} €`;
        });
    }

    // Backend Safety Guard for Vitals:
    if (!data.vitalsImpact) {
      data.vitalsImpact = {};
    }

    const combinedActionAndNarrative = (actionLower + ' ' + (data.narrative || '')).toLowerCase();
    const isEating = /(mang|repas|dîn|déjeun|petit-d|nourri|aliment|snack|sandwich|croissant|pain|boir|café|thé|plat|cuisin|restau|bistrot|goût|festin|estomac|oeuf|œuf|omelette|pâte|pasta|spaghetti|tartine|fromage|viande|soupe|salade|délicieu|avaler|dégust|savoure)/i.test(combinedActionAndNarrative) ||
      Boolean(data.inventoryUpdates && data.inventoryUpdates.some(u => (u.quantityDelta || 0) < 0 && /(nourriture|aliment|consommable|divers)/i.test(u.category || '')));
    const isSleeping = /(dorm|sommeil|siest|repos|couch|lit|nuit|m'endorm|m’endorm)/i.test(combinedActionAndNarrative);
    const isWashing = /(douch|lav|bain|toilet|savon|bross)/i.test(combinedActionAndNarrative);

    if (data.vitalsImpact.hunger && data.vitalsImpact.hunger > 0 && !isEating) {
      data.vitalsImpact.hunger = 0;
    }
    if (data.vitalsImpact.energy && data.vitalsImpact.energy > 0 && !isSleeping) {
      data.vitalsImpact.energy = 0;
    }
    if (data.vitalsImpact.hygiene && data.vitalsImpact.hygiene > 0 && !isWashing) {
      data.vitalsImpact.hygiene = 0;
    }

    // Safety guard against excessive energy drain during short daytime activities (36-hour planetary scale)
    if (data.vitalsImpact.energy && data.vitalsImpact.energy < 0 && !isSleeping) {
      // In a 36-hour day, standard 1-2h daytime actions should not drain more than 10-15 energy at once
      const isExtremeExertion = /(marathon|déménagement\s+lourd|chantier\s+éreintant|combat\s+acharné|creuser\s+toute\s+la\s+journée)/i.test(actionLower);
      if (!isExtremeExertion) {
        data.vitalsImpact.energy = Math.max(data.vitalsImpact.energy, -12);
      }
    }

    // Dynamic hunger scaling based on user eating phrasing
    if (isEating) {
      const isFeast = /(festin|remplir\s+(?:l'|mon\s+)?estomac|cal(?:er|é)\s+(?:l'|le\s+|mon\s+)?ventre|gargantuesque|copieu|banquet|mange\s+beaucoup|n'en\s+plus\s+pouvoir|rassasi)/i.test(combinedActionAndNarrative);
      const isQuickSnack = /(rapide|vite|croque|sur\s+le\s+pouce|grignot|petite?\s+faim|encas|collation|biscuit|pomme|pain\s+seul|café|thé)/i.test(combinedActionAndNarrative);

      if (isFeast) {
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, 95);
        data.vitalsImpact.mood = Math.max(data.vitalsImpact.mood || 0, 10);
      } else if (isQuickSnack) {
        data.vitalsImpact.hunger = Math.min(Math.max(data.vitalsImpact.hunger || 25, 20), 35);
      } else {
        // Standard meal (omelette, pasta, dish)
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, 65);
        data.vitalsImpact.mood = Math.max(data.vitalsImpact.mood || 0, 5);
      }
    }

    // Post-process Agenda Events to ensure absolute date format (No "demain", strict Day+1 resolution, Named Days of week)
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const isTomorrowRequested = /demain|lendemain|prochain\s+cycle|matin\s+suivant|commencer\s+ma\s+période\s+d'essai\s+demain|commence\s+demain/i.test(actionLower);
    const isMorningRequested = /matin|matinée|début\s+de\s+journée|début\s+de\s+demain/i.test(actionLower);

    const getFormattedAgendaDate = (targetDay: number, timeStr: string) => {
      const dayName = daysOfWeek[(targetDay - 1) % 7] || `Jour ${targetDay}`;
      return `${dayName} à ${timeStr} (Jour ${targetDay})`;
    };

    if (data.newAgendaEvents && data.newAgendaEvents.length > 0) {
      data.newAgendaEvents.forEach(ev => {
        const timeMatch = (ev.dateGameStr || '').match(/(\d{1,2}[h:]\d{2}|\d{1,2}h|\d{1,2}:\d{2})/i);
        const timePart = timeMatch ? timeMatch[1].replace('h', ':') : (isMorningRequested ? '08:00' : '14:00');
        const formattedTime = timePart.includes(':') 
          ? (timePart.split(':')[0].padStart(2, '0') + ':' + timePart.split(':')[1].padEnd(2, '0')) 
          : (timePart.padStart(2, '0') + ':00');

        const targetDay = (!ev.dateGameStr || /demain|lendemain/i.test(ev.dateGameStr) || isTomorrowRequested)
          ? gameTimeInfo.dayNumber + 1
          : (/jour\s+(\d+)/i.test(ev.dateGameStr || '') 
              ? parseInt((ev.dateGameStr || '').match(/jour\s+(\d+)/i)![1], 10) 
              : gameTimeInfo.dayNumber);

        ev.dateGameStr = getFormattedAgendaDate(targetDay, formattedTime);
      });
    }

    // Robust Fallback for Agenda Events:
    // If the player intended to add an agenda event or if narrative indicates an agenda event was scheduled,
    // ensure newAgendaEvents is populated so the Agenda screen updates reliably!
    if ((!data.newAgendaEvents || data.newAgendaEvents.length === 0) && (isAgendaIntent || /(?:ajoute|inscrit|noté|enregistré|programmé).*(?:agenda|calendrier|planning)/i.test(data.narrative || ''))) {
      let eventTitle = "Rendez-vous convenu";
      let eventDesc = `Planifié suite à votre demande ("${action}")`;
      const fallbackTargetDay = isTomorrowRequested ? gameTimeInfo.dayNumber + 1 : gameTimeInfo.dayNumber;
      const fallbackTime = isMorningRequested ? "08:00" : "14:00";
      let eventDate = getFormattedAgendaDate(fallbackTargetDay, fallbackTime);
      let category: 'rdv' | 'travail' | 'personnel' | 'finance' | 'urgent' = 'rdv';

      // Inspect recent history for context
      const histText = state.narrativeHistory.slice(-4).map(h => h.content).join(' ');
      
      if (/léo|voisin/i.test(actionLower) || /léo|voisin/i.test(histText)) {
        eventTitle = "Rendez-vous avec Léo";
        eventDesc = "Point amical / échange avec votre voisin de palier Léo.";
        category = 'rdv';
      } else if (/banqu|crédit|prêt|conseiller|loyer|financ/i.test(actionLower) || /banqu|conseiller|loyer/i.test(histText)) {
        eventTitle = "Point financier à la banque";
        eventDesc = "Entretien pour faire le point sur les comptes et finances.";
        category = 'finance';
      } else if (/travail|job|embauche|entretien|boulot|mission|réunion|période\s+d'essai|commence/i.test(actionLower) || /embauche|entretien|boulot|période\s+d'essai/i.test(histText)) {
        eventTitle = "Premier jour de travail (Période d'essai)";
        eventDesc = "Début de votre période d'essai chez votre employeur (250 €/semaine + prime d'intéressement).";
        category = 'travail';
      } else if (/café|bistrot|resto|déjeuner|dîner/i.test(actionLower) || /café|bistrot/i.test(histText)) {
        eventTitle = "Rencontre au Café Saint-Michel";
        eventDesc = "Moment convivial au bistrot du quartier.";
        category = 'rdv';
      } else {
        const matchTitle = action.match(/(?:ajoute|noter?|inscrit?|programme|planifie|mettre)\s+(?:à\s+mon\s+agenda\s+|dans\s+l'agenda\s+|dans\s+mon\s+agenda\s+)?(?:le\s+|un\s+|mon\s+|ce\s+)?([^.,;!?]+)/i);
        if (matchTitle && matchTitle[1]) {
          const clean = matchTitle[1].replace(/à\s+mon\s+agenda/i, '').replace(/dans\s+l'agenda/i, '').replace(/dans\s+mon\s+agenda/i, '').trim();
          if (clean.length > 2 && clean.length < 50) {
            eventTitle = clean.charAt(0).toUpperCase() + clean.slice(1);
          }
        }
      }

      data.newAgendaEvents = [
        {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          title: eventTitle,
          description: eventDesc,
          dateGameStr: eventDate,
          category: category,
          completed: false
        }
      ];
    }

    // Auto-bridge: If a character was created or updated with upcomingEvents, ensure they are registered in agenda
    const characterEvents = [
      ...(data.newCharacters || []),
      ...(data.updatedCharacters || [])
    ];
    characterEvents.forEach(char => {
      if (char.upcomingEvents && char.upcomingEvents.length > 0) {
        if (!data.newAgendaEvents) data.newAgendaEvents = [];
        char.upcomingEvents.forEach(evtText => {
          if (!evtText || typeof evtText !== 'string') return;
          const charName = char.name || 'Personnage';
          const alreadyInAgenda = (data.newAgendaEvents || []).some(
            ae => ae.title.toLowerCase().includes(evtText.toLowerCase().substring(0, 15))
          );
          if (!alreadyInAgenda) {
            let cat: 'rdv' | 'travail' | 'personnel' | 'finance' | 'urgent' = 'rdv';
            if (/entretien|embauche|travail|boulot|shift|essai/i.test(evtText)) cat = 'travail';
            else if (/banque|argent|payer|dette|loyer|remboursement/i.test(evtText)) cat = 'finance';
            else if (/urgent|vital|alerte/i.test(evtText)) cat = 'urgent';

            const nextDay = gameTimeInfo.dayNumber + 1;
            const nextDayName = daysOfWeek[(nextDay - 1) % 7] || `Jour ${nextDay}`;

            data.newAgendaEvents!.push({
              id: `ev-char-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              title: evtText.length > 40 ? evtText.substring(0, 37) + '...' : evtText,
              description: `Rendez-vous planifié lié à ${charName}.`,
              dateGameStr: `${nextDayName} à 08:00 (Jour ${nextDay})`,
              category: cat,
              completed: false
            });
          }
        });
      }
    });

    // Automatic Food & Cooking & Ingredient Consumption Bridge:
    // When ingredients or food/drinks are prepared, eaten, cooked, or used:
    // deduce every mentioned item independently and ensure hunger/vitals are updated.
    const isFoodCookingOrEating = /(?:oeuf|œuf|omelette|pâte|pasta|spaghetti|café|thé|sauce|coulis|tomate|beurre|pain|tartine|fromage|viande|soupe|salade|repas|cuisin|manger|mang|boir|boire|petit-déjeuner|dîner|déjeuner|encas|collation|bocal|placard|frigo|ingrédient|prépar|utilis|verser|ajouter|dégust|savoure)/i.test(actionLower + ' ' + (data.narrative || ''));
    
    if (isFoodCookingOrEating && Array.isArray(state.inventory)) {
      if (!data.inventoryUpdates) data.inventoryUpdates = [];
      const combinedFoodText = (actionLower + ' ' + (data.narrative || '')).toLowerCase();
      
      const frenchNumberMap: Record<string, number> = {
        "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
        "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "douze": 12
      };

      const parseQty = (keywords: string[], defaultQty = 1) => {
        const kwPattern = keywords.join('|');
        const numWordsPattern = Object.keys(frenchNumberMap).join('|');
        
        // Match explicit digits: e.g. "4 oeufs", "avec 4 oeufs"
        const digitRegex = new RegExp(`(?:avec|de|faire|cuisiner|utiliser|prendre|casser|battre)?\\s*(\\d+)\\s*(?:gross?es?|petit(?:es?)|beaux|belles)?\\s*(?:${kwPattern})`, 'i');
        const digitMatch = combinedFoodText.match(digitRegex);
        if (digitMatch && digitMatch[1]) {
          const val = parseInt(digitMatch[1], 10);
          if (!isNaN(val) && val > 0) return val;
        }

        // Match word numbers: e.g. "quatre oeufs", "deux oeufs"
        const wordRegex = new RegExp(`(?:avec|de|faire|cuisiner|utiliser|prendre|casser|battre)?\\s*(${numWordsPattern})\\s*(?:gross?es?|petit(?:es?)|beaux|belles)?\\s*(?:${kwPattern})`, 'i');
        const wordMatch = combinedFoodText.match(wordRegex);
        if (wordMatch && wordMatch[1] && frenchNumberMap[wordMatch[1]]) {
          return frenchNumberMap[wordMatch[1]];
        }

        return defaultQty;
      };

      // 1. Eggs / Omelette
      if (/(?:oeuf|œuf|omelette)/i.test(combinedFoodText)) {
        const eggItem = state.inventory.find(i => /(?:oeuf|œuf)/i.test(i.name));
        if (eggItem) {
          const defaultEggQty = /omelette/i.test(combinedFoodText) ? 2 : 1;
          const eggCount = parseQty(['oeufs?', 'œufs?', 'oeuf', 'œuf'], defaultEggQty);
          
          const existingEggUpdateIdx = data.inventoryUpdates.findIndex(u => /(?:oeuf|œuf)/i.test(u.name || ''));
          if (existingEggUpdateIdx !== -1) {
            data.inventoryUpdates[existingEggUpdateIdx] = {
              ...data.inventoryUpdates[existingEggUpdateIdx],
              id: eggItem.id,
              name: eggItem.name,
              quantityDelta: -eggCount,
              location: eggItem.location || 'appartement'
            };
          } else {
            data.inventoryUpdates.push({
              id: eggItem.id,
              name: eggItem.name,
              quantityDelta: -eggCount,
              location: eggItem.location || 'appartement'
            });
          }
        }
      }

      // 2. Pasta
      if (/(?:pâte|pasta|spaghetti)/i.test(combinedFoodText)) {
        const pastaItem = state.inventory.find(i => /(?:pâte|pasta)/i.test(i.name));
        if (pastaItem) {
          const pastaPortions = parseQty(['pâtes?', 'pastas?', 'portions?', 'paquets?'], 1);
          const existingUpdateIdx = data.inventoryUpdates.findIndex(u => /(?:pâte|pasta)/i.test(u.name || ''));
          if (existingUpdateIdx !== -1) {
            data.inventoryUpdates[existingUpdateIdx].quantityDelta = -pastaPortions;
          } else {
            data.inventoryUpdates.push({
              id: pastaItem.id,
              name: pastaItem.name,
              quantityDelta: -pastaPortions,
              location: pastaItem.location || 'appartement'
            });
          }
        }
      }

      // 3. Tomato sauce / Coulis de tomate / Coulis
      if (/(?:sauce|coulis|tomate)/i.test(combinedFoodText)) {
        const sauceItem = state.inventory.find(i => /(?:sauce|coulis|tomate)/i.test(i.name));
        if (sauceItem) {
          const existingUpdateIdx = data.inventoryUpdates.findIndex(u => /(?:sauce|coulis|tomate)/i.test(u.name || ''));
          if (existingUpdateIdx !== -1) {
            data.inventoryUpdates[existingUpdateIdx] = {
              ...data.inventoryUpdates[existingUpdateIdx],
              id: sauceItem.id,
              name: sauceItem.name,
              quantityDelta: -1,
              location: sauceItem.location || 'appartement'
            };
          } else {
            data.inventoryUpdates.push({
              id: sauceItem.id,
              name: sauceItem.name,
              quantityDelta: -1,
              location: sauceItem.location || 'appartement'
            });
          }
        }
      }

      // 4. Butter / Beurre
      if (/(?:beurre)/i.test(combinedFoodText)) {
        const beurreItem = state.inventory.find(i => /beurre/i.test(i.name));
        if (beurreItem) {
          const existingUpdateIdx = data.inventoryUpdates.findIndex(u => /beurre/i.test(u.name || ''));
          if (existingUpdateIdx === -1) {
            data.inventoryUpdates.push({
              id: beurreItem.id,
              name: beurreItem.name,
              quantityDelta: -1,
              location: beurreItem.location || 'appartement'
            });
          }
        }
      }

      // 5. Coffee
      if (/(?:café|expresso)/i.test(combinedFoodText)) {
        const coffeeItem = state.inventory.find(i => /café/i.test(i.name));
        if (coffeeItem) {
          const cups = parseQty(['cafés?', 'tasses?', 'capsules?', 'doses?'], 1);
          const existingUpdateIdx = data.inventoryUpdates.findIndex(u => /café/i.test(u.name || ''));
          if (existingUpdateIdx !== -1) {
            data.inventoryUpdates[existingUpdateIdx].quantityDelta = -cups;
          } else {
            data.inventoryUpdates.push({
              id: coffeeItem.id,
              name: coffeeItem.name,
              quantityDelta: -cups,
              location: coffeeItem.location || 'appartement'
            });
          }
        }
      }

      // 6. Tea
      if (/(?:thé|infusion)/i.test(combinedFoodText)) {
        const teaItem = state.inventory.find(i => /(?:thé|infusion)/i.test(i.name));
        if (teaItem) {
          const cups = parseQty(['thés?', 'tasses?', 'sachets?'], 1);
          const existingUpdateIdx = data.inventoryUpdates.findIndex(u => /(?:thé|infusion)/i.test(u.name || ''));
          if (existingUpdateIdx !== -1) {
            data.inventoryUpdates[existingUpdateIdx].quantityDelta = -cups;
          } else {
            data.inventoryUpdates.push({
              id: teaItem.id,
              name: teaItem.name,
              quantityDelta: -cups,
              location: teaItem.location || 'appartement'
            });
          }
        }
      }

      // 7. General fallback: check any other food/beverage in inventory mentioned in text
      state.inventory.forEach(invItem => {
        if (!invItem.name || (invItem.category !== 'nourriture' && invItem.category !== 'boisson' && !invItem.consumable)) return;
        const itemNameLower = invItem.name.toLowerCase();
        // Check if item's distinctive words are in the action
        const cleanWords = itemNameLower
          .replace(/^(?:bo[îi]te|paquet|bocal|pack|bouteille|portion|sachet|lot)\s+de\s+/i, '')
          .split(/[\s,&]+/)
          .filter(w => w.length >= 4 && !/^(fermier|artisanal|frais|moulu|sec|morceau)/i.test(w));
        
        const isMentioned = cleanWords.some(w => combinedFoodText.includes(w));
        if (isMentioned) {
          const alreadyUpdated = data.inventoryUpdates!.some(u => u.id === invItem.id || (u.name && u.name.toLowerCase() === itemNameLower));
          if (!alreadyUpdated) {
            data.inventoryUpdates!.push({
              id: invItem.id,
              name: invItem.name,
              quantityDelta: -1,
              location: invItem.location || 'appartement'
            });
          }
        }
      });

      // Guarantee hunger & vitality replenishment for cooked/eaten meals:
      if (!data.vitalsImpact) data.vitalsImpact = {};
      if (/(?:oeuf|œuf|omelette)/i.test(combinedFoodText)) {
        const defaultEggQty = /omelette/i.test(combinedFoodText) ? 2 : 1;
        const count = parseQty(['oeufs?', 'œufs?', 'oeuf', 'œuf'], defaultEggQty);
        const hungerGain = count >= 4 ? 80 : (count >= 2 ? 60 : 35);
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, hungerGain);
        data.vitalsImpact.mood = Math.max(data.vitalsImpact.mood || 0, 5);
      } else if (/(?:pâte|pasta|spaghetti|sauce|coulis|tomate)/i.test(combinedFoodText)) {
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, 70);
        data.vitalsImpact.mood = Math.max(data.vitalsImpact.mood || 0, 5);
      } else if (/(?:café|expresso)/i.test(combinedFoodText)) {
        data.vitalsImpact.energy = Math.max(data.vitalsImpact.energy || 0, 8);
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, 15);
      } else {
        data.vitalsImpact.hunger = Math.max(data.vitalsImpact.hunger || 0, 55);
      }
    }

    // Automatic Anonymous SMS / Plot Lead / Rendezvous Bridge:
    // If the narrative contains an incoming anonymous or mysterious SMS/job offer/rendezvous:
    const narTextFull = (data.narrative || '');
    const isAnonymousJobOrLead = /(?:recherche\s+profil|mission\s+de\s+nuit|texte\s+anonyme|message\s+anonyme|point\s+de\s+rendez-vous|discrétion\s+exigée|paiement\s+cash|venez\s+seul)/i.test(narTextFull);

    if (isAnonymousJobOrLead) {
      // 1. Sync Communicateur Messages
      if (!data.newMessages || data.newMessages.length === 0) {
        const quoteMatch = narTextFull.match(/[«"“]([^"»”]{20,500})[»"”]/);
        const msgContent = quoteMatch ? quoteMatch[1] : "Recherche profil polyvalent pour mission de nuit non conventionnelle. Discrétion exigée. Paiement cash immédiat à la clé. Répondez OUI pour fixer un point de rendez-vous discret.";
        data.newMessages = [{
          senderId: "contact-anonyme",
          senderName: "Contact Anonyme",
          preview: msgContent.length > 50 ? msgContent.substring(0, 47) + '...' : msgContent,
          content: msgContent,
          replyOptions: ["OUI", "NON", "Préciser la mission"]
        }];
      }

      // 2. Sync Plot Leads in Archives
      if (!data.newPlotLeads || data.newPlotLeads.length === 0) {
        data.newPlotLeads = [{
          title: "Mission nocturne clandestine (Secteur technique)",
          category: "mystere",
          status: "actif",
          qualitativeStage: "Proposition de mission anonyme reçue sur communicateur",
          clues: [
            "Message anonyme reçu exigeant discrétion absolue et profil polyvalent.",
            "Rémunération cash immédiate promise à la clé."
          ],
          relatedCharacterIds: [],
          relatedLocationIds: [],
          notes: "Un commanditaire anonyme a transmis une offre de mission clandestine dans le secteur technique."
        }];
      }

      // 3. Sync Rendezvous in Agenda if location & timer mentioned
      const isRdvMentioned = /(?:rendez-vous|coin\s+de\s+la\s+rue|avenue\s+des|dans\s+(?:exactement\s+)?(?:\d+|quarante-cinq|trente|vingt|quinze)\s+minutes)/i.test(narTextFull);
      if (isRdvMentioned && (!data.newAgendaEvents || data.newAgendaEvents.length === 0)) {
        let offsetMinutes = 45;
        if (/quarante-cinq|45/i.test(narTextFull)) offsetMinutes = 45;
        else if (/trente|30/i.test(narTextFull)) offsetMinutes = 30;
        else if (/quinze|15/i.test(narTextFull)) offsetMinutes = 15;
        else if (/une\s+heure|60/i.test(narTextFull)) offsetMinutes = 60;

        const currentHour = parseInt(gameTimeInfo.timeStr.split(':')[0], 10) || 12;
        const currentMin = parseInt(gameTimeInfo.timeStr.split(':')[1], 10) || 0;
        const totalMinutes = (currentHour * 60 + currentMin + offsetMinutes) % (36 * 60);
        const targetHour = Math.floor(totalMinutes / 60);
        const targetMin = totalMinutes % 60;
        const targetTimeStr = `${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`;

        const dayName = daysOfWeek[(gameTimeInfo.dayNumber - 1) % 7] || `Jour ${gameTimeInfo.dayNumber}`;
        const agendaDateStr = `${dayName} à ${targetTimeStr} (Jour ${gameTimeInfo.dayNumber})`;

        data.newAgendaEvents = [{
          id: `ev-secret-rdv-${Date.now()}`,
          title: "Rendez-vous discret - Rue Saint-Michel / Av. des Cèdres",
          description: "Rendez-vous anonyme pour une mission clandestine dans le secteur technique. Discrétion exigée.",
          dateGameStr: agendaDateStr,
          category: 'urgent',
          completed: false
        }];
      }
    }

    // Automatic Contract & Salary Memory Bridge:
    // If the narrative or history talks about employer negotiation / 250 € / prime d'intéressement / job
    const combinedContext = actionLower + ' ' + (data.narrative || '') + ' ' + (state.narrativeHistory.slice(-5).map(h => h.content).join(' '));
    const isSalaryAgreement = /(?:250\s*(?:€|euros?)|prime\s+d'intéressement|salaire\s+négocié|accord\s+salarial|période\s+d'essai)/i.test(combinedContext);
    
    if (isSalaryAgreement) {
      // Find existing employer character or update first non-player character
      const existingChars = Object.values(state.characters || {});
      const employerChar = existingChars.find(c => /employeur|patron|gérant|chef|responsable|restaurat/i.test(c.occupation || '') || /employeur|patron/i.test(c.name || ''))
        || existingChars.find(c => c.relationshipStatus === 'professionnel')
        || (data.newCharacters && data.newCharacters[0]);

      const contractTerms = "Employeur : 250 € par semaine + prime d'intéressement sur performances (Avance reçue : 50 €).";

      if (employerChar) {
        if (!data.updatedCharacters) data.updatedCharacters = [];
        const alreadyUpdated = data.updatedCharacters.some(uc => uc.id === employerChar.id);
        if (!alreadyUpdated) {
          data.updatedCharacters.push({
            id: employerChar.id,
            financialRelation: contractTerms,
            notesAppend: `Accord salarial validé : 250 € / semaine avec prime d'intéressement sur performances.`
          });
        }
      }

      // Check if diary has a note about the contract, otherwise create one
      const diaryHasJob = (state.diary || []).some(d => /250|prime\s+d'intéressement|contrat|embauche/i.test(d.title + ' ' + d.content));
      if (!diaryHasJob && !data.diaryEntry) {
        data.diaryEntry = {
          title: "Accord professionnel & Négociation salariale",
          content: "J'ai conclu un accord pour mon nouveau travail : 250 € par semaine avec prime sur intéressement calculée selon mes performances. Une avance de 50 € m'a déjà été versée, et ma période d'essai commence demain matin.",
          category: 'objectif',
          mood: 'Déterminé & Confiant',
          milestone: true
        };
      }
    }

    // If task completion was requested, guarantee task termination and open choices
    if (isTaskCompletion) {
      data.taskTimeAdjustmentMinutes = -1000;
      data.durationMinutes = undefined;
      data.taskSummary = undefined;
    }

    // Ensure taskSummary is clean, concise (3-6 words) and never takes the whole narrative
    if (data.durationMinutes && data.durationMinutes > 0) {
      if (!data.taskSummary || data.taskSummary.length > 45 || data.taskSummary.includes('.')) {
        const cleanAction = action.replace(/^(?:je\s+|j'|j’|vous\s+)?(?:vais\s+|compte\s+|veux\s+|souhaite\s+|décide\s+de\s+|pars\s+pour\s+)?/i, '').trim();
        const shortAction = cleanAction.length > 40 ? cleanAction.substring(0, 37) + '...' : cleanAction;
        data.taskSummary = shortAction.charAt(0).toUpperCase() + shortAction.slice(1);
      }
    }

    // Generate vector embedding for episodicMemory if provided
    if (data.episodicMemory && data.episodicMemory.summary) {
      try {
        const textToEmbed = `${data.episodicMemory.summary} ${(data.episodicMemory.tags || []).join(' ')}`;
        const vector = await getEmbedding(textToEmbed);
        data.episodicMemory.embedding = vector || undefined;
        data.episodicMemory.id = `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        data.episodicMemory.timestamp = Date.now();
        data.episodicMemory.gameDateStr = gameTimeInfo.fullDateStr;
      } catch (embErr) {
        console.warn("Could not generate embedding for new episodic memory:", embErr);
      }
    }

    await attachVisualsToEntities(data);
    res.json(data);
  } catch (error) {
    console.error("General action endpoint fallback:", error);
    res.json({
      isDangerous: false,
      narrative: "Vous continuez votre aventure. L'environnement reste calme et vous maîtrisez la situation.",
      choices: ["Continuer l'exploration", "Regarder autour de vous", "Faire le point"]
    });
  }
});


const offlineRecapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrativeRecap: { type: Type.STRING, description: "A vivid, multi-paragraph recap of what happened during the entire absence period." },
    events: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Bullet points of key events across the absence period." },
    timeline: {
      type: Type.ARRAY,
      description: "Chronological stages covering the full span of absence (especially for multi-hour or multi-day absences).",
      items: {
        type: Type.OBJECT,
        properties: {
          timeRange: { type: Type.STRING, description: "e.g. 'Début d'absence', 'Nuit & Grand repos', 'Matinée', 'Retour imminent'" },
          summary: { type: Type.STRING, description: "Key action or situation during this phase." }
        },
        required: ["timeRange", "summary"]
      }
    },
    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 actionable suggested choices for what the player can do immediately upon returning/waking up." },
    vitalsImpact: { 
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER },
        hunger: { type: Type.INTEGER },
        hygiene: { type: Type.INTEGER },
        mood: { type: Type.INTEGER },
        mindset: { type: Type.INTEGER, description: "Delta impact on Mindset (-20 to +20). Negative = Tendu/Red, Positive = À l'aise/Green." }
      }
    },
    moneyImpact: {
      type: Type.OBJECT,
      properties: {
        checkingDelta: { type: Type.INTEGER },
        savingsDelta: { type: Type.INTEGER },
        debtsDelta: { type: Type.INTEGER },
        reason: { type: Type.STRING, description: "Precise motif or label for any expenses or earnings during absence in French (e.g. 'Courses alimentaires & repas', 'Salaire journalier', 'Paiement transport'). ALWAYS provide a clear description!" }
      }
    },
    inventoryUpdates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING, description: "Item name in French (e.g. 'Panier de fruits et légumes frais', 'Pack de provisions (pâtes, riz, sauces)', 'Pack d\'eau minérale & jus', 'Pain frais')." },
          category: { type: Type.STRING, enum: ['nourriture', 'boisson', 'hygiene', 'vetement', 'outils', 'technologie', 'documents', 'clefs_pass', 'divers'] },
          quantityDelta: { type: Type.INTEGER, description: "Positive delta (+1, +2) for items purchased/gained, negative (-1) if consumed." },
          location: { type: Type.STRING, enum: ['personnage', 'appartement'], description: "'appartement' for items stored in fridge/cupboard/studio, 'personnage' for carried items." },
          description: { type: Type.STRING },
          freshness: { type: Type.STRING, enum: ['frais', 'perime', 'sec', 'conserve'] },
          consumable: { type: Type.BOOLEAN }
        },
        required: ["name", "quantityDelta", "location"]
      }
    },
    skillsImpact: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          practicePointsDelta: { type: Type.INTEGER }
        }
      }
    },
    newCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          locationEncountered: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          age: { type: Type.STRING },
          appearance: { type: Type.STRING },
          occupation: { type: Type.STRING },
          background: { type: Type.STRING },
          financialRelation: { type: Type.STRING },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING }
        }
      }
    },
    updatedCharacters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          relationshipStatus: { type: Type.STRING, enum: ['amical', 'amoureux', 'professionnel', 'conflictuel', 'neutre', 'inconnu'] },
          financialRelation: { type: Type.STRING },
          pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          upcomingEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
          notesAppend: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING },
          description: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING },
          discoveredGameDate: { type: Type.NUMBER }
        }
      }
    },
    updatedLocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['domicile', 'travail', 'commerce', 'interet', 'lieu_clef', 'autre'] },
          district: { type: Type.STRING },
          description: { type: Type.STRING },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
          associatedCharacters: { type: Type.ARRAY, items: { type: Type.STRING } },
          notesAppend: { type: Type.STRING }
        },
        required: ["id"]
      }
    },
    newAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["title"]
      }
    },
    updatedAgendaEvents: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          dateGameStr: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['travail', 'rdv', 'personnel', 'finance', 'urgent'] },
          completed: { type: Type.BOOLEAN }
        },
        required: ["id"]
      }
    },
    newMessages: {
      type: Type.ARRAY,
      description: "Passive narrative events: Messages received from contacts while the character was sleeping or busy.",
      items: {
        type: Type.OBJECT,
        properties: {
          senderId: { type: Type.STRING },
          senderName: { type: Type.STRING },
          preview: { type: Type.STRING },
          content: { type: Type.STRING },
          timestampGameDateStr: { type: Type.STRING },
          replyOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["senderName", "content"]
      }
    },
    newPlotLeads: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['emploi', 'mystere', 'quartier', 'personnel', 'finance'] },
          qualitativeStage: { type: Type.STRING },
          clues: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['actif', 'en_pause', 'resolu', 'abandonne'] }
        },
        required: ["title"]
      }
    },
    updatedPlotLeads: {
      type: Type.ARRAY,
      description: "Plot leads that expired or evolved naturally while the character was asleep/absent.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          qualitativeStage: { type: Type.STRING },
          newClues: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['actif', 'en_pause', 'resolu', 'abandonne'] }
        },
        required: ["id"]
      }
    },
    newRumors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          source: { type: Type.STRING },
          credibility: { type: Type.STRING, enum: ['faible', 'plausible', 'averee'] },
          district: { type: Type.STRING }
        },
        required: ["text"]
      }
    },
    diaryEntry: {
      type: Type.OBJECT,
      description: "An introspective first-person diary entry summarizing the character's personal feelings, reflections, and thoughts during this long absence.",
      properties: {
        title: { type: Type.STRING, description: "Poetic title (e.g. 'Une longue nuit de repos et réflexions', 'Évolution du quotidien')" },
        content: { type: Type.STRING, description: "Deep personal first-person journal entry written by the character reflecting on life, progress, relationships, and the future." },
        category: { type: Type.STRING, enum: ['absence', 'souvenir', 'reflexion'] },
        mood: { type: Type.STRING, description: "Dominant mood (e.g. 'Ragaillardi', 'Serein', 'Déterminé', 'Mélancolique', 'Pensif')" },
        milestone: { type: Type.BOOLEAN, description: "True if a key event occurred during absence" }
      },
      required: ["title", "content"]
    }
  },
  required: ["narrativeRecap"]
};

app.post('/api/offline', async (req, res) => {
  try {
    const { state, offlineRealMinutes, autopilotMode } = req.body as OfflineRecapRequest;
    const offlineGameMinutes = offlineRealMinutes;
    const offlineHours = Math.round((offlineGameMinutes / 60) * 10) / 10;

    // Narrative context extraction
    const recentHistory = state.narrativeHistory && state.narrativeHistory.length > 0
      ? state.narrativeHistory.slice(-25).map(h => `${h.role === 'user' ? 'Joueur' : 'Narrateur'}: ${h.content}`).join('\n\n')
      : "Aucun historique précédent. Début de la simulation.";

    const allCharacters = Object.values(state.characters || {});
    const knownCharactersList = allCharacters.length > 0
      ? allCharacters.map(c => 
          `• [ID: "${c.id}"] ${c.name} | Âge: ${c.age || 'Inconnu'} | Rôle: ${c.occupation || 'Non précisé'} | Statut: ${c.relationshipStatus}
  - Rencontre: ${c.locationEncountered}
  - Accords: ${c.financialRelation || 'Aucun'}
  - En cours: ${(c.pendingItems && c.pendingItems.length > 0) ? c.pendingItems.join(', ') : 'Rien'}
  - Notes: ${c.notes || 'Aucune'}`
        ).join('\n')
      : "Aucun personnage enregistré.";

    const allLocations = Object.values(state.locations || {});
    const knownLocationsList = allLocations.length > 0
      ? allLocations.map(l => 
          `• [ID: "${l.id}"] ${l.name} (${l.category || 'lieu'}) - ${l.district || 'Saint-Michel'}: ${l.description}`
        ).join('\n')
      : "Aucun lieu enregistré.";

    const diaryEntries = (state.diary || []);
    const milestonesList = diaryEntries
      .filter(d => d.milestone || d.category === 'souvenir')
      .slice(-6)
      .map(d => `- [${d.category || 'souvenir'}] ${d.title || 'Jalon'}: ${d.content}`)
      .join('\n');

    const skillsList = Object.values(state.skills || {})
      .map(s => `- ${s.name} : Niveau ${s.level} (${s.practicePoints}/100)`)
      .join('\n');

    const upcomingAgendaList = (state.agenda || [])
      .filter(e => !e.completed)
      .map(e => `- [${(e.category || 'évènement').toUpperCase()}] ${e.title} (${e.dateGameStr || 'Date non précisée'}): ${e.description || ''}`)
      .join('\n');

    const characterInventory = (state.inventory || []).filter((i: any) => i.location === 'personnage');
    const apartmentInventory = (state.inventory || []).filter((i: any) => i.location === 'appartement');

    const characterInvList = characterInventory.length > 0
      ? characterInventory.map((i: any) => `- ${i.name} (x${i.quantity || 1}) [${i.category || 'divers'}]`).join('\n')
      : "Aucun objet sur soi.";

    const apartmentInvList = apartmentInventory.length > 0
      ? apartmentInventory.map((i: any) => `- ${i.name} (x${i.quantity || 1}) [${i.category || 'divers'}]${i.freshness ? ` (${i.freshness})` : ''}`).join('\n')
      : "Frigo et placards vides (aucun aliment ou objet stocké).";

    const activePlotLeadsList = (state.plotLeads || [])
      .filter((l: any) => l.status !== 'resolu')
      .map((l: any) => `- [${l.category.toUpperCase()}] ${l.title} (Stade: ${l.qualitativeStage})\n  - Indices: ${(l.clues || []).join(' | ')}\n  - Notes: ${l.notes || 'Aucune'}`)
      .join('\n');
      
    const activeRumorsList = (state.rumors || [])
      .map((r: any) => `- [RUMEUR ${r.credibility.toUpperCase()} - Quartier: ${r.district}] ${r.text} (Source: ${r.source})`)
      .join('\n');
      
    const recentMessagesList = (state.messages || [])
      .slice(0, 5)
      .map((m: any) => `- Message ${m.read ? "lu" : "NON LU"} de ${m.senderName}: "${m.preview}" (Options de réponse suggérées: ${(m.replyOptions || []).join(' | ')})`)
      .join('\n');

    // Bank Account Context
    const checking = state.bank?.checking ?? 0;
    const savings = state.bank?.savings ?? 0;
    const debts = state.bank?.debts ?? 0;
    const totalNetWorth = checking + savings - debts;

    let taskContext = "";
    if (state.currentTask) {
      taskContext = `- TÂCHE ACHEVÉE DURANT L'ABSENCE : "${state.currentTask.description}".
Cette tâche a été lancée par le joueur avant son départ et s'est terminée pendant son absence.
INSTRUCTION CRUCIALE : Le récapitulatif ('narrativeRecap') DOIT IMPÉRATIVEMENT commencer par décrire l'aboutissement réussi de cette tâche ("${state.currentTask.description}"), avant de raconter ce que le personnage a fait ensuite durant le reste de son temps d'absence jusqu'à son réveil / retour au calme.`;
    }

    const gameTimeInfo = getGameDateInfoServer(state.epochRealTime);

    let timeScaleGuidance = "";
    if (offlineHours < 1) {
      timeScaleGuidance = state.currentTask
        ? `ABSENCE COURTE AVEC FIN DE TÂCHE (${Math.round(offlineGameMinutes)} MINUTES ÉCOULÉES) :
Le personnage a mené à terme sa tâche ("${state.currentTask.description}").
Décris de manière vivante et détaillée comment il a finalisé cette tâche, ses gestes concrets durant ces ${Math.round(offlineGameMinutes)} minutes, la conclusion de l'activité, et comment il s'est ensuite posé ou préparé pour ce qui vient sous l'ambiance de ${gameTimeInfo.cyclePhase} (${gameTimeInfo.timeStr}).`
        : `ABSENCE COURTE (${Math.round(offlineGameMinutes)} MINUTES ÉCOULÉES DANS LA VIE DU PERSONNAGE) :
Pendant ces ${Math.round(offlineGameMinutes)} minutes, le personnage N'EST PAS RESTÉ IMMOBILE SANS RIEN FAIRE !
Raconte les actions réelles, tangibles et concrètes qu'il a accomplies pendant ces ${Math.round(offlineGameMinutes)} minutes en te basant sur le contexte de sa dernière action et de son lieu :
- S'il discutait ou était dans un commerce/échoppe/rue : il a conclu l'échange, réglé ce qu'il devait régler, a marché quelques minutes le long des façades du quartier Saint-Michel sous les reflets de ${gameTimeInfo.cyclePhase} (${gameTimeInfo.timeStr}), a observé les passants ou le travail des artisans locaux, puis s'est posé.
- S'il était chez lui : il a fini de ranger ses affaires, s'est préparé une collation ou un verre, a vérifié ses notes ou regardé par la fenêtre.
- Selon son mode autopilot ("${autopilotMode}") :
  * Si 'curieux' : a flâné, repéré des boutiques ou des affiches, salué un voisin.
  * Si 'prudent' : a vérifié ses dépenses, évité les risques, pris son temps avec méthode.
  * Si 'normal' : routine fluide et équilibrée.
INTERDICTION FORMELLE D'ÉCRIRE UNE PHRASE VAGUE OU GÉNÉRIQUE. Écris un récit vivant de 2 à 3 paragraphes qui explique précisément ce qu'il a fait de son temps et de ses mains durant ces ${Math.round(offlineGameMinutes)} minutes !`;
    } else if (offlineHours <= 4) {
      timeScaleGuidance = `ABSENCE MOYENNE (${offlineHours} heures) : Une demi-journée ou soirée active. Raconte chronologiquement les différentes actions menées (tâche achevée, repas pris, déplacements dans le quartier, discussions ou démarches, moments de repos).`;
    } else if (offlineHours <= 10) {
      timeScaleGuidance = `ABSENCE LONGUE (${offlineHours} heures) : Une nuit complète ou une journée entière de travail ! Le personnage a eu un cycle complet de sommeil réparateur (restaure l'énergie à 90-100), s'est nourri, a lavé ses affaires et a géré ses occupations quotidiennes.`;
    } else {
      timeScaleGuidance = `TRÈS LONGUE ABSENCE (${offlineHours} HEURES RÉELLES - PRESQUE UN DEMI-CYCLE PLANÉTAIRE OU PLUS !) :
ATTENTION MAJEURE : En ${offlineHours} heures (ex: toute une nuit + matinée ou 16h d'absence), une vie humaine ne se résume JAMAIS à boire un simple café !
Pendant ces ${offlineHours} heures, le personnage a nécessairement :
1. Mené à terme la tâche initiale si applicable.
2. Dormi un cycle complet de sommeil profond et réparateur (énergie restaurée à 100%).
3. Préparé et consommé des repas équilibrés en utilisant les provisions existantes ou en prenant un repas léger.
4. Vaqué à des occupations de son mode autopilot ("${autopilotMode}") : rangement, étude/formation, travail, démarches, découverte du quartier, écoute des infos locales ou échange de messages avec ses connaissances.
5. Structuré son emploi du temps à travers plusieurs phases successives.
NE RÉSUME PAS 16 HEURES EN UNE SEULE PHRASE BANALE. Décris l'évolution concrète et réaliste de cette longue tranche de vie !`;
    }

    const prompt = `
You are the master narrator and game director for a life simulation RPG set on an Earth-like planet with a 36-hour day.
The player was offline/away for ${offlineHours} REAL HOURS (${Math.round(offlineGameMinutes)} minutes).
Chosen autopilot strategy: "${autopilotMode}".
- "prudent": Stays home or in safe zone, rests deeply, manages budget carefully, handles personal study/chores.
- "curieux": Explores the city, visits new venues, interacts with neighbors/acquaintances, spots opportunities.
- "normal": Standard balanced routine (healthy sleep, home cooking, local errands, relaxing).

🌍 DATE, HEURE EXACTE DU RÉVEIL & CYCLE PLANÉTAIRE (JOURNÉE DE 36 HEURES) :
- Jour actuel : ${gameTimeInfo.dayName} (Jour ${gameTimeInfo.dayNumber})
- Heure exacte en jeu à l'instant du réveil : ${gameTimeInfo.timeStr} (l'heure s'étend de 00:00 à 35:59)
- Phase atmosphérique & Luminosité : ${gameTimeInfo.cyclePhase} (${gameTimeInfo.cycleSubtext})
- Description d'ambiance : ${gameTimeInfo.cycleDetails}

⚠️ RÈGLE DE COHÉRENCE TEMPORELLE STRICTE : Le réveil et l'atmosphère finale DOIVENT correspondre à ${gameTimeInfo.timeStr} (${gameTimeInfo.cyclePhase}). Si le réveil se fait à 29h ou 31h, c'est le crépuscule ou la soirée, JAMAIS le matin !

REAL-TIME SCALE GUIDANCE:
${timeScaleGuidance}

CRITICAL INSTRUCTION - STORY CONTINUITY:
You MUST maintain absolute continuity with the player's recent narrative history below! Do NOT invent an unrelated absurd scenario (e.g. do NOT wake them up in a space cruiser or hospital if they were at home). Continue directly from their actual ongoing life and apartment/job context.

EXISTING STORY CONTEXT & MEMORY:
- Known Characters:
${knownCharactersList || "Aucun pour l'instant"}
- Known Locations:
${knownLocationsList || "Aucun pour l'instant"}
- Compétences du joueur :
${skillsList || "Cuisine, Communication, Bricolage"}

- Agenda & Événements à venir :
${upcomingAgendaList || "Aucun événement prévu"}

- PISTES D'ENQUÊTE & PROJETS ACTIFS (PLOT LEADS) :
${activePlotLeadsList || "Aucune piste ou projet en cours."}

- RUMEURS LOCALES :
${activeRumorsList || "Aucune rumeur."}

- MESSAGES RÉCENTS :
${recentMessagesList || "Aucun message récent."}

- Inventaire dans le studio / appartement (Frigo, Kitchenette, Placards) :
${apartmentInvList}
- Objets transportés sur le personnage :
${characterInvList}
${taskContext}

RECENT NARRATIVE HISTORY (PAST ACTIONS):
${recentHistory}

Current initial Vitals before absence:
Energy ${state.vitals.energy}, Hunger ${state.vitals.hunger}, Hygiene ${state.vitals.hygiene}, Mood ${state.vitals.mood}, Mindset ${state.vitals.mindset ?? 50}/100.
- Situation Financière (Monnaie : Euro € exclusivement, JAMAIS de crédits) : Compte Courant: ${checking}€, Épargne: ${savings}€, Dettes: ${debts}€, Solde total: ${totalNetWorth}€.

🛑 RÈGLE D'OR : ÉQUILIBRE ET RÉALISME DES COURSES ET DU FRIGO :
- Dans une journée de 36 heures, on NE FAIT PAS les courses 3 fois par jour ! Les provisions se font au maximum 1 seule fois pour plusieurs jours.
- S'il y a déjà de la nourriture dans le frigo/kitchenette de l'appartement (${apartmentInvList}), IL EST STRICTEMENT INTERDIT de renvoyer le personnage faire des courses au supermarché. Il cuisine ou consomme simplement ce qui est déjà là !
- Si le personnage n'avait plus rien à manger ET qu'une séance de courses de ravitaillement a été faite pendant une longue absence :
  1. Tu DOIS IMPÉRATIVEMENT ajouter les articles achetés dans 'inventoryUpdates' avec 'location': 'appartement' (ex: "Panier de fruits & légumes frais", "Pack de pâtes & sauces", "Pack d'eau minérale") !
  2. Tu DOIS déduire le coût dans 'moneyImpact.checkingDelta' (ex: -25€) avec 'reason': "Courses de provisions pour la kitchenette".

INSTRUCTIONS:
1. 'narrativeRecap': Write a vivid, multi-paragraph recap (in French, 2nd person "Vous") that genuinely details what the character concretely DID during these ${Math.round(offlineGameMinutes)} minutes (${offlineHours} hours). Describe the sequence of actions, bodily sensations, interactions finished, walk in the neighborhood, and current situation.
2. ALWAYS end the recap with an active event happening RIGHT NOW as the character opens their eyes or resumes their focus (e.g. a chime on the terminal, a message from a contact, a passerby calling out, footsteps in the hallway, or the golden light shifting through the windows) so the player has something immediate to react to!
3. 'timeline': For absences >= 2 hours, break down the time chronologically into 2 to 4 phases (e.g. 'Soirée & Tâches', 'Grand Repos Nocturne', 'Matinée & Préparatifs', 'À l'instant').
4. 'events': 3-5 scannable bullet points of significant occurrences during this period.
5. 'diaryEntry': Write an authentic, deep first-person journal entry written by the character reflecting on how they feel about their life, goals, and experiences over this elapsed time.
6. 'choices': Provide 3 distinct, creative, actionable suggested choices for what the player could do right now.
7. 'vitalsImpact':
   - If offline < 3h : energy stays similar or drops slightly (-5 to +5), hunger drops (-5 to -20), hygiene drops (-2 to -5). DO NOT give high positive energy or hunger for short absences!
   - If offline >= 3h (sleep/rest) : energy increases (+40 to +80, capped at 100), hunger drops (-15 to -30 unless food purchased), hygiene (-5 to -15 unless showered), mood (+10 to +25), mindset (+5 to +15).
8. 'moneyImpact': Strictly in Euros (€). If groceries/meals were bought during a long absence, populate checkingDelta (e.g. -25) and reason.
9. 'inventoryUpdates': If provisions or items were purchased or obtained, include them with 'location': 'appartement' or 'personnage' so the inventory updates immediately.
10. If in "curieux" mode and away for several hours, you may introduce a 'newCharacters' or 'newLocations'.
11. PASSIVE EVENTS (CRITICAL): If the character was asleep or absent for >3 hours, inject passive narrative events! Life continues while they sleep. You MUST generate at least one 'newMessages' (e.g. a contact messaging them at 3 AM), or expire/update an active plot in 'updatedPlotLeads', or generate a 'newRumors' happening in the city.
    `;

    let responseText = "";
    try {
      const response = await generateWithModelFallback(prompt, offlineRecapSchema, 0.5);
      responseText = response.text || '{}';
    } catch (genError) {
      console.error("Offline recap model fallback error:", genError);
      return res.json(buildDynamicOfflineFallback(state, offlineHours, offlineGameMinutes, autopilotMode));
    }

    let data = safeParseOfflineRecap(responseText, offlineHours, offlineGameMinutes, state, autopilotMode);

    await attachVisualsToEntities(data);
    res.json(data);
  } catch (error) {
    console.error("General offline endpoint fallback:", error);
    const { state, offlineRealMinutes, autopilotMode } = req.body || {};
    const fallback = buildDynamicOfflineFallback(state, (offlineRealMinutes || 0) / 60, offlineRealMinutes || 0, autopilotMode);
    res.json(fallback);
  }
});

const taskProgressSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrativeSnippet: { type: Type.STRING, description: "A rich, vivid 1-2 paragraph situational description in French (2nd person 'Vous...') of what is happening right now during this task (sensory atmosphere of the 36h planet, bodily sensations, unexpected encounter, obstacle, or dilemma)." },
    choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 distinct, actionable choices for the player during this task that clearly offer different strategies (e.g. accelerating to save time, taking a breather, or maintaining steady focus)." },
    vitalsImpact: {
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER },
        hunger: { type: Type.INTEGER },
        hygiene: { type: Type.INTEGER },
        mood: { type: Type.INTEGER },
        mindset: { type: Type.INTEGER }
      }
    },
    taskTimeAdjustmentMinutes: {
      type: Type.INTEGER,
      description: "Optional immediate delta in task minutes (-30 to +30) triggered by this situation."
    }
  },
  required: ["narrativeSnippet", "choices"]
};

app.post('/api/task-progress', async (req, res) => {
  try {
    const { task, state, progressPercent } = req.body;
    const totalMinutes = Math.max(1, Math.round(((task?.endTimeReal || Date.now()) - (task?.startTimeReal || Date.now())) / 60000));
    const minutesLeft = Math.max(0, Math.round(((task?.endTimeReal || Date.now()) - Date.now()) / 60000));

    const taskDesc = (task?.description || 'Activité en cours').toLowerCase();
    const isSleepingTask = /(dorm|sommeil|siest|repos|couch|lit|nuit)/i.test(taskDesc);
    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    const prompt = `
You are the master narrator and game director for an immersive life simulation RPG set on an Earth-like planet with a 36-hour day.
The player is actively performing an ongoing task: "${task?.description || 'Activité en cours'}".
Current task progress: ~${progressPercent}% completed (total duration: ~${totalMinutes} min, remaining: ~${minutesLeft} min).

🌍 DATE, HEURE EXACTE DU MOMENT & CYCLE PLANÉTAIRE (JOURNÉE DE 36 HEURES) :
- Jour : ${gameTimeInfo.dayName} (Jour ${gameTimeInfo.dayNumber})
- Heure en jeu : ${gameTimeInfo.timeStr} (00:00 à 35:59)
- Phase atmosphérique & Luminosité : ${gameTimeInfo.cyclePhase} (${gameTimeInfo.cycleSubtext})
- Description de l'environnement : ${gameTimeInfo.cycleDetails}

⚠️ RÈGLE DE COHÉRENCE TEMPORELLE : Respecte l'ambiance lumineuse et l'heure en jeu (${gameTimeInfo.timeStr} - ${gameTimeInfo.cyclePhase}). Si l'heure est 29h ou 31h, c'est le crépuscule ou la soirée, JAMAIS le matin !

Context:
- Vitals: Energy ${state?.vitals?.energy ?? 100}%, Hunger ${state?.vitals?.hunger ?? 100}%, Hygiene ${state?.vitals?.hygiene ?? 100}%, Mood ${state?.vitals?.mood ?? 100}%, Mindset ${state?.vitals?.mindset ?? 50}/100.
- Mindset: ${state?.vitals?.mindset ?? 50}/100 (0=Tendu/Rouge, 100=À l'aise/Vert).

TASK SITUATIONAL EVENT & CHOICES GUIDELINES:
1. 'narrativeSnippet' (RÉCIT IMMERSIF EN COURS DE TÂCHE - 1 à 2 paragraphes soignés) :
   - Écris un texte vivant en français à la 2e personne ("Vous..."), directement en lien avec "${task?.description}".
   ${isSleepingTask ? `
   - SPÉCIFIQUE SOMMEIL / REPOS : Décris ce qui se passe durant cette phase de sommeil (un rêve étrange ou poétique, une sensation progressive de récupération musculaire, les bruits de pluie ou d'ambiance nocturne feutrée de la ville, ou un micro-réveil paisible).
   ` : `
   - DÉTAILS CONCRETS : Décris ce qui survient à ce stade de l'activité (avancement, sensation d'effort ou de fluidité, une rencontre imprévue, un détail qui attire votre regard, une brève hésitation ou une opportunité d'accélérer).
   `}
2. 'choices' (CHOIX INTERACTIFS INFLUANT SUR LE TEMPS ET L'ÉNERGIE) :
   ${isSleepingTask ? `
   - Propose 3 choix évocateurs pour le joueur :
     * "Se réveiller dès maintenant et sortir du lit" (interrompt le sommeil plus tôt)
     * "Se retourner sous la couette et savourer le sommeil" (poursuit la nuit normalement)
     * "Laisser dériver son esprit dans un demi-sommeil paisible" (méditation légère)
   ` : `
   - Fournis 3 choix distincts et stimulants en lien direct avec la tâche :
     * Un choix d'accélération / effort soutenu (ex: "Accélérer l'allure pour terminer plus tôt", "Donner un coup de collier pour gagner du temps").
     * Un choix de temporisation / pause / répit (ex: "S'accorder une courte pause pour souffler", "Prendre le temps de peaufiner les détails").
     * Un choix de régularité ou d'observation (ex: "Garder un rythme régulier et attentif", "Observer attentivement l'environnement en avançant").
   `}
3. 'vitalsImpact' :
   ${isSleepingTask ? `
   - Gains graduels d'énergie (+10 à +25) et de mentalité (+2 à +8).
   ` : `
   - Ajustements légers et réalistes selon l'effort (-1 à -3 énergie, -1 faim).
   `}
`;

    const response = await generateWithModelFallback(prompt, taskProgressSchema, 0.7);
    const data = safeParseTaskProgress(response.text || '{}', req.body?.task?.description || 'votre activité');
    res.json(data);
  } catch (err) {
    console.error("Task progress endpoint error:", err);
    res.json({
      narrativeSnippet: `Vous poursuivez "${req.body?.task?.description || 'votre activité'}" avec régularité et attention.`,
      choices: ["Accélérer le rythme pour gagner du temps", "Prendre une brève pause pour souffler", "Maintenir un rythme régulier"]
    });
  }
});

const introspectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Poetic and reflective title for this introspection entry" },
    content: { type: Type.STRING, description: "Profound, authentic first-person journal entry (3-4 paragraphs) reflecting on the character's present life, finances, dreams, emotional state, and relationships." },
    mood: { type: Type.STRING, description: "Current emotional mood (e.g. 'Pensif', 'Déterminé', 'Mélancolique', 'Confiant', 'Inquiet')" },
    category: { type: Type.STRING, enum: ['reflexion', 'souvenir', 'objectif', 'secret'] },
    milestone: { type: Type.BOOLEAN }
  },
  required: ["title", "content", "mood"]
};

app.post('/api/introspection', async (req, res) => {
  try {
    const { state } = req.body;
    const recentHistory = (state.narrativeHistory || []).slice(-6).map((h: any) => `${h.role}: ${h.content}`).join('\n');
    const knownChars = Object.values(state.characters || {}).map((c: any) => `${c.name} (${c.relationshipStatus})`).join(', ');
    const gameTimeInfo = getGameDateInfoServer(state?.epochRealTime);

    const prompt = `
You are the inner consciousness and subconscious mind of the protagonist in a 36-hour planet life simulator.
The character is taking a quiet moment to sit down and write a personal, intimate page in their private diary (Journal Intime).

🌍 DATE & HEURE EN JEU : ${gameTimeInfo.dayName} (Jour ${gameTimeInfo.dayNumber}) à ${gameTimeInfo.timeStr} [${gameTimeInfo.cyclePhase} - ${gameTimeInfo.cycleSubtext}].

Current character context:
- Vitals: Energy ${state.vitals.energy}%, Hunger ${state.vitals.hunger}%, Mood ${state.vitals.mood}%, Mindset ${state.vitals.mindset ?? 50}/100.
- Finances: ${state.bank.checking}€ checking, ${state.bank.savings}€ savings, ${state.bank.debts}€ debts.
- Known Relationships: ${knownChars || "Aucun pour l'instant"}.
- Recent experiences:
${recentHistory || "Début de mon installation dans le quartier Saint-Michel."}

Write an eloquent, deeply human, and introspective journal entry in French in the first person ("Je / Mon...").
It should reflect on their ambitions, doubts, their connection with others, and how they navigate life on this planet.
    `;

    const response = await generateWithModelFallback(prompt, introspectionSchema, 0.7);
    const data = safeParseIntrospection(response.text || '{}');
    res.json(data);
  } catch (error) {
    console.error("Introspection generation error:", error);
    res.json({
      title: "Pensées nocturnes & Bilan",
      content: "Je prends un moment pour contempler le chemin parcouru. S'adapter à des journées de 36 heures n'est pas anodin, mais chaque choix compte pour forger mon avenir.",
      mood: "Pensif",
      category: "reflexion",
      milestone: false
    });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, type, seed } = req.body;
    const imageUrl = await generateImageHelper(prompt, type, seed);
    return res.json({ imageUrl });
  } catch (error) {
    console.error("Image endpoint error:", error);
    res.status(500).json({ error: 'Failed to process image generation' });
  }
});

async function startServer() {
  // Always serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
