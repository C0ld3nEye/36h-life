import React, { useState } from 'react';
import { 
  Compass, Search, Plus, CheckCircle2, PauseCircle, PlayCircle, 
  HelpCircle, Trash2, Edit3, MessageSquare, MapPin, User, Tag, 
  Sparkles, AlertCircle, Eye, ChevronRight, X, Check, ShieldAlert,
  Radio, FileText, ArrowRight, CornerDownRight, Clock, AlertTriangle
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { PlotLead, RumorEntry } from '../types';
import { cn } from '../lib/utils';

export function PlotLeadsView() {
  const { 
    plotLeads = [], 
    rumors = [], 
    characters = {}, 
    locations = {},
    addPlotLead,
    updatePlotLead,
    deletePlotLead,
    addPlotLeadClue,
    addRumor,
    deleteRumor
  } = useGameStore();

  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'rumors'>('leads');
  const [filterStatus, setFilterStatus] = useState<'all' | 'actif' | 'en_pause' | 'resolu' | 'expire'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & form state
  const [selectedLead, setSelectedLead] = useState<PlotLead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showNewRumorModal, setShowNewRumorModal] = useState(false);
  const [newClueText, setNewClueText] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Form states for new Lead
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<PlotLead['category']>('emploi');
  const [formQualitativeStage, setFormQualitativeStage] = useState('Premiers indices recueillis');
  const [formInitialClue, setFormInitialClue] = useState('');
  const [formExpiryWarning, setFormExpiryWarning] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form states for new Rumor
  const [rumorFormText, setRumorFormText] = useState('');
  const [rumorFormSource, setRumorFormSource] = useState('');
  const [rumorFormCredibility, setRumorFormCredibility] = useState<RumorEntry['credibility']>('plausible');
  const [rumorFormDistrict, setRumorFormDistrict] = useState('Quartier Saint-Michel');

  const leadsList = Array.isArray(plotLeads) ? plotLeads : [];
  const rumorsList = Array.isArray(rumors) ? rumors : [];

  const filteredLeads = leadsList.filter(lead => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (filterCategory !== 'all' && lead.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = lead.title.toLowerCase().includes(q);
      const matchStage = (lead.qualitativeStage || '').toLowerCase().includes(q);
      const matchNotes = (lead.notes || '').toLowerCase().includes(q);
      const matchClues = (lead.clues || []).some(c => c.toLowerCase().includes(q));
      if (!matchTitle && !matchStage && !matchNotes && !matchClues) return false;
    }
    return true;
  });

  const filteredRumors = rumorsList.filter(rumor => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = rumor.text.toLowerCase().includes(q);
      const matchSource = (rumor.source || '').toLowerCase().includes(q);
      const matchDistrict = (rumor.district || '').toLowerCase().includes(q);
      if (!matchText && !matchSource && !matchDistrict) return false;
    }
    return true;
  });

  const getCategoryBadge = (category: PlotLead['category']) => {
    switch (category) {
      case 'emploi':
        return { label: 'Opportunité & Emploi', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
      case 'mystere':
        return { label: 'Mystère Urbain', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
      case 'quartier':
        return { label: 'Affaire de Quartier', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
      case 'personnel':
        return { label: 'Quête Personnelle', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      case 'finance':
        return { label: 'Affaire Financière', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
      default:
        return { label: 'Piste', color: 'text-slate-300', bg: 'bg-slate-800 border-white/10' };
    }
  };

  const getStatusBadge = (status: PlotLead['status']) => {
    switch (status) {
      case 'actif':
        return { label: 'En cours d\'investigation', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: PlayCircle };
      case 'en_pause':
        return { label: 'En attente d\'éléments', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: PauseCircle };
      case 'resolu':
        return { label: 'Affaire élucidée / Conclue', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', icon: CheckCircle2 };
      case 'expire':
        return { label: 'Opportunité expirée / Manquée', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', icon: AlertCircle };
      default:
        return { label: 'Piste abandonnée', color: 'text-slate-500', bg: 'bg-slate-900 border-white/5', icon: HelpCircle };
    }
  };

  const getCredibilityBadge = (credibility: RumorEntry['credibility']) => {
    switch (credibility) {
      case 'averee':
        return { label: 'Information avérée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      case 'plausible':
        return { label: 'Rumeur plausible', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
      default:
        return { label: 'Bruit incertain', color: 'text-slate-400', bg: 'bg-slate-800 border-white/10' };
    }
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const clues = formInitialClue.trim() ? [formInitialClue.trim()] : [];
    addPlotLead({
      title: formTitle.trim(),
      category: formCategory,
      status: 'actif',
      qualitativeStage: formQualitativeStage.trim() || 'Premiers repérages effectués',
      clues,
      expiryWarningText: formExpiryWarning.trim() || undefined,
      notes: formNotes.trim() || undefined,
      discoveredGameDateStr: 'Jour actuel'
    });

    setFormTitle('');
    setFormInitialClue('');
    setFormExpiryWarning('');
    setFormNotes('');
    setShowNewLeadModal(false);
  };

  const handleCreateRumor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rumorFormText.trim()) return;

    addRumor({
      text: rumorFormText.trim(),
      source: rumorFormSource.trim() || 'Entendu dans les rues',
      credibility: rumorFormCredibility,
      district: rumorFormDistrict.trim() || 'Quartier Saint-Michel',
      discoveredGameDateStr: 'Jour actuel'
    });

    setRumorFormText('');
    setRumorFormSource('');
    setShowNewRumorModal(false);
  };

  const handleAddClueToSelected = () => {
    if (!selectedLead || !newClueText.trim()) return;
    addPlotLeadClue(selectedLead.id, newClueText.trim());
    setSelectedLead({
      ...selectedLead,
      clues: [...(selectedLead.clues || []), newClueText.trim()]
    });
    setNewClueText('');
  };

  const handleSaveNotes = () => {
    if (!selectedLead) return;
    updatePlotLead(selectedLead.id, { notes: editingNotes });
    setSelectedLead({ ...selectedLead, notes: editingNotes });
    setIsEditingNotes(false);
  };

  const handleToggleStatus = (targetStatus: PlotLead['status']) => {
    if (!selectedLead) return;
    updatePlotLead(selectedLead.id, { status: targetStatus });
    setSelectedLead({ ...selectedLead, status: targetStatus });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Sub-navigation bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveSubTab('leads')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'leads'
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Pistes & Intrigues ({leadsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('rumors')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'rumors'
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Rumeurs Urbaines ({rumorsList.length})</span>
          </button>
        </div>

        {activeSubTab === 'leads' ? (
          <button
            type="button"
            onClick={() => setShowNewLeadModal(true)}
            className="p-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle piste</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewRumorModal(true)}
            className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Noter une rumeur</span>
          </button>
        )}
      </div>

      {/* Search & filters */}
      <div className="p-3 sm:p-4 border-b border-white/5 bg-slate-900/30 flex flex-col gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeSubTab === 'leads' ? "Rechercher une intrigue, un indice..." : "Rechercher une rumeur, un quartier..."}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {activeSubTab === 'leads' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn("px-2.5 py-1 rounded-lg font-medium border whitespace-nowrap cursor-pointer transition-all", filterStatus === 'all' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200")}
            >
              Tous les statuts
            </button>
            <button
              onClick={() => setFilterStatus('actif')}
              className={cn("px-2.5 py-1 rounded-lg font-medium border whitespace-nowrap cursor-pointer transition-all", filterStatus === 'actif' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200")}
            >
              En cours
            </button>
            <button
              onClick={() => setFilterStatus('en_pause')}
              className={cn("px-2.5 py-1 rounded-lg font-medium border whitespace-nowrap cursor-pointer transition-all", filterStatus === 'en_pause' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200")}
            >
              En attente
            </button>
            <button
              onClick={() => setFilterStatus('resolu')}
              className={cn("px-2.5 py-1 rounded-lg font-medium border whitespace-nowrap cursor-pointer transition-all", filterStatus === 'resolu' ? "bg-sky-500/20 text-sky-300 border-sky-500/40" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200")}
            >
              Élucidées
            </button>
            <button
              onClick={() => setFilterStatus('expire')}
              className={cn("px-2.5 py-1 rounded-lg font-medium border whitespace-nowrap cursor-pointer transition-all", filterStatus === 'expire' ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200")}
            >
              Expirées
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeSubTab === 'leads' ? (
          filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
              <Compass className="w-10 h-10 text-amber-400/60 mb-2" />
              <div className="font-semibold text-slate-200 text-sm">Aucune piste d'enquête trouvée</div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Explorez la ville, parlez aux habitants ou cliquez sur "Nouvelle piste" pour noter vos objectifs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredLeads.map(lead => {
                const catBadge = getCategoryBadge(lead.category);
                const statusBadge = getStatusBadge(lead.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <div
                    key={lead.id}
                    onClick={() => {
                      setSelectedLead(lead);
                      setEditingNotes(lead.notes || '');
                      setIsEditingNotes(false);
                    }}
                    className={cn(
                      "p-4 glass-panel rounded-2xl border transition-all hover:bg-white/5 cursor-pointer flex flex-col gap-3 group relative overflow-hidden",
                      lead.status === 'resolu' ? "border-sky-500/30 opacity-80" : 
                      lead.status === 'expire' ? "border-rose-500/30 opacity-90" : 
                      "border-white/10 hover:border-amber-500/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", catBadge.bg, catBadge.color)}>
                            {catBadge.label}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1", statusBadge.bg, statusBadge.color)}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusBadge.label}</span>
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-amber-300 transition-colors mt-0.5">
                          {lead.title}
                        </h3>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </div>

                    {/* Expiry Warning if active with deadline */}
                    {lead.status === 'actif' && lead.expiryWarningText && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-medium">{lead.expiryWarningText}</span>
                      </div>
                    )}

                    {/* Expired Reason if missed */}
                    {lead.status === 'expire' && lead.expiredReason && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{lead.expiredReason}</span>
                      </div>
                    )}

                    {/* Qualitative progression stage */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-300">
                      <span className="text-[11px] font-semibold text-amber-400">Étape actuelle :</span>
                      <span className="font-medium truncate">{lead.qualitativeStage}</span>
                    </div>

                    {/* Clues excerpt */}
                    {lead.clues && lead.clues.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dernier indice :</span>
                        <div className="text-xs text-slate-300 flex items-start gap-1.5 font-serif italic">
                          <CornerDownRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{lead.clues[lead.clues.length - 1]}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredRumors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
              <Radio className="w-10 h-10 text-purple-400/60 mb-2" />
              <div className="font-semibold text-slate-200 text-sm">Aucune rumeur consignée</div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Tendez l'oreille dans les cafés et gares pour recueillir les échos et secrets de la ville.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRumors.map(rumor => {
                const credBadge = getCredibilityBadge(rumor.credibility);
                return (
                  <div key={rumor.id} className="p-4 glass-panel rounded-2xl border border-white/10 flex flex-col gap-2.5 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", credBadge.bg, credBadge.color)}>
                          {credBadge.label}
                        </span>
                        {rumor.district && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 text-slate-300 border border-white/5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-sky-400" />
                            <span>{rumor.district}</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRumor(rumor.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Supprimer la rumeur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 font-serif leading-relaxed italic">
                      « {rumor.text} »
                    </p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
                      <span>Source : <strong className="text-slate-300 font-semibold">{rumor.source}</strong></span>
                      {rumor.discoveredGameDateStr && <span>{rumor.discoveredGameDateStr}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Selected Lead Modal Detail */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-950/50">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", getCategoryBadge(selectedLead.category).bg, getCategoryBadge(selectedLead.category).color)}>
                    {getCategoryBadge(selectedLead.category).label}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", getStatusBadge(selectedLead.status).bg, getStatusBadge(selectedLead.status).color)}>
                    {getStatusBadge(selectedLead.status).label}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {selectedLead.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
              {/* Qualitative Status Controls */}
              <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                <label className="text-xs font-semibold text-slate-300">
                  Avancement narratif & Statut
                </label>
                <div className="text-xs text-amber-300 font-medium pb-2 border-b border-white/5">
                  État : {selectedLead.qualitativeStage}
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('actif')}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      selectedLead.status === 'actif' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200"
                    )}
                  >
                    En cours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('en_pause')}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      selectedLead.status === 'en_pause' ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200"
                    )}
                  >
                    Mettre en pause
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('resolu')}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      selectedLead.status === 'resolu' ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200"
                    )}
                  >
                    Marquer comme Résolue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus('expire')}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      selectedLead.status === 'expire' ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm" : "bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200"
                    )}
                  >
                    Expirée / Manquée
                  </button>
                </div>

                {/* Expiration warning or Expired explanation banner */}
                {selectedLead.status === 'expire' && selectedLead.expiredReason && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 mt-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300 block mb-0.5">Opportunité manquée :</span>
                      <span>{selectedLead.expiredReason}</span>
                    </div>
                  </div>
                )}
                {selectedLead.status === 'actif' && selectedLead.expiryWarningText && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 mt-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{selectedLead.expiryWarningText}</span>
                  </div>
                )}
              </div>

              {/* Clues collection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Indices & Éléments recueillis</span>
                  <span className="text-[10px] text-slate-400">{selectedLead.clues?.length || 0} note(s)</span>
                </div>
                
                <div className="space-y-2">
                  {(selectedLead.clues || []).map((clue, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-200 flex items-start gap-2 font-serif leading-relaxed">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{clue}</span>
                    </div>
                  ))}
                </div>

                {/* Add new clue input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newClueText}
                    onChange={(e) => setNewClueText(e.target.value)}
                    placeholder="Ajouter un nouvel indice ou fait marquant..."
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddClueToSelected(); }}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddClueToSelected}
                    disabled={!newClueText.trim()}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Player Personal Notes */}
              <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Notes personnelles</span>
                  {!isEditingNotes ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(true)}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Check className="w-3 h-3" />
                      <span>Enregistrer</span>
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <textarea
                    rows={3}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 resize-y font-serif"
                  />
                ) : (
                  <p className="text-xs text-slate-300 font-serif leading-relaxed italic">
                    {selectedLead.notes || "Aucune note personnelle rédigée."}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-950/50">
              <button
                type="button"
                onClick={() => {
                  deletePlotLead(selectedLead.id);
                  setSelectedLead(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer la piste</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Plot Lead */}
      {showNewLeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Consigner une nouvelle piste</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewLeadModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Titre de l'intrigue / Affaire *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Piste d'embauche au spatioport, Le paquet suspect..."
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Catégorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="emploi">Opportunité & Emploi</option>
                    <option value="mystere">Mystère Urbain</option>
                    <option value="quartier">Affaire de Quartier</option>
                    <option value="personnel">Quête Personnelle</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Stade qualitatif</label>
                  <input
                    type="text"
                    value={formQualitativeStage}
                    onChange={(e) => setFormQualitativeStage(e.target.value)}
                    placeholder="Ex: Premiers indices"
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Premier indice (optionnel)</label>
                <input
                  type="text"
                  value={formInitialClue}
                  onChange={(e) => setFormInitialClue(e.target.value)}
                  placeholder="Ex: Un document laissé sur la table..."
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Échéance / Délai qualitatif (optionnel)</label>
                <input
                  type="text"
                  value={formExpiryWarning}
                  onChange={(e) => setFormExpiryWarning(e.target.value)}
                  placeholder="Ex: Valable jusqu'à ce soir, Témoin sur le départ..."
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Notes & Contexte</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Détails à garder en mémoire..."
                  className="bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewLeadModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Créer la piste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Rumor */}
      {showNewRumorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                <span>Noter un bruit ou une rumeur</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewRumorModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRumor} className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Contenu du bruit / rumeur *</label>
                <textarea
                  required
                  rows={3}
                  value={rumorFormText}
                  onChange={(e) => setRumorFormText(e.target.value)}
                  placeholder="Ex: On raconte qu'un transporteur clandestin opère depuis les quais..."
                  className="bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 resize-y font-serif"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Source entendue</label>
                  <input
                    type="text"
                    value={rumorFormSource}
                    onChange={(e) => setRumorFormSource(e.target.value)}
                    placeholder="Ex: Bistro Saint-Michel, Voisins..."
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Crédibilité estimée</label>
                  <select
                    value={rumorFormCredibility}
                    onChange={(e) => setRumorFormCredibility(e.target.value as any)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="plausible">Rumeur plausible</option>
                    <option value="averee">Information avérée</option>
                    <option value="faible">Bruit incertain</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Quartier ou Lieu associé</label>
                <input
                  type="text"
                  value={rumorFormDistrict}
                  onChange={(e) => setRumorFormDistrict(e.target.value)}
                  placeholder="Ex: Quartier Saint-Michel, Quais Fluviaux..."
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewRumorModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!rumorFormText.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer la rumeur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
