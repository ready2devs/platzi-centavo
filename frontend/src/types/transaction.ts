export type TransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  date: string;
  description?: string;
  createdAt: string;
}

export interface TransactionSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  period: string;
}
