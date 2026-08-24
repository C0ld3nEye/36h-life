import { StateCreator } from 'zustand';
import { GameState } from '../../types';
import { GameStore } from '../useGameState';

export interface BankSlice {
  bank: GameState['bank'];
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

  transferMoney: (from, to, amount) => {
    return get().dispatchGameAction({
      type: 'TRANSFER_MONEY',
      payload: { from, to, amount }
    });
  },

  takeLoan: (amount) => {
    return get().dispatchGameAction({
      type: 'TAKE_LOAN',
      payload: { amount }
    });
  }
});
