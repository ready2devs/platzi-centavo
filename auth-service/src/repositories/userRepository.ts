export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface IUserRepository {
  create(data: { email: string; passwordHash: string; name: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  clear(): Promise<void>; // Útil para testing
}

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  async create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const user: User = {
      id,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user || null;
  }

  async clear(): Promise<void> {
    this.users.clear();
  }
}

// Repositorio por defecto en memoria
export const defaultUserRepository = new InMemoryUserRepository();
