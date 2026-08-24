import { StateCreator } from 'zustand';
import { GameState } from '../../types';
import { GameStore } from '../useGameState';
import { DeterministicRulesEngine } from '../../engine/rulesEngine';

export interface BankSlice {
  bank: GameState['bank'];
  updateMoney: (impact: Partial<{ checkingDelta: number; savingsDelta: number; debtsDelta: number; reason?: string }>, label?: string) => void;
  transferMoney: (from: 'checking' | 'savings', to: 'checking' | 'savings' | 'debts', amount: number) => { success: boolean; error?: string };
  takeLoan: (amount: number) => { success: boolean; error?: string };
}

export const createBankSlice: StateCreator<GameStore, [], [], BankSlice> = (set, get) => ({
  bank: {
    checking: 500,
    savings: 1000,
    savingsRate: 0.02,
    debts: 0,
    debtRate: 0.05,
    recurringBills: [
      {
        id: 'bill-loyer',
        name: 'Loyer',
        amount: 350,
        nextDueDate: Date.now() + 30 * 36 * 60 * 60 * 1000
      }
    ],
    transactions: [
      {
        id: 'init-2',
        timestamp: Date.now(),
        label: 'Solde de départ - Épargne',
        amount: 1000,
        account: 'savings',
        category: 'virement'
      },
      {
        id: 'init-1',
        timestamp: Date.now() - 1000,
        label: 'Solde de départ - Courant',
        amount: 500,
        account: 'checking',
        category: 'virement'
      }
    ]
  },

  updateMoney: (impact, label) => set((state) => {
    const newBank = { ...state.bank };
    const txList = newBank.transactions ? [...newBank.transactions] : [];
    const now = Date.now();
    const txLabel = label || impact.reason;

    if (impact.checkingDelta) {
      newBank.checking += impact.checkingDelta;
      txList.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        label: txLabel || (impact.checkingDelta > 0 ? "Revenu / Crédit" : "Dépense / Facture"),
        amount: impact.checkingDelta,
        account: 'checking',
        category: impact.checkingDelta > 0 ? 'salaire' : 'depense'
      });
    }
    if (impact.savingsDelta) {
      newBank.savings += impact.savingsDelta;
      txList.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        label: txLabel || (impact.savingsDelta > 0 ? "Mouvement Épargne (+)" : "Mouvement Épargne (-)"),
        amount: impact.savingsDelta,
        account: 'savings',
        category: 'virement'
      });
    }
    if (impact.debtsDelta) {
      newBank.debts += impact.debtsDelta;
      txList.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        label: txLabel || (impact.debtsDelta < 0 ? "Remboursement de dette" : "Nouveau crédit"),
        amount: -impact.debtsDelta,
        account: 'debts',
        category: impact.debtsDelta < 0 ? 'remboursement' : 'depense'
      });
    }

    newBank.transactions = txList;
    return { bank: newBank, lastUpdateTime: Date.now() };
  }),

  transferMoney: (from, to, amount) => {
    const state = get();
    const bank = { ...state.bank };

    const validation = DeterministicRulesEngine.validateTransfer(bank, from, to, amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Apply transfer
    if (from === 'checking') bank.checking -= amount;
    if (from === 'savings') bank.savings -= amount;

    if (to === 'checking') bank.checking += amount;
    if (to === 'savings') bank.savings += amount;
    if (to === 'debts') bank.debts = Math.max(0, bank.debts - amount);

    const accountNames = {
      checking: 'Compte Courant',
      savings: "Livret d'Épargne",
      debts: 'Remboursement Dette'
    };

    const now = Date.now();
    const txList = bank.transactions ? [...bank.transactions] : [];

    txList.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      label: `Virement vers ${accountNames[to]}`,
      amount: -amount,
      account: from,
      category: 'virement'
    });

    txList.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now + 1,
      label: `Virement reçu de ${accountNames[from]}`,
      amount: amount,
      account: to,
      category: 'virement'
    });

    bank.transactions = txList;
    set({ bank, lastUpdateTime: Date.now() });
    return { success: true };
  },

  takeLoan: (amount) => {
    if (amount <= 0 || isNaN(amount)) {
      return { success: false, error: 'Le montant du crédit doit être supérieur à 0 €.' };
    }
    if (amount > 10000) {
      return { success: false, error: 'Le montant maximal accordé par la banque est de 10 000 €.' };
    }

    const state = get();
    const bank = { ...state.bank };
    bank.checking += amount;
    bank.debts += amount;

    const now = Date.now();
    const txList = bank.transactions ? [...bank.transactions] : [];

    txList.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      label: `Souscription Crédit Banque`,
      amount: amount,
      account: 'checking',
      category: 'virement'
    });

    bank.transactions = txList;
    set({ bank, lastUpdateTime: Date.now() });
    return { success: true };
  }
});
