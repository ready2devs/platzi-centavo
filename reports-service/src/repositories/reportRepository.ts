import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

export interface CategorySummary {
  category: string;
  totalSpent: number;
  budgetLimit: number | null;
  difference: number;
  percentageUsed: number | null;
  status: 'WITHIN_BUDGET' | 'EXCEEDED' | 'NO_BUDGET';
  isExceeded: boolean;
}

export interface ReportContent {
  id: string;
  month: string; // YYYY-MM
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalSpent: number;
  totalBudget: number;
  netSavings: number;
  transactionsCount: number;
  hasExceededBudget: boolean;
  exceededCategories: string[];
  alerts: string[];
  categoryBreakdown: CategorySummary[];
  transactions: Array<{
    id: string;
    amount: number;
    category: string;
    date: string;
    description?: string;
  }>;
}

export interface ReportMetadata {
  id: string;
  month: string;
  generatedAt: string;
  totalSpent: number;
  totalBudget: number;
  netSavings: number;
  transactionsCount: number;
  hasExceededBudget: boolean;
  exceededCategories: string[];
  fileName: string;
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportRepository {
  save(report: ReportContent): Promise<ReportMetadata>;
  findAll(): Promise<ReportMetadata[]>;
  findById(id: string): Promise<ReportMetadata | null>;
  findFullReportById(id: string): Promise<ReportContent | null>;
  getFilePath(id: string): Promise<string | null>;
  clear(): Promise<void>;
}

export class InMemoryReportRepository implements IReportRepository {
  private reports: Map<string, ReportMetadata> = new Map();
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir = storageDir || process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage/reports');
    if (!fsSync.existsSync(this.storageDir)) {
      fsSync.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async save(report: ReportContent): Promise<ReportMetadata> {
    const fileName = `report_${report.month}_${report.id}.json`;
    const fullPath = path.resolve(this.storageDir, fileName);

    await fs.writeFile(fullPath, JSON.stringify(report, null, 2), 'utf-8');

    const now = new Date();
    const metadata: ReportMetadata = {
      id: report.id,
      month: report.month,
      generatedAt: report.generatedAt,
      totalSpent: report.totalSpent,
      totalBudget: report.totalBudget,
      netSavings: report.netSavings,
      transactionsCount: report.transactionsCount,
      hasExceededBudget: report.hasExceededBudget,
      exceededCategories: report.exceededCategories,
      fileName,
      filePath: fullPath,
      createdAt: now,
      updatedAt: now
    };

    this.reports.set(report.id, metadata);
    return metadata;
  }

  async findAll(): Promise<ReportMetadata[]> {
    const list = Array.from(this.reports.values());
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list;
  }

  async findById(id: string): Promise<ReportMetadata | null> {
    return this.reports.get(id) ?? null;
  }

  async findFullReportById(id: string): Promise<ReportContent | null> {
    const metadata = this.reports.get(id);
    if (!metadata) return null;

    try {
      const content = await fs.readFile(metadata.filePath, 'utf-8');
      return JSON.parse(content) as ReportContent;
    } catch {
      return null;
    }
  }

  async getFilePath(id: string): Promise<string | null> {
    const metadata = this.reports.get(id);
    if (!metadata) return null;
    if (fsSync.existsSync(metadata.filePath)) {
      return metadata.filePath;
    }
    return null;
  }

  async clear(): Promise<void> {
    this.reports.clear();
  }
}

export const defaultReportRepository = new InMemoryReportRepository();
