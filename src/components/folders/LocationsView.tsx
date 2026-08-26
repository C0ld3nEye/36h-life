import React, { useState } from 'react';
import { Map, MapPin, Compass, Book, Sparkles, Users, X, Edit3, Trash2, RefreshCw, ZoomIn, Loader2, Home, Building, ShoppingBag, User, Clock, AlertCircle } from 'lucide-react';
import { cn, getGameDateInfo } from '../../lib/utils';
import { useGameStore } from '../../state/useGameState';
import { LocationProfile } from '../../types';
import { DeterministicRulesEngine } from '../../engine/rulesEngine';
import { api } from '../../lib/api';
import { compressImageDataUrl } from '../../lib/imageCompressor';
import { InteractiveCityMap } from '../InteractiveCityMap';

function getLocationCategoryBadge(category?: LocationProfile['category']) {
  switch (category) {
    case 'domicile': return { label: 'Domicile / Residence', icon: Home, bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
    case 'travail': return { label: 'Lieu de travail', icon: Building, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    case 'commerce': return { label: 'Commerce / Services', icon: ShoppingBag, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'lieu_clef': return { label: 'Lieu Clef', icon: Sparkles, bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    case 'interet': return { label: "Point d'interet", icon: MapPin, bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
    default: return { label: 'Lieu Explore', icon: MapPin, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

interface LocationsViewProps {
  searchQuery: string;
  showToast: (msg: string) => void;
  onLightbox: (src: string, title: string) => void;
}

export function LocationsView({ searchQuery, showToast, onLightbox }: LocationsViewProps) {
  const { locations, characters, epochRealTime, updateLocationNotes, updateLocationImage, deleteLocation } = useGameStore();
  const timeInfo = getGameDateInfo(epochRealTime);
  const locArray = Object.values(locations);
  const q = searchQuery.toLowerCase().trim();
  const filteredLocs = locArray.filter(l => !q || l.name.toLowerCase().includes(q) || (l.district && l.district.toLowerCase().includes(q)) || (l.description && l.description.toLowerCase().includes(q)));

  const [locationViewMode, setLocationViewMode] = useState<'map' | 'list'>('map');
  const [selectedLoc, setSelectedLoc] = useState<LocationProfile | null>(null);
  const [locNotesEdit, setLocNotesEdit] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [selectedChar, setSelectedChar] = useState<any>(null);

  const openLocModal = (loc: LocationProfile) => { setSelectedLoc(loc); setLocNotesEdit(loc.notes || ''); setSaveSuccess(false); };

  const handleSaveLocNotes = () => {
    if (selectedLoc) {
      updateLocationNotes(selectedLoc.id, locNotesEdit);
      setSelectedLoc({ ...selectedLoc, notes: locNotesEdit });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleGenerateLocVisual = async () => {
    if (!selectedLoc || isGeneratingImg) return;
    setIsGeneratingImg(true);
    try {
      const prompt = `${selectedLoc.name}, ${selectedLoc.district || ''}, ${selectedLoc.description}`;
      const res = await api.generateVisual(prompt, 'location', selectedLoc.id);
      const compressedUrl = await compressImageDataUrl(res.imageUrl);
      updateLocationImage(selectedLoc.id, compressedUrl);
      setSelectedLoc(prev => prev ? { ...prev, imageUrl: compressedUrl } : null);
      showToast("Illustration générée avec succès !");
    } catch (err) {
      console.error('Failed to generate location visual:', err);
      showToast("Impossible de générer l'illustration pour l'instant.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleDeleteLocVisual = () => {
    if (!selectedLoc) return;
    updateLocationImage(selectedLoc.id, undefined);
    setSelectedLoc(prev => prev ? { ...prev, imageUrl: undefined } : null);
  };

  return (
    <>
      <div className="flex flex-col gap-3 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setLocationViewMode('map')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5', locationViewMode==='map'?'bg-emerald-600 text-white':'text-slate-400 hover:text-slate-200 hover:bg-white/5')}><Compass className="w-3.5 h-3.5"/><span>Carte des Secteurs</span></button>
            <button onClick={() => setLocationViewMode('list')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5', locationViewMode==='list'?'bg-emerald-600 text-white':'text-slate-400 hover:text-slate-200 hover:bg-white/5')}><MapPin className="w-3.5 h-3.5"/><span>Fiches des Lieux ({locArray.length})</span></button>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">Systeme de geolocalisation urbaine</span>
        </div>

        {locationViewMode === 'map' ? (
          <div className="bg-slate-950/80 rounded-2xl border border-white/10 overflow-hidden min-h-[500px]">
            <InteractiveCityMap
              onSelectLocation={(loc) => openLocModal(loc)}
              onImageClick={(src, title) => onLightbox(src, title)}
              onFastTravelAction={(actionText) => {
                useGameStore.getState().addNarrative('user', actionText);
                api.performAction({ action: actionText, state: useGameStore.getState(), force: true })
                  .then(res => { useGameStore.getState().processActionResponse(res); showToast('Deplacement effectue !'); })
                  .catch(err => console.error('Travel action error', err));
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredLocs.length === 0 ? (
              <div className="text-center py-12 px-4 col-span-full"><Map className="w-10 h-10 text-slate-600 mx-auto mb-2"/><p className="text-slate-400 italic text-sm">{searchQuery ? 'Aucun lieu ne correspond.' : 'Aucun lieu repertorie.'}</p></div>
            ) : (
              filteredLocs.map(loc => {
                const catBadge = getLocationCategoryBadge(loc.category);
                const CatIcon = catBadge.icon;
                const openStatus = DeterministicRulesEngine.isLocationOpen(loc, timeInfo.gameHourOfDay);
                const npcsHere = Object.values(characters).filter(c => c.currentLocationId === loc.id || c.locationEncountered === loc.name);

                return (
                  <div key={loc.id} onClick={() => openLocModal(loc)} className="relative bg-slate-900/90 p-3 rounded-xl border border-white/10 flex flex-col gap-2 hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all group cursor-pointer overflow-hidden">
                    <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); if(confirm(`Supprimer "${loc.name}" des archives ?`)){deleteLocation(loc.id);} }} className="p-1.5 bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white rounded-md border border-rose-500/50 transition-all" title="Supprimer"><X className="w-4 h-4"/></button>
                    </div>
                    {loc.imageUrl && (
                      <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 relative group/img">
                        <img src={loc.imageUrl} alt={loc.name} referrerPolicy="no-referrer" onClick={(e) => { e.stopPropagation(); onLightbox(loc.imageUrl!, loc.name); }} className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer relative z-20"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"/>
                        <div onClick={(e) => { e.stopPropagation(); onLightbox(loc.imageUrl!, loc.name); }} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[1px]"><ZoomIn className="w-6 h-6 text-white"/></div>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-2 min-w-0"><CatIcon className="w-4 h-4 text-emerald-400 shrink-0"/><h3 className="font-bold text-emerald-300 text-sm group-hover:text-emerald-200 truncate">{loc.name}</h3></div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn('text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border', openStatus.isOpen ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20')}>{openStatus.isOpen ? 'Ouvert' : 'Fermé'}</span>
                        <span className={cn('text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border', catBadge.bg)}>{catBadge.label}</span>
                      </div>
                    </div>
                    {loc.district && <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-slate-500 shrink-0"/><span className="truncate">{loc.district}</span></div>}
                    {npcsHere.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium truncate">
                        <Users className="w-3 h-3 shrink-0 text-amber-400" />
                        <span className="truncate">{npcsHere.map(c => c.name).join(', ')}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{loc.description}</p>
                    <div className="pt-1.5 border-t border-white/5 text-[10px] text-emerald-400 font-medium flex items-center justify-between mt-auto">
                      <span className="text-slate-500">Lieu répertorié</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">Voir la fiche →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selectedLoc && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setSelectedLoc(null); }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-950 border border-emerald-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 sm:w-6 sm:h-6"/></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">{selectedLoc.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={cn('text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0', getLocationCategoryBadge(selectedLoc.category).bg)}>{getLocationCategoryBadge(selectedLoc.category).label}</span>
                    {selectedLoc.district && <span className="text-xs text-slate-400 truncate">• {selectedLoc.district}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedLoc(null)} className="p-2 text-slate-200 bg-slate-900 border border-white/20 hover:bg-emerald-900/60 rounded-full shrink-0 active:scale-95 cursor-pointer" title="Fermer"><X className="w-5 h-5 text-emerald-300"/></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 custom-scrollbar">
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-3">
                {selectedLoc.imageUrl ? (
                  <div className="relative group w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-emerald-500/30">
                    <img src={selectedLoc.imageUrl} alt={selectedLoc.name} referrerPolicy="no-referrer" onClick={() => onLightbox(selectedLoc.imageUrl!, selectedLoc.name)} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"/>
                    <button onClick={() => onLightbox(selectedLoc.imageUrl!, selectedLoc.name)} className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-black text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm"><ZoomIn className="w-3.5 h-3.5 text-emerald-400"/><span>Agrandir</span></button>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      <button onClick={handleDeleteLocVisual} className="p-2 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/30 flex items-center gap-1 text-xs backdrop-blur-sm"><Trash2 className="w-3.5 h-3.5"/><span className="hidden sm:inline">Supprimer</span></button>
                      <button onClick={handleGenerateLocVisual} disabled={isGeneratingImg} className="p-2 bg-black/80 hover:bg-black text-emerald-300 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 text-xs backdrop-blur-sm">{isGeneratingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400"/> : <RefreshCw className="w-3.5 h-3.5"/>}<span>Regenerer</span></button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-xl bg-slate-950 border border-dashed border-emerald-500/30 flex flex-col items-center justify-center gap-2 text-slate-500 p-3 text-center">
                    <MapPin className="w-8 h-8 text-emerald-400/50"/>
                    <span className="text-xs text-slate-400">Aucune illustration</span>
                    <button onClick={handleGenerateLocVisual} disabled={isGeneratingImg} className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                      {isGeneratingImg ? <><Loader2 className="w-4 h-4 animate-spin text-emerald-400"/><span>Generation...</span></> : <><Sparkles className="w-4 h-4 text-emerald-400"/><span>Generer le visuel AI</span></>}
                    </button>
                  </div>
                )}
              </div>

              {/* Living City: Open/Closed & NPCs in modal */}
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <span className={cn(
                  "text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5",
                  DeterministicRulesEngine.isLocationOpen(selectedLoc, timeInfo.gameHourOfDay).isOpen 
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                )}>
                  <span>{DeterministicRulesEngine.isLocationOpen(selectedLoc, timeInfo.gameHourOfDay).isOpen ? "● Lieu ouvert & accessible" : "● Actuellement fermé"}</span>
                </span>
                {DeterministicRulesEngine.isLocationOpen(selectedLoc, timeInfo.gameHourOfDay).reason && (
                  <span className="text-xs text-rose-300/90 italic">
                    ({DeterministicRulesEngine.isLocationOpen(selectedLoc, timeInfo.gameHourOfDay).reason})
                  </span>
                )}
              </div>

              {/* Present NPCs in this location */}
              {Object.values(characters).filter(c => c.currentLocationId === selectedLoc.id || c.locationEncountered === selectedLoc.name).length > 0 && (
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-amber-500/20">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Personnages actuellement sur les lieux :</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.values(characters)
                      .filter(c => c.currentLocationId === selectedLoc.id || c.locationEncountered === selectedLoc.name)
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedLoc(null); setSelectedChar(c); }}
                          className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1"
                        >
                          <User className="w-3 h-3 text-amber-400" />
                          <span>{c.name} {c.occupation ? `(${c.occupation})` : ''}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-1"><h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5"><Book className="w-3.5 h-3.5"/><span>Description complete</span></h4><p className="text-xs text-slate-200 bg-slate-900/60 p-3.5 rounded-xl border border-white/5 leading-relaxed font-serif">{selectedLoc.description}</p></div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/><span>Equipements et Caracteristiques</span></h4>
                {selectedLoc.keyFeatures && selectedLoc.keyFeatures.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">{selectedLoc.keyFeatures.map((feat, i) => <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-medium">OK {feat}</span>)}</div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-900/40 p-2.5 rounded-xl border border-white/5">Aucun equipement liste.</p>
                )}
              </div>

              {selectedLoc.associatedCharacters && selectedLoc.associatedCharacters.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/><span>Personnages associes</span></h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLoc.associatedCharacters.map((charNameOrId, i) => {
                      const targetChar = characters[charNameOrId] || Object.values(characters).find(c => c.name.toLowerCase() === charNameOrId.toLowerCase());
                      return (
                        <button key={i} onClick={() => { if(targetChar){setSelectedLoc(null);setSelectedChar(targetChar);} }}
                          className={cn('text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-all', targetChar?'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30 cursor-pointer':'bg-slate-900 text-slate-400 border-white/10 cursor-default')}>
                          <User className="w-3 h-3 text-rose-400"/><span>{targetChar ? targetChar.name : charNameOrId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between"><h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5 text-emerald-400"/><span>Notes personnelles</span></h4>{saveSuccess && <span className="text-xs text-emerald-400 font-bold animate-pulse">Enregistré</span>}</div>
                <textarea value={locNotesEdit} onChange={(e) => setLocNotesEdit(e.target.value)} placeholder="Ajoutez vos remarques sur ce lieu..." className="w-full h-20 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"/>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedLoc(null)} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-white/10 flex items-center gap-1.5"><X className="w-3.5 h-3.5"/><span>Fermer</span></button>
                    <button onClick={() => { if(confirm(`Supprimer "${selectedLoc.name}" ?`)){deleteLocation(selectedLoc.id);setSelectedLoc(null);showToast(`Fiche de "${selectedLoc.name}" supprimée.`);} }} className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-rose-400"/><span>Supprimer</span></button>
                  </div>
                  <button onClick={handleSaveLocNotes} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl">Enregistrer les notes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Character Profile Modal from Location */}
      {selectedChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedChar(null)}>
          <div className="relative w-full max-w-lg bg-slate-950/95 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-28 bg-gradient-to-r from-amber-950/60 to-slate-900 flex items-end p-4 border-b border-white/10">
              <button onClick={() => setSelectedChar(null)} className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full border border-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-lg">
                  {selectedChar.imageUrl ? (
                    <img src={selectedChar.imageUrl} alt={selectedChar.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <User className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">{selectedChar.name}</h3>
                  <p className="text-xs text-amber-400">{selectedChar.occupation || 'Habitant de Saint-Michel'}</p>
                </div>
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {selectedChar.relationshipStatus && (
                <div className="text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Lien relationnel :</span>
                  <span className="text-amber-300 font-bold uppercase tracking-wider">{selectedChar.relationshipStatus}</span>
                </div>
              )}
              {selectedChar.background && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Parcours & Profil</h4>
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-white/5 leading-relaxed">{selectedChar.background}</p>
                </div>
              )}
              {selectedChar.notes && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes & Impressions</h4>
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-white/5 leading-relaxed italic">{selectedChar.notes}</p>
                </div>
              )}
              <div className="pt-2 flex justify-end">
                <button onClick={() => setSelectedChar(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-white/10">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
