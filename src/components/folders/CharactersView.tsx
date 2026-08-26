import React, { useState } from 'react';
import { Users, User, X, MapPin, Briefcase, Book, Eye, Edit3, CreditCard, Clock, Calendar, Loader2, Sparkles, Trash2, ZoomIn } from 'lucide-react';
import { cn, getQualitativeAge } from '../../lib/utils';
import { useGameStore } from '../../state/useGameState';
import { CharacterProfile } from '../../types';
import { api } from '../../lib/api';
import { compressImageDataUrl } from '../../lib/imageCompressor';

interface CharactersViewProps {
  searchQuery: string;
  showToast: (msg: string) => void;
  onLightbox: (src: string, title: string) => void;
}

export function CharactersView({ searchQuery, showToast, onLightbox }: CharactersViewProps) {
  const { characters, locations, updateCharacterNotes, updateCharacterImage, deleteCharacter } = useGameStore();
  const charArray = Object.values(characters);
  const q = searchQuery.toLowerCase().trim();
  const filteredChars = charArray.filter(c => !q || c.name.toLowerCase().includes(q) || (c.occupation && c.occupation.toLowerCase().includes(q)) || (c.relationshipStatus && c.relationshipStatus.toLowerCase().includes(q)));

  const [selectedChar, setSelectedChar] = useState<CharacterProfile | null>(null);
  const [charNotesEdit, setCharNotesEdit] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const openCharModal = (char: CharacterProfile) => { setSelectedChar(char); setCharNotesEdit(char.notes || ''); setSaveSuccess(false); };

  const handleSaveCharNotes = () => {
    if (selectedChar) {
      updateCharacterNotes(selectedChar.id, charNotesEdit);
      setSelectedChar({ ...selectedChar, notes: charNotesEdit });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleGenerateCharVisual = async () => {
    if (!selectedChar || isGeneratingImg) return;
    setIsGeneratingImg(true);
    try {
      const prompt = `${selectedChar.name}, ${selectedChar.age || ''}, ${selectedChar.occupation || ''}, ${selectedChar.appearance || ''}`;
      const res = await api.generateVisual(prompt, 'character', selectedChar.id);
      const compressedUrl = await compressImageDataUrl(res.imageUrl);
      updateCharacterImage(selectedChar.id, compressedUrl);
      setSelectedChar(prev => prev ? { ...prev, imageUrl: compressedUrl } : null);
    } catch (err) { console.error('Failed to generate character visual:', err); }
    finally { setIsGeneratingImg(false); }
  };

  const relStatus = (s?: string) => {
    if (s === 'amical') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s === 'amoureux') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (s === 'professionnel') return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (s === 'conflictuel') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-6xl mx-auto">
        {filteredChars.length === 0 ? (
          <div className="text-center py-12 px-4 col-span-full"><Users className="w-10 h-10 text-slate-600 mx-auto mb-2"/><p className="text-slate-400 italic text-sm">{searchQuery ? 'Aucune relation ne correspond.' : 'Aucune relation enregistree.'}</p></div>
        ) : (
          filteredChars.map(char => (
            <div key={char.id} onClick={() => openCharModal(char)} className="relative bg-slate-900/90 p-3 rounded-xl border border-white/10 flex flex-col gap-2 hover:border-rose-500/40 hover:bg-slate-800/80 transition-all group cursor-pointer">
              <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); if(confirm(`Supprimer "${char.name}" des archives ?`)){deleteCharacter(char.id);} }} className="p-1.5 bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white rounded-md border border-rose-500/50 transition-all" title="Supprimer"><X className="w-4 h-4"/></button>
              </div>
              <div className="flex items-start justify-between gap-2 w-full pr-8">
                <div className="flex items-center gap-2 min-w-0">
                  {char.imageUrl ? (
                    <div className="w-9 h-9 rounded-full shrink-0 border border-rose-500/40 overflow-hidden"><img src={char.imageUrl} alt={char.name} referrerPolicy="no-referrer" onClick={(e) => { e.stopPropagation(); onLightbox(char.imageUrl!, char.name); }} className="w-full h-full object-cover cursor-pointer"/></div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-500/30">{char.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-rose-200 text-sm group-hover:text-rose-100 truncate">{char.name}</h3>
                    {char.occupation && <span className="text-[10px] text-slate-400 block truncate">{char.occupation}</span>}
                  </div>
                </div>
                <span className={cn('text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0', relStatus(char.relationshipStatus))}>{char.relationshipStatus}</span>
              </div>
              {char.notes && <p className="text-[11px] text-slate-300 line-clamp-1 italic font-serif bg-slate-950/60 px-2 py-1 rounded-md border border-white/5">"{char.notes}"</p>}
              <div className="pt-1.5 border-t border-white/5 text-[10px] text-rose-400 font-medium flex items-center justify-between">
                <span className="text-slate-400 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{char.currentLocationId && locations[char.currentLocationId] ? locations[char.currentLocationId].name : (char.locationEncountered || 'Inconnu')}</span>
                </span>
                <span className="group-hover:translate-x-0.5 transition-transform shrink-0">Voir dossier →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedChar && (
        <div onClick={(e) => { if(e.target===e.currentTarget) setSelectedChar(null); }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-950 border border-rose-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2.5 bg-gradient-to-r from-rose-950/40 via-slate-950 to-slate-950 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedChar.imageUrl ? (
                  <img src={selectedChar.imageUrl} alt={selectedChar.name} referrerPolicy="no-referrer" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-rose-500/40 shrink-0"/>
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center font-bold text-xl shrink-0">{selectedChar.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">{selectedChar.name}</h2>
                  <span className={cn('text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border inline-flex', relStatus(selectedChar.relationshipStatus))}>Statut : {selectedChar.relationshipStatus}</span>
                </div>
              </div>
              <button onClick={() => setSelectedChar(null)} className="p-2 text-slate-200 hover:text-white bg-slate-900 border border-white/20 hover:bg-rose-900/60 rounded-full shrink-0 active:scale-95 cursor-pointer" title="Fermer"><X className="w-5 h-5 text-rose-300"/></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 custom-scrollbar">
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                {selectedChar.imageUrl ? (
                  <div onClick={() => onLightbox(selectedChar.imageUrl!, selectedChar.name)} className="relative group shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-rose-500/40">
                    <img src={selectedChar.imageUrl} alt={selectedChar.name} referrerPolicy="no-referrer" className="w-28 h-28 sm:w-32 sm:h-32 object-cover group-hover:scale-105 transition-transform"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] backdrop-blur-[1px]"><ZoomIn className="w-6 h-6 text-rose-300"/><span>Agrandir</span></div>
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-2xl bg-slate-950 border border-dashed border-rose-500/30 flex flex-col items-center justify-center gap-1.5 text-slate-500 shrink-0"><User className="w-8 h-8 text-rose-400/50"/><span className="text-[10px]">Aucun portrait</span></div>
                )}
                <div className="flex-1 flex flex-col justify-center gap-2 text-center sm:text-left">
                  <div className="text-xs text-slate-300">{selectedChar.imageUrl ? 'Portrait genere.' : 'Generez un portrait unique.'}</div>
                  <button onClick={handleGenerateCharVisual} disabled={isGeneratingImg} className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center justify-center sm:justify-start gap-2 disabled:opacity-50 self-center sm:self-start">
                    {isGeneratingImg ? <><Loader2 className="w-4 h-4 animate-spin text-rose-400"/><span>Generation...</span></> : <><Sparkles className="w-4 h-4 text-rose-400"/><span>{selectedChar.imageUrl ? 'Regenerer le portrait AI' : 'Generer le portrait AI'}</span></>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {label:'Age',icon:User,color:'text-rose-400',value:getQualitativeAge(selectedChar.age)},
                  {label:'Profession',icon:Briefcase,color:'text-sky-400',value:selectedChar.occupation||'Inconnue'},
                  {label:'Localisation',icon:MapPin,color:'text-emerald-400',value:selectedChar.currentLocationId && locations[selectedChar.currentLocationId] ? locations[selectedChar.currentLocationId].name : (selectedChar.locationEncountered||'Lieu inconnu')}
                ].map(({label,icon:Icon,color,value}) => (
                  <div key={label} className="bg-slate-900/80 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5"><Icon className={cn('w-3.5 h-3.5',color)}/><span>{label}</span></div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{value}</div>
                  </div>
                ))}
              </div>

              {selectedChar.schedule && selectedChar.schedule.length > 0 && (
                <div className="space-y-1.5"><h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/><span>Routine & Horaires habituels</span></h4>
                  <div className="flex flex-col gap-1">
                    {selectedChar.schedule.map((entry: any, idx) => (
                      <div key={idx} className="text-xs bg-slate-900/60 text-slate-300 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
                        <span>
                          {typeof entry === 'string' 
                            ? entry 
                            : `${entry.phase || ''} : ${locations[entry.locationId]?.name || entry.locationId || ''} ${entry.activityDescription ? `(${entry.activityDescription})` : ''}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedChar.appearance && <div className="space-y-1"><h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/><span>Apparence physique</span></h4><p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">{selectedChar.appearance}</p></div>}

              <div className="space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5"><Book className="w-3.5 h-3.5"/><span>Passif et Histoire</span></h4>
                <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">{selectedChar.background || 'Aucun passif repertorie.'}</p>
              </div>

              {selectedChar.financialRelation && selectedChar.financialRelation.trim() !== '' && selectedChar.financialRelation.toLowerCase() !== 'aucune' && (
                <div className="space-y-1"><h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5"/><span>Relation financiere</span></h4><p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">{selectedChar.financialRelation}</p></div>
              )}

              {selectedChar.socialTies && selectedChar.socialTies.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5"/>
                    <span>Réseau & Liens relationnels</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {selectedChar.socialTies.map((tie, idx) => (
                      <div key={idx} className="text-xs bg-indigo-950/20 text-slate-300 border border-indigo-500/20 p-2.5 rounded-xl flex flex-col gap-0.5">
                        <div className="flex items-center justify-between font-semibold text-indigo-200">
                          <span>{tie.targetCharacterName}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-mono">{tie.relationshipType}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">{tie.dynamicSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5"/>
                  <span>Solidarité & Dettes de Faveur</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {(selectedChar.favorBalance || 0) > 0 
                    ? `✨ Vous avez rendu un fier service à ${selectedChar.name}. En cas de détresse (faim, manque de fonds, fatigue), cette personne est disposée à vous soutenir spontanément.`
                    : (selectedChar.favorBalance || 0) < 0 
                    ? `🤝 Vous avez reçu une aide précieuse de ${selectedChar.name}. Pensez à lui renvoyer l'ascenseur dès que l'occasion se présentera.`
                    : `⚖️ Relation équilibrée. Aucun engagement moral ou dette de service en cours.`}
                </p>
              </div>

              {selectedChar.pendingItems && selectedChar.pendingItems.length > 0 && (
                <div className="space-y-1.5"><h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/><span>Engagements en cours</span></h4>
                  <div className="flex flex-col gap-1">{selectedChar.pendingItems.map((item, idx) => <div key={idx} className="text-xs bg-slate-900/60 text-slate-300 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"/><span>{item}</span></div>)}</div>
                </div>
              )}

              {selectedChar.upcomingEvents && selectedChar.upcomingEvents.length > 0 && (
                <div className="space-y-1.5"><h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/><span>Rendez-vous planifies</span></h4>
                  <div className="flex flex-col gap-1">{selectedChar.upcomingEvents.map((evt, idx) => <div key={idx} className="text-xs bg-emerald-950/30 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/><span>{evt}</span></div>)}</div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between"><h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5 text-rose-400"/><span>Notes personnelles</span></h4>{saveSuccess && <span className="text-xs text-emerald-400 font-bold animate-pulse">Enregistre</span>}</div>
                <textarea value={charNotesEdit} onChange={(e) => setCharNotesEdit(e.target.value)} placeholder="Ajoutez vos notes sur cette personne..." className="w-full h-20 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none"/>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedChar(null)} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-white/10 flex items-center gap-1.5"><X className="w-3.5 h-3.5"/><span>Fermer</span></button>
                    <button onClick={() => { if(confirm(`Supprimer la fiche de ${selectedChar.name} ?`)){deleteCharacter(selectedChar.id);setSelectedChar(null);showToast(`Fiche de ${selectedChar.name} supprimee.`);} }} className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-rose-400"/><span>Supprimer</span></button>
                  </div>
                  <button onClick={handleSaveCharNotes} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl">Enregistrer les notes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
