import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Plus, CheckCircle2, Circle, Trash2, Clock, 
  AlertCircle, Briefcase, User, Landmark, Edit2, X, ChevronRight, 
  Receipt, ArrowUpRight, Check, Sparkles
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { AgendaEvent } from '../types';
import { 
  cn, 
  formatGameAgendaDate, 
  getAgendaSortKey, 
  getGameDateInfo, 
  getCalendarDateFromGameDay 
} from '../lib/utils';

type FilterCategory = 'all' | 'travail' | 'rdv' | 'personnel' | 'finance' | 'urgent';

export function AgendaScreen() {
  const { 
    agenda = [], 
    bank, 
    epochRealTime, 
    addAgendaEvent, 
    updateAgendaEvent, 
    deleteAgendaEvent, 
    toggleAgendaEventCompleted 
  } = useGameStore();
  
  const currentDateInfo = useMemo(() => getGameDateInfo(epochRealTime), [epochRealTime]);
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [dateGameStr, setDateGameStr] = useState('');
  const [category, setCategory] = useState<AgendaEvent['category']>('personnel');
  const [description, setDescription] = useState('');
  
  // Custom Date Builder State
  const [useDateBuilder, setUseDateBuilder] = useState(true);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedHour, setSelectedHour] = useState<string>('14:00');

  // Compute next monthly recurring bill date in 2100
  const recurringBillsWithDates = useMemo(() => {
    if (!bank.recurringBills || bank.recurringBills.length === 0) return [];
    
    // Monthly recurring bills are debited every 30 game days (1 planetary month)
    const currentDay = currentDateInfo.dayNumber;
    const nextDueDay = Math.floor((currentDay - 1) / 30) * 30 + 31; // 1st of next month
    const cal = getCalendarDateFromGameDay(nextDueDay);
    const dateFormatted = `${cal.dayName} ${cal.dateStr} à 08:00`;
    
    return bank.recurringBills.map(bill => ({
      id: `bill-${bill.id}`,
      title: `Échéance : ${bill.name}`,
      description: `Prélèvement automatique mensuel (${bill.amount} €) sur le Compte Courant.`,
      dateGameStr: dateFormatted,
      category: 'finance' as const,
      isFinancialBill: true,
      amount: bill.amount,
      completed: false
    }));
  }, [bank.recurringBills, currentDateInfo]);

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setTitle('');
    
    // Default to Tomorrow at 10:00
    const tomorrowCal = getCalendarDateFromGameDay(currentDateInfo.dayNumber + 1);
    const defaultDateStr = `${tomorrowCal.dayName} ${tomorrowCal.dateStr} à 10:00`;
    
    setDateGameStr(defaultDateStr);
    setSelectedDayOffset(1);
    setSelectedHour('10:00');
    setUseDateBuilder(true);
    setCategory('personnel');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEditModal = (event: AgendaEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDateGameStr(event.dateGameStr || '');
    setUseDateBuilder(false);
    setCategory(event.category || 'personnel');
    setDescription(event.description || '');
    setShowModal(true);
  };

  const handleSelectQuickPreset = (dayOffset: number, hour: string = '14:00') => {
    setSelectedDayOffset(dayOffset);
    setSelectedHour(hour);
    const targetCal = getCalendarDateFromGameDay(currentDateInfo.dayNumber + dayOffset);
    const formatted = `${targetCal.dayName} ${targetCal.dateStr} à ${hour}`;
    setDateGameStr(formatted);
  };

  const handleHourChange = (newHour: string) => {
    setSelectedHour(newHour);
    const targetCal = getCalendarDateFromGameDay(currentDateInfo.dayNumber + selectedDayOffset);
    const formatted = `${targetCal.dayName} ${targetCal.dateStr} à ${newHour}`;
    setDateGameStr(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingEvent) {
      updateAgendaEvent(editingEvent.id, {
        title: title.trim(),
        dateGameStr: dateGameStr.trim() || undefined,
        category,
        description: description.trim() || undefined
      });
    } else {
      addAgendaEvent({
        title: title.trim(),
        dateGameStr: dateGameStr.trim() || undefined,
        category,
        description: description.trim() || undefined,
        completed: false
      });
    }

    setShowModal(false);
  };

  const getCategoryBadge = (cat?: AgendaEvent['category']) => {
    switch (cat) {
      case 'urgent':
        return {
          label: 'Urgent',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: AlertCircle
        };
      case 'travail':
        return {
          label: 'Travail',
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          icon: Briefcase
        };
      case 'rdv':
        return {
          label: 'Rendez-vous',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock
        };
      case 'finance':
        return {
          label: 'Finance',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: Landmark
        };
      default:
        return {
          label: 'Personnel',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: User
        };
    }
  };

  // Combine user agenda events with recurring bills if filtering finance or all
  const allEvents = useMemo(() => {
    const events = [...agenda];
    
    // Sort chronologically
    return events.sort((a, b) => {
      const keyA = getAgendaSortKey(a.dateGameStr);
      const keyB = getAgendaSortKey(b.dateGameStr);
      return keyA - keyB;
    });
  }, [agenda]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesTab = activeTab === 'upcoming' ? !event.completed : event.completed;
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      return matchesTab && matchesCategory;
    });
  }, [allEvents, activeTab, selectedCategory]);

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-100 overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3.5 bg-slate-900/80 border-b border-white/10 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight leading-none mb-1">
              Agenda & Événements
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span className="text-slate-300 font-semibold">{currentDateInfo.dayName} {currentDateInfo.dateStr}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-sky-400 font-bold">{currentDateInfo.timeStr}</span>
              <span className="text-slate-600">•</span>
              <span className="text-sky-300/90">{currentDateInfo.cyclePhase}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvel événement</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* Controls & Filters */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-white/5 shrink-0 flex flex-col gap-2">
        {/* Status Tabs */}
        <div className="flex p-0.5 bg-slate-900/80 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === 'upcoming'
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <span>À venir ({agenda.filter(e => !e.completed).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === 'completed'
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <span>Terminés ({agenda.filter(e => e.completed).length})</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all border cursor-pointer",
              selectedCategory === 'all'
                ? "bg-slate-700 text-slate-100 border-slate-500"
                : "bg-slate-900/50 text-slate-400 border-white/5 hover:text-slate-200"
            )}
          >
            Tous
          </button>
          {(['travail', 'rdv', 'personnel', 'finance', 'urgent'] as const).map((cat) => {
            const badge = getCategoryBadge(cat);
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all border flex items-center gap-1 cursor-pointer",
                  isSelected
                    ? badge.bg + " border-current font-bold"
                    : "bg-slate-900/50 text-slate-400 border-white/5 hover:text-slate-200"
                )}
              >
                <badge.icon className="w-3 h-3" />
                {badge.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Event List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {/* Recurring Financial Deadlines Banner (if activeTab === 'upcoming' and category is all or finance) */}
        {activeTab === 'upcoming' && (selectedCategory === 'all' || selectedCategory === 'finance') && recurringBillsWithDates.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-slate-200 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-500/10 pb-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Échéances Financières Automatiques
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Prélèvements mensuels</span>
            </div>

            <div className="space-y-2">
              {recurringBillsWithDates.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/5 gap-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{bill.title}</span>
                    <span className="text-[11px] text-emerald-400/90 font-mono font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {bill.dateGameStr}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-rose-400">-{bill.amount} €</span>
                    <span className="text-[9px] text-slate-500 block">Compte Courant</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-300 mb-1">
              {activeTab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement terminé'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {activeTab === 'upcoming'
                ? "Planifiez vos rendez-vous futurs ou demandez à l'IA d'inscrire vos engagements (ex: « Note le rendez-vous dans mon agenda ») !"
                : "Les événements cochés comme accomplis sont archivés ici."}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const badge = getCategoryBadge(event.category);
            return (
              <div
                key={event.id}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative group",
                  event.completed
                    ? "bg-slate-900/30 border-white/5 text-slate-500"
                    : "bg-slate-900/60 border-white/10 text-slate-200 hover:border-white/20 shadow-sm"
                )}
              >
                {/* Completion Checkbox */}
                <button
                  onClick={() => toggleAgendaEventCompleted(event.id)}
                  className="mt-0.5 text-slate-400 hover:text-sky-400 transition-colors shrink-0 cursor-pointer"
                  title={event.completed ? "Marquer comme non terminé" : "Marquer comme terminé"}
                >
                  {event.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                {/* Event Details */}
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1", badge.bg)}>
                      <badge.icon className="w-3 h-3" />
                      {badge.label}
                    </span>

                    {event.dateGameStr && (
                      <span className="text-[11px] font-semibold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-400/30 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-sky-400" />
                        {formatGameAgendaDate(event.dateGameStr)}
                      </span>
                    )}
                  </div>

                  <h3 className={cn("text-sm font-bold tracking-tight text-slate-100", event.completed && "line-through text-slate-500")}>
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className={cn("text-xs text-slate-400 mt-1 leading-relaxed", event.completed && "text-slate-600")}>
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(event)}
                    className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAgendaEvent(event.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal with Enhanced 2100 Calendar Date Builder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 bg-slate-850 border-b border-white/10 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 min-w-0 flex-1">
                <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">{editingEvent ? "Modifier l'événement" : "Nouvel événement calendaire"}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-300 hover:text-white bg-slate-950 border border-white/15 hover:bg-slate-800 rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer shadow-sm ml-2"
                title="Fermer"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Titre / Objet du rendez-vous *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Entretien professionnel, Dîner chez Léo, Shift..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Date & Moment Picker */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Date & Heure précises (2100)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseDateBuilder(!useDateBuilder)}
                    className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                  >
                    {useDateBuilder ? "Saisie libre" : "Assistant de date"}
                  </button>
                </div>

                {useDateBuilder ? (
                  <div className="space-y-2.5">
                    {/* Quick Day Presets */}
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-medium">Sélection rapide du jour :</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: "Aujourd'hui", offset: 0 },
                          { label: "Demain", offset: 1 },
                          { label: "+2 Jours", offset: 2 },
                          { label: "+3 Jours", offset: 3 },
                          { label: "+1 Semaine", offset: 7 },
                          { label: "+1 Mois", offset: 30 },
                        ].map(preset => {
                          const isSelected = selectedDayOffset === preset.offset;
                          const cal = getCalendarDateFromGameDay(currentDateInfo.dayNumber + preset.offset);
                          return (
                            <button
                              key={preset.offset}
                              type="button"
                              onClick={() => handleSelectQuickPreset(preset.offset, selectedHour)}
                              className={cn(
                                "p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                                isSelected
                                  ? "bg-sky-500/20 border-sky-400 text-sky-200 font-bold"
                                  : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20"
                              )}
                            >
                              <span className="text-[11px] leading-tight">{preset.label}</span>
                              <span className="text-[9px] text-slate-500 font-mono">{cal.dateStr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hour of Day in 36h Cycle */}
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-medium">Heure du cycle planétaire (36h) :</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { h: "08:00", name: "Aube" },
                          { h: "12:00", name: "Matin" },
                          { h: "18:00", name: "Zénith" },
                          { h: "24:00", name: "Après-midi" },
                          { h: "28:30", name: "Crépuscule" },
                          { h: "32:00", name: "Soir" },
                          { h: "34:00", name: "Nuit" },
                          { h: "02:00", name: "Minuit" },
                        ].map(hourItem => (
                          <button
                            key={hourItem.h}
                            type="button"
                            onClick={() => handleHourChange(hourItem.h)}
                            className={cn(
                              "py-1 px-1.5 rounded-lg border text-center transition-all cursor-pointer text-[10px]",
                              selectedHour === hourItem.h
                                ? "bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-sm"
                                : "bg-slate-900 text-slate-300 border-white/5 hover:border-white/20"
                            )}
                          >
                            <span className="font-mono block">{hourItem.h}</span>
                            <span className="text-[8px] opacity-75">{hourItem.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={dateGameStr}
                      onChange={(e) => setDateGameStr(e.target.value)}
                      placeholder="ex: Lundi 01/01/2100 à 14:00, Mardi 02/01/2100 à 10:00..."
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {/* Formatted Live Preview */}
                <div className="p-2 rounded-xl bg-slate-900 border border-sky-500/20 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Affichage final :</span>
                  <span className="text-[11px] font-bold text-sky-300 font-mono">
                    {formatGameAgendaDate(dateGameStr) || "Non planifié"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AgendaEvent['category'])}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="personnel">Personnel</option>
                  <option value="travail">Travail</option>
                  <option value="rdv">Rendez-vous</option>
                  <option value="finance">Finance</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description / Notes complémentaires
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informations utiles, lieu, objectifs, contacts associés..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {editingEvent ? "Enregistrer" : "Créer l'événement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
