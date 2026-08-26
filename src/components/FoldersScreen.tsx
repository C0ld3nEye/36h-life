import React, { useState } from 'react';
import { 
  Book, Map, Users, BrainCircuit, ChevronLeft, Folder,
  MessageSquare, Compass, Shield, Search,
  Utensils, Code, Wrench, Dumbbell, Palette, Music,
  BookOpen, Cpu, HeartHandshake, Package,
  Home, Building, ShoppingBag, Sparkles, MapPin, Clock
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { LocationProfile, DiaryEntry } from '../types';
import { cn } from '../lib/utils';
import { InventoryView } from './InventoryView';
import { PlotLeadsView } from './PlotLeadsView';
import { MessagesView } from './MessagesView';
import { DiaryView } from './folders/DiaryView';
import { CharactersView } from './folders/CharactersView';
import { LocationsView } from './folders/LocationsView';

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
  const { skills = {}, inventory = [], plotLeads = [], messages = [], diary = [], locations = {}, characters = {} } = useGameStore();

  const [activeFolder, setActiveFolder] = useState<'diary' | 'locations' | 'characters' | 'skills' | 'inventory' | 'plots' | 'messages' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [diaryToast, setDiaryToast] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  const skillArray = Object.values(skills);
  const inventoryList = inventory || [];
  const unreadMessagesCount = (messages || []).filter(m => !m.read).length;
  const activePlotLeadsCount = (plotLeads || []).filter(p => p.status === 'actif').length;
  const locCount = Object.keys(locations || {}).length;
  const charCount = Object.keys(characters || {}).length;
  const diaryCount = (diary || []).length;

  const showToast = (msg: string) => {
    setDiaryToast(msg);
    setTimeout(() => setDiaryToast(null), 3000);
  };

  const folders = [
    { id: 'inventory', label: 'Inventaire & Frigo', count: `${inventoryList.length} objet(s)`, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'plots', label: 'Pistes & Rumeurs', count: activePlotLeadsCount > 0 ? `${activePlotLeadsCount} active(s)` : `${plotLeads.length} piste(s)`, icon: Compass, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'messages', label: 'Messagerie & Contacts', count: unreadMessagesCount > 0 ? `${unreadMessagesCount} non lu(s)` : `${messages.length} message(s)`, icon: MessageSquare, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { id: 'skills', label: 'Compétences', count: `${skillArray.length} maîtrisée(s)`, icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'diary', label: 'Journal Intime', count: `${diaryCount} souvenir(s)`, icon: Book, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { id: 'locations', label: 'Lieux Explorés', count: `${locCount} lieu(x)`, icon: Map, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'characters', label: 'Relations', count: `${charCount} contact(s)`, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10' }
  ] as const;

  if (activeFolder) {
    const folder = folders.find(f => f.id === activeFolder)!;
    const Icon = folder.icon;
    const filteredSkills = skillArray.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="flex-1 flex flex-col h-full bg-[#020617] relative">
        {/* Header with Search Bar */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col gap-2 shrink-0 bg-slate-950/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button onClick={() => { setActiveFolder(null); setSearchQuery(''); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-slate-300">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className={cn('p-1.5 rounded-lg', folder.bg, folder.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-200 text-base sm:text-lg">{folder.label}</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">Dossier</span>
          </div>

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
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300">✕</button>
            )}
          </div>
        </div>

        {/* Toast */}
        {diaryToast && (
          <div className="mx-4 mt-2 bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs px-4 py-2 rounded-xl text-center animate-in fade-in duration-200">
            {diaryToast}
          </div>
        )}

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar flex flex-col">
          {activeFolder === 'plots' && <PlotLeadsView />}
          {activeFolder === 'messages' && <MessagesView />}
          {activeFolder === 'inventory' && <InventoryView searchQuery={searchQuery} />}
          {activeFolder === 'diary' && <DiaryView searchQuery={searchQuery} showToast={showToast} />}
          {activeFolder === 'characters' && <CharactersView searchQuery={searchQuery} showToast={showToast} onLightbox={(src, title) => setLightboxImage({ src, title })} />}
          {activeFolder === 'locations' && <LocationsView searchQuery={searchQuery} showToast={showToast} onLightbox={(src, title) => setLightboxImage({ src, title })} />}

          {/* SKILLS TAB */}
          {activeFolder === 'skills' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-5xl mx-auto">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-12 px-4 col-span-full">
                  <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 italic text-sm">{searchQuery ? 'Aucune compétence ne correspond.' : 'Aucune compétence enregistrée.'}</p>
                </div>
              ) : (
                filteredSkills.map(skill => {
                  const SkillIcon = getSkillIcon(skill.name);
                  const progressPct = Math.min(100, Math.max(0, Math.round(skill.practicePoints)));
                  return (
                    <div key={skill.name} className="bg-slate-900/90 p-3.5 rounded-xl border border-white/10 shadow-md flex flex-col gap-2 hover:border-purple-500/30 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0"><SkillIcon className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-200 text-sm capitalize truncate">{skill.name}</h3>
                          <span className="text-[10px] text-purple-400 font-semibold">{getSkillHumanDescription(skill.level, skill.practicePoints)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug italic font-serif border-t border-white/5 pt-1.5">{getSkillDecayNote(skill.practicePoints)}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150">
            <button onClick={() => setLightboxImage(null)} className="fixed top-4 right-4 z-[110] p-2.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-full border border-white/20 shadow-2xl flex items-center gap-1.5 text-xs font-bold px-3.5 cursor-pointer">
              <span className="text-rose-400">✕</span><span>Fermer</span>
            </button>
            <div onClick={(e) => e.stopPropagation()} className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center cursor-default my-auto">
              <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-slate-950 flex flex-col items-center p-2 sm:p-3">
                <img src={lightboxImage.src} alt={lightboxImage.title} referrerPolicy="no-referrer" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
                {lightboxImage.title && (
                  <div className="mt-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-slate-200 text-xs sm:text-sm font-semibold tracking-wide">{lightboxImage.title}</div>
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
                <Folder className={cn('w-12 h-12 sm:w-14 sm:h-14 transition-transform group-hover:scale-105', folder.color)} strokeWidth={1} />
                <div className="absolute inset-0 flex items-center justify-center mt-1.5">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-200 text-sm sm:text-base">{folder.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{folder.count}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
