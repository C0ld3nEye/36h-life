import React, { useState } from 'react';
import { 
  Book, Map, Users, BrainCircuit, ChevronLeft, Folder, X, 
  MapPin, Briefcase, Calendar, DollarSign, CheckSquare, Sparkles, 
  User, Home, Building, ShoppingBag, Eye, Edit3, Clock, AlertCircle,
  Utensils, Code, Wrench, MessageSquare, Dumbbell, Palette, Music,
  BookOpen, Compass, Shield, Cpu, HeartHandshake, Search,
  Image as ImageIcon, Loader2, RefreshCw, ZoomIn, Plus, Trash2,
  Star, Tag, Feather, Filter, Heart, Check, Smile, CreditCard,
  Package
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { cn, getQualitativeRelativeDate, getQualitativeAge } from '../lib/utils';
import { CharacterProfile, LocationProfile, DiaryEntry } from '../types';
import { api } from '../lib/api';
import { compressImageDataUrl } from '../lib/imageCompressor';
import { InteractiveCityMap } from './InteractiveCityMap';
import { InventoryView } from './InventoryView';

function getSkillIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('cuisin') || n.includes('cook') || n.includes('repas') || n.includes('gastronom')) return Utensils;
  if (n.includes('code') || n.includes('program') || n.includes('informatiq') || n.includes('dev') || n.includes('tech')) return Code;
  if (n.includes('brico') || n.includes('meca') || n.includes('repara') || n.includes('outils')) return Wrench;
  if (n.includes('commun') || n.includes('charism') || n.includes('persuas') || n.includes('eloquen') || n.includes('negoc')) return MessageSquare;
  if (n.includes('sport') || n.includes('cour') || n.includes('athlet') || n.includes('muscu') || n.includes('endur')) return Dumbbell;
  if (n.includes('art') || n.includes('dessin') || n.includes('peint') || n.includes('design')) return Palette;
  if (n.includes('musiq') || n.includes('chant') || n.includes('guitare') || n.includes('piano')) return Music;
  if (n.includes('etud') || n.includes('lectur') || n.includes('savoir') || n.includes('scienc')) return BookOpen;
  if (n.includes('explor') || n.includes('orient') || n.includes('survi')) return Compass;
  if (n.includes('combat') || n.includes('defens') || n.includes('martial')) return Shield;
  if (n.includes('cyber') || n.includes('electroniq') || n.includes('pirat')) return Cpu;
  if (n.includes('sante') || n.includes('soin') || n.includes('medecin')) return HeartHandshake;
  return BrainCircuit;
}

function getSkillHumanDescription(level: number, points: number) {
  if (level <= 1) {
    if (points < 30) return "Notions de base";
    if (points < 70) return "Apprentissage en cours";
    return "Bonne maîtrise initiale";
  }
  if (level === 2) {
    if (points < 40) return "Pratique régulière";
    return "Aisance acquise";
  }
  if (level === 3) {
    if (points < 40) return "Solide expérience";
    return "Très compétent";
  }
  if (level === 4) {
    return "Maîtrise excellente";
  }
  return "Expertise remarquable";
}

function getSkillDecayNote(points: number) {
  if (points < 20) return "Compétence un peu rouillée par manque de pratique récente.";
  if (points > 80) return "Pratique fréquente, maîtrise au sommet.";
  return "Pratique régulière, niveau très stable.";
}

