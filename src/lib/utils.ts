import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GAME_TIME_MULTIPLIER } from '../state/useGameState';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAtmosphericCycle(gameHourOfDay: number): {
  phase: string;
  subtext: string;
  theme: 'dawn' | 'morning' | 'zenith' | 'afternoon' | 'dusk' | 'night';
} {
  if (gameHourOfDay >= 5 && gameHourOfDay < 10) {
    return { phase: "Aube naissante", subtext: "Premières lueurs", theme: 'dawn' };
  }
  if (gameHourOfDay >= 10 && gameHourOfDay < 16) {
    return { phase: "Matinée lumineuse", subtext: "Plein jour", theme: 'morning' };
  }
  if (gameHourOfDay >= 16 && gameHourOfDay < 22) {
    return { phase: "Zénith solaire", subtext: "Chaleur du cycle", theme: 'zenith' };
  }
  if (gameHourOfDay >= 22 && gameHourOfDay < 28) {
    return { phase: "Après-midi prolongé", subtext: "Lumière dorée", theme: 'afternoon' };
  }
  if (gameHourOfDay >= 28 && gameHourOfDay < 32) {
    return { phase: "Crépuscule doré", subtext: "Déclin du ciel", theme: 'dusk' };
  }
  return { phase: "Nuit profonde", subtext: "Heures calmes", theme: 'night' };
}

/**
 * Returns the exact calendar date (starting 01/01/2100 on Day 1)
 */
export function getCalendarDateFromGameDay(dayNumber: number): {
  dayName: string;
  day: number;
  month: number;
  year: number;
  dateStr: string; // "01/01/2100"
  fullDisplay: string; // "Lundi 01/01/2100"
  monthName: string;
} {
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

export function getGameDateInfo(epochRealTime: number) {
  const realElapsedMs = Date.now() - epochRealTime;
  const gameElapsedMs = realElapsedMs * GAME_TIME_MULTIPLIER;
  
  const totalGameMinutes = Math.floor(gameElapsedMs / (1000 * 60));
  const totalGameHours = Math.floor(totalGameMinutes / 60);
  const gameHourOfDay = (8 + totalGameHours) % 36;
  const gameMinuteOfHour = totalGameMinutes % 60;
  const totalDays = Math.floor(gameElapsedMs / (36 * 60 * 60 * 1000));
  const dayNumber = totalDays + 1;
  
  const cal = getCalendarDateFromGameDay(dayNumber);
  const cycle = getAtmosphericCycle(gameHourOfDay);
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
    cycleTheme: cycle.theme,
    fullHeaderStr: `${cal.fullDisplay} • ${timeStr} • ${cycle.phase}`
  };
}

export function formatGameDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (remMins === 0) return `${hours}h`;
  return `${hours}h ${remMins.toString().padStart(2, '0')}m`;
}

/**
 * Parses and formats an agenda string into an accurate calendar date
 * e.g. "Jour 1 à 14:00" -> "Lundi 01/01/2100 à 14:00"
 * "02/01/2100 à 10:00" -> "Mardi 02/01/2100 à 10:00"
 */
