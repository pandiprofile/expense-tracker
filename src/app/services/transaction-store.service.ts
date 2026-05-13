import { Injectable, signal, computed } from '@angular/core';
import {
  Transaction,
  StatementSource,
  CategorySummary,
  DashboardSummary,
} from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionStoreService {
  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _sources = signal<StatementSource[]>([]);
  private readonly _searchTerm = signal('');
  private readonly _categoryFilter = signal<string | null>(null);
  private readonly _typeFilter = signal<'all' | 'income' | 'expense'>('all');
  private readonly _sourceFilter = signal<string | null>(null);
  private readonly _dateFrom = signal<Date | null>(null);
  private readonly _dateTo = signal<Date | null>(null);

  readonly transactions = this._transactions.asReadonly();
  readonly sources = this._sources.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly typeFilter = this._typeFilter.asReadonly();
  readonly sourceFilter = this._sourceFilter.asReadonly();

  readonly filteredTransactions = computed(() => {
    let txns = this._transactions();
    const search = this._searchTerm().toLowerCase();
    const cat = this._categoryFilter();
    const type = this._typeFilter();
    const source = this._sourceFilter();
    const dateFrom = this._dateFrom();
    const dateTo = this._dateTo();

    if (search) {
      txns = txns.filter(
        t =>
          t.description.toLowerCase().includes(search) ||
          t.category.toLowerCase().includes(search) ||
          t.source.toLowerCase().includes(search)
      );
    }
    if (cat) {
      txns = txns.filter(t => t.category === cat);
    }
    if (type !== 'all') {
      txns = txns.filter(t => t.type === type);
    }
    if (source) {
      txns = txns.filter(t => t.source === source);
    }
    if (dateFrom) {
      txns = txns.filter(t => new Date(t.date) >= dateFrom);
    }
    if (dateTo) {
      txns = txns.filter(t => new Date(t.date) <= dateTo);
    }

    return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  readonly dashboard = computed<DashboardSummary>(() => {
    const txns = this._transactions();
    const income = txns.filter(t => t.type === 'income');
    const expenses = txns.filter(t => t.type === 'expense');

    const totalIncome = income.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      transactionCount: txns.length,
      incomeByCategory: this.groupByCategory(income, totalIncome),
      expenseByCategory: this.groupByCategory(expenses, totalExpenses),
      sources: this._sources(),
    };
  });

  readonly allCategories = computed(() => {
    const cats = new Set(this._transactions().map(t => t.category));
    return Array.from(cats).sort();
  });

  readonly allSources = computed(() => {
    const srcs = new Set(this._transactions().map(t => t.source));
    return Array.from(srcs).sort();
  });

  addTransactions(transactions: Transaction[], source: StatementSource): void {
    this._transactions.update(existing => [...existing, ...transactions]);
    this._sources.update(existing => [...existing, source]);
  }

  updateCategory(id: string, newCategory: string, newType: 'income' | 'expense'): void {
    this._transactions.update(txns =>
      txns.map(t => (t.id === id ? { ...t, category: newCategory, type: newType } : t))
    );
  }

  deleteTransaction(id: string): void {
    this._transactions.update(txns => txns.filter(t => t.id !== id));
  }

  clearAll(): void {
    this._transactions.set([]);
    this._sources.set([]);
  }

  setSearch(term: string): void {
    this._searchTerm.set(term);
  }

  setCategoryFilter(cat: string | null): void {
    this._categoryFilter.set(cat);
  }

  setTypeFilter(type: 'all' | 'income' | 'expense'): void {
    this._typeFilter.set(type);
  }

  setSourceFilter(source: string | null): void {
    this._sourceFilter.set(source);
  }

  setDateRange(from: Date | null, to: Date | null): void {
    this._dateFrom.set(from);
    this._dateTo.set(to);
  }

  exportToCsv(): string {
    const txns = this.filteredTransactions();
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Source'];
    const rows = txns.map(t => [
      new Date(t.date).toLocaleDateString(),
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.type,
      t.category,
      t.source,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private groupByCategory(txns: Transaction[], total: number): CategorySummary[] {
    const map = new Map<string, { total: number; count: number }>();
    for (const t of txns) {
      const existing = map.get(t.category) || { total: 0, count: 0 };
      existing.total += Math.abs(t.amount);
      existing.count += 1;
      map.set(t.category, existing);
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: total > 0 ? (data.total / total) * 100 : 0,
        type: txns[0]?.type || ('expense' as const),
      }))
      .sort((a, b) => b.total - a.total);
  }
}
