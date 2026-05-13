import { Component, computed, viewChild, effect, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { TransactionStoreService } from '../../services/transaction-store.service';

Chart.register(...registerables);

const CHART_COLORS = [
  '#1a237e', '#283593', '#303f9f', '#3949ab', '#3f51b5',
  '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9', '#e8eaf6',
  '#0d47a1', '#1565c0', '#1976d2', '#1e88e5', '#2196f3',
  '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatDividerModule, MatListModule, BaseChartDirective,
  ],
  template: `
    <div class="dashboard-container">
      @if (store.transactions().length === 0) {
        <mat-card class="empty-state">
          <mat-icon class="empty-icon">insert_chart</mat-icon>
          <h2>No Data Yet</h2>
          <p>Upload your bank or credit card statements to see your financial dashboard.</p>
          <button mat-raised-button color="primary" (click)="goToUpload()">
            <mat-icon>cloud_upload</mat-icon>
            Upload Statements
          </button>
        </mat-card>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-grid">
          <mat-card class="summary-card income-card">
            <div class="card-inner">
              <mat-icon>trending_up</mat-icon>
              <div>
                <span class="card-label">Total Income</span>
                <span class="card-value">{{ dashboard().totalIncome | number:'1.2-2' }}</span>
              </div>
            </div>
          </mat-card>

          <mat-card class="summary-card expense-card">
            <div class="card-inner">
              <mat-icon>trending_down</mat-icon>
              <div>
                <span class="card-label">Total Expenses</span>
                <span class="card-value">{{ dashboard().totalExpenses | number:'1.2-2' }}</span>
              </div>
            </div>
          </mat-card>

          <mat-card class="summary-card" [class.positive]="dashboard().netCashFlow >= 0" [class.negative]="dashboard().netCashFlow < 0">
            <div class="card-inner">
              <mat-icon>{{ dashboard().netCashFlow >= 0 ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
              <div>
                <span class="card-label">Net Cash Flow</span>
                <span class="card-value">{{ dashboard().netCashFlow | number:'1.2-2' }}</span>
              </div>
            </div>
          </mat-card>

          <mat-card class="summary-card count-card">
            <div class="card-inner">
              <mat-icon>receipt</mat-icon>
              <div>
                <span class="card-label">Transactions</span>
                <span class="card-value">{{ dashboard().transactionCount }}</span>
              </div>
            </div>
          </mat-card>
        </div>

        <!-- Charts Row -->
        <div class="charts-grid">
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Expenses by Category</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-wrapper">
                <canvas baseChart
                  [type]="'doughnut'"
                  [datasets]="expenseChartData().datasets"
                  [labels]="expenseChartData().labels"
                  [options]="doughnutOptions">
                </canvas>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Income vs Expenses</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-wrapper">
                <canvas baseChart
                  [type]="'bar'"
                  [datasets]="incomeVsExpenseData().datasets"
                  [labels]="incomeVsExpenseData().labels"
                  [options]="barOptions">
                </canvas>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Category Breakdowns -->
        <div class="breakdown-grid">
          <mat-card class="breakdown-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="expense-icon-bg">trending_down</mat-icon>
              <mat-card-title>Expense Categories</mat-card-title>
              <mat-card-subtitle>SGD {{ dashboard().totalExpenses | number:'1.2-2' }} total</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @for (cat of dashboard().expenseByCategory; track cat.category) {
                <div class="category-row" (click)="filterByCategory(cat.category)">
                  <div class="category-info">
                    <span class="category-name">{{ cat.category }}</span>
                    <span class="category-count">{{ cat.count }} txn{{ cat.count > 1 ? 's' : '' }}</span>
                  </div>
                  <div class="category-bar-container">
                    <div class="category-bar" [style.width.%]="cat.percentage" [style.background]="getColor(cat.category)"></div>
                  </div>
                  <div class="category-amount">
                    <span class="amount">{{ cat.total | number:'1.2-2' }}</span>
                    <span class="percentage">{{ cat.percentage | number:'1.1-1' }}%</span>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>

          @if (dashboard().incomeByCategory.length > 0) {
            <mat-card class="breakdown-card">
              <mat-card-header>
                <mat-icon mat-card-avatar class="income-icon-bg">trending_up</mat-icon>
                <mat-card-title>Income Categories</mat-card-title>
                <mat-card-subtitle>SGD {{ dashboard().totalIncome | number:'1.2-2' }} total</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @for (cat of dashboard().incomeByCategory; track cat.category) {
                  <div class="category-row" (click)="filterByCategory(cat.category)">
                    <div class="category-info">
                      <span class="category-name">{{ cat.category }}</span>
                      <span class="category-count">{{ cat.count }} txn{{ cat.count > 1 ? 's' : '' }}</span>
                    </div>
                    <div class="category-bar-container">
                      <div class="category-bar income-bar" [style.width.%]="cat.percentage"></div>
                    </div>
                    <div class="category-amount">
                      <span class="amount income-amount">{{ cat.total | number:'1.2-2' }}</span>
                      <span class="percentage">{{ cat.percentage | number:'1.1-1' }}%</span>
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Sources -->
        <mat-card class="sources-card">
          <mat-card-header>
            <mat-card-title>Statement Sources</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="sources-chips">
              @for (source of dashboard().sources; track source.fileName) {
                <div class="source-chip">
                  <mat-icon>description</mat-icon>
                  <span class="source-name">{{ source.bankName }}</span>
                  <span class="source-detail">{{ source.transactionCount }} txns &middot; {{ source.fileType | uppercase }}</span>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .empty-state {
      text-align: center;
      padding: 64px 24px;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
    }
    .empty-state h2 { color: #616161; margin-top: 16px; }
    .empty-state p { color: #9e9e9e; margin-bottom: 24px; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .summary-card {
      border-radius: 12px;
      overflow: hidden;
    }
    .card-inner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .card-inner mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      padding: 10px;
      border-radius: 12px;
    }
    .card-label {
      display: block;
      font-size: 13px;
      color: #757575;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      margin-top: 2px;
    }
    .income-card .card-inner mat-icon { background: #e8f5e9; color: #2e7d32; }
    .income-card .card-value { color: #2e7d32; }
    .expense-card .card-inner mat-icon { background: #fce4ec; color: #c62828; }
    .expense-card .card-value { color: #c62828; }
    .positive .card-inner mat-icon { background: #e8f5e9; color: #2e7d32; }
    .positive .card-value { color: #2e7d32; }
    .negative .card-inner mat-icon { background: #fce4ec; color: #c62828; }
    .negative .card-value { color: #c62828; }
    .count-card .card-inner mat-icon { background: #e8eaf6; color: #1a237e; }
    .count-card .card-value { color: #1a237e; }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }
    .chart-card { border-radius: 12px; }
    .chart-wrapper {
      position: relative;
      height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
    }
    .breakdown-card { border-radius: 12px; }
    .expense-icon-bg {
      background: #fce4ec !important;
      color: #c62828 !important;
      border-radius: 50%;
      padding: 8px;
    }
    .income-icon-bg {
      background: #e8f5e9 !important;
      color: #2e7d32 !important;
      border-radius: 50%;
      padding: 8px;
    }
    .category-row {
      display: grid;
      grid-template-columns: 180px 1fr 120px;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .category-row:hover {
      background: #f5f5f5;
    }
    .category-info {
      display: flex;
      flex-direction: column;
    }
    .category-name {
      font-weight: 500;
      font-size: 14px;
      color: #212121;
    }
    .category-count {
      font-size: 11px;
      color: #9e9e9e;
    }
    .category-bar-container {
      height: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }
    .category-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .income-bar { background: #66bb6a; }
    .category-amount {
      text-align: right;
      display: flex;
      flex-direction: column;
    }
    .amount {
      font-weight: 600;
      font-size: 14px;
      color: #c62828;
    }
    .income-amount { color: #2e7d32 !important; }
    .percentage {
      font-size: 11px;
      color: #9e9e9e;
    }
    .sources-card { border-radius: 12px; }
    .sources-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 8px 0;
    }
    .source-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #f5f5f5;
      border-radius: 24px;
      font-size: 14px;
    }
    .source-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #757575;
    }
    .source-name { font-weight: 500; }
    .source-detail { color: #9e9e9e; font-size: 12px; }

    @media (max-width: 600px) {
      .charts-grid, .breakdown-grid {
        grid-template-columns: 1fr;
      }
      .category-row {
        grid-template-columns: 120px 1fr 90px;
      }
    }
  `],
})
export class DashboardComponent {
  private colorMap = new Map<string, string>();