export function formatGameAgendaDate(dateGameStr?: string): string {
  if (!dateGameStr) return 'Date à définir';
  
  const trimmed = dateGameStr.trim();

  // If already full format with weekday and date (e.g. "Lundi 01/01/2100 à 14:00")
  if (/^[A-Za-zÀ-ÿ]+\s+\d{2}\/\d{2}\/\d{4}/i.test(trimmed)) {
    return trimmed;
  }

  // If starts with standard date format "DD/MM/YYYY" (e.g. "01/01/2100 à 14:00" or "01/01/2100")
  const directDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:[àa@]\s*)(\d{1,2}[:h]\d{2}|\d{1,2}h|\d{1,2}))?/i);
  if (directDateMatch) {
    const d = parseInt(directDateMatch[1], 10);
    const m = parseInt(directDateMatch[2], 10);
    const y = parseInt(directDateMatch[3], 10);
    
    // Calculate day of week
    const baseEpoch = new Date(2100, 0, 1).getTime();
    const targetEpoch = new Date(y, m - 1, d).getTime();
    const dayDiff = Math.round((targetEpoch - baseEpoch) / (24 * 60 * 60 * 1000));
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const dayIndex = ((dayDiff % 7) + 7) % 7;
    const dayName = daysOfWeek[dayIndex];

    const dStr = String(d).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    const formattedDate = `${dayName} ${dStr}/${mStr}/${y}`;

    let timePart = directDateMatch[4];
    if (timePart) {
      timePart = timePart.replace('h', ':');
      if (!timePart.includes(':')) timePart += ':00';
      const parts = timePart.split(':');
      const formattedTime = `${parts[0].padStart(2, '0')}:${parts[1].padEnd(2, '0')}`;
      return `${formattedDate} à ${formattedTime}`;
    }
    return formattedDate;
  }
  
  // If it has "Jour X à HH:MM" or "Jour X"
  const jourMatch = trimmed.match(/Jour\s+(\d+)(?:\s*(?:[àa@]\s*)(\d{1,2}[:h]\d{2}|\d{1,2}h|\d{1,2}))?/i);
  if (jourMatch) {
    const dayNum = parseInt(jourMatch[1], 10);
    const cal = getCalendarDateFromGameDay(dayNum);
    let timePart = jourMatch[2];
    if (timePart) {
      timePart = timePart.replace('h', ':');
      if (!timePart.includes(':')) timePart += ':00';
      const parts = timePart.split(':');
      const formattedTime = `${parts[0].padStart(2, '0')}:${parts[1].padEnd(2, '0')}`;
      return `${cal.fullDisplay} à ${formattedTime}`;
    }
    return cal.fullDisplay;
  }
  
  return trimmed;
}

/**
 * Returns a sortable score for agenda dates to ensure chronological ordering
 */
export function getAgendaSortKey(dateGameStr?: string): number {
  if (!dateGameStr) return 999999999;
  
  // Try match DD/MM/YYYY
  const dateMatch = dateGameStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:[àa@]\s*)(\d{1,2})[:h](\d{2}))?/i);
  if (dateMatch) {
    const d = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const y = parseInt(dateMatch[3], 10);
    const h = dateMatch[4] ? parseInt(dateMatch[4], 10) : 12;
    const min = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
    return y * 100000000 + m * 1000000 + d * 10000 + h * 100 + min;
  }

  // Try match Jour X à HH:MM
  const jourMatch = dateGameStr.match(/Jour\s+(\d+)(?:\s*(?:[àa@]\s*)(\d{1,2})[:h](\d{2}))?/i);
  if (jourMatch) {
    const dayNum = parseInt(jourMatch[1], 10);
    const cal = getCalendarDateFromGameDay(dayNum);
    const h = jourMatch[2] ? parseInt(jourMatch[2], 10) : 12;
    const min = jourMatch[3] ? parseInt(jourMatch[3], 10) : 0;
    return cal.year * 100000000 + cal.month * 1000000 + cal.day * 10000 + h * 100 + min;
  }

  return 500000000;
}

/**
 * Calculates remaining game hours until an event's dateGameStr from current game time.
 * Returns null if the date is non-parseable (e.g. recurring or undefined).
 */
