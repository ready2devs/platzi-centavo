export type NotificationType = 'OVERSPENT_ALERT' | 'BUDGET_WARNING';

export interface Notification {
  id: string;
  type: NotificationType;
  category: string;
  transactionId: string;
  amount: number;
  budgetLimit: number;
  currentSpent: number;
  overspentAmount: number;
  percentage: number;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationFilters {
  category?: string;
  type?: NotificationType;
  read?: boolean;
}

export interface INotificationRepository {
  create(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'read'> & { read?: boolean }): Promise<Notification>;
  findAll(filters?: NotificationFilters): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  markAsRead(id: string): Promise<Notification | null>;
  clear(): Promise<void>;
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private notifications: Map<string, Notification> = new Map();

  async create(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'read'> & { read?: boolean }): Promise<Notification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const notification: Notification = {
      id,
      type: data.type,
      category: data.category.trim().toLowerCase(),
      transactionId: data.transactionId,
      amount: data.amount,
      budgetLimit: data.budgetLimit,
      currentSpent: data.currentSpent,
      overspentAmount: data.overspentAmount,
      percentage: Math.round(data.percentage * 100) / 100,
      message: data.message,
      read: data.read ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.notifications.set(id, notification);
    return notification;
  }

  async findAll(filters?: NotificationFilters): Promise<Notification[]> {
    let results = Array.from(this.notifications.values());

    if (filters?.category) {
      const cat = filters.category.toLowerCase().trim();
      results = results.filter(n => n.category.toLowerCase() === cat);
    }

    if (filters?.type) {
      results = results.filter(n => n.type === filters.type);
    }

    if (filters?.read !== undefined) {
      results = results.filter(n => n.read === filters.read);
    }

    // Ordenar por fecha descendente (más reciente primero)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) ?? null;
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const notif = this.notifications.get(id);
    if (!notif) return null;

    const updated: Notification = {
      ...notif,
      read: true,
      updatedAt: new Date()
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async clear(): Promise<void> {
    this.notifications.clear();
  }
}

export const defaultNotificationRepository = new InMemoryNotificationRepository();