function getLocationCategoryBadge(category?: LocationProfile['category']) {
  switch (category) {
    case 'domicile':
      return { label: 'Domicile / Résidence', icon: Home, bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
    case 'travail':
      return { label: 'Lieu de travail', icon: Building, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    case 'commerce':
      return { label: 'Commerce / Services', icon: ShoppingBag, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'lieu_clef':
      return { label: 'Lieu Clef', icon: Sparkles, bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    case 'interet':
      return { label: "Point d'intérêt", icon: MapPin, bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
    default:
      return { label: 'Lieu Exploré', icon: MapPin, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

function getDiaryCategoryBadge(category?: DiaryEntry['category']) {
  switch (category) {
    case 'souvenir':
      return { label: 'Souvenir', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    case 'reflexion':
      return { label: 'Réflexion', icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'absence':
      return { label: 'Absence & Sommeil', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
    case 'objectif':
      return { label: 'Objectif & Avenir', icon: Compass, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'secret':
      return { label: 'Confidentiel', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
    default:
      return { label: 'Note', icon: BookOpen, color: 'text-slate-300', bg: 'bg-slate-800/80 border-white/10' };
  }
}

export function FoldersScreen() {
  const { 
    diary, episodicMemories, locations, characters, skills, inventory,
    updateCharacterNotes, updateLocationNotes, updateCharacterImage, updateLocationImage,
    deleteCharacter, deleteLocation,
    addDiaryEntry, updateDiaryEntry, deleteDiaryEntry
  } = useGameStore();

  const [activeFolder, setActiveFolder] = useState<'diary' | 'locations' | 'characters' | 'skills' | 'inventory' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Diary specific state
  const [diaryCategoryFilter, setDiaryCategoryFilter] = useState<'all' | 'souvenir' | 'reflexion' | 'absence' | 'objectif' | 'secret' | 'memoire'>('all');
  const [isGeneratingIntrospection, setIsGeneratingIntrospection] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [diaryFormTitle, setDiaryFormTitle] = useState('');
  const [diaryFormContent, setDiaryFormContent] = useState('');
  const [diaryFormCategory, setDiaryFormCategory] = useState<DiaryEntry['category']>('reflexion');
  const [diaryFormMood, setDiaryFormMood] = useState('Serein');
  const [diaryFormMilestone, setDiaryFormMilestone] = useState(false);
  const [diaryToast, setDiaryToast] = useState<string | null>(null);

  // Selected item modals
  const [selectedChar, setSelectedChar] = useState<CharacterProfile | null>(null);
  const [selectedLoc, setSelectedLoc] = useState<LocationProfile | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [locationViewMode, setLocationViewMode] = useState<'map' | 'list'>('map');
  
  const [charNotesEdit, setCharNotesEdit] = useState('');
  const [locNotesEdit, setLocNotesEdit] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const locArray = Object.values(locations);
  const charArray = Object.values(characters);
  const skillArray = Object.values(skills);

  const showToast = (msg: string) => {
    setDiaryToast(msg);
    setTimeout(() => setDiaryToast(null), 3000);
  };

  const handleGenerateIntrospection = async () => {
    if (isGeneratingIntrospection) return;
    setIsGeneratingIntrospection(true);
    try {
      const state = useGameStore.getState();
      const res = await api.generateIntrospection(state);
      if (res && res.content) {
        addDiaryEntry({
          gameDate: Date.now(),
          title: res.title || "Pensée du moment",
          content: res.content,
          mood: res.mood || "Pensif",
          category: (res.category as any) || 'reflexion',
          milestone: res.milestone ?? false,
          isPersonal: false
        });
        showToast("Nouvelle réflexion rédigée et consignée.");
      }
    } catch (err) {
      console.error("Introspection generation failed", err);
      showToast("Impossible de rédiger la réflexion pour l'instant.");
    } finally {
      setIsGeneratingIntrospection(false);
    }
  };

  const openNewDiaryModal = () => {
    setEditingDiaryId(null);
    setDiaryFormTitle('');
    setDiaryFormContent('');
    setDiaryFormCategory('reflexion');
    setDiaryFormMood('Pensif');
    setDiaryFormMilestone(false);
    setShowDiaryModal(true);
  };

  const openEditDiaryModal = (entry: DiaryEntry) => {
    setEditingDiaryId(entry.id);
    setDiaryFormTitle(entry.title || '');
    setDiaryFormContent(entry.content || '');
    setDiaryFormCategory(entry.category || 'reflexion');
    setDiaryFormMood(entry.mood || 'Pensif');
    setDiaryFormMilestone(entry.milestone || false);
    setShowDiaryModal(true);
  };

  const handleSaveDiaryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryFormContent.trim()) return;

    if (editingDiaryId) {
      updateDiaryEntry(editingDiaryId, {
        title: diaryFormTitle.trim() || undefined,
        content: diaryFormContent.trim(),
        category: diaryFormCategory,
        mood: diaryFormMood.trim() || undefined,
        milestone: diaryFormMilestone
      });
      showToast("Entrée modifiée avec succès.");
    } else {
      addDiaryEntry({
        gameDate: Date.now(),
        title: diaryFormTitle.trim() || undefined,
        content: diaryFormContent.trim(),
        category: diaryFormCategory,
        mood: diaryFormMood.trim() || undefined,
        milestone: diaryFormMilestone,
        isPersonal: true
      });
      showToast("Note personnelle ajoutée.");
    }
    setShowDiaryModal(false);
  };

  const openCharModal = (char: CharacterProfile) => {
    setSelectedChar(char);
    setCharNotesEdit(char.notes || '');
    setSaveSuccess(false);
  };

  const openLocModal = (loc: LocationProfile) => {
    setSelectedLoc(loc);
    setLocNotesEdit(loc.notes || '');
    setSaveSuccess(false);
  };

  const handleSaveCharNotes = () => {
    if (selectedChar) {
      updateCharacterNotes(selectedChar.id, charNotesEdit);
      setSelectedChar({ ...selectedChar, notes: charNotesEdit });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleSaveLocNotes = () => {
    if (selectedLoc) {
      updateLocationNotes(selectedLoc.id, locNotesEdit);
      setSelectedLoc({ ...selectedLoc, notes: locNotesEdit });
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
    } catch (err) {
      console.error("Failed to generate character visual:", err);
    } finally {
      setIsGeneratingImg(false);
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
    } catch (err) {
      console.error("Failed to generate location visual:", err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleDeleteLocVisual = () => {
    if (!selectedLoc) return;
    updateLocationImage(selectedLoc.id, undefined);
    setSelectedLoc(prev => prev ? { ...prev, imageUrl: undefined } : null);
  };

  const inventoryList = inventory || [];

  const folders = [
    { id: 'inventory', label: 'Inventaire & Frigo', count: inventoryList.length, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'skills', label: 'Compétences', count: skillArray.length, icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'diary', label: 'Journal Intime', count: diary.length, icon: Book, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { id: 'locations', label: 'Lieux Explorés', count: locArray.length, icon: Map, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'characters', label: 'Relations', count: charArray.length, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10' }
  ] as const;

  if (activeFolder) {
    const folder = folders.find(f => f.id === activeFolder)!;
    const Icon = folder.icon;

    // Search filter logic
    const q = searchQuery.toLowerCase().trim();

    const episodicMemoriesList = episodicMemories || [];
    const filteredMemories = episodicMemoriesList.filter(m => {
      if (!q) return true;
      return (m.summary && m.summary.toLowerCase().includes(q)) || 
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q))) ||
        (m.gameDateStr && m.gameDateStr.toLowerCase().includes(q));
    });

    const filteredSkills = skillArray.filter(s => !q || s.name.toLowerCase().includes(q));
    const filteredDiary = diary.filter(d => {
      const matchesSearch = !q || (d.content && d.content.toLowerCase().includes(q)) || (d.title && d.title.toLowerCase().includes(q)) || (d.mood && d.mood.toLowerCase().includes(q));
      const matchesCategory = diaryCategoryFilter === 'all' || (d.category || 'souvenir') === diaryCategoryFilter;
      return matchesSearch && matchesCategory;
    });
    const filteredLocs = locArray.filter(l => !q || l.name.toLowerCase().includes(q) || (l.district && l.district.toLowerCase().includes(q)) || (l.description && l.description.toLowerCase().includes(q)));
    const filteredChars = charArray.filter(c => !q || c.name.toLowerCase().includes(q) || (c.occupation && c.occupation.toLowerCase().includes(q)) || (c.relationshipStatus && c.relationshipStatus.toLowerCase().includes(q)));

    return (
      <div className="flex-1 flex flex-col h-full bg-[#020617] relative">
        {/* Header with Search Bar */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col gap-2 shrink-0 bg-slate-950/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => { setActiveFolder(null); setSearchQuery(''); }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className={cn("p-1.5 rounded-lg", folder.bg, folder.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-200 text-base sm:text-lg">{folder.label}</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
              Dossier
            </span>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Rechercher dans ${folder.label.toLowerCase()}...`}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
          {/* SKILLS TAB */}
          {activeFolder === 'skills' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-5xl mx-auto">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-12 px-4 col-span-full">
                  <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 italic text-sm">
                    {searchQuery ? "Aucune compétence ne correspond à la recherche." : "Aucune compétence enregistrée pour le moment."}
                  </p>
                </div>
              ) : (
                filteredSkills.map(skill => {
                  const SkillIcon = getSkillIcon(skill.name);
                  const progressPct = Math.min(100, Math.max(0, Math.round(skill.practicePoints)));
                  return (
                    <div 
                      key={skill.name} 
                      className="bg-slate-900/90 p-3.5 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
                            <SkillIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-200 text-sm capitalize truncate leading-tight">
                              {skill.name}
                            </h3>
                            <span className="text-[10px] text-purple-400 font-semibold">
                              {getSkillHumanDescription(skill.level, skill.practicePoints)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Progress Bar (no numbers) */}
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5 my-0.5">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <p className="text-[10px] text-slate-400 leading-snug italic font-serif border-t border-white/5 pt-1.5 mt-0.5">
                        {getSkillDecayNote(skill.practicePoints)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* DIARY TAB */}
          {activeFolder === 'diary' && (
            <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-10">
              {/* Actions & Filters Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center gap-1.5 flex-wrap no-scrollbar">
                  {[
                    { id: 'all', label: 'Tous' },
                    { id: 'reflexion', label: 'Réflexions' },
                    { id: 'souvenir', label: 'Souvenirs' },
                    { id: 'memoire', label: '🧠 Mémoire Épisodique (RAG)' },
                    { id: 'absence', label: 'Absences' },
                    { id: 'objectif', label: 'Objectifs' },
                    { id: 'secret', label: 'Secrets' }
                  ].map(tab => {
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDiaryCategoryFilter(tab.id as any)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                          diaryCategoryFilter === tab.id
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                            : "bg-slate-800/60 text-slate-400 border border-white/5 hover:text-slate-200 hover:bg-slate-800"
                        )}
                      >
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleGenerateIntrospection}
                    disabled={isGeneratingIntrospection}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    title="Prendre un moment de calme pour rédiger une réflexion introspective"
                  >
                    {isGeneratingIntrospection ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Méditation...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Méditer & Écrire</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={openNewDiaryModal}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Nouvelle note</span>
                  </button>
                </div>
              </div>

              {/* Toast message if present */}
              {diaryToast && (
                <div className="bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs px-4 py-2 rounded-xl text-center animate-in fade-in duration-200">
                  {diaryToast}
                </div>
              )}

              {/* Episodic Memories View */}
              {diaryCategoryFilter === 'memoire' ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-purple-950/30 border border-purple-500/20 p-3 rounded-xl flex items-start gap-2.5">
                    <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-200/90 leading-relaxed">
                      <span className="font-bold text-purple-300">Mémoire Épisodique & RAG Vectoriel :</span> Ces fragments mémoriels sont indexés par embeddings sémantiques. Le narrateur les retrouve automatiquement en arrière-plan lorsque vous effectuez une action en lien avec ces événements passés.
                    </div>
                  </div>

                  {filteredMemories.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                      <BrainCircuit className="w-8 h-8 text-purple-400/50" />
                      <p className="text-slate-400 italic text-xs">
                        {searchQuery ? "Aucune mémoire épisodique ne correspond à votre recherche." : "Aucune mémoire épisodique enregistrée pour le moment."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {[...filteredMemories].reverse().map(mem => (
                        <div 
                          key={mem.id}
                          className="bg-slate-900/90 p-3.5 rounded-xl border border-purple-500/20 shadow-md flex flex-col gap-2 hover:border-purple-500/40 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                mem.importance === 'critique' ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
                                mem.importance === 'haute' ? "bg-amber-500/15 border-amber-500/30 text-amber-300" :
                                "bg-purple-500/15 border-purple-500/30 text-purple-300"
                              )}>
                                Importance {mem.importance}
                              </span>
                              {mem.embedding && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                                  Vectorisé
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {mem.gameDateStr || 'Passé récent'}
                            </span>
                          </div>

                          <p className="text-slate-200 text-xs sm:text-sm font-serif leading-relaxed">
                            {mem.summary}
                          </p>

                          {mem.tags && mem.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                              {mem.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-white/5">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Diary Entries List */
                filteredDiary.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Feather className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-semibold text-sm mb-1">
                      {searchQuery ? "Aucune page ne correspond à votre recherche" : "Aucun écrit dans cette section"}
                    </h4>
                    <p className="text-slate-400 italic text-xs max-w-sm">
                      {searchQuery 
                        ? "Essayez d'autres mots-clés ou réinitialisez la recherche." 
                        : "Consignez vos pensées personnelles ou laissez votre personnage méditer sur ses péripéties."}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button
                      onClick={handleGenerateIntrospection}
                      disabled={isGeneratingIntrospection}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Rédiger une première réflexion</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {[...filteredDiary].reverse().map(entry => {
                    const badge = getDiaryCategoryBadge(entry.category);
                    const BadgeIcon = badge.icon;
                    const dateStr = getQualitativeRelativeDate(entry.gameDate);

                    return (
                      <div 
                        key={entry.id} 
                        className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-md flex flex-col gap-3 relative hover:border-sky-500/30 transition-all group"
                      >
                        {/* Entry Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Category Badge */}
                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold tracking-wide", badge.bg, badge.color)}>
                              <BadgeIcon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </span>

                            {/* Mood Tag */}
                            {entry.mood && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-medium">
                                <span>💭</span>
                                <span>{entry.mood}</span>
                              </span>
                            )}

                            {/* Milestone Star */}
                            {entry.milestone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>Étape Clé</span>
                              </span>
                            )}

                            {/* Personal Note Indicator */}
                            {entry.isPersonal && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                                <Tag className="w-3 h-3" />
                                <span>Note Joueur</span>
                              </span>
                            )}
                          </div>

                          {/* Date & Actions */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {dateStr}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => openEditDiaryModal(entry)}
                                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-md transition-colors"
                                title="Modifier"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Supprimer cette page du journal ?")) {
                                    deleteDiaryEntry(entry.id);
                                    showToast("Entrée supprimée.");
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-md transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Title if present */}
                        {entry.title && (
                          <h3 className="text-slate-100 font-bold text-sm sm:text-base tracking-tight leading-snug">
                            {entry.title}
                          </h3>
                        )}

                        {/* Content */}
                        <div className="text-slate-300 leading-relaxed font-serif text-sm sm:text-[15px] whitespace-pre-wrap">
                          {entry.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* LOCATIONS TAB */}
          {activeFolder === 'locations' && (
            <div className="flex flex-col gap-3 max-w-6xl mx-auto w-full">
              {/* View Mode Toggle: Interactive Atlas Map vs Detailed Cards */}
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLocationViewMode('map')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      locationViewMode === 'map'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Carte des Secteurs & Atlas</span>
                  </button>
                  <button
                    onClick={() => setLocationViewMode('list')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      locationViewMode === 'list'
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Fiches des Lieux ({locArray.length})</span>
                  </button>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
                  Système de géolocalisation urbaine
                </span>
              </div>

              {locationViewMode === 'map' ? (
                <div className="bg-slate-950/80 rounded-2xl border border-white/10 overflow-hidden min-h-[500px]">
                  <InteractiveCityMap 
                    onSelectLocation={(loc) => openLocModal(loc)}
                    onFastTravelAction={(actionText) => {
                      // Trigger travel narrative
                      useGameStore.getState().addNarrative('user', actionText);
                      api.performAction({
                        action: actionText,
                        state: useGameStore.getState(),
                        force: true
                      }).then(res => {
                        useGameStore.getState().processActionResponse(res);
                        showToast("Déplacement effectué !");
                      }).catch(err => {
                        console.error("Travel action error", err);
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredLocs.length === 0 ? (
                    <div className="text-center py-12 px-4 col-span-full">
                      <Map className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 italic text-sm">
                        {searchQuery ? "Aucun lieu ne correspond à la recherche." : "Aucun lieu répertorié."}
                      </p>
                    </div>
                  ) : (
                    filteredLocs.map(loc => {
                      const catBadge = getLocationCategoryBadge(loc.category);
                      const CatIcon = catBadge.icon;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => openLocModal(loc)}
                          className="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all group overflow-hidden"
                        >
                          {loc.imageUrl && (
                            <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                              <img 
                                src={loc.imageUrl} 
                                alt={loc.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-1.5 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <CatIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                              <h3 className="font-bold text-emerald-300 text-sm group-hover:text-emerald-200 transition-colors truncate">
                                {loc.name}
                              </h3>
                            </div>
                            <span className={cn("text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0", catBadge.bg)}>
                              {catBadge.label}
                            </span>
                          </div>

                          {loc.district && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{loc.district}</span>
                            </div>
                          )}

                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {loc.description}
                          </p>

                          <div className="pt-1.5 border-t border-white/5 text-[10px] text-emerald-400 font-medium flex items-center justify-between mt-auto">
                            <span className="text-slate-500">Lieu répertorié</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">Voir la fiche →</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* CHARACTERS TAB */}
          {activeFolder === 'characters' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-6xl mx-auto">
              {filteredChars.length === 0 ? (
                <div className="text-center py-12 px-4 col-span-full">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 italic text-sm">
                    {searchQuery ? "Aucune relation ne correspond à la recherche." : "Aucune relation enregistrée."}
                  </p>
                </div>
              ) : (
                filteredChars.map(char => (
                  <button
                    key={char.id}
                    onClick={() => openCharModal(char)}
                    className="bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 text-left hover:border-rose-500/40 hover:bg-slate-800/80 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        {char.imageUrl ? (
                          <img 
                            src={char.imageUrl} 
                            alt={char.name} 
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-rose-500/40 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-500/30">
                            {char.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-bold text-rose-200 text-sm group-hover:text-rose-100 transition-colors truncate">
                            {char.name}
                          </h3>
                          {char.occupation && (
                            <span className="text-[10px] text-slate-400 block truncate">{char.occupation}</span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                        char.relationshipStatus === 'amical' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        char.relationshipStatus === 'amoureux' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        char.relationshipStatus === 'professionnel' && "bg-sky-500/10 text-sky-400 border-sky-500/20",
                        char.relationshipStatus === 'conflictuel' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        (char.relationshipStatus === 'neutre' || char.relationshipStatus === 'inconnu') && "bg-slate-800 text-slate-400 border-slate-700",
                      )}>
                        {char.relationshipStatus}
                      </span>
                    </div>

                    {char.notes && (
                      <p className="text-[11px] text-slate-300 line-clamp-1 italic font-serif bg-slate-950/60 px-2 py-1 rounded-md border border-white/5">
                        "{char.notes}"
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-white/5 text-[10px] text-rose-400 font-medium flex items-center justify-between">
                      <span className="text-slate-500 truncate">{char.locationEncountered || 'Inconnu'}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform shrink-0">Voir dossier →</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeFolder === 'inventory' && (
            <InventoryView searchQuery={searchQuery} />
          )}
        </div>

        {/* CHARACTER DETAIL MODAL */}
        {selectedChar && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedChar(null); }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar"
          >
            <div className="bg-slate-950 border border-rose-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2.5 bg-gradient-to-r from-rose-950/40 via-slate-950 to-slate-950 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectedChar.imageUrl ? (
                    <img 
                      src={selectedChar.imageUrl} 
                      alt={selectedChar.name} 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover border border-rose-500/40 shadow-inner shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center font-bold text-base sm:text-xl shadow-inner shrink-0">
                      {selectedChar.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-tight truncate">{selectedChar.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn(
                        "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center",
                        selectedChar.relationshipStatus === 'amical' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        selectedChar.relationshipStatus === 'amoureux' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        selectedChar.relationshipStatus === 'professionnel' && "bg-sky-500/10 text-sky-400 border-sky-500/20",
                        selectedChar.relationshipStatus === 'conflictuel' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        (selectedChar.relationshipStatus === 'neutre' || selectedChar.relationshipStatus === 'inconnu') && "bg-slate-800 text-slate-400 border-slate-700",
                      )}>
                        Statut : {selectedChar.relationshipStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChar(null)}
                  className="p-2 sm:p-2.5 text-slate-200 hover:text-white bg-slate-900 border border-white/20 hover:bg-rose-900/60 rounded-full transition-all shrink-0 flex items-center justify-center shadow-lg active:scale-95 ml-2 cursor-pointer z-10"
                  title="Fermer la fiche"
                >
                  <X className="w-5 h-5 text-rose-300" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 custom-scrollbar">
                {/* Visual / Portrait Section */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                  {selectedChar.imageUrl ? (
                    <div 
                      onClick={() => setLightboxImage({ src: selectedChar.imageUrl!, title: selectedChar.name })}
                      className="relative group shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-rose-500/40 shadow-lg"
                      title="Cliquer pour agrandir le portrait"
                    >
                      <img 
                        src={selectedChar.imageUrl} 
                        alt={selectedChar.name} 
                        referrerPolicy="no-referrer"
                        className="w-28 h-28 sm:w-32 sm:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white font-medium text-[11px] backdrop-blur-[1px]">
                        <ZoomIn className="w-6 h-6 text-rose-300 animate-bounce" />
                        <span>Agrandir</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-950 border border-dashed border-rose-500/30 flex flex-col items-center justify-center gap-1.5 text-slate-500 shrink-0 p-2 text-center">
                      <User className="w-8 h-8 text-rose-400/50" />
                      <span className="text-[10px]">Aucun portrait</span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-center gap-2 text-center sm:text-left">
                    <div className="text-xs text-slate-300 font-medium">
                      {selectedChar.imageUrl ? "Portrait généré pour ce personnage." : "Générez un portrait visuel unique pour ce personnage."}
                    </div>
                    <button
                      onClick={handleGenerateCharVisual}
                      disabled={isGeneratingImg}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center justify-center sm:justify-start gap-2 transition-all disabled:opacity-50 self-center sm:self-start shadow-sm"
                    >
                      {isGeneratingImg ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                          <span>Génération du portrait en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-rose-400" />
                          <span>{selectedChar.imageUrl ? "Régénérer le portrait AI" : "Générer le portrait AI"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Identity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-400" />
                      <span>Âge</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {getQualitativeAge(selectedChar.age)}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                      <span>Profession</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {selectedChar.occupation || 'Inconnue'}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Rencontré(e) à</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {selectedChar.locationEncountered || 'Lieu inconnu'}
                    </div>
                  </div>
                </div>

                {/* Physical Appearance */}
                {selectedChar.appearance && (
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Apparence physique & Style</span>
                    </h4>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {selectedChar.appearance}
                    </p>
                  </div>
                )}

                {/* Backstory / Shared History */}
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5" />
                    <span>Passif & Histoire partagée</span>
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {selectedChar.background || 'Aucun passif particulier répertorié.'}
                  </p>
                </div>

                {/* Financial Relation */}
                {selectedChar.financialRelation && selectedChar.financialRelation.trim() !== '' && selectedChar.financialRelation.toLowerCase() !== 'aucune' && (
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Relation financière & Accords</span>
                    </h4>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {selectedChar.financialRelation}
                    </p>
                  </div>
                )}

                {/* Pending Items / Obligations */}
                {selectedChar.pendingItems && selectedChar.pendingItems.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Engagements & Affaires en cours</span>
                    </h4>
                    <div className="flex flex-col gap-1">
                      {selectedChar.pendingItems.map((item, idx) => (
                        <div key={idx} className="text-xs bg-slate-900/60 text-slate-300 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Scheduled Events */}
                {selectedChar.upcomingEvents && selectedChar.upcomingEvents.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Rendez-vous planifiés</span>
                    </h4>
                    <div className="flex flex-col gap-1">
                      {selectedChar.upcomingEvents.map((evt, idx) => (
                        <div key={idx} className="text-xs bg-emerald-950/30 text-emerald-300 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{evt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Player Notes Section */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Notes personnelles</span>
                    </h4>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 font-bold animate-pulse">
                        ✓ Enregistré
                      </span>
                    )}
                  </div>
                  <textarea
                    value={charNotesEdit}
                    onChange={(e) => setCharNotesEdit(e.target.value)}
                    placeholder="Ajoutez vos propres notes concernant cette personne..."
                    className="w-full h-20 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none"
                  />
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedChar(null)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors border border-white/10 flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Fermer</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer définitivement la fiche de ${selectedChar.name} ?`)) {
                            deleteCharacter(selectedChar.id);
                            setSelectedChar(null);
                            showToast(`Fiche de ${selectedChar.name} supprimée.`);
                          }
                        }}
                        className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Supprimer ce personnage"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                    <button
                      onClick={handleSaveCharNotes}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                    >
                      Enregistrer les notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOCATION DETAIL MODAL */}
        {selectedLoc && (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedLoc(null); }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto custom-scrollbar"
          >
            <div className="bg-slate-950 border border-emerald-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 shrink-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-lg sm:text-xl shadow-inner shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-tight truncate">{selectedLoc.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0", getLocationCategoryBadge(selectedLoc.category).bg)}>
                        {getLocationCategoryBadge(selectedLoc.category).label}
                      </span>
                      {selectedLoc.district && (
                        <span className="text-xs text-slate-400 font-medium truncate">
                          • {selectedLoc.district}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLoc(null)}
                  className="p-2 sm:p-2.5 text-slate-200 hover:text-white bg-slate-900 border border-white/20 hover:bg-emerald-900/60 rounded-full transition-all shrink-0 flex items-center justify-center shadow-lg active:scale-95 ml-2 cursor-pointer z-10"
                  title="Fermer la fiche"
                >
                  <X className="w-5 h-5 text-emerald-300" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 custom-scrollbar">
                {/* Visual / Location Banner Section */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-3">
                  {selectedLoc.imageUrl ? (
                    <div className="relative group w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-emerald-500/30">
                      <img 
                        src={selectedLoc.imageUrl} 
                        alt={selectedLoc.name} 
                        referrerPolicy="no-referrer"
                        onClick={() => setLightboxImage({ src: selectedLoc.imageUrl!, title: selectedLoc.name })}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                        title="Cliquer pour agrandir le visuel"
                      />
                      <button
                        onClick={() => setLightboxImage({ src: selectedLoc.imageUrl!, title: selectedLoc.name })}
                        className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-black text-emerald-300 rounded-lg border border-emerald-500/30 transition-all opacity-90 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm shadow-md"
                        title="Agrandir en plein écran"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Agrandir</span>
                      </button>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={handleDeleteLocVisual}
                          className="p-2 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/30 transition-all flex items-center gap-1 text-xs font-semibold backdrop-blur-sm shadow-md"
                          title="Supprimer l'illustration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Supprimer</span>
                        </button>
                        <button
                          onClick={handleGenerateLocVisual}
                          disabled={isGeneratingImg}
                          className="p-2 bg-black/80 hover:bg-black text-emerald-300 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm shadow-md"
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
                        onClick={handleGenerateLocVisual}
                        disabled={isGeneratingImg}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isGeneratingImg ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            <span>Génération du paysage AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Générer le visuel du lieu AI</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Full Description */}
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5" />
                    <span>Description complète</span>
                  </h4>
                  <p className="text-xs text-slate-200 bg-slate-900/60 p-3.5 rounded-xl border border-white/5 leading-relaxed font-serif">
                    {selectedLoc.description}
                  </p>
                </div>

                {/* Key Features & Amenities */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Équipements & Caractéristiques</span>
                  </h4>
                  {selectedLoc.keyFeatures && selectedLoc.keyFeatures.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLoc.keyFeatures.map((feat, i) => (
                        <span key={i} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-medium">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
                      Aucun équipement particulier listé.
                    </p>
                  )}
                </div>

                {/* Associated Characters */}
                {selectedLoc.associatedCharacters && selectedLoc.associatedCharacters.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Personnages associés</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLoc.associatedCharacters.map((charNameOrId, i) => {
                        const targetChar = characters[charNameOrId] || Object.values(characters).find(c => c.name.toLowerCase() === charNameOrId.toLowerCase());
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (targetChar) {
                                setSelectedLoc(null);
                                setSelectedChar(targetChar);
                                setCharNotesEdit(targetChar.notes || '');
                              }
                            }}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-all",
                              targetChar 
                                ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30 cursor-pointer"
                                : "bg-slate-900 text-slate-400 border-white/10 cursor-default"
                            )}
                          >
                            <User className="w-3 h-3 text-rose-400" />
                            <span>{targetChar ? targetChar.name : charNameOrId}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Player Notes Section */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Notes personnelles</span>
                    </h4>
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 font-bold animate-pulse">
                        ✓ Enregistré
                      </span>
                    )}
                  </div>
                  <textarea
                    value={locNotesEdit}
                    onChange={(e) => setLocNotesEdit(e.target.value)}
                    placeholder="Ajoutez vos remarques sur ce lieu..."
                    className="w-full h-20 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedLoc(null)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors border border-white/10 flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Fermer</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer définitivement la fiche du lieu "${selectedLoc.name}" ?`)) {
                            deleteLocation(selectedLoc.id);
                            setSelectedLoc(null);
                            showToast(`Fiche de "${selectedLoc.name}" supprimée.`);
                          }
                        }}
                        className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Supprimer ce lieu"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                    <button
                      onClick={handleSaveLocNotes}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                    >
                      Enregistrer les notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* DIARY ENTRY MODAL */}
        {showDiaryModal && (
          <div 
            onClick={() => setShowDiaryModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-white/20 rounded-2xl max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300">
                    <Feather className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                      {editingDiaryId ? "Modifier l'entrée du journal" : "Nouvelle page du journal intime"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Consignez vos impressions, objectifs ou réflexions personnelles.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiaryModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSaveDiaryForm} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                {/* Category selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Catégorie
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'reflexion', label: 'Réflexion', icon: BrainCircuit, color: 'text-purple-400' },
                      { id: 'souvenir', label: 'Souvenir', icon: Sparkles, color: 'text-amber-400' },
                      { id: 'objectif', label: 'Objectif', icon: Compass, color: 'text-emerald-400' },
                      { id: 'secret', label: 'Confidentiel', icon: Shield, color: 'text-rose-400' },
                      { id: 'absence', label: 'Absence', icon: Clock, color: 'text-sky-400' }
                    ].map(cat => {
                      const CatIcon = cat.icon;
                      const isSelected = diaryFormCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setDiaryFormCategory(cat.id as any)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all text-left cursor-pointer",
                            isSelected 
                              ? "bg-slate-800 border-sky-500 text-white shadow-sm" 
                              : "bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          )}
                        >
                          <CatIcon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-sky-400" : cat.color)} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Titre (optionnel)
                  </label>
                  <input
                    type="text"
                    value={diaryFormTitle}
                    onChange={(e) => setDiaryFormTitle(e.target.value)}
                    placeholder="Ex: Une soirée inoubliable au marché, Mes doutes sur..."
                    className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                {/* Mood / État d'esprit */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    État d'esprit / Humeur
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {['Serein', 'Pensif', 'Motivé', 'Nostalgique', 'Inquiet', 'Confiant', 'Soulagé', 'Fatigué'].map(moodPreset => (
                      <button
                        key={moodPreset}
                        type="button"
                        onClick={() => setDiaryFormMood(moodPreset)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                          diaryFormMood === moodPreset
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                            : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200"
                        )}
                      >
                        {moodPreset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={diaryFormMood}
                    onChange={(e) => setDiaryFormMood(e.target.value)}
                    placeholder="Ex: Pensif, Excité, Sceptique..."
                    className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Texte de la note *</span>
                    <span className="text-[10px] text-slate-500 font-normal">Format texte libre</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={diaryFormContent}
                    onChange={(e) => setDiaryFormContent(e.target.value)}
                    placeholder="Écrivez ce qui vous passe par la tête, un fait marquant ou vos ressentis..."
                    className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-y font-serif leading-relaxed"
                  />
                </div>

                {/* Milestone Toggle */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-white/10 cursor-pointer hover:bg-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={diaryFormMilestone}
                    onChange={(e) => setDiaryFormMilestone(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 border-white/20"
                  />
                  <div className="flex items-center gap-2">
                    <Star className={cn("w-4 h-4", diaryFormMilestone ? "text-amber-400 fill-amber-400" : "text-slate-500")} />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Marquer comme Étape Clé</div>
                      <div className="text-[10px] text-slate-400">Met en valeur ce souvenir comme un tournant mémorable.</div>
                    </div>
                  </div>
                </label>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowDiaryModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!diaryFormContent.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingDiaryId ? "Mettre à jour" : "Enregistrer dans le journal"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FULLSCREEN LIGHTBOX MODAL */}
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="fixed top-4 right-4 z-[110] p-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full border border-white/20 shadow-2xl transition-all flex items-center gap-1.5 text-xs font-bold px-3.5 cursor-pointer"
              title="Fermer l'image"
            >
              <X className="w-5 h-5 text-rose-400" />
              <span>Fermer</span>
            </button>

            <div 
              onClick={(e) => e.stopPropagation()} 
              className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center cursor-default my-auto"
            >
              <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-slate-950 flex flex-col items-center p-2 sm:p-3">
                <img 
                  src={lightboxImage.src} 
                  alt={lightboxImage.title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                />
                {lightboxImage.title && (
                  <div className="mt-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold tracking-wide">
                    {lightboxImage.title}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-transparent custom-scrollbar max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-slate-100">Archives & Inventaire</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {folders.map(folder => {
          const Icon = folder.icon;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className="flex flex-col items-center justify-center gap-3 p-5 glass-panel rounded-2xl hover:bg-white/5 transition-all hover:-translate-y-0.5 group border border-white/10 cursor-pointer"
            >
              <div className="relative">
                <Folder className={cn("w-12 h-12 sm:w-14 sm:h-14 transition-transform group-hover:scale-105", folder.color)} strokeWidth={1} />
                <div className="absolute inset-0 flex items-center justify-center mt-1.5">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-200 text-sm sm:text-base">{folder.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Consulter le dossier</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
