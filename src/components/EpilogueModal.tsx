import React from 'react';
import { useGameStore } from '../state/useGameState';
import { Trophy, AlertTriangle, Clock, RefreshCw, Play, HeartPulse } from 'lucide-react';

export const EpilogueModal: React.FC = () => {
  const { gameStatus, epilogueSummary, resetGame, continueGameAfterEpilogue, recoverFromBreakdown } = useGameStore();

  if (!gameStatus || gameStatus === 'active') return null;

  const getStatusDetails = () => {
    switch (gameStatus) {
      case 'victory':
        return {
          title: "Cycle de 36 Heures Accompli",
          icon: <Trophy className="w-10 h-10 text-amber-400" />,
          badge: "Succès & Stabilité",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          defaultText: "Vous avez traversé avec succès l'intégralité du premier cycle de 36 heures ! Votre discernement et votre gestion du quotidien vous ont permis de préserver votre équilibre et de poser les bases de votre vie dans la cité."
        };
      case 'timeout':
        return {
          title: "Premier Cycle Temporel Franchi",
          icon: <Clock className="w-10 h-10 text-sky-400" />,
          badge: "Cycle Terminé",
          badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
          defaultText: "Le premier cycle de 36 heures s'achève. Vous avez découvert les exigences et le rythme singulier de cette planète, marquant la conclusion de cette première grande étape d'acclimatation."
        };
      case 'breakdown':
      default:
        return {
          title: "Épuisement Critique & Surmenage",
          icon: <AlertTriangle className="w-10 h-10 text-rose-400" />,
          badge: "Alerte Vitale",
          badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          defaultText: "Vos réserves mentales ou physiques se sont complètement taries sous la pression du rythme de vie. Vous avez besoin d'une prise en charge médicale d'urgence ou d'un repos complet."
        };
    }
  };

  const details = getStatusDetails();

  return (
    <div id="epilogue-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div id="epilogue-card" className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 shadow-2xl text-zinc-100 flex flex-col items-center text-center space-y-5">
        <div className="p-4 bg-zinc-800/80 border border-zinc-700 rounded-full shadow-inner">
          {details.icon}
        </div>

        <div className="space-y-2">
          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${details.badgeColor}`}>
            {details.badge}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white">{details.title}</h2>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed max-w-md">
          {epilogueSummary || details.defaultText}
        </p>

        {/* Action Buttons: Continuation vs Reset */}
        <div className="w-full pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-center gap-3">
          {gameStatus === 'breakdown' ? (
            <button
              id="epilogue-recover-btn"
              onClick={() => recoverFromBreakdown()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium rounded-xl transition shadow-lg cursor-pointer"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Soins d'urgence au Dispensaire</span>
            </button>
          ) : (
            <button
              id="epilogue-continue-btn"
              onClick={() => continueGameAfterEpilogue()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium rounded-xl transition shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Poursuivre mon aventure (Mode Libre)</span>
            </button>
          )}

          <button
            id="epilogue-reset-btn"
            onClick={() => resetGame()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-300 hover:text-white font-medium rounded-xl border border-zinc-700 transition cursor-pointer text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recommencer à zéro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
