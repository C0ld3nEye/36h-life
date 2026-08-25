export function getAtmosphericCycleDetails(gameHourOfDay: number) {
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

export function getCalendarDateFromGameDayServer(dayNumber: number) {
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

export function getGameDateInfoServer(epochRealTime?: number) {
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
