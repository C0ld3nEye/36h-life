import React from 'react';
import { Home, FolderOpen, Calendar, Landmark } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentTab: 'home' | 'folders' | 'agenda' | 'bank';
  onTabChange: (tab: 'home' | 'folders' | 'agenda' | 'bank') => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
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
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab",
          currentTab === 'folders' && "active"
        )}
      >
        <FolderOpen className="w-5 h-5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Archives</span>
      </button>

      <button 
        onClick={() => onTabChange('agenda')}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all nav-tab",
          currentTab === 'agenda' && "active"
        )}
      >
        <Calendar className="w-5 h-5" />
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
