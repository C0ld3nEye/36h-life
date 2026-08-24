import React, { useState } from 'react';
import { 
  Wallet, PiggyBank, Receipt, TrendingUp, AlertCircle, 
  ArrowRightLeft, ArrowUpRight, ArrowDownLeft, CheckCircle2, 
  ChevronDown, ShieldCheck, Plus, Euro
} from 'lucide-react';
import { useGameStore } from '../state/useGameState';
import { cn, getQualitativeRelativeDate, getGameDateInfo, getCalendarDateFromGameDay } from '../lib/utils';

type AccountOption = {
  id: 'checking' | 'savings' | 'debts';
  name: string;
  balanceStr: string;
};

function CustomAccountSelector({
  value,
  onChange,
  options,
  label
}: {
  value: 'checking' | 'savings' | 'debts';
  onChange: (val: any) => void;
  options: AccountOption[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-slate-950 border border-white/10 rounded-xl p-2.5 px-3 text-sm text-slate-200 hover:border-sky-500/50 flex items-center justify-between gap-2 transition-all cursor-pointer"
      >
        <span className="font-semibold truncate">{selectedOption?.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-sky-400">{selectedOption?.balanceStr}</span>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-slate-950 border border-sky-500/30 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full p-2.5 rounded-lg text-left flex items-center justify-between gap-2 transition-all hover:bg-slate-800/80 cursor-pointer",
                  opt.id === value && "bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold"
                )}
              >
                <span className="text-sm font-medium text-slate-200">{opt.name}</span>
                <span className="text-xs font-bold text-sky-400">{opt.balanceStr}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BankScreen() {
  const { bank, epochRealTime, transferMoney, takeLoan } = useGameStore();
  const dateInfo = getGameDateInfo(epochRealTime);
  const currentDay = dateInfo.dayNumber;
  const nextDueDay = Math.floor((currentDay - 1) / 30) * 30 + 31;
  const nextDueCal = getCalendarDateFromGameDay(nextDueDay);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [fromAccount, setFromAccount] = useState<'checking' | 'savings'>('checking');
  const [toAccount, setToAccount] = useState<'checking' | 'savings' | 'debts'>('savings');
  const [transferAmount, setTransferAmount] = useState<string>('50');
  const [customLoanAmount, setCustomLoanAmount] = useState<string>('500');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanSuccess, setLoanSuccess] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'checking' | 'savings' | 'debts'>('all');
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmLoan, setConfirmLoan] = useState(false);

  const totalNetWorth = (bank.checking || 0) + (bank.savings || 0) - (bank.debts || 0);

  const availableSourceBalance = fromAccount === 'checking' ? bank.checking : bank.savings;

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    const val = parseFloat(transferAmount);
    if (isNaN(val) || val <= 0) {
      setTransferError('Veuillez saisir un montant valide supérieur à 0 €.');
      return;
    }

    if (val > availableSourceBalance) {
      setTransferError(`Solde insuffisant sur ce compte (${availableSourceBalance.toLocaleString('fr-FR')} € disponibles).`);
      return;
    }

    if (!confirmTransfer) {
      setConfirmTransfer(true);
      return;
    }
    setConfirmTransfer(false);

    const res = transferMoney(fromAccount, toAccount, val);

    if (!res.success) {
      setTransferError(res.error || 'Erreur lors du virement.');
    } else {
      setTransferSuccess(`Virement de ${val.toLocaleString('fr-FR')} € validé avec succès.`);
      setTransferAmount('50');
      setTimeout(() => setTransferSuccess(null), 3500);
    }
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoanError(null);
    setLoanSuccess(null);

    const val = parseFloat(customLoanAmount);
    if (isNaN(val) || val <= 0) {
      setLoanError('Veuillez saisir un montant valide supérieur à 0 €.');
      return;
    }

    if (!confirmLoan) {
      setConfirmLoan(true);
      return;
    }
    setConfirmLoan(false);

    const res = takeLoan(val);

    if (!res.success) {
      setLoanError(res.error || 'Erreur lors de la souscription au crédit.');
    } else {
      setLoanSuccess(`Crédit de ${val.toLocaleString('fr-FR')} € accordé et versé sur votre compte courant.`);
      setTimeout(() => setLoanSuccess(null), 4000);
    }
  };

  const transactions = bank.transactions || [];
  const filteredTransactions = transactions.filter(tx => {
    if (historyFilter === 'all') return true;
    return tx.account === historyFilter;
  });

  // Source options
  const sourceOptions: AccountOption[] = [
    { id: 'checking', name: 'Compte Courant', balanceStr: `${(bank.checking || 0).toLocaleString('fr-FR')} €` },
    { id: 'savings', name: "Livret d'Épargne", balanceStr: `${(bank.savings || 0).toLocaleString('fr-FR')} €` }
  ];

  // Destination options
  const destinationOptions: AccountOption[] = [];
  if (fromAccount !== 'checking') {
    destinationOptions.push({ id: 'checking', name: 'Compte Courant', balanceStr: `${(bank.checking || 0).toLocaleString('fr-FR')} €` });
  }
  if (fromAccount !== 'savings') {
    destinationOptions.push({ id: 'savings', name: "Livret d'Épargne", balanceStr: `${(bank.savings || 0).toLocaleString('fr-FR')} €` });
  }
  if (bank.debts > 0) {
    destinationOptions.push({ id: 'debts', name: 'Remboursement Dette', balanceStr: `${(bank.debts || 0).toLocaleString('fr-FR')} € restant` });
  }

  return (
    <div className="absolute inset-0 overflow-y-auto p-3 sm:p-4 flex flex-col gap-4 bg-transparent custom-scrollbar select-none">
      
      {/* Total Balance Card */}
      <div className="glass-panel bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 border border-slate-700/60 text-white rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-xl shrink-0">
        <div className="absolute -right-4 -bottom-4 opacity-5 sm:opacity-10 pointer-events-none select-none">
          <Wallet className="w-28 h-28 sm:w-36 sm:h-36" />
        </div>
        <div className="flex items-center justify-between mb-2 relative z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-slate-300 font-semibold uppercase tracking-wider text-xs">Patrimoine Financier Global</h2>
          </div>
          <div className="flex items-center gap-1.5 z-20">
            <button
              type="button"
              onClick={() => { setShowTransferForm(!showTransferForm); setShowLoanForm(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{showTransferForm ? "Fermer" : "Virement"}</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowLoanForm(!showLoanForm); setShowTransferForm(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{showLoanForm ? "Fermer" : "Emprunter"}</span>
            </button>
          </div>
        </div>

        {/* Real Net Worth Numeric Display */}
        <div className="flex items-baseline gap-2 mb-3 relative z-10">
          <span className={cn(
            "text-3xl sm:text-4xl font-extrabold tracking-tight font-mono",
            totalNetWorth >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {totalNetWorth.toLocaleString('fr-FR')} €
          </span>
          <span className="text-xs text-slate-400 font-medium">solde net</span>
        </div>
        
        {/* Account breakdown cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-slate-700/50 relative z-10">
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Wallet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-medium truncate">Compte Courant</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-sky-300 truncate">
              {(bank.checking || 0).toLocaleString('fr-FR')} €
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium truncate">Livret Épargne</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 truncate">
              {(bank.savings || 0).toLocaleString('fr-FR')} €
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-medium truncate">Dette Bancaire</span>
            </div>
            <div className={cn(
              "text-base sm:text-lg font-bold font-mono truncate",
              (bank.debts || 0) > 0 ? "text-rose-400" : "text-slate-400"
            )}>
              {(bank.debts || 0).toLocaleString('fr-FR')} €
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Form (Collapsible Card) */}
      {showTransferForm && (
        <div className="glass-panel bg-slate-900/95 rounded-3xl p-5 border border-sky-500/40 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200 shrink-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <ArrowRightLeft className="w-5 h-5" />
              <h3>Virement bancaire</h3>
            </div>
            <button 
              onClick={() => setShowTransferForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Source */}
              <CustomAccountSelector
                label="Depuis le compte :"
                value={fromAccount}
                options={sourceOptions}
                onChange={(val) => {
                  setFromAccount(val);
                  setConfirmTransfer(false);
                  if (val === toAccount) {
                    setToAccount(val === 'checking' ? 'savings' : 'checking');
                  }
                }}
              />

              {/* Destination */}
              <CustomAccountSelector
                label="Vers le compte :"
                value={toAccount}
                options={destinationOptions}
                onChange={(val) => {
                  setToAccount(val);
                  setConfirmTransfer(false);
                }}
              />
            </div>

            {/* Numeric Amount Input with Quick Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Montant à transférer</label>
                <span className="text-xs text-slate-400">
                  Disponible : <strong className="text-sky-300">{availableSourceBalance.toLocaleString('fr-FR')} €</strong>
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={availableSourceBalance}
                  step="1"
                  value={transferAmount}
                  onChange={(e) => {
                    setTransferAmount(e.target.value);
                    setConfirmTransfer(false);
                  }}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-base font-bold font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 pr-10"
                  placeholder="Montant en €"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">€</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 flex-wrap pt-1">
                {[10, 25, 50, 100, 250].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setTransferAmount(String(Math.min(amt, availableSourceBalance)));
                      setConfirmTransfer(false);
                    }}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-white/10 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    +{amt} €
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTransferAmount(String(availableSourceBalance));
                    setConfirmTransfer(false);
                  }}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 rounded-lg text-xs font-bold text-sky-300 transition-all cursor-pointer"
                >
                  Tout ({availableSourceBalance.toLocaleString('fr-FR')} €)
                </button>
              </div>
            </div>

            {transferError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{transferSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              className={cn(
                "mt-1 w-full py-3 active:scale-98 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer",
                confirmTransfer ? "bg-amber-600 hover:bg-amber-500" : "bg-sky-600 hover:bg-sky-500"
              )}
            >
              {confirmTransfer ? `Confirmer le virement de ${transferAmount || '0'} € ?` : "Valider le virement"}
            </button>
          </form>
        </div>
      )}

      {/* Loan Form (Collapsible Card) */}
      {showLoanForm && (
        <div className="glass-panel bg-slate-900/95 rounded-3xl p-5 border border-rose-500/40 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200 shrink-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <AlertCircle className="w-5 h-5" />
              <h3>Souscription à un Crédit Bancaire</h3>
            </div>
            <button 
              onClick={() => setShowLoanForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleLoanSubmit} className="flex flex-col gap-4">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed">
              Le montant emprunté sera directement crédité sur votre <strong>Compte Courant</strong>. Une dette bancaire équivalente sera enregistrée avec des frais d'intérêts réguliers lors des factures récurrentes.
            </div>

            {/* Loan Presets & Custom Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Montant du crédit souhaité</label>
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { amt: 100, label: "100 €", sub: "Dépannage" },
                  { amt: 500, label: "500 €", sub: "Trésorerie" },
                  { amt: 1500, label: "1 500 €", sub: "Équipement" },
                ].map((item) => (
                  <button
                    key={item.amt}
                    type="button"
                    onClick={() => {
                      setCustomLoanAmount(String(item.amt));
                      setConfirmLoan(false);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border text-center flex flex-col items-center transition-all cursor-pointer",
                      customLoanAmount === String(item.amt)
                        ? "bg-rose-500/20 border-rose-400 text-rose-200 font-semibold"
                        : "bg-slate-950 border-white/10 text-slate-300 hover:border-rose-500/30"
                    )}
                  >
                    <span className="text-xs font-bold font-mono">{item.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{item.sub}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="10000"
                  step="50"
                  value={customLoanAmount}
                  onChange={(e) => {
                    setCustomLoanAmount(e.target.value);
                    setConfirmLoan(false);
                  }}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-base font-bold font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 pr-10"
                  placeholder="Montant du prêt"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">€</span>
              </div>
            </div>

            {loanError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loanError}</span>
              </div>
            )}

            {loanSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{loanSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              className={cn(
                "mt-1 w-full py-3 active:scale-98 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer",
                confirmLoan ? "bg-amber-600 hover:bg-amber-500" : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {confirmLoan ? `Confirmer la demande de crédit de ${customLoanAmount || '0'} € ?` : "Souscrire au Crédit"}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="glass-panel bg-slate-900/50 rounded-3xl p-4 sm:p-5 border border-white/10 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
            <h3 className="font-bold text-slate-200 text-sm sm:text-base">Historique des Mouvements</h3>
          </div>

          {/* Account Filter Tabs */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto max-w-full custom-scrollbar">
            <button
              onClick={() => setHistoryFilter('all')}
              className={cn("px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap", historyFilter === 'all' ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-slate-200")}
            >
              Tous ({transactions.length})
            </button>
            <button
              onClick={() => setHistoryFilter('checking')}
              className={cn("px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap", historyFilter === 'checking' ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-slate-200")}
            >
              Courant
            </button>
            <button
              onClick={() => setHistoryFilter('savings')}
              className={cn("px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap", historyFilter === 'savings' ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-slate-200")}
            >
              Épargne
            </button>
            {bank.debts > 0 && (
              <button
                onClick={() => setHistoryFilter('debts')}
                className={cn("px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap", historyFilter === 'debts' ? "bg-sky-500 text-white shadow" : "text-slate-400 hover:text-slate-200")}
              >
                Dettes
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <p className="text-slate-400 text-xs sm:text-sm italic text-center py-5">Aucune opération enregistrée pour ce filtre.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {filteredTransactions.map(tx => {
              const isPositive = tx.amount > 0;
              const relativeTime = getQualitativeRelativeDate(tx.timestamp);

              return (
                <div key={tx.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-950/60 border border-white/5 rounded-2xl gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={cn(
                      "p-2 rounded-xl shrink-0",
                      isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {isPositive ? <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200 text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[320px]" title={tx.label}>
                          {tx.label}
                        </span>
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
                          tx.account === 'checking' && "bg-sky-500/10 text-sky-400 border-sky-500/20",
                          tx.account === 'savings' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          tx.account === 'debts' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        )}>
                          {tx.account === 'checking' ? 'Courant' : tx.account === 'savings' ? 'Épargne' : 'Dette'}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block mt-0.5">{relativeTime}</span>
                    </div>
                  </div>

                  {/* Real Numeric Transaction Amount */}
                  <div className={cn(
                    "font-bold font-mono text-xs sm:text-sm shrink-0 text-right whitespace-nowrap pl-1",
                    isPositive ? "text-emerald-400" : "text-slate-300"
                  )}>
                    {isPositive ? `+${tx.amount.toLocaleString('fr-FR')} €` : `${tx.amount.toLocaleString('fr-FR')} €`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recurring Bills */}
      <div className="glass-panel bg-slate-900/50 rounded-3xl p-4 sm:p-5 border border-white/10 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
          <h3 className="font-bold text-slate-200 text-sm sm:text-base">Factures et Charges Récurrentes</h3>
        </div>
        
        {(!bank.recurringBills || bank.recurringBills.length === 0) ? (
          <p className="text-slate-400 text-xs sm:text-sm italic text-center py-3">Aucune charge récurrente enregistrée.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bank.recurringBills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-950/50 border border-white/5 rounded-xl gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-slate-200 text-xs sm:text-sm truncate">{bill.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Prochaine échéance : <span className="text-emerald-400 font-mono font-semibold">{nextDueCal.dayName} {nextDueCal.dateStr} à 08:00</span>
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-rose-400 font-bold font-mono shrink-0">
                  -{bill.amount.toLocaleString('fr-FR')} € / mois
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
