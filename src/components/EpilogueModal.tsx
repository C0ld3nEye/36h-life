import React from 'react';
import { useGameStore } from '../state/useGameState';
import { Trophy, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

export const EpilogueModal: React.FC = () => {
  const { gameStatus, epilogueSummary, resetGame } = useGameStore();

  if (!gameStatus || gameStatus === 'active') return null;

  const getStatusDetails = () => {
    switch (gameStatus) {
      case 'victory':
        return {
          title: "Cycle de 36 Heures Accompli",
          icon: <Trophy className="w-10 h-10 text-amber-400" />,
          badge: "Succès & Stabilité",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          defaultText: "Vous avez traversé avec succès l'intégralité du cycle de 36 heures. Votre persévérance et votre discernement vous ont permis de préserver votre équilibre et de bâtir des bases solides dans la cité."
        };
      case 'timeout':
        return {
          title: "Fin du Cycle Temporel",
          icon: <Clock className="w-10 h-10 text-sky-400" />,
          badge: "Cycle Terminé",
          badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
          defaultText: "Le cycle de 36 heures s'achève. Vous avez découvert les exigences et le rythme singulier de cette ville, marquant la conclusion de cette première grande étape."
        };
      case 'breakdown':
      default:
        return {
          title: "Rupture Psychologique ou Physique",
          icon: <AlertTriangle className="w-10 h-10 text-rose-400" />,
          badge: "Épuisement Critique",
          badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          defaultText: "Vos réserves mentales ou physiques se sont complètement taries sous la pression du cycle. Une période de repos forcé est nécessaire avant de pouvoir repartir sur de nouvelles bases."
        };
    }
  };

  const details = getStatusDetails();

  return (
    <div id="epilogue-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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

        <div className="w-full pt-4 border-t border-zinc-800 flex justify-center">
          <button
            id="epilogue-reset-btn"
            onClick={() => resetGame()}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl transition shadow-lg hover:shadow-emerald-900/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Commencer un Nouveau Cycle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
