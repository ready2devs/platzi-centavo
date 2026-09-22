import { Transaction, TransactionSummary } from '../types/transaction';
import { request } from './apiClient';

interface RawBackendTransaction {
  id: string;
  amount: number;
  category: string | { id?: string; name: string };
  date: string;
  description?: string;
  title?: string;
  type?: 'INCOME' | 'EXPENSE';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransactionDTO {
  amount: number;
  category: string;
  description?: string;
  date?: string;
}

function mapToFrontendTransaction(raw: RawBackendTransaction): Transaction {
  const categoryName = typeof raw.category === 'string' ? raw.category : raw.category?.name || 'General';
  return {
    id: raw.id,
    title: raw.description || raw.title || categoryName,
    amount: Number(raw.amount) || 0,
    type: raw.type || 'EXPENSE',
    category: {
      id: typeof raw.category === 'object' && raw.category?.id ? raw.category.id : categoryName.toLowerCase(),
      name: categoryName,
    },
    date: raw.date ? new Date(raw.date).toLocaleDateString() : new Date().toLocaleDateString(),
    description: raw.description,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export const transactionService = {
  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await request<{ data: RawBackendTransaction[] }>('/api/transactions');
      const list = response.data || [];
      return list.map(mapToFrontendTransaction);
    } catch (err) {
      console.warn('transactions-service no disponible o error:', err);
      return [];
    }
  },

  async createTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
    const payload = {
      amount: Number(dto.amount),
      category: dto.category.trim(),
      description: dto.description?.trim() || undefined,
      date: dto.date || new Date().toISOString(),
    };

    const response = await request<{ message: string; data: RawBackendTransaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return mapToFrontendTransaction(response.data);
  },

  async getSummary(): Promise<TransactionSummary> {
    try {
      const txList = await this.getTransactions();
      let totalExpense = 0;
      let totalIncome = 0;

      for (const tx of txList) {
        if (tx.type === 'INCOME') {
          totalIncome += tx.amount;
        } else {
          totalExpense += tx.amount;
        }
      }

      return {
        totalBalance: totalIncome - totalExpense,
        totalIncome,
        totalExpense,
        period: 'Mes actual',
      };
    } catch (err) {
      console.warn('Error calculando resumen financiero:', err);
      return {
        totalBalance: 0,
        totalIncome: 0,
        totalExpense: 0,
        period: 'Mes actual',
      };
    }
  },
};
