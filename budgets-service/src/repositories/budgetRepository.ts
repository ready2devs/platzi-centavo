export interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  period: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetFilters {
  category?: string;
  period?: string;
}

export interface IBudgetRepository {
  create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget>;
  findAll(filters?: BudgetFilters): Promise<Budget[]>;
  findById(id: string): Promise<Budget | null>;
  clear(): Promise<void>; // Útil para testing
}

export class InMemoryBudgetRepository implements IBudgetRepository {
  private budgets: Map<string, Budget> = new Map();

  async create(data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const id = `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const budget: Budget = {
      id,
      category: data.category.trim(),
      limitAmount: data.limitAmount,
      period: data.period.trim().toLowerCase(),
      description: data.description?.trim(),
      createdAt: now,
      updatedAt: now
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async findAll(filters?: BudgetFilters): Promise<Budget[]> {
    let results = Array.from(this.budgets.values());

    if (filters?.category) {
      const cat = filters.category.toLowerCase().trim();
      results = results.filter(b => b.category.toLowerCase() === cat);
    }

    if (filters?.period) {
      const per = filters.period.toLowerCase().trim();
      results = results.filter(b => b.period.toLowerCase() === per);
    }

    // Ordenar por fecha descendente (más reciente primero)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  async findById(id: string): Promise<Budget | null> {
    return this.budgets.get(id) ?? null;
  }

  async clear(): Promise<void> {
    this.budgets.clear();
  }
}

// Repositorio por defecto en memoria
export const defaultBudgetRepository = new InMemoryBudgetRepository();
