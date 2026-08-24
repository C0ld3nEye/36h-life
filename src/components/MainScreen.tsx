import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, AlertOctagon, X, Sparkles, Clock } from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

function formatNarrativeMessage(rawContent: any): string {
  if (!rawContent) return "";
  let text = typeof rawContent === 'string' 
    ? rawContent 
    : (rawContent?.text || rawContent?.narrative || (typeof rawContent === 'object' ? JSON.stringify(rawContent) : String(rawContent)));

  text = text
    .replace(/^\[RÉCAPITULATIF HORS-LIGNE\]\n?/, '')
    .replace(/^\[TÂCHE EN COURS[^\n]*\]\n?/, '');

  if (text.includes('narrative :') || text.includes('"narrative":') || text.includes('isDangerous :')) {
    const narrativeMatch = text.match(/(?:narrative\s*:\s*|"narrative"\s*:\s*)(.+?)(?:,\s*(?:choices|newAgendaEvents|newCharacters|newLocations|vitalsImpact|moneyImpact|skillsImpact|isDangerous|dangerWarning)\s*:|$)/s);
    if (narrativeMatch && narrativeMatch[1]) {
      text = narrativeMatch[1].replace(/^["']|["']$/g, '').trim();
    } else {
      text = text.replace(/^(?:isDangerous\s*:\s*(?:false|true)\s*,\s*)?narrative\s*:\s*/i, '');
      text = text.replace(/(?:,\s*)?(?:choices|newAgendaEvents|newCharacters|newLocations|vitalsImpact|moneyImpact|skillsImpact)\s*:\s*.*$/is, '');
    }
  }

  return text.trim();
}

const NarrativeMessage = memo(({ msg, index }: { msg: any; index: number }) => {
  if (!msg) return null;
  const raw = msg.content as any;
  const msgContent = typeof raw === 'string'
    ? raw
    : (raw?.text || raw?.narrative || (typeof raw === 'object' ? JSON.stringify(raw) : String(raw || '')));
    
  const isOfflineRecap = msg.role === 'model' && msgContent.startsWith('[RÉCAPITULATIF');
  const isTaskProgress = msg.role === 'model' && msgContent.startsWith('[TÂCHE EN COURS');
  const cleanContent = formatNarrativeMessage(msgContent);

  return (
    <div className={cn(
      "flex w-full",
      msg.role === 'user' ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-[15px] leading-relaxed",
        msg.role === 'user' 
          ? "bg-sky-600 text-white rounded-br-sm" 
          : isTaskProgress
            ? "bg-slate-900/90 border border-amber-500/20 text-slate-200 rounded-bl-sm font-serif shadow-amber-950/20"
            : "glass-panel text-slate-200 rounded-bl-sm font-serif"
      )}>
        {isOfflineRecap && (
          <div className="flex items-center gap-2 mb-2 text-sky-400 font-semibold text-xs tracking-wider font-sans">
            <Sparkles className="w-4 h-4" /> RÉVEIL & RETOUR
          </div>
        )}
        {isTaskProgress && (
          <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-xs tracking-wider font-sans">
            <Clock className="w-3.5 h-3.5" />
            <span>{msgContent.split('\n')[0].replace('[', '').replace(']', '')}</span>
          </div>
        )}
        {cleanContent}
      </div>
    </div>
  );
});

export function MainScreen() {
  const narrativeHistory = useGameStore(state => state.narrativeHistory || []);
  const currentTask = useGameStore(state => state.currentTask);
  const choices = useGameStore(state => state.choices || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dangerWarning, setDangerWarning] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [narrativeHistory, loading]);

  // Safety watchdog: ensure loading never gets stuck for more than 48 seconds
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 48000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleSubmit = async (actionText: string, force = false) => {
    const trimmed = (actionText || '').trim();
    if (!trimmed || loading) return;
    
    setLoading(true);
    setDangerWarning(null);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    if (!force) {
      useGameStore.getState().addNarrative('user', trimmed);
    }
    
    try {
      const state = useGameStore.getState();
      const res = await api.performAction({ action: trimmed, state, force });
      
      if (res.isDangerous && !force) {
        setDangerWarning(res.dangerWarning || "Cette action est extrêmement dangereuse ou illégale.");
        setPendingAction(trimmed);
      } else {
        useGameStore.getState().processActionResponse(res);
        setPendingAction(null);
      }
    } catch (err) {
      console.error("Action error:", err);
      useGameStore.getState().processActionResponse({
        isDangerous: false,
        narrative: `Vous poursuivez votre action ("${trimmed}"). Malgré un bref instant d'hésitation, les choses suivent leur cours normalement.`,
        choices: ["Observer ce qui vous entoure", "Faire le point sur la situation", "Poursuivre"]
      });
    } finally {
      setLoading(false);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-transparent">
      {/* Scrollable Narrative Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 narrative-feed overscroll-contain touch-pan-y"
      >
        {narrativeHistory.map((msg, i) => (
          <NarrativeMessage key={i} msg={msg} index={i} />
        ))}
        {loading && (
          <div className="flex justify-start w-full">
            <div className="glass-panel rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-.15s]" />
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-.3s]" />
            </div>
          </div>
        )}
      </div>

      {/* Choice Bubbles and Action Form pinned at bottom */}
      <div className="shrink-0 p-3 bg-slate-950/95 backdrop-blur-md border-t border-white/10 flex flex-col gap-2.5 z-20">
        {choices.length > 0 && !loading && !dangerWarning && (
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            {choices.map((c, i) => {
              const rawC = c as any;
              const choiceText = typeof rawC === 'string' ? rawC : (rawC?.text || rawC?.label || rawC?.choice || String(rawC || ''));
              if (!choiceText) return null;
              return (
                <button
                  key={i}
                  onClick={() => handleSubmit(choiceText)}
                  className="choice-bubble px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
                >
                  {choiceText}
                </button>
              );
            })}
          </div>
        )}

        <form 
          onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
          className="flex items-end gap-2 p-1.5 rounded-2xl border border-white/10 glass-panel bg-slate-900/80"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(input);
              }
            }}
            disabled={loading || !!dangerWarning}
            placeholder={currentTask ? "Agir, penser ou parler pendant la tâche..." : "Décrire une action, une parole, une pensée..."}
            className="flex-1 bg-transparent px-3 py-2.5 outline-none text-sm disabled:opacity-50 text-slate-200 placeholder:text-slate-500 min-w-0 resize-none hide-scrollbar leading-relaxed"
            style={{ height: '40px', minHeight: '40px' }}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading || !!dangerWarning}
            className="p-2.5 mb-0.5 bg-sky-600 text-white rounded-xl hover:bg-sky-500 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Danger Modal */}
      {dangerWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/20 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/20">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Attention !</h3>
            <p className="text-slate-400 text-[15px] leading-relaxed mb-6">
              {dangerWarning}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setDangerWarning(null); setPendingAction(null); }}
                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleSubmit(pendingAction!, true)}
                className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-semibold active:scale-95 transition-transform"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
