import React, { useState } from 'react';
import { Moon, Shield, Sparkles, Compass, X } from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { cn } from '../lib/utils';

interface SleepModalProps {
  onClose: () => void;
  onSleep: () => void;
}

export function SleepModal({ onClose, onSleep }: SleepModalProps) {
  const { autopilotMode, setAutopilotMode } = useGameStore();
  const [isSleeping, setIsSleeping] = useState(false);

  const modes = [
    {
      id: 'prudent',
      title: 'Prudent',
      desc: 'Reste en sécurité, évite les dépenses et les risques.',
      icon: Shield,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30'
    },
    {
      id: 'normal',
      title: 'Normal',
      desc: 'Routine classique, gère ses besoins de base.',
      icon: Moon,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30'
    },
    {
      id: 'curieux',
      title: 'Curieux',
      desc: 'Explore, fait des rencontres, peut dépenser plus.',
      icon: Compass,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30'
    }
  ] as const;

  const handleConfirm = () => {
    localStorage.setItem('last_sleep_time', Date.now().toString());
    setIsSleeping(true);
  };

  if (isSleeping) {
    const selectedMode = modes.find(m => m.id === autopilotMode) || modes[1];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
        <div className="bg-slate-900/90 border border-sky-500/30 rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 animate-pulse">
            <Moon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Mode Autopilote Activé</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Votre personnage vit sa vie selon le comportement <span className="text-sky-400 font-bold">{selectedMode.title}</span>.
            </p>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 text-xs text-slate-400 italic">
            Fermez l'application ou quittez le jeu. Un récapitulatif détaillé vous attendra lors de votre prochain réveil.
          </div>
          <button
            onClick={() => { onSleep(); }}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-all"
          >
            Se réveiller maintenant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 glass-panel relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-full transition-all cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-xl font-bold text-white mb-1 pr-6">Passer en Autopilote</h3>
        <p className="text-slate-400 text-sm mb-6">Comment votre personnage doit-il se comporter pendant votre absence ?</p>
        
        <div className="flex flex-col gap-3 mb-6">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setAutopilotMode(mode.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                autopilotMode === mode.id 
                  ? `${mode.bg}` 
                  : "bg-slate-800/50 border-white/5 hover:bg-slate-800"
              )}
            >
              <div className={cn("p-2 rounded-full bg-slate-950/50 border border-white/5", mode.color)}>
                <mode.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-200">{mode.title}</div>
                <div className="text-xs text-slate-400 leading-snug">{mode.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3.5 bg-slate-800 text-slate-300 rounded-xl font-semibold active:scale-95 transition-transform"
          >
            Annuler
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[2] px-4 py-3.5 bg-sky-600 text-white rounded-xl font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-sky-200" />
            Fermer l'œil
          </button>
        </div>
      </div>
    </div>
  );
}
