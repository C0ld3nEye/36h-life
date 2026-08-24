import React, { useState, useMemo } from 'react';
import { 
  Map, MapPin, Compass, Navigation, ArrowRight, Clock, 
  Sparkles, Building, Home, ShoppingBag, Info, X, Search,
  ChevronRight, Footprints, Train, ExternalLink, RefreshCw, Loader2, ZoomIn, Trash2
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { LocationProfile, TransitRoute } from '../types';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { compressImageDataUrl } from '../lib/imageCompressor';

interface DistrictZone {
  id: string;
  name: string;
  theme: string;
  color: string;
  borderColor: string;
  bgGradient: string;
  badgeBg: string;
  description: string;
  vibe: string;
}

const DISTRICT_ZONES: DistrictZone[] = [
  {
    id: 'saint-michel',
    name: 'Quartier Saint-Michel',
    theme: 'Résidentiel & Tradition',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    bgGradient: 'from-indigo-950/40 to-slate-900/80',
    badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    description: 'Vie de quartier animée, ruelles pavées, bistrots chaleureux et résidences élégantes sous la verrière urbaine.',
    vibe: 'Atmosphère vivante et conviviale'
  },
  {
    id: 'lumina',
    name: 'Centre Lumina & Verrières',
    theme: 'Commerces & Affaires',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgGradient: 'from-amber-950/40 to-slate-900/80',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    description: 'Boutiques technologiques, galeries commerciales suspendues et avenues lumineuses baignées par la lumière du cycle.',
    vibe: 'Effervescence continue'
  },
  {
    id: 'docks',
    name: 'Docks Sud & Voies de Fret',
    theme: 'Industrie & Transports',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgGradient: 'from-emerald-950/40 to-slate-900/80',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    description: 'Terminus des monorails, entrepôts automatisés, ateliers de maintenance et accès aux berges fluviales.',
    vibe: 'Activité laborieuse et transit'
  },
  {
    id: 'hauts',
    name: 'Hauts Plateaux & Belvédères',
    theme: 'Panorama & Sérénité',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgGradient: 'from-purple-950/40 to-slate-900/80',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    description: 'Parcs suspendus, observatoires astronomiques calibrés pour les 36 heures et terrasses panoramiques calmes.',
    vibe: 'Détente et recul'
  }
];

function getCategoryIcon(category?: LocationProfile['category']) {
  switch (category) {
    case 'domicile': return Home;
    case 'travail': return Building;
    case 'commerce': return ShoppingBag;
    case 'lieu_clef': return Sparkles;
    default: return MapPin;
  }
}

function getCategoryColor(category?: LocationProfile['category']) {
  switch (category) {
    case 'domicile': return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    case 'travail': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'commerce': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'lieu_clef': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    default: return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
  }
}

interface InteractiveCityMapProps {
  onSelectLocation?: (location: LocationProfile) => void;
  onFastTravelAction?: (actionText: string) => void;
  onImageClick?: (src: string, title: string) => void;
}

export function InteractiveCityMap({ onSelectLocation, onFastTravelAction, onImageClick }: InteractiveCityMapProps) {
  const { locations = {}, setCurrentLocation, updateLocationImage } = useGameStore();
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [activeLocDetails, setActiveLocDetails] = useState<LocationProfile | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [isTraveling, setIsTraveling] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const locList = useMemo(() => Object.values(locations), [locations]);

  const currentLocation = useMemo(() => {
    return locList.find(l => l.isCurrentLocation) || locList[0] || null;
  }, [locList]);

  const handleGenerateMapLocVisual = async (loc: LocationProfile) => {
    if (isGeneratingImg) return;
    setIsGeneratingImg(true);
    try {
      const prompt = `${loc.name}, ${loc.district || ''}, ${loc.description}`;
      const res = await api.generateVisual(prompt, 'location', loc.id);
      const compressedUrl = await compressImageDataUrl(res.imageUrl);
      updateLocationImage(loc.id, compressedUrl);
      setActiveLocDetails(prev => prev && prev.id === loc.id ? { ...prev, imageUrl: compressedUrl } : prev);
    } catch (err) {
      console.error("Failed to generate location visual from map:", err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleDeleteMapLocVisual = (loc: LocationProfile) => {
    updateLocationImage(loc.id, undefined);
    setActiveLocDetails(prev => prev && prev.id === loc.id ? { ...prev, imageUrl: undefined } : prev);
  };

  // Group locations by district or matching
  const filteredLocs = useMemo(() => {
    const q = mapSearch.toLowerCase().trim();
    return locList.filter(loc => {
      const matchSearch = !q || loc.name.toLowerCase().includes(q) || (loc.district && loc.district.toLowerCase().includes(q)) || loc.description.toLowerCase().includes(q);
      const matchDistrict = selectedDistrict === 'all' || (loc.district && loc.district.toLowerCase().includes(selectedDistrict)) || (!loc.district && selectedDistrict === 'saint-michel');
      return matchSearch && matchDistrict;
    });
  }, [locList, mapSearch, selectedDistrict]);

  const handleTravelTo = (loc: LocationProfile, mode: 'a_pied' | 'transport' = 'a_pied') => {
    const isWalking = mode === 'a_pied';
    const estimatedMinutes = isWalking ? 20 : 10;
    const modeLabel = isWalking ? "à pied (~20 min)" : "en monorail express (~10 min)";
    const prompt = `Je me déplace ${modeLabel} en direction de : "${loc.name}" (${loc.district || 'la ville'}). Décris mon trajet et mon arrivée sur place.`;
    
    if (onFastTravelAction) {
      onFastTravelAction(prompt);
      setActiveLocDetails(null);
    } else {
      // Direct update with state transition
      setCurrentLocation(loc.id);
      setActiveLocDetails(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 max-w-6xl mx-auto w-full">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-3 shrink-0 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Carte des Quartiers & Lieux</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {locList.length} lieux explorés
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Position actuelle : <strong className="text-emerald-300">{currentLocation ? currentLocation.name : 'Quartier Saint-Michel'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* District Selector & Search */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-1">
          {/* District Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
            <button
              onClick={() => setSelectedDistrict('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                selectedDistrict === 'all'
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10"
              )}
            >
              Tous les secteurs
            </button>
            {DISTRICT_ZONES.map(z => (
              <button
                key={z.id}
                onClick={() => setSelectedDistrict(z.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                  selectedDistrict === z.id
                    ? "bg-slate-800 text-slate-100 border-emerald-400 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-white/10"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", z.color.replace('text-', 'bg-'))} />
                <span>{z.name}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Rechercher un lieu..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Map Content View: District Grid Layout with Interactive Landmarks */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
        {/* Visual District Atlas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DISTRICT_ZONES.map(zone => {
            const isSelected = selectedDistrict === 'all' || selectedDistrict === zone.id;
            const districtLocs = locList.filter(l => (l.district && l.district.toLowerCase().includes(zone.id)) || (!l.district && zone.id === 'saint-michel'));

            if (!isSelected && districtLocs.length === 0) return null;

            return (
              <div 
                key={zone.id}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col gap-3 transition-all relative overflow-hidden bg-gradient-to-br",
                  zone.bgGradient,
                  zone.borderColor,
                  "shadow-lg"
                )}
              >
                {/* District Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full", zone.color.replace('text-', 'bg-'))} />
                      <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                        {zone.name}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                      {zone.theme} • {zone.vibe}
                    </span>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", zone.badgeBg)}>
                    {districtLocs.length} {districtLocs.length > 1 ? 'lieux' : 'lieu'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-serif">
                  {zone.description}
                </p>

                {/* Landmarks in this district */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-2 mt-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lieux & Bâtiments Découverts :
                  </span>
                  
                  {districtLocs.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-500 italic">
                      Aucun lieu spécifique encore cartographié dans ce secteur.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {districtLocs.map(loc => {
                        const Icon = getCategoryIcon(loc.category);
                        const isHere = loc.isCurrentLocation || (currentLocation && currentLocation.id === loc.id);

                        return (
                          <button
                            key={loc.id}
                            onClick={() => setActiveLocDetails(loc)}
                            className={cn(
                              "p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all group relative overflow-hidden",
                              isHere 
                                ? "bg-emerald-950/50 border-emerald-500/50 shadow-emerald-950/30" 
                                : "bg-slate-900/80 hover:bg-slate-800 border-white/10 hover:border-emerald-500/30"
                            )}
                          >
                            {loc.imageUrl && (
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-white/10 shrink-0 relative mb-0.5">
                                <img 
                                  src={loc.imageUrl} 
                                  alt={loc.name} 
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => { e.stopPropagation(); if(onImageClick) onImageClick(loc.imageUrl, loc.name); }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon className={cn("w-3.5 h-3.5 shrink-0", isHere ? "text-emerald-300" : "text-slate-400 group-hover:text-emerald-400")} />
                                <span className={cn("text-xs font-bold truncate", isHere ? "text-emerald-200" : "text-slate-200 group-hover:text-white")}>
                                  {loc.name}
                                </span>
                              </div>
                              {isHere && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  ICI
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {loc.description}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-emerald-400 font-medium pt-1 mt-auto">
                              <span className="text-slate-500">Explorer</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">Détails →</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Directory of All Explored Locations */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Répertoire Rapide de Navigation</span>
            </h3>
            <span className="text-xs text-slate-400">{filteredLocs.length} résultats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredLocs.map(loc => {
              const Icon = getCategoryIcon(loc.category);
              const isHere = loc.isCurrentLocation || (currentLocation && currentLocation.id === loc.id);

              return (
                <div
                  key={loc.id}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col gap-2 transition-all overflow-hidden group",
                    isHere 
                      ? "bg-emerald-950/40 border-emerald-500/40" 
                      : "bg-slate-950/60 border-white/10 hover:border-white/20"
                  )}
                >
                  {loc.imageUrl && (
                    <div className="w-full h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                      <img 
                                  src={loc.imageUrl} 
                                  alt={loc.name} 
                                  referrerPolicy="no-referrer"
                                  onClick={(e) => { e.stopPropagation(); if(onImageClick) onImageClick(loc.imageUrl, loc.name); }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-100 truncate">{loc.name}</h4>
                        <span className="text-[10px] text-slate-400 truncate block">{loc.district || 'Saint-Michel'}</span>
                      </div>
                    </div>
                    {isHere && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        VOUS ÊTES ICI
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed font-serif">
                    {loc.description}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
                    <button
                      onClick={() => setActiveLocDetails(loc)}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-medium"
                    >
                      <Info className="w-3 h-3" />
                      <span>Fiche</span>
                    </button>
                    {!isHere && (
                      <button
                        onClick={() => handleTravelTo(loc, 'a_pied')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Footprints className="w-3 h-3" />
                        <span>S'y rendre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Location Modal / Transit Drawer */}
      {activeLocDetails && (
        <div 
          onClick={() => setActiveLocDetails(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-white/20 rounded-2xl max-w-lg w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-100 text-base truncate">{activeLocDetails.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{activeLocDetails.district || 'Quartier Saint-Michel'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveLocDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-slate-200">
              {activeLocDetails.imageUrl ? (
                <div className="w-full h-44 rounded-xl overflow-hidden border border-emerald-500/30 relative group">
                  <img 
                    src={activeLocDetails.imageUrl} 
                    alt={activeLocDetails.name}
                    referrerPolicy="no-referrer"
                    onClick={(e) => { e.stopPropagation(); if(onImageClick) onImageClick(activeLocDetails.imageUrl, activeLocDetails.name); }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteMapLocVisual(activeLocDetails)}
                      className="p-2 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/30 transition-all flex items-center gap-1 text-xs font-semibold backdrop-blur-sm shadow-md"
                      title="Supprimer l'illustration"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Supprimer</span>
                    </button>
                    <button
                      onClick={() => handleGenerateMapLocVisual(activeLocDetails)}
                      disabled={isGeneratingImg}
                      className="p-2 bg-black/80 hover:bg-black text-emerald-300 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm shadow-md"
                      title="Générer une nouvelle vue pour ce lieu"
                    >
                      {isGeneratingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Régénérer</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl bg-slate-950 border border-dashed border-emerald-500/30 flex flex-col items-center justify-center gap-2 text-slate-500 p-3 text-center">
                  <MapPin className="w-8 h-8 text-emerald-400/50" />
                  <span className="text-xs text-slate-400">Aucune illustration pour ce lieu</span>
                  <button
                    onClick={() => handleGenerateMapLocVisual(activeLocDetails)}
                    disabled={isGeneratingImg}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isGeneratingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Générer l'illustration du lieu</span>
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Description</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-serif bg-slate-900/60 p-3 rounded-xl border border-white/5">
                  {activeLocDetails.description}
                </p>
              </div>

              {activeLocDetails.keyFeatures && activeLocDetails.keyFeatures.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Équipements & Particularités</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLocDetails.keyFeatures.map((feat, i) => (
                      <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Fast Travel Actions */}
              {!(activeLocDetails.isCurrentLocation || (currentLocation && currentLocation.id === activeLocDetails.id)) && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Itinéraires & Déplacements</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTravelTo(activeLocDetails, 'a_pied')}
                      className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Footprints className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100">Trajet à pied</span>
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">~20 min</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Balade urbaine rythmée</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
  
                    <button
                      onClick={() => handleTravelTo(activeLocDetails, 'transport')}
                      className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-sky-500/40 text-left flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-sky-400" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100">Monorail / Navette</span>
                            <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-500/30">~10 min</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Déplacement rapide sécurisé</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