export function getGameHoursUntilEvent(dateGameStr: string | undefined, epochRealTime: number): number | null {
  if (!dateGameStr) return null;
  
  const dateInfo = getGameDateInfo(epochRealTime);
  const currentTotalHours = (dateInfo.dayNumber - 1) * 36 + dateInfo.gameHourOfDay + dateInfo.gameMinuteOfHour / 60;
  
  const fullMatch = dateGameStr.match(/^([A-Za-zÀ-ÿ]+\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:[àa@]\s*)(\d{1,2})[:h](\d{2}))?/i);
  if (fullMatch) {
    const d = parseInt(fullMatch[2], 10);
    const m = parseInt(fullMatch[3], 10);
    const y = parseInt(fullMatch[4], 10);
    const h = fullMatch[5] ? parseInt(fullMatch[5], 10) : 12;
    const min = fullMatch[6] ? parseInt(fullMatch[6], 10) : 0;
    
    // Base epoch in game is 01/01/2100 = Day 1
    const baseEpoch = new Date(2100, 0, 1).getTime();
    const targetEpoch = new Date(y, m - 1, d).getTime();
    const dayDiff = Math.round((targetEpoch - baseEpoch) / (24 * 60 * 60 * 1000));
    const targetDayNumber = dayDiff + 1;
    const targetTotalHours = (targetDayNumber - 1) * 36 + h + min / 60;
    
    return targetTotalHours - currentTotalHours;
  }
  
  const jourMatch = dateGameStr.match(/Jour\s+(\d+)(?:\s*(?:[àa@]\s*)(\d{1,2})[:h](\d{2}))?/i);
  if (jourMatch) {
    const dayNum = parseInt(jourMatch[1], 10);
    const h = jourMatch[2] ? parseInt(jourMatch[2], 10) : 12;
    const min = jourMatch[3] ? parseInt(jourMatch[3], 10) : 0;
    const targetTotalHours = (dayNum - 1) * 36 + h + min / 60;
    return targetTotalHours - currentTotalHours;
  }
  
  return null;
}

export type ImminentEvent = {
  id: string;
  title: string;
  category?: string;
  description?: string;
  dateGameStr?: string;
  hoursUntil: number;
  timeLabel: string;
};

export function getImminentAgendaEvents(
  agenda: Array<{ id: string; title: string; category?: string; description?: string; dateGameStr?: string; completed?: boolean }> | undefined,
  epochRealTime: number
): ImminentEvent[] {
  if (!agenda || agenda.length === 0) return [];
  const results: ImminentEvent[] = [];

  for (const ev of agenda) {
    if (ev.completed) continue;
    const hours = getGameHoursUntilEvent(ev.dateGameStr, epochRealTime);
    if (hours !== null && hours >= -1.0 && hours <= 3.0) {
      let timeLabel = "";
      if (hours < -0.2) {
        timeLabel = "En cours maintenant";
      } else if (hours <= 0.2) {
        timeLabel = "C'est l'heure !";
      } else if (hours < 1) {
        const mins = Math.max(5, Math.round(hours * 60));
        timeLabel = `Dans ~${mins} min`;
      } else {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        timeLabel = m > 0 ? `Dans ~${h}h${m.toString().padStart(2, '0')}` : `Dans ~${h}h`;
      }
      results.push({
        id: ev.id,
        title: ev.title,
        category: ev.category,
        description: ev.description,
        dateGameStr: ev.dateGameStr,
        hoursUntil: hours,
        timeLabel
      });
    }
  }

  return results.sort((a, b) => a.hoursUntil - b.hoursUntil);
}

export function getCheckingAccountStatus(amount: number): { label: string; badge: string; color: string } {
  if (amount >= 1000) return { label: "Aisance financière confortable", badge: "Solde très élevé", color: "text-emerald-400" };
  if (amount >= 400) return { label: "Fonds largement suffisants", badge: "Solde positif", color: "text-emerald-400" };
  if (amount >= 150) return { label: "Fonds disponibles", badge: "Solde correct", color: "text-sky-400" };
  if (amount >= 40) return { label: "Budget serré", badge: "Solde bas", color: "text-amber-400" };
  if (amount > 0) return { label: "Fonds très réduits", badge: "Solde critique", color: "text-rose-400" };
  return { label: "Compte à découvert", badge: "Découvert", color: "text-rose-500" };
}

export function getSavingsAccountStatus(amount: number): { label: string; badge: string; color: string } {
  if (amount >= 2000) return { label: "Importante réserve de sécurité", badge: "Épargne très confortable", color: "text-emerald-400" };
  if (amount >= 800) return { label: "Épargne solide", badge: "Bonne réserve", color: "text-emerald-400" };
  if (amount >= 200) return { label: "Épargne modeste", badge: "Réserve modérée", color: "text-sky-400" };
  if (amount > 0) return { label: "Petite réserve de secours", badge: "Faible réserve", color: "text-amber-400" };
  return { label: "Aucune réserve disponible", badge: "Livret vide", color: "text-slate-400" };
}

