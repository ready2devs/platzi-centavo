import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionSummary } from '../types/transaction';
import { transactionService } from '../services/transactionService';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    period: 'Mes actual',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txList, sum] = await Promise.all([
        transactionService.getTransactions(),
        transactionService.getSummary(),
      ]);
      setTransactions(txList);
      setSummary(sum);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar transacciones';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    summary,
    loading,
    error,
    refresh: fetchTransactions,
    isEmpty: transactions.length === 0,
  };
}
