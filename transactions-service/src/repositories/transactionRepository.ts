export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;        // ISO 8601 date string
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionFilters {
  category?: string;
  startDate?: string;  // ISO 8601
  endDate?: string;    // ISO 8601
}

export interface ITransactionRepository {
  create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  findAll(filters?: TransactionFilters): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
  clear(): Promise<void>; // Útil para testing
}

export class InMemoryTransactionRepository implements ITransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const id = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const transaction: Transaction = {
      id,
      amount: data.amount,
      category: data.category.trim(),
      date: data.date,
      description: data.description?.trim(),
      createdAt: now,
      updatedAt: now
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async findAll(filters?: TransactionFilters): Promise<Transaction[]> {
    let results = Array.from(this.transactions.values());

    if (filters?.category) {
      const cat = filters.category.toLowerCase().trim();
      results = results.filter(t => t.category.toLowerCase() === cat);
    }

    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      results = results.filter(t => new Date(t.date).getTime() >= start);
    }

    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      results = results.filter(t => new Date(t.date).getTime() <= end);
    }

    // Ordenar por fecha descendente (más reciente primero)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return results;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) ?? null;
  }

  async clear(): Promise<void> {
    this.transactions.clear();
  }
}

// Repositorio por defecto en memoria
export const defaultTransactionRepository = new InMemoryTransactionRepository();
