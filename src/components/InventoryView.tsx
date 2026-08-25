import React, { useState } from 'react';
import { 
  Package, User, Home, Coffee, Utensils, Sparkles, Wrench, Key, 
  Smartphone, Shield, FileText, Trash2, ArrowRightLeft, Check
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { cn } from '../lib/utils';
import { ItemCategory } from '../types';

function getItemCategoryIcon(category?: ItemCategory) {
  switch (category) {
    case 'nourriture':
      return Utensils;
    case 'boisson':
      return Coffee;
    case 'hygiene':
      return Sparkles;
    case 'outils':
      return Wrench;
    case 'clefs_pass':
      return Key;
    case 'technologie':
      return Smartphone;
    case 'livres_documents':
      return FileText;
    case 'vetements':
      return Shield;
    default:
      return Package;
  }
}

function getItemCategoryColor(category?: ItemCategory) {
  switch (category) {
    case 'nourriture':
      return { bg: 'bg-amber-500/15 text-amber-300' };
    case 'boisson':
      return { bg: 'bg-sky-500/15 text-sky-300' };
    case 'hygiene':
      return { bg: 'bg-teal-500/15 text-teal-300' };
    case 'outils':
      return { bg: 'bg-orange-500/15 text-orange-300' };
    case 'clefs_pass':
      return { bg: 'bg-yellow-500/15 text-yellow-300' };
    case 'technologie':
      return { bg: 'bg-indigo-500/15 text-indigo-300' };
    case 'livres_documents':
      return { bg: 'bg-emerald-500/15 text-emerald-300' };
    case 'vetements':
      return { bg: 'bg-purple-500/15 text-purple-300' };
    default:
      return { bg: 'bg-slate-800 text-slate-300' };
  }
}

export function InventoryView({ searchQuery }: { searchQuery: string }) {
  const { inventory, dispatchGameAction } = useGameStore();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'personnage' | 'appartement'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const items = inventory || [];
  const q = searchQuery.toLowerCase().trim();

  const filteredItems = items.filter(item => {
    const matchesQuery = !q || 
      item.name.toLowerCase().includes(q) || 
      (item.category && item.category.toLowerCase().includes(q));
      
    const matchesTab = activeSubTab === 'all' || item.location === activeSubTab;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesQuery && matchesTab && matchesCategory;
  });

  const characterItemsCount = items.filter(i => i.location === 'personnage').length;
  const apartmentItemsCount = items.filter(i => i.location === 'appartement').length;

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'nourriture', label: 'Nourriture' },
    { id: 'boisson', label: 'Boissons' },
    { id: 'hygiene', label: 'Hygiène' },
    { id: 'outils', label: 'Outils' },
    { id: 'technologie', label: 'Technologie' },
    { id: 'clefs_pass', label: 'Clés & Pass' },
    { id: 'livres_documents', label: 'Documents' },
    { id: 'vetements', label: 'Vêtements' },
    { id: 'divers', label: 'Divers' },
  ];

  const handleConsume = (itemId: string, name: string) => {
    const res = dispatchGameAction({ type: 'CONSUME_ITEM', payload: { itemId, quantity: 1 } });
    if (res.success) {
      setActionFeedback(`Consommé : ${name}`);
      setTimeout(() => setActionFeedback(null), 2500);
    }
  };

  const handleMove = (itemId: string, currentLoc: 'personnage' | 'appartement') => {
    const targetLoc = currentLoc === 'appartement' ? 'personnage' : 'appartement';
    dispatchGameAction({ type: 'MOVE_ITEM', payload: { itemId, targetLocation: targetLoc } });
  };

  const handleDelete = (itemId: string, name: string) => {
    dispatchGameAction({ type: 'DELETE_ITEM', payload: { itemId } });
    setActionFeedback(`Jeté : ${name}`);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto w-full pb-8">
      {/* Action feedback banner */}
      {actionFeedback && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Sub-Tabs: Character (Sur soi) vs Apartment (Frigo & Placards) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/80 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'all'
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Tout ({items.length})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('personnage')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'personnage'
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Sur moi ({characterItemsCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('appartement')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              activeSubTab === 'appartement'
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Studio / Frigo ({apartmentItemsCount})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 italic px-2">
          {items.length} objet{items.length > 1 ? 's' : ''} au total
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-all cursor-pointer",
              selectedCategory === cat.id
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                : "bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-900/40 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold text-xs mb-1">
              {searchQuery ? "Aucun objet ne correspond à votre recherche" : "Aucun objet dans cette section"}
            </h4>
            <p className="text-slate-400 text-[11px] max-w-sm italic">
              {activeSubTab === 'appartement' 
                ? "Votre frigo et vos placards sont vides." 
                : "Vous n'avez rien sur vous dans cette catégorie."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5 shadow-md">
          {filteredItems.map(item => {
            const CatIcon = getItemCategoryIcon(item.category);
            const catColors = getItemCategoryColor(item.category);
            const isAtHome = item.location === 'appartement';
            const isExpanded = expandedItemId === item.id;
            const isConsumable = item.consumable || item.category === 'nourriture' || item.category === 'boisson' || item.category === 'hygiene';

            return (
              <div 
                key={item.id}
                className="flex flex-col hover:bg-white/[0.02] transition-colors"
              >
                <div 
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  {/* Left: Icon & Item Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={cn("p-1.5 rounded-lg shrink-0", catColors.bg)}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-200 text-xs sm:text-sm truncate">
                        {item.name}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.freshness && (
                      <span className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.5 rounded border",
                        item.freshness === 'frais' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        item.freshness === 'perime' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        item.freshness === 'sec' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        item.freshness === 'entame' && "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      )}>
                        {item.freshness.toUpperCase()}
                      </span>
                    )}

                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-md border",
                      isAtHome 
                        ? "bg-sky-500/10 text-sky-300 border-sky-500/20" 
                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    )}>
                      {isAtHome ? "🏠 Studio" : "🎒 Sur moi"}
                    </span>
                  </div>
                </div>

                {/* Expanded Action Panel */}
                {isExpanded && (
                  <div className="px-3.5 pb-3 pt-1 bg-slate-950/40 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-slate-400 text-[11px] leading-relaxed max-w-md">
                      {item.description || "Aucune description détaillée."}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConsumable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConsume(item.id, item.name);
                          }}
                          className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Utensils className="w-3 h-3" />
                          <span>Consommer</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(item.id, item.location || 'personnage');
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        title={isAtHome ? "Prendre sur moi" : "Déposer dans le studio"}
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>{isAtHome ? "Prendre sur moi" : "Ranger au studio"}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id, item.name);
                        }}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] transition-all cursor-pointer"
                        title="Jeter l'objet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