export function getDebtStatus(amount: number): { label: string; badge: string; color: string } {
  if (amount <= 0) return { label: "Aucune dette bancaire", badge: "Sans dette", color: "text-emerald-400" };
  if (amount <= 500) return { label: "Endettement modéré", badge: "Dette modérée", color: "text-amber-400" };
  return { label: "Endettement conséquent", badge: "Dette importante", color: "text-rose-400" };
}

export function getNetWorthStatus(checking: number, savings: number, debts: number): { label: string; color: string } {
  const net = checking + savings - debts;
  if (net >= 2500) return { label: "Situation financière sereine", color: "text-emerald-400" };
  if (net >= 1000) return { label: "Situation financière confortable", color: "text-emerald-400" };
  if (net >= 300) return { label: "Équilibre financier stable", color: "text-sky-400" };
  if (net >= 50) return { label: "Situation financière fragile", color: "text-amber-400" };
  return { label: "Situation financière précaire", color: "text-rose-400" };
}

export function getTransactionMagnitudeLabel(amount: number): { label: string; color: string } {
  if (amount > 500) return { label: "Rentrée majeure", color: "text-emerald-400" };
  if (amount > 100) return { label: "Rentrée significative", color: "text-emerald-400" };
  if (amount > 0) return { label: "Gain d'appoint", color: "text-emerald-400" };
  if (amount < -500) return { label: "Dépense majeure", color: "text-rose-400" };
  if (amount < -100) return { label: "Dépense conséquente", color: "text-rose-400" };
  if (amount < -30) return { label: "Dépense courante", color: "text-amber-400" };
  return { label: "Petite dépense du quotidien", color: "text-slate-300" };
}

export function getTaskProgressText(progressPct: number): string {
  if (progressPct <= 15) return "Vient de débuter";
  if (progressPct <= 40) return "En bonne voie";
  if (progressPct <= 70) return "À mi-parcours";
  if (progressPct <= 90) return "Phase finale";
  return "Presque achevé";
}

export function getQualitativeRelativeDate(dateInput?: number | string): string {
  if (!dateInput) return "Récemment";
  if (typeof dateInput === 'string') {
    return dateInput.trim();
  }
  const diffMs = Date.now() - dateInput;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffMinutes < 5) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

export function getQualitativeAge(ageInput?: string | number): string {
  if (!ageInput) return "Inconnu";
  const num = typeof ageInput === 'number' ? ageInput : parseInt(ageInput, 10);
  if (isNaN(num)) return String(ageInput);
  if (num < 20) return "Adolescence";
  if (num < 30) return "Jeune adulte";
  if (num < 45) return "Trentaine / Quarantaine";
  if (num < 65) return "Âge mûr";
  return "Senior";
}

/**
 * French word to number dictionary
 */
const FRENCH_NUMBER_WORDS: Record<string, number> = {
  "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
  "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11,
  "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16,
  "vingt": 20, "demi": 1, "demie": 1
};

/**
 * Extracts the exact quantity of ingredients mentioned in user action or text
 * (e.g., "omelette avec 4 oeufs" -> 4, "deux tranches" -> 2)
 */
export function extractIngredientQuantity(text: string, itemKeywords: string[]): number {
  if (!text) return 1;
  const lower = text.toLowerCase();
  
  const keywordsPattern = itemKeywords.join('|');
  const numberWordsPattern = Object.keys(FRENCH_NUMBER_WORDS).join('|');
  
  // 1. Explicit digits pattern: e.g. "4 oeufs", "avec 4 oeufs", "4 de mes oeufs"
  const digitRegex = new RegExp(`(?:avec|de|faire|cuisiner|utiliser|prendre|casser|battre)?\\s*(\\d+)\\s*(?:gross?es?|petit(?:es?)|beaux|belles)?\\s*(?:${keywordsPattern})`, 'i');
  const digitMatch = lower.match(digitRegex);
  if (digitMatch && digitMatch[1]) {
    const qty = parseInt(digitMatch[1], 10);
    if (!isNaN(qty) && qty > 0) return qty;
  }

  // 2. French word numbers: e.g. "quatre oeufs", "deux oeufs"
  const wordRegex = new RegExp(`(?:avec|de|faire|cuisiner|utiliser|prendre|casser|battre)?\\s*(${numberWordsPattern})\\s*(?:gross?es?|petit(?:es?)|beaux|belles)?\\s*(?:${keywordsPattern})`, 'i');
  const wordMatch = lower.match(wordRegex);
  if (wordMatch && wordMatch[1] && FRENCH_NUMBER_WORDS[wordMatch[1]]) {
    return FRENCH_NUMBER_WORDS[wordMatch[1]];
  }

  // 3. Fallbacks for specific terms like "omelette" without explicit count (default standard omelette = 2 eggs)
  if (itemKeywords.some(k => /oeuf|œuf/i.test(k))) {
    if (/omelette/i.test(lower)) {
      return 2;
    }
  }

  return 1;
}

