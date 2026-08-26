import React, { useState } from 'react';
import {
  Book, BrainCircuit, Feather, Sparkles, Compass, Shield, Clock,
  Plus, X, Edit3, Tag, Star, Check, Loader2
} from 'lucide-react';
import { cn, getQualitativeRelativeDate } from '../../lib/utils';
import { useGameStore } from '../../state/useGameState';
import { DiaryEntry } from '../../types';
import { api } from '../../lib/api';

function getDiaryCategoryBadge(category?: DiaryEntry['category']) {
  switch (category) {
    case 'souvenir': return { label: 'Souvenir', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    case 'reflexion': return { label: 'Reflexion', icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
    case 'absence': return { label: 'Absence & Sommeil', icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
    case 'objectif': return { label: 'Objectif & Avenir', icon: Compass, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    case 'secret': return { label: 'Confidentiel', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
    default: return { label: 'Note', icon: Book, color: 'text-slate-300', bg: 'bg-slate-800/80 border-white/10' };
  }
}

interface DiaryViewProps { searchQuery: string; showToast: (msg: string) => void; }

export function DiaryView({ searchQuery, showToast }: DiaryViewProps) {
  const { diary, episodicMemories, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = useGameStore();
  const [diaryCategoryFilter, setDiaryCategoryFilter] = useState<'all' | 'souvenir' | 'reflexion' | 'absence' | 'objectif' | 'secret' | 'memoire'>('all');
  const [isGeneratingIntrospection, setIsGeneratingIntrospection] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [diaryFormTitle, setDiaryFormTitle] = useState('');
  const [diaryFormContent, setDiaryFormContent] = useState('');
  const [diaryFormCategory, setDiaryFormCategory] = useState<DiaryEntry['category']>('reflexion');
  const [diaryFormMood, setDiaryFormMood] = useState('Serein');
  const [diaryFormMilestone, setDiaryFormMilestone] = useState(false);
  const q = searchQuery.toLowerCase().trim();
  const episodicMemoriesList = episodicMemories || [];
  const filteredMemories = episodicMemoriesList.filter(m => !q || (m.summary && m.summary.toLowerCase().includes(q)) || (m.tags && m.tags.some(t => t.toLowerCase().includes(q))));
  const filteredDiary = diary.filter(d => {
    const matchesSearch = !q || (d.content && d.content.toLowerCase().includes(q)) || (d.title && d.title.toLowerCase().includes(q));
    const matchesCategory = diaryCategoryFilter === 'all' || (d.category || 'souvenir') === diaryCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleGenerateIntrospection = async () => {
    if (isGeneratingIntrospection) return;
    setIsGeneratingIntrospection(true);
    try {
      const state = useGameStore.getState();
      const res = await api.generateIntrospection(state);
      if (res && res.content) {
        addDiaryEntry({ gameDate: Date.now(), title: res.title || 'Pensee du moment', content: res.content, mood: res.mood || 'Pensif', category: (res.category as any) || 'reflexion', milestone: res.milestone ?? false, isPersonal: false });
        showToast('Nouvelle reflexion redigee et consignee.');
      }
    } catch (err) { showToast("Impossible de rediger la reflexion pour l'instant."); }
    finally { setIsGeneratingIntrospection(false); }
  };

  const openNewDiaryModal = () => { setEditingDiaryId(null); setDiaryFormTitle(''); setDiaryFormContent(''); setDiaryFormCategory('reflexion'); setDiaryFormMood('Pensif'); setDiaryFormMilestone(false); setShowDiaryModal(true); };
  const openEditDiaryModal = (entry: DiaryEntry) => { setEditingDiaryId(entry.id); setDiaryFormTitle(entry.title || ''); setDiaryFormContent(entry.content || ''); setDiaryFormCategory(entry.category || 'reflexion'); setDiaryFormMood(entry.mood || 'Pensif'); setDiaryFormMilestone(entry.milestone || false); setShowDiaryModal(true); };

  const handleSaveDiaryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryFormContent.trim()) return;
    if (editingDiaryId) {
      updateDiaryEntry(editingDiaryId, { title: diaryFormTitle.trim() || undefined, content: diaryFormContent.trim(), category: diaryFormCategory, mood: diaryFormMood.trim() || undefined, milestone: diaryFormMilestone });
      showToast('Entree modifiee avec succes.');
    } else {
      addDiaryEntry({ gameDate: Date.now(), title: diaryFormTitle.trim() || undefined, content: diaryFormContent.trim(), category: diaryFormCategory, mood: diaryFormMood.trim() || undefined, milestone: diaryFormMilestone, isPersonal: true });
      showToast('Note personnelle ajoutee.');
    }
    setShowDiaryModal(false);
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-1.5 flex-wrap no-scrollbar">
          {[{id:'all',label:'Tous'},{id:'reflexion',label:'Reflexions'},{id:'souvenir',label:'Souvenirs'},{id:'memoire',label:'Memoire Episodique (RAG)'},{id:'absence',label:'Absences'},{id:'objectif',label:'Objectifs'},{id:'secret',label:'Secrets'}].map(tab => (
            <button key={tab.id} onClick={() => setDiaryCategoryFilter(tab.id as any)} className={cn('px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer', diaryCategoryFilter === tab.id ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800/60 text-slate-400 border border-white/5 hover:text-slate-200')}>{tab.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleGenerateIntrospection} disabled={isGeneratingIntrospection} className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
            {isGeneratingIntrospection ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/><span>Meditation...</span></> : <><Sparkles className="w-3.5 h-3.5 text-amber-300"/><span>Mediter et Ecrire</span></>}
          </button>
          <button onClick={openNewDiaryModal} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold rounded-xl cursor-pointer">
            <Plus className="w-3.5 h-3.5 text-sky-400"/><span>Nouvelle note</span>
          </button>
        </div>
      </div>

      {diaryCategoryFilter === 'memoire' ? (
        <div className="flex flex-col gap-3">
          <div className="bg-purple-950/30 border border-purple-500/20 p-3 rounded-xl flex items-start gap-2.5">
            <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 mt-0.5"/>
            <div className="text-xs text-purple-200/90 leading-relaxed"><span className="font-bold text-purple-300">Memoire Episodique et RAG Vectoriel :</span> Ces fragments sont indexes semantiquement. Le narrateur les retrouve automatiquement.</div>
          </div>
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-white/5 flex flex-col items-center gap-2"><BrainCircuit className="w-8 h-8 text-purple-400/50"/><p className="text-slate-400 italic text-xs">{searchQuery ? 'Aucune memoire ne correspond.' : 'Aucune memoire enregistree.'}</p></div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {[...filteredMemories].reverse().map(mem => (
                <div key={mem.id} className="bg-slate-900/90 p-3.5 rounded-xl border border-purple-500/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border', mem.importance==='critique'?'bg-rose-500/15 border-rose-500/30 text-rose-300':mem.importance==='haute'?'bg-amber-500/15 border-amber-500/30 text-amber-300':'bg-purple-500/15 border-purple-500/30 text-purple-300')}>Importance {mem.importance}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{mem.gameDateStr || 'Passe recent'}</span>
                  </div>
                  <p className="text-slate-200 text-xs font-serif leading-relaxed">{mem.summary}</p>
                  {mem.tags && mem.tags.length > 0 && <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">{mem.tags.map((tag,i) => <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/5">#{tag}</span>)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredDiary.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400"><Feather className="w-6 h-6"/></div>
          <p className="text-slate-400 italic text-xs max-w-sm">{searchQuery ? 'Aucune page ne correspond.' : 'Consignez vos pensees ou laissez votre personnage mediter.'}</p>
          {!searchQuery && <button onClick={handleGenerateIntrospection} disabled={isGeneratingIntrospection} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600/80 text-white text-xs font-bold rounded-xl"><Sparkles className="w-3.5 h-3.5 text-amber-300"/><span>Rediger une premiere reflexion</span></button>}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {[...filteredDiary].reverse().map(entry => {
            const badge = getDiaryCategoryBadge(entry.category);
            const BadgeIcon = badge.icon;
            return (
              <div key={entry.id} className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col gap-3 relative hover:border-sky-500/30 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold', badge.bg, badge.color)}><BadgeIcon className="w-3.5 h-3.5"/><span>{badge.label}</span></span>
                    {entry.mood && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]"><span>💭</span><span>{entry.mood}</span></span>}
                    {entry.milestone && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold"><Star className="w-3 h-3 fill-amber-400 text-amber-400"/><span>Etape Cle</span></span>}
                    {entry.isPersonal && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold"><Tag className="w-3 h-3"/><span>Note Joueur</span></span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-mono">{getQualitativeRelativeDate(entry.gameDate)}</span>
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button onClick={() => openEditDiaryModal(entry)} className="p-1 text-slate-400 hover:text-sky-300 hover:bg-white/10 rounded-md" title="Modifier"><Edit3 className="w-3.5 h-3.5"/></button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Supprimer DEFINITIVEMENT cette page?')){deleteDiaryEntry(entry.id);showToast('Entree supprimee.');} }} className="p-1.5 text-rose-400 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 rounded-md" title="Supprimer"><X className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
                {entry.title && <h3 className="text-slate-100 font-bold text-sm tracking-tight">{entry.title}</h3>}
                <div className="text-slate-300 leading-relaxed font-serif text-sm whitespace-pre-wrap">{entry.content}</div>
              </div>
            );
          })}
        </div>
      )}

      {showDiaryModal && (
        <div onClick={() => setShowDiaryModal(false)} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-slate-950 border border-white/20 rounded-2xl max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2"><div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300"><Feather className="w-4 h-4"/></div><h3 className="font-bold text-slate-100 text-sm">{editingDiaryId ? "Modifier l'entree" : 'Nouvelle page du journal'}</h3></div>
              <button onClick={() => setShowDiaryModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveDiaryForm} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Categorie</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[{id:'reflexion',label:'Reflexion',icon:BrainCircuit},{id:'souvenir',label:'Souvenir',icon:Sparkles},{id:'objectif',label:'Objectif',icon:Compass},{id:'secret',label:'Confidentiel',icon:Shield},{id:'absence',label:'Absence',icon:Clock}].map(cat => {
                    const CatIcon = cat.icon; const isSel = diaryFormCategory===cat.id;
                    return <button key={cat.id} type="button" onClick={() => setDiaryFormCategory(cat.id as any)} className={cn('flex items-center gap-2 p-2 rounded-xl text-xs border cursor-pointer',isSel?'bg-slate-800 border-sky-500 text-white':'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200')}><CatIcon className="w-3.5 h-3.5 shrink-0"/><span className="truncate">{cat.label}</span></button>;
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-300">Titre (optionnel)</label><input type="text" value={diaryFormTitle} onChange={(e) => setDiaryFormTitle(e.target.value)} placeholder="Titre de la note..." className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"/></div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Etat d'esprit</label>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">{['Serein','Pensif','Motive','Nostalgique','Inquiet','Confiant','Soulage','Fatigue'].map(m => <button key={m} type="button" onClick={() => setDiaryFormMood(m)} className={cn('px-2.5 py-0.5 rounded-lg text-[11px] border cursor-pointer',diaryFormMood===m?'bg-indigo-500/20 text-indigo-300 border-indigo-500/40':'bg-slate-900 text-slate-400 border-white/5')}>{m}</button>)}</div>
                <input type="text" value={diaryFormMood} onChange={(e) => setDiaryFormMood(e.target.value)} placeholder="Humeur personnalisee..." className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"/>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-300">Texte *</label><textarea required rows={5} value={diaryFormContent} onChange={(e) => setDiaryFormContent(e.target.value)} placeholder="Ecrivez vos pensees, faits marquants ou ressentis..." className="bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-y font-serif leading-relaxed"/></div>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-white/10 cursor-pointer hover:bg-slate-900">
                <input type="checkbox" checked={diaryFormMilestone} onChange={(e) => setDiaryFormMilestone(e.target.checked)} className="w-4 h-4 rounded bg-slate-950 border-white/20"/>
                <div className="flex items-center gap-2"><Star className={cn('w-4 h-4',diaryFormMilestone?'text-amber-400 fill-amber-400':'text-slate-500')}/><div><div className="text-xs font-semibold text-slate-200">Marquer comme Etape Cle</div><div className="text-[10px] text-slate-400">Met en valeur ce souvenir.</div></div></div>
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setShowDiaryModal(false)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 cursor-pointer">Annuler</button>
                <button type="submit" disabled={!diaryFormContent.trim()} className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"><Check className="w-3.5 h-3.5"/><span>{editingDiaryId ? 'Mettre a jour' : 'Enregistrer'}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
