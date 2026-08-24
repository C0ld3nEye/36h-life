import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Battery, Coffee, Droplet, Clock, Settings, Calendar, 
  AlertTriangle, XCircle, ChevronRight, CheckCircle2, Sparkles,
  ArrowRight, Sun, Moon, Sunrise, Sunset, Info, X
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { 
  getGameDateInfo, 
  cn, 
  getTaskProgressText, 
  formatGameDuration,
  getImminentAgendaEvents,
  ImminentEvent
} from '../lib/utils';
import { api } from '../lib/api';
import { getAtmosphereForHour } from '../lib/atmosphere';
import { MindsetGauge } from './MindsetGauge';
import { SettingsModal } from './SettingsModal';
import { sendGameNotification } from '../lib/notifications';

interface TopBarProps {
  onSleep?: () => void;
  onNavigateToAgenda?: () => void;
}

export function TopBar({ onSleep, onNavigateToAgenda }: TopBarProps) {
  const { vitals, currentTask, epochRealTime, agenda = [], toggleAgendaEventCompleted } = useGameStore();
  const [dateInfo, setDateInfo] = useState(getGameDateInfo(epochRealTime));
  const [taskRemaining, setTaskRemaining] = useState<string | null>(null);
  const [showAbortTaskModal, setShowAbortTaskModal] = useState(false);
  const [isAbortingTask, setIsAbortingTask] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const isCompletingTaskRef = useRef(false);

  // Compute imminent calendar events (<= 3 game hours)
  const imminentEvents = useMemo(() => {
    return getImminentAgendaEvents(agenda, epochRealTime);
  }, [agenda, epochRealTime]);

  const nearestImminentEvent: ImminentEvent | null = imminentEvents.length > 0 ? imminentEvents[0] : null;
  const atmosphere = useMemo(() => getAtmosphereForHour(dateInfo.gameHourOfDay), [dateInfo.gameHourOfDay]);

  const completeTask = useCallback((task: any) => {
    if (isCompletingTaskRef.current) return;
    isCompletingTaskRef.current = true;

    setTaskRemaining(null);
    useGameStore.getState().setCurrentTask(null);

    // Trigger audible chime, vibration, and system notification
    sendGameNotification({
      title: '⏳ Tâche terminée !',
      body: `Fin de l'action : ${task.description}`,
      tag: 'task-complete'
    });

    // Trigger narrative completion
    const state = useGameStore.getState();
    api.performAction({
      action: `[Tâche achevée] Je viens de terminer : "${task.description}". Décris la fin de cette action ou mon arrivée à destination, ainsi que la nouvelle situation.`,
      state: { ...state, currentTask: null },
      force: true
    }).then(res => {
      useGameStore.getState().processActionResponse(res);
    }).catch(err => {
      console.error("Failed to fetch task completion narrative", err);
      useGameStore.getState().addNarrative('model', `[Système] Vous avez terminé la tâche : ${task.description}. Que voulez-vous faire maintenant ?`);
    }).finally(() => {
      isCompletingTaskRef.current = false;
    });
  }, []);

  // Main task & time countdown ticker
  useEffect(() => {
    const checkTask = () => {
      setDateInfo(getGameDateInfo(epochRealTime));
      
      const task = useGameStore.getState().currentTask;
      if (task) {
        const remaining = task.endTimeReal - Date.now();
        if (remaining > 0) {
          const totalSecs = Math.ceil(remaining / 1000);
          const hours = Math.floor(totalSecs / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          if (hours > 0) {
            setTaskRemaining(`${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
          } else {
            setTaskRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
          }
        } else {
          // Only complete task live if it expired right now in front of the active player (within the last 3 seconds)
          // If it expired in the past while away, App.tsx's handleOfflineCheck handles the offline recap cleanly.
          if (document.visibilityState === 'visible' && remaining >= -3000) {
            completeTask(task);
          } else {
            setTaskRemaining(null);
          }
        }
      } else {
        setTaskRemaining(null);
      }
    };

    const interval = setInterval(checkTask, 1000);
    checkTask();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTask();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTask);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTask);
    };
  }, [epochRealTime, completeTask]);

  const handleAbortTask = async () => {
    const task = currentTask;
    if (!task || isAbortingTask) return;
    setIsAbortingTask(true);
    setShowAbortTaskModal(false);

    setTaskRemaining(null);
    useGameStore.getState().setCurrentTask(null);

    const state = useGameStore.getState();
    try {
      const res = await api.performAction({
        action: `[Interruption prématurée] J'abandonne et j'arrête immédiatement mon action en cours : "${task.description}". Décris cette interruption brutale et applique les conséquences logiques et tangibles sur ma situation, mon moral, mes finances ou mes relations.`,
        state,
        force: true
      });
      useGameStore.getState().processActionResponse(res);
    } catch (err) {
      console.error("Failed to process task interruption", err);
      useGameStore.getState().addNarrative('model', `Vous décidez d'interrompre précipitamment votre action : "${task.description}". Cette décision inattendue pourrait laisser des traces.`);
    } finally {
      setIsAbortingTask(false);
    }
  };

  const getVitalColor = (value: number) => {
    if (value > 60) return 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]';
    if (value > 30) return 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]';
    if (value > 15) return 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]';
    return 'text-rose-500 animate-pulse drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]';
  };

  const getVitalBg = (value: number) => {
    if (value > 60) return 'bg-emerald-500/10';
    if (value > 30) return 'bg-sky-500/10';
    if (value > 15) return 'bg-amber-500/10';
    return 'bg-rose-500/20';
  };

  const getVitalLabel = (type: 'energy' | 'hunger' | 'hygiene' | 'mood', value: number) => {
    if (value > 60) {
      if (type === 'energy') return `Énergie : Pleine forme`;
      if (type === 'hunger') return `Faim : Rassasié`;
      if (type === 'hygiene') return `Hygiène : Impeccable`;
      return `Moral : Très bon`;
    }
    if (value > 30) {
      if (type === 'energy') return `Énergie : En forme`;
      if (type === 'hunger') return `Faim : Petite faim gérable`;
      if (type === 'hygiene') return `Hygiène : Correcte`;
      return `Moral : Positif`;
    }
    if (value > 15) {
      if (type === 'energy') return `Énergie : Fatigue modérée`;
      if (type === 'hunger') return `Faim : Faim prononcée`;
      if (type === 'hygiene') return `Hygiène : À rafraîchir`;
      return `Moral : Neutre`;
    }
    if (type === 'energy') return `Énergie : Épuisement`;
    if (type === 'hunger') return `Faim : Affamé`;
    if (type === 'hygiene') return `Hygiène : Négligée`;
    return `Moral : Morose`;
  };

  const calculateTaskProgress = () => {
    if (!currentTask || !currentTask.endTimeReal || !currentTask.startTimeReal) return 0;
    const totalMs = currentTask.durationMinutes && currentTask.durationMinutes > 0
      ? currentTask.durationMinutes * 60000
      : Math.max(1, currentTask.endTimeReal - currentTask.startTimeReal);
    if (!totalMs || isNaN(totalMs) || totalMs <= 0) return 0;
    const remainingMs = Math.max(0, currentTask.endTimeReal - Date.now());
    const elapsedMs = Math.max(0, totalMs - remainingMs);
    const pct = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
    return isNaN(pct) ? 0 : pct;
  };

  const progressPercent = Math.round(calculateTaskProgress());

  return (
    <div className="w-full shrink-0 flex flex-col z-30 select-none">
      {/* Main Status Bar */}
      <div className="w-full h-14 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 border-b border-white/10 relative">
        {/* Left: Date, Time & Atmospheric Phase */}
        <button
          type="button"
          onClick={() => setShowAtmosphereModal(true)}
          className="flex flex-col shrink-0 justify-center min-w-0 text-left hover:opacity-90 active:scale-95 transition-all cursor-pointer group"
          title="Consulter l'ambiance et les détails du cycle de 36 heures"
        >
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-xs font-bold text-slate-100 tracking-tight group-hover:text-sky-300 transition-colors">
              {dateInfo.dayName} {dateInfo.dateStr}
            </span>
            <span className={cn(
              "text-[11px] font-bold font-mono tracking-tight px-1.5 py-0.5 rounded border shadow-sm transition-colors",
              atmosphere.ambientTone,
              atmosphere.accentBorder,
              "bg-slate-950/80"
            )}>
              {dateInfo.timeStr}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", atmosphere.ambientTone.replace('text-', 'bg-'))} />
            <span className="text-[10px] font-semibold text-slate-400 leading-none group-hover:text-slate-300">
              {atmosphere.phaseName}
            </span>
          </div>
        </button>

        {/* Center: Compact Mindset Gauge */}
        <div className="flex-1 min-w-0 mx-1 flex justify-center items-center">
          <MindsetGauge value={vitals.mindset ?? 50} compact={true} />
        </div>

        {/* Right: Vitals Capsule & Settings Gear Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Vitals Capsule */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
            <div className={cn("p-0.5 rounded-full flex items-center justify-center cursor-help", getVitalBg(vitals.energy))} title={getVitalLabel('energy', vitals.energy)}>
              <Battery className={cn("w-3.5 h-3.5", getVitalColor(vitals.energy))} />
            </div>
            <div className={cn("p-0.5 rounded-full flex items-center justify-center cursor-help", getVitalBg(vitals.hunger))} title={getVitalLabel('hunger', vitals.hunger)}>
              <Coffee className={cn("w-3.5 h-3.5", getVitalColor(vitals.hunger))} />
            </div>
            <div className={cn("p-0.5 rounded-full flex items-center justify-center cursor-help", getVitalBg(vitals.hygiene))} title={getVitalLabel('hygiene', vitals.hygiene)}>
              <Droplet className={cn("w-3.5 h-3.5", getVitalColor(vitals.hygiene))} />
            </div>
          </div>

          {/* Single Settings (Gear) Icon */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-white/10 transition-all flex items-center justify-center shadow-sm cursor-pointer"
            title="Paramètres & Système (Posture, Sauvegarde Cloud, Export/Import JSON, Notifications)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upcoming Event Imminent Banner (<= 3h remaining) */}
      {nearestImminentEvent && (
        <div className="w-full bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/80 border-b border-amber-500/30 px-3.5 py-1.5 flex items-center justify-between gap-2 backdrop-blur-md shadow-md animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/90 border border-amber-400/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Agenda</span>
            </span>

            <span className="text-slate-100 font-semibold truncate text-xs">
              {nearestImminentEvent.title}
            </span>

            <span className="text-[10px] font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-400/30 shrink-0 font-mono">
              {nearestImminentEvent.timeLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onNavigateToAgenda && (
              <button
                type="button"
                onClick={onNavigateToAgenda}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
              >
                <span>Ouvrir l'agenda</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            
            <button
              type="button"
              onClick={() => toggleAgendaEventCompleted(nearestImminentEvent.id)}
              className="p-1 bg-slate-800 hover:bg-emerald-950/80 text-slate-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 rounded-lg transition-all cursor-pointer"
              title="Marquer comme terminé"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Active Task HUD Banner */}
      {currentTask && (
        <div className="w-full bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border-b border-sky-500/25 px-3.5 py-2 flex flex-col gap-1.5 backdrop-blur-md relative shadow-lg animate-in slide-in-from-top-2 duration-300">
          {/* Top Line: Badge + Title + Duration / Countdown */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
              </span>
              <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase bg-sky-950/80 border border-sky-400/30 px-2 py-0.5 rounded-full shrink-0">
                En cours
              </span>
              <span className="text-slate-100 font-medium truncate text-xs sm:text-sm leading-none">
                {currentTask.description}
              </span>
              {currentTask.durationMinutes && currentTask.durationMinutes > 0 && (
                <span className="hidden sm:inline-flex text-[10px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                  {formatGameDuration(currentTask.durationMinutes)}
                </span>
              )}
            </div>

            {/* Live Countdown, Progress Percentage & Abort Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 bg-sky-950/90 px-2.5 py-1 rounded-full border border-sky-400/40 shadow-sm">
                <Clock className="w-3 h-3 text-sky-400 animate-spin [animation-duration:6s]" />
                {taskRemaining ? (
                  <span className="text-[11px] font-bold text-sky-300 font-mono tracking-tight">
                    {taskRemaining}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-sky-300">
                    {getTaskProgressText(progressPercent)}
                  </span>
                )}
                <span className="text-[10px] text-sky-400 font-mono border-l border-sky-400/30 pl-1.5 font-bold">
                  {progressPercent}%
                </span>
              </div>

              {/* Quick Abort / Stop Action Button */}
              <button
                onClick={() => setShowAbortTaskModal(true)}
                disabled={isAbortingTask}
                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-[10px] font-bold rounded-full transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                title="Interrompre ou abandonner l'action en cours (avec conséquences)"
              >
                <XCircle className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">Interrompre</span>
              </button>
            </div>
          </div>

          {/* Bottom Line: Sleek Integrated Progress Bar */}
          <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/5 relative">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(2, progressPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* Task Abort Confirmation Modal */}
      {showAbortTaskModal && currentTask && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 leading-tight">Interrompre l'action ?</h3>
                <p className="text-[11px] text-rose-300/80 font-medium">Décision à impact direct</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous certain de vouloir abandonner <strong className="text-slate-100">"{currentTask.description}"</strong> maintenant ?
            </p>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/20 text-xs space-y-1.5 text-slate-300">
              <span className="font-semibold text-rose-400 block text-[11px] uppercase tracking-wider">⚠️ Risques & Conséquences :</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                <li>Dégradation possible des relations avec vos interlocuteurs</li>
                <li>Impact sur votre moral ou état d'esprit</li>
                <li>Perte financière ou opportunité manquée</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAbortTaskModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Poursuivre la tâche
              </button>
              <button
                type="button"
                onClick={handleAbortTask}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Interrompre</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Centralized Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        onSleep={onSleep} 
      />

      {/* Atmospheric Cycle & Lighting Modal */}
      {showAtmosphereModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className={cn(
            "bg-slate-900/95 border rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden",
            atmosphere.accentBorder
          )}>
            {/* Background glow header */}
            <div 
              className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-50"
              style={{ backgroundColor: atmosphere.glowColor }}
            />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className={cn("p-2.5 rounded-2xl bg-slate-950 border", atmosphere.accentBorder)}>
                  {atmosphere.key === 'aube' && <Sunrise className={cn("w-5 h-5", atmosphere.ambientTone)} />}
                  {(atmosphere.key === 'matin' || atmosphere.key === 'zenith' || atmosphere.key === 'apres_midi') && <Sun className={cn("w-5 h-5", atmosphere.ambientTone)} />}
                  {atmosphere.key === 'crepuscule' && <Sunset className={cn("w-5 h-5", atmosphere.ambientTone)} />}
                  {atmosphere.key === 'nuit' && <Moon className={cn("w-5 h-5", atmosphere.ambientTone)} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 leading-tight flex items-center gap-1.5">
                    {atmosphere.phaseName}
                  </h3>
                  <p className={cn("text-xs font-medium", atmosphere.ambientTone)}>
                    {dateInfo.timeStr} • {atmosphere.subtext}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAtmosphereModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed font-serif relative z-10">
              {atmosphere.lightingDescription}
            </div>

            <div className="space-y-2 relative z-10 text-[11px] text-slate-400">
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-950/40 border border-white/5">
                <span>Calendrier</span>
                <span className="font-semibold text-slate-200">{dateInfo.dayName} {dateInfo.dateStr}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-950/40 border border-white/5">
                <span>Rythme planétaire</span>
                <span className="font-semibold text-sky-400">Cycle solaire de 36 heures</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAtmosphereModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
