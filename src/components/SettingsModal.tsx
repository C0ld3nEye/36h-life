import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, X, Cloud, CloudOff, RefreshCw, LogIn, LogOut, Download, 
  Upload, Bell, BellRing, BellOff, Volume2, CheckCircle2, AlertCircle, 
  RotateCcw, PowerOff, Sparkles, User, ShieldCheck, FileJson, Heart, 
  Compass, Eye, Check, AlertTriangle, Moon, Cpu, Layers, Brain,
  Zap, HelpCircle
} from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useGameStore } from '../state/useGameState';
import { auth, loginWithGoogle, logout } from '../firebase';
import { onSyncStatusChange, triggerCloudSave, SyncStatus } from '../lib/cloudSync';
import { hybridAIRouter } from '../lib/hybridRouter';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendGameNotification, 
  playNotificationChime 
} from '../lib/notifications';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSleep?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSleep }: SettingsModalProps) {
  const { 
    autopilotMode, 
    setAutopilotMode, 
    resetGame,
    vitals,
    episodicMemories
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'cloud' | 'ai' | 'files' | 'notifs' | 'system'>('cloud');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'offline' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [manualSyncMsg, setManualSyncMsg] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(getNotificationPermission());
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    const unsubSync = onSyncStatusChange((s) => {
      setSyncStatus(s);
    });
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      setManualSyncMsg("Connexion réussie ! Synchronisation de votre partie...");
      setTimeout(() => setManualSyncMsg(null), 4000);
    } catch (err: any) {
      console.error("Firebase Login Error", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setManualSyncMsg("Déconnecté. Vos futures actions resteront en local.");
      setTimeout(() => setManualSyncMsg(null), 4000);
    } catch (err: any) {
      console.error("Firebase Logout Error", err);
    }
  };

  const handleForceCloudSave = async () => {
    setManualSyncMsg("Sauvegarde forcée dans le Cloud...");
    try {
      const currentState = useGameStore.getState();
      await triggerCloudSave(currentState, true);
      setManualSyncMsg("Partie synchronisée avec succès sur Firebase !");
    } catch (err) {
      setManualSyncMsg("Erreur lors de la synchronisation cloud.");
    } finally {
      setTimeout(() => setManualSyncMsg(null), 3500);
    }
  };

  const handleRequestNotifs = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermission());
    if (granted) {
      sendGameNotification({
        title: "🔔 Notifications activées !",
        body: "Vous serez prévenu de la fin de vos actions, des rendez-vous et des messages.",
        tag: 'notif-enabled'
      });
      playNotificationChime();
    }
  };

  const handleTestNotification = () => {
    playNotificationChime();
    sendGameNotification({
      title: "⏳ Test de notification en jeu",
      body: "Le carillon audio et le système d'alerte fonctionnent parfaitement !",
      tag: 'test-chime'
    });
    setTestNotifSuccess(true);
    setTimeout(() => setTestNotifSuccess(false), 3000);
  };

  const handleExportJSON = () => {
    const state = useGameStore.getState();
    const cleanState = {
      epochRealTime: state.epochRealTime,
      vitals: state.vitals,
      skills: state.skills,
      characters: state.characters,
      locations: state.locations,
      bank: state.bank,
      diary: state.diary,
      agenda: state.agenda,
      currentTask: state.currentTask,
      narrativeHistory: state.narrativeHistory,
      autopilotMode: state.autopilotMode,
      choices: state.choices,
      lastUpdateTime: Date.now(),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(cleanState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const dateTag = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours()}h${d.getMinutes()}`;
    a.href = url;
    a.download = `36h_life_simulator_save_${dateTag}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object' || !parsed.vitals || !parsed.bank) {
          throw new Error("Format de sauvegarde JSON invalide ou corrompu.");
        }
        useGameStore.getState().loadState(parsed);
        setImportSuccess("Sauvegarde JSON chargée et restaurée avec succès !");
        setTimeout(() => setImportSuccess(null), 4000);
      } catch (err: any) {
        setImportError(err?.message || "Erreur lors du chargement du fichier JSON.");
        setTimeout(() => setImportError(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl border border-sky-500/20 text-sky-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight leading-tight">
                Paramètres &amp; Système
              </h2>
              <p className="text-[11px] text-slate-400">
                Configuration hors-jeu, sauvegardes et notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-950 border border-white/15 hover:bg-slate-800 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-sm"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-4 pt-2.5 bg-slate-950 border-b border-white/5 overflow-x-auto no-scrollbar gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('cloud')}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative",
              activeTab === 'cloud'
                ? "bg-slate-900 text-sky-400 border-t border-x border-white/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sauvegarde Cloud</span>
            {currentUser && !currentUser.isAnonymous && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === 'ai'
                ? "bg-slate-900 text-indigo-400 border-t border-x border-white/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Architecture IA V2</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === 'files'
                ? "bg-slate-900 text-sky-400 border-t border-x border-white/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Fichiers JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('notifs')}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === 'notifs'
                ? "bg-slate-900 text-sky-400 border-t border-x border-white/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === 'system'
                ? "bg-slate-900 text-rose-400 border-t border-x border-white/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>Système</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-slate-900">
          {/* TAB 1: SAUVEGARDE CLOUD (FIREBASE) */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" />
                  <span>Synchronisation Cloud Multi-Appareils</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Assure la synchronisation instantanée de votre aventure entre votre <strong>PC, tablette et smartphone</strong> via Google Firebase.
                </p>
              </div>

              {/* Status Card */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Compte connecté :</span>
                  {currentUser && !currentUser.isAnonymous ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synchronisé en direct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-slate-300 font-bold bg-slate-800/80 px-2.5 py-1 rounded-full border border-white/10">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Mode Local Déconnecté
                    </span>
                  )}
                </div>

                {currentUser && !currentUser.isAnonymous ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-slate-300">
                    <User className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate font-mono text-xs text-sky-300 font-semibold">{currentUser.email}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-white/5 leading-relaxed">
                    Votre partie est conservée en local (IndexedDB) sur ce navigateur. Connectez-vous avec Google pour la retrouver sur tous vos écrans.
                  </p>
                )}

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Statut de la base :</span>
                  {syncStatus.state === 'saving' ? (
                    <span className="text-sky-400 flex items-center gap-1 animate-pulse font-medium">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Écriture en cours...
                    </span>
                  ) : currentUser && !currentUser.isAnonymous ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> À jour dans le Cloud
                    </span>
                  ) : (
                    <span className="text-slate-400">Stockage local actif</span>
                  )}
                </div>
              </div>

              {manualSyncMsg && (
                <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{manualSyncMsg}</span>
                </div>
              )}

              {/* Login / Logout Controls */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                {currentUser && !currentUser.isAnonymous ? (
                  <>
                    <button
                      type="button"
                      onClick={handleForceCloudSave}
                      className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Forcer la synchronisation</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-sky-950/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Se connecter avec Google (Activer le Cloud Multi-Appareils)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: MOTEUR NARRATIF IA (GEMINI CLOUD) */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
                  <Brain className="w-4 h-4" />
                  <span>Moteur Narratif IA (Google Gemini)</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Toutes les narrations, interactions et conséquences de vos actions sont générées en temps réel par les modèles Google Gemini via le serveur de l'application.
                </p>
              </div>

              {/* État du moteur Gemini */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Statut du Moteur IA</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Opérationnel (Cloud API)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="block text-slate-400 font-medium mb-0.5">Architecture :</span>
                      <span className="font-semibold text-slate-200">Génération Serveur Express Sécurisée</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                      <span className="block text-slate-400 font-medium mb-0.5">Dernière Latence :</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {hybridAIRouter.getLastLatency() ? `${hybridAIRouter.getLastLatency()} ms` : 'En attente d\'action'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modules Cognitifs & Mémoire Sémantique */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Modules Cognitifs & Continuité Narrative</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                      <span>Mémoire Épisodique (RAG) :</span>
                      <span className="text-sky-400">Active</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {episodicMemories?.length || 0} souvenir(s) clés conservés pour contextualiser les décisions de l'IA.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                      <span>Perception du Mindset :</span>
                      <span className={vitals.mindset < 25 ? "text-rose-400" : vitals.mindset > 75 ? "text-emerald-400" : "text-sky-400"}>
                        {vitals.mindset < 25 ? "Altérée / Distorsions" : vitals.mindset > 75 ? "Hyper-lucide" : "Stable & Réaliste"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Influence subtilement le ton et la subjectivité des descriptions reçues.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note informative sur les navigateurs web mobiles */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-white/10 flex items-start gap-2.5 text-[11px] text-slate-400">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-slate-300">Note de fonctionnement :</strong> Sur le Web mobile (Chrome Android), l'accès direct aux puces IA matérielles n'est pas autorisé aux pages web par Google. L'application utilise donc directement l'API Cloud de Gemini pour garantir la plus haute qualité de rédaction et une réactivité optimale.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FICHIERS JSON (EXPORT / IMPORT) */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4" />
                  <span>Gestion des Sauvegardes JSON Manuelles</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Exportez un instantané complet de votre monde sous forme de fichier <code>.json</code> pour conserver une archive locale ou le transférer manuellement.
                </p>
              </div>

              {importSuccess && (
                <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {importError && (
                <div className="bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Export Card */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-sky-400" />
                      <span>Exporter ma partie</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Télécharge un fichier JSON contenant votre état de santé, compte bancaire, journal intime, compétences et relations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full py-2.5 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger la sauvegarde (.json)</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Restaurer / Importer</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Sélectionnez un fichier JSON de sauvegarde précédemment exporté pour écraser et charger la partie immédiatement.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportFileSelect}
                      accept=".json,application/json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Sélectionner un fichier JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & AUDIO */}
          {activeTab === 'notifs' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                  <Bell className="w-4 h-4" />
                  <span>Notifications &amp; Alertes Sonores</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Recevez un signal discret ou une notification navigateur lorsque vos actions programmées se terminent, lors d'un réveil ou d'un événement d'agenda.
                </p>
              </div>

              {/* Status Box */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Autorisation système :</span>
                  {notifPermission === 'granted' ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <BellRing className="w-3.5 h-3.5" /> Activées &amp; Autorisées
                    </span>
                  ) : notifPermission === 'denied' ? (
                    <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-500/30">
                      <BellOff className="w-3.5 h-3.5" /> Bloquées par le navigateur
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <Bell className="w-3.5 h-3.5" /> En attente d'autorisation
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Carillon Web Audio</span>
                    <span className="text-[11px] text-slate-400">Son harmonieux généré localement sans fichier externe</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tester le son</span>
                  </button>
                </div>
              </div>

              {testNotifSuccess && (
                <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Notification et carillon envoyés !</span>
                </div>
              )}

              {notifPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestNotifs}
                  className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Bell className="w-4 h-4" />
                  <span>Activer les notifications du navigateur</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 4: SYSTÈME (MODE ABSENCE, SOMMEIL & RESET) */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                  <PowerOff className="w-4 h-4" />
                  <span>Contrôles Système &amp; Session</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gérez le repos du personnage, le mode d'action autonome en cas d'absence ou réinitialisez la partie.
                </p>
              </div>

              {/* Autopilot Absence Mode */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Comportement autonome pendant vos absences prolongées
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'prudent', label: 'Prudent', desc: 'Priorité absolue à la survie et dépenses minimales' },
                    { id: 'normal', label: 'Équilibré', desc: 'Gestion courante du quotidien et repos naturel' },
                    { id: 'curieux', label: 'Curieux', desc: 'Explore et saisit les opportunités sociales' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAutopilotMode(mode.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        autopilotMode === mode.id
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 font-bold"
                          : "bg-slate-950/60 border-white/5 text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <span className="text-xs">{mode.label}</span>
                      <span className="text-[9px] opacity-75 mt-1 leading-tight">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep Quick Button */}
              {onSleep && (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Mode Repos &amp; Sommeil</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Permet d'avancer le temps de repos pour restaurer l'énergie.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSleep();
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                  >
                    Dormir
                  </button>
                </div>
              )}

              {/* Hard Reset Zone */}
              <div className="bg-rose-950/30 p-4 rounded-2xl border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Zone Dangereuse</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Réinitialise intégralement la partie (personnage, relations, finances, compétences et sauvegardes Cloud).
                </p>

                {showResetConfirm ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await resetGame();
                        setShowResetConfirm(false);
                        onClose();
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-rose-950/50"
                    >
                      Confirmer la réinitialisation
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réinitialiser la partie à zéro</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