/**
 * Normalizes item names for fuzzy inventory matching (removes accents, ligatures, packaging, counts)
 */
export function normalizeItemSearchKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/\b(?:boite\s+de|boite\s+d'|boite\s+d’|paquet\s+de|paquet\s+d'|paquet\s+d’|bocal\s+de|bocal\s+d'|bocal\s+d’|pack\s+de|pack\s+d'|pack\s+d’|bouteille\s+de|bouteille\s+d'|bouteille\s+d’|sachet\s+de|portion\s+de|lot\s+de|tranche\s+de|morceau\s+de|bocal|bouteille|panier\s+de|pack|gourde\s+d'|gourde\s+de)\b/gi, "")
    .replace(/\b(?:fermiers?|artisanals?|frais|fraiche|fraiches|secs?|moulu|torrefie|nature|isotherme|filtree)\b/gi, "")
    .replace(/[0-9]+(?:\s*g|\s*kg|\s*cl|\s*l|\s*ml|\s*x)?/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds the best matching item in inventory by ID, exact name, or fuzzy/ingredient match across locations
 */
export function findMatchingInventoryItemIndex(
  inventory: Array<{ id: string; name: string; location?: string; quantity: number }>,
  targetName: string,
  targetId?: string,
  preferredLocation?: string
): number {
  if (!inventory || inventory.length === 0) return -1;

  // 1. Exact ID match
  if (targetId) {
    const idIdx = inventory.findIndex(i => i.id === targetId);
    if (idIdx !== -1) return idIdx;
  }

  const cleanTarget = targetName.trim().toLowerCase();
  const normTarget = normalizeItemSearchKey(targetName);

  // 2. Exact name + exact location match
  if (preferredLocation) {
    const exactLocIdx = inventory.findIndex(i => 
      i.name.trim().toLowerCase() === cleanTarget && i.location === preferredLocation
    );
    if (exactLocIdx !== -1) return exactLocIdx;
  }

  // 3. Exact name across any location
  const exactAnyIdx = inventory.findIndex(i => i.name.trim().toLowerCase() === cleanTarget);
  if (exactAnyIdx !== -1) return exactAnyIdx;

  // 4. Normalized key matching (preferred location first, then any)
  const candidateScores = inventory.map((item, idx) => {
    const cleanItemName = item.name.trim().toLowerCase();
    const normItemName = normalizeItemSearchKey(item.name);
    
    let score = 0;
    if (preferredLocation && item.location === preferredLocation) {
      score += 15;
    }

    if (normItemName === normTarget && normTarget.length > 0) {
      score += 100;
    } else if (normTarget.length > 2 && (normItemName.includes(normTarget) || normTarget.includes(normItemName))) {
      score += 60;
    } else {
      // Word overlap (e.g. "oeufs" in "boite de 6 oeufs")
      const targetWords = normTarget.split(" ").filter(w => w.length > 2);
      const itemWords = normItemName.split(" ").filter(w => w.length > 2);
      const matches = targetWords.filter(tw => itemWords.some(iw => iw.includes(tw) || tw.includes(iw)));
      if (matches.length > 0) {
        score += matches.length * 30;
      }
    }

    return { idx, score };
  });

  candidateScores.sort((a, b) => b.score - a.score);
  if (candidateScores.length > 0 && candidateScores[0].score >= 25) {
    return candidateScores[0].idx;
  }

  return -1;
}


