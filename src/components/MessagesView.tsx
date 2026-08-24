import React, { useState } from 'react';
import { 
  MessageSquare, Send, CheckCheck, Clock, User, Calendar, 
  Trash2, CornerDownRight, Sparkles, ChevronRight, X, Plus,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { ContactMessage } from '../types';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface MessagesViewProps {
  onNavigateToAgenda?: () => void;
}

export function MessagesView({ onNavigateToAgenda }: MessagesViewProps) {
  const { 
    messages = [], 
    characters = {}, 
    markMessageAsRead, 
    replyToContactMessage, 
    deleteContactMessage,
    addAgendaEvent,
    addNarrative,
    processActionResponse
  } = useGameStore();

  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [customReply, setCustomReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showScheduleSuccess, setShowScheduleSuccess] = useState(false);

  const messagesList = Array.isArray(messages) ? messages : [];

  const handleSelectMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      markMessageAsRead(msg.id);
    }
  };

  const handleSendReply = async (replyText: string) => {
    if (!selectedMessage || !replyText.trim() || isSendingReply) return;
    setIsSendingReply(true);

    const senderName = selectedMessage.senderName || 'Votre contact';
    replyToContactMessage(selectedMessage.id, replyText.trim());

    try {
      const state = useGameStore.getState();
      const res = await api.performAction({
        action: `[Message envoyé à ${senderName}] "${replyText.trim()}". Décris la réception de ma réponse par ${senderName} ou la suite de nos échanges.`,
        state,
        force: true
      });
      processActionResponse(res);
    } catch (err) {
      console.error("Failed to send message reply action", err);
      addNarrative('model', `Vous avez envoyé un message à ${senderName} : "${replyText.trim()}".`);
    } finally {
      setIsSendingReply(false);
      setCustomReply('');
      setSelectedMessage(prev => prev ? { ...prev, replied: true } : null);
    }
  };

  const handleQuickAddAgendaMeeting = () => {
    if (!selectedMessage) return;
    const senderName = selectedMessage.senderName || 'Rendez-vous';
    
    addAgendaEvent({
      title: `Rendez-vous avec ${senderName}`,
      description: `Rendez-vous fixé suite au message : "${selectedMessage.preview}"`,
      locationId: 'loc-cafe-lumina',
      dateGameStr: 'Dans le cycle actuel',
      category: 'rdv',
      completed: false
    });

    setShowScheduleSuccess(true);
    setTimeout(() => setShowScheduleSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Messagerie & Communications ({messagesList.length})
          </h2>
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Réseau local Saint-Michel
        </div>
      </div>

      {/* Messages List & Details */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {messagesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-white/10 text-slate-400">
            <MessageSquare className="w-10 h-10 text-sky-400/60 mb-2" />
            <div className="font-semibold text-slate-200 text-sm">Boîte de réception vide</div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Vous n'avez aucun message en attente pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {messagesList.map(msg => {
              const sender = msg.senderId && characters[msg.senderId] ? characters[msg.senderId] : null;

              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={cn(
                    "p-4 glass-panel rounded-2xl border transition-all hover:bg-white/5 cursor-pointer flex flex-col gap-2 relative group",
                    !msg.read ? "border-sky-500/40 bg-sky-950/20" : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">
                        {sender?.imageUrl ? (
                          <img src={sender.imageUrl} alt={msg.senderName} referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          msg.senderName.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100 truncate">{msg.senderName}</span>
                          {!msg.read && (
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                          )}
                          {msg.replied && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
                              <CheckCheck className="w-3 h-3" />
                              <span>Répondu</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {msg.timestampGameDateStr || 'Récemment'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>

                  <p className="text-xs text-slate-300 font-serif line-clamp-2 pl-10 leading-relaxed">
                    {msg.content || msg.preview}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-slate-950/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0">
                  {selectedMessage.senderName.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                    {selectedMessage.senderName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono">{selectedMessage.timestampGameDateStr || 'Message reçu'}</span>
                    {selectedMessage.replied && (
                      <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                        <CheckCheck className="w-3 h-3" />
                        <span>Réponse transmise</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Message Content & Actions */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
              {/* Message Body */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 text-xs sm:text-sm text-slate-100 font-serif leading-relaxed">
                {selectedMessage.content}
              </div>

              {/* Quick Agenda Schedule Button if it contains invitations */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex items-center gap-2 text-xs text-sky-300">
                  <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Fixer un rendez-vous dans l'agenda ?</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddAgendaMeeting}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  {showScheduleSuccess ? "Ajouté à l'agenda !" : "Inscrire"}
                </button>
              </div>

              {/* Reply options section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200">
                  Propositions de réponse :
                </span>

                <div className="space-y-1.5">
                  {(selectedMessage.replyOptions || [
                    "Merci pour ton message, je te recontacte très vite !",
                    "Bien reçu, avec grand plaisir !",
                    "Je suis un peu pris en ce moment, on se tient au courant."
                  ]).map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSendingReply}
                      onClick={() => handleSendReply(option)}
                      className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-white/5 hover:border-sky-500/30 text-xs text-slate-200 font-serif transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">« {option} »</span>
                      <Send className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom reply input */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <span className="text-xs font-semibold text-slate-300">
                  Ou rédiger une réponse personnalisée :
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    placeholder="Écrire votre message..."
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(customReply); }}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                  <button
                    type="button"
                    disabled={!customReply.trim() || isSendingReply}
                    onClick={() => handleSendReply(customReply)}
                    className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-slate-950/50">
              <button
                type="button"
                onClick={() => {
                  deleteContactMessage(selectedMessage.id);
                  setSelectedMessage(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer le message</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
