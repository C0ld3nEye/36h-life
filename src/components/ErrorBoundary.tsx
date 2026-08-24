import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRepairAndReload = () => {
    try {
      // Clear corrupted tasks or choices in local storage while preserving core save
      const saved = localStorage.getItem('local_game_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            // Sanitize choices
            if (Array.isArray(parsed.choices)) {
              parsed.choices = parsed.choices.map((c: any) => typeof c === 'string' ? c : (c?.text || String(c))).filter(Boolean);
            }
            // Clear stuck task if invalid
            if (parsed.currentTask && (!parsed.currentTask.endTimeReal || isNaN(parsed.currentTask.endTimeReal))) {
              parsed.currentTask = null;
            }
            // Sanitize narrative
            if (Array.isArray(parsed.narrativeHistory)) {
              parsed.narrativeHistory = parsed.narrativeHistory.map((m: any) => ({
                role: m?.role === 'user' ? 'user' : 'model',
                content: typeof m?.content === 'string' ? m.content : (m?.content?.text || JSON.stringify(m?.content || '')),
                timestamp: typeof m?.timestamp === 'number' ? m.timestamp : Date.now()
              }));
            }
            localStorage.setItem('local_game_state', JSON.stringify(parsed));
          }
        } catch (e) {
          // If totally invalid, backup and clear
          console.warn("Could not repair corrupted save, clearing storage:", e);
        }
      }
    } catch (e) {
      console.warn("Storage repair error:", e);
    }
    window.location.reload();
  };

  private handleFullReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser la partie ? Cela effacera la session locale.")) {
      localStorage.removeItem('local_game_state');
      localStorage.removeItem('last_sleep_time');
      localStorage.removeItem('last_active_time');
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#020617] p-4 font-sans text-slate-200 z-[9999]">
          <div className="max-w-md w-full glass-panel bg-slate-900/90 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Interruption de l'interface</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Une donnée de tâche ou de réponse a provoqué une anomalie d'affichage. Vos données principales restent en sécurité.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 text-[11px] font-mono text-rose-300/80 text-left overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleRepairAndReload}
                className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-sky-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réparer & Recharger
              </button>
              <button
                onClick={this.handleFullReset}
                className="py-3 px-4 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-white/10 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
