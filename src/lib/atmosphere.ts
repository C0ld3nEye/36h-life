import { CycleAtmosphereTheme, CyclePhaseKey } from '../types';

export const CYCLE_36H_ATMOSPHERES: Record<CyclePhaseKey, CycleAtmosphereTheme> = {
  aube: {
    key: 'aube',
    phaseName: 'Aube naissante',
    subtext: 'Premières lueurs dorées & Brise fraîche',
    skyGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    ambientTone: 'text-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.12)',
    accentBorder: 'border-amber-500/30',
    lightingDescription: 'Le soleil émerge à l\'horizon d\'Aethelis, parant les toitures du quartier Saint-Michel de reflets d\'ambre et d\'or rose.'
  },
  matin: {
    key: 'matin',
    phaseName: 'Matinée lumineuse',
    subtext: 'Plein jour & Effervescence urbaine',
    skyGradient: 'from-sky-950/40 via-slate-900 to-slate-950',
    ambientTone: 'text-sky-300',
    glowColor: 'rgba(56, 189, 248, 0.12)',
    accentBorder: 'border-sky-500/30',
    lightingDescription: 'Une lumière claire et vive baigne les terrasses et avenues, accompagnant le flux régulier des passants et des commerces.'
  },
  zenith: {
    key: 'zenith',
    phaseName: 'Zénith solaire',
    subtext: 'Plein éclat du cycle & Chaleur rayonnante',
    skyGradient: 'from-blue-950/50 via-slate-900 to-slate-950',
    ambientTone: 'text-cyan-300',
    glowColor: 'rgba(6, 182, 212, 0.15)',
    accentBorder: 'border-cyan-500/30',
    lightingDescription: 'Le soleil atteint son point culminant au 18e rang du cycle de 36 heures, illuminant chaque détail architectural de la cité.'
  },
  apres_midi: {
    key: 'apres_midi',
    phaseName: 'Après-midi prolongé',
    subtext: 'Lumière cuivrée étirée & Douceur de vivre',
    skyGradient: 'from-orange-950/40 via-slate-900 to-slate-950',
    ambientTone: 'text-orange-300',
    glowColor: 'rgba(249, 115, 22, 0.12)',
    accentBorder: 'border-orange-500/30',
    lightingDescription: 'Les ombres s\'allongent lentement sous une lumière cuivrée et apaisante caractéristique de ce cycle étendu.'
  },
  crepuscule: {
    key: 'crepuscule',
    phaseName: 'Crépuscule doré',
    subtext: 'Ciel pourpre & Allumage des réverbères',
    skyGradient: 'from-purple-950/50 via-slate-900 to-slate-950',
    ambientTone: 'text-purple-300',
    glowColor: 'rgba(168, 85, 247, 0.15)',
    accentBorder: 'border-purple-500/30',
    lightingDescription: 'Les teintes violettes et magenta embrasent l\'horizon alors que les néons et réverbères urbains s\'illuminent doucement.'
  },
  nuit: {
    key: 'nuit',
    phaseName: 'Nuit profonde & Heures calmes',
    subtext: 'Voûte étoilée & Grand silence nocturne',
    skyGradient: 'from-indigo-950/40 via-slate-900 to-slate-950',
    ambientTone: 'text-indigo-300',
    glowColor: 'rgba(99, 102, 241, 0.10)',
    accentBorder: 'border-indigo-500/30',
    lightingDescription: 'Le calme enveloppe la ville sous un ciel constellé d\'étoiles, propice au repos réparateur et aux songes.'
  }
};

export function getAtmosphereForHour(gameHourOfDay: number): CycleAtmosphereTheme {
  const normalized = ((gameHourOfDay % 36) + 36) % 36;
  if (normalized >= 5 && normalized < 10) return CYCLE_36H_ATMOSPHERES.aube;
  if (normalized >= 10 && normalized < 16) return CYCLE_36H_ATMOSPHERES.matin;
  if (normalized >= 16 && normalized < 22) return CYCLE_36H_ATMOSPHERES.zenith;
  if (normalized >= 22 && normalized < 28) return CYCLE_36H_ATMOSPHERES.apres_midi;
  if (normalized >= 28 && normalized < 32) return CYCLE_36H_ATMOSPHERES.crepuscule;
  return CYCLE_36H_ATMOSPHERES.nuit;
}
