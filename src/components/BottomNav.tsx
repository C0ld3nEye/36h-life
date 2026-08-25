import React from 'react';
import { Home, FolderOpen, Calendar, Landmark } from 'lucide-react';
import { cn, getImminentAgendaEvents } from '../lib/utils';
import { useGameStore } from '../state/useGameState';

interface BottomNavProps {
  currentTab: 'home' | 'folders' | 'agenda' | 'bank';
  onTabChange: (tab: 'home' | 'folders' | 'agenda' | 'bank') => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const { messages, agenda, epochRealTime } = useGameStore();

  // Compter les messages non lus
  const unreadCount = (messages || []).filter(m => !m.read).length;

  // Compter les événements d'agenda imminents (dans les 3 prochaines heures de jeu)
  const imminentEvents = getImminentAgendaEvents(agenda, epochRealTime);
  const imminentCount = imminentEvents.length;

  return (
    <div className="w-full h-16 shrink-0 bg-slate-950 border-t border-white/10 z-30 flex items-center justify-between px-2 pb-safe">
      <button 
        onClick={() => onTabChange('home')}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab",
          currentTab === 'home' && "active"
        )}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Simulation</span>
      </button>

      <button 
        onClick={() => onTabChange('folders')}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab relative",
          currentTab === 'folders' && "active"
        )}
      >
        <div className="relative">
          <FolderOpen className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">Archives</span>
      </button>

      <button 
        onClick={() => onTabChange('agenda')}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab relative",
          currentTab === 'agenda' && "active"
        )}
      >
        <div className="relative">
          <Calendar className="w-5 h-5" />
          {imminentCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {imminentCount > 9 ? '9+' : imminentCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">Agenda</span>
      </button>

      <button 
        onClick={() => onTabChange('bank')}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab",
          currentTab === 'bank' && "active"
        )}
      >
        <Landmark className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Finance</span>
      </button>
    </div>
  );
}