  constructor(public store: TransactionStoreService, private router: Router) {}

  dashboard = computed(() => this.store.dashboard());

  expenseChartData = computed(() => {
    const cats = this.dashboard().expenseByCategory.slice(0, 10);
    return {
      labels: cats.map(c => c.category),
      datasets: [{
        data: cats.map(c => c.total),
        backgroundColor: cats.map((c, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };
  });

  incomeVsExpenseData = computed(() => {
    return {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [this.dashboard().totalIncome, this.dashboard().totalExpenses],
        backgroundColor: ['#66bb6a', '#ef5350'],
        borderRadius: 8,
        barThickness: 60,
      }],
    };
  });

  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed;
            const total = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: SGD ${val.toLocaleString('en', { minimumFractionDigits: 2 })} (${pct}%)`;
          },
        },
      },
    },
    cutout: '55%',
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` SGD ${(ctx.parsed.y ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => `SGD ${Number(val).toLocaleString()}`,
        },
      },
    },
  };

  getColor(category: string): string {
    if (!this.colorMap.has(category)) {
      this.colorMap.set(category, CHART_COLORS[this.colorMap.size % CHART_COLORS.length]);
    }
    return this.colorMap.get(category)!;
  }

  filterByCategory(category: string): void {
    this.store.setCategoryFilter(category);
    this.router.navigate(['/transactions']);
  }

  goToUpload(): void {
    this.router.navigate(['/upload']);
  }
}
