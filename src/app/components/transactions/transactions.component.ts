import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TransactionStoreService } from '../../services/transaction-store.service';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, Transaction } from '../../models/transaction.model';
import { CategoryEditorComponent } from '../category-editor/category-editor.component';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatInputModule, MatFormFieldModule, MatSelectModule,
    MatChipsModule, MatTooltipModule, MatSnackBarModule, MatButtonToggleModule,
    MatBadgeModule, MatMenuModule, MatDialogModule,
  ],
  template: `
    <div class="transactions-container">
      <!-- Filters Bar -->
      <mat-card class="filters-card">
        <div class="filters-row">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search transactions</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput [ngModel]="store.searchTerm()" (ngModelChange)="store.setSearch($event)" placeholder="Search by description, category, or source...">
            @if (store.searchTerm()) {
              <button matSuffix mat-icon-button (click)="store.setSearch('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          <mat-button-toggle-group [value]="store.typeFilter()" (change)="store.setTypeFilter($event.value)" class="type-toggle">
            <mat-button-toggle value="all">All</mat-button-toggle>
            <mat-button-toggle value="income">Income</mat-button-toggle>
            <mat-button-toggle value="expense">Expenses</mat-button-toggle>
          </mat-button-toggle-group>

          <mat-form-field appearance="outline" class="category-filter">
            <mat-label>Category</mat-label>
            <mat-select [ngModel]="store.categoryFilter()" (ngModelChange)="store.setCategoryFilter($event)">
              <mat-option [value]="null">All Categories</mat-option>
              @for (cat of store.allCategories(); track cat) {
                <mat-option [value]="cat">{{ cat }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="source-filter">
            <mat-label>Source</mat-label>
            <mat-select [ngModel]="store.sourceFilter()" (ngModelChange)="store.setSourceFilter($event)">
              <mat-option [value]="null">All Sources</mat-option>
              @for (src of store.allSources(); track src) {
                <mat-option [value]="src">{{ src }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filters-summary">
          <span class="result-count">{{ store.filteredTransactions().length }} transactions</span>
          @if (hasActiveFilters()) {
            <button mat-button color="primary" (click)="clearFilters()">
              <mat-icon>filter_list_off</mat-icon>
              Clear Filters
            </button>
          }
          <div class="spacer"></div>
          <button mat-button [matMenuTriggerFor]="exportMenu">
            <mat-icon>download</mat-icon>
            Export
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportCsv()">
              <mat-icon>table_chart</mat-icon>
              Export as CSV
            </button>
          </mat-menu>
        </div>
      </mat-card>

      @if (store.transactions().length === 0) {
        <mat-card class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h2>No Transactions</h2>
          <p>Upload your statements to see transactions here.</p>
          <button mat-raised-button color="primary" (click)="goToUpload()">
            <mat-icon>cloud_upload</mat-icon>
            Upload Statements
          </button>
        </mat-card>
      } @else {
        <!-- Transaction Cards (responsive) -->
        <div class="txn-list">
          @for (txn of store.filteredTransactions(); track txn.id; let i = $index) {
            <mat-card class="txn-card" [class.income-border]="txn.type === 'income'" [class.expense-border]="txn.type === 'expense'">
              <div class="txn-row">
                <div class="txn-date">
                  <span class="date-day">{{ txn.date | date:'dd' }}</span>
                  <span class="date-month">{{ txn.date | date:'MMM' }}</span>
                </div>
                <div class="txn-details">
                  <span class="txn-desc">{{ txn.description }}</span>
                  <div class="txn-meta">
                    <span class="txn-category" (click)="editCategory(txn)" matTooltip="Click to edit category">
                      {{ txn.category }}
                      <mat-icon class="edit-hint">edit</mat-icon>
                    </span>
                    <span class="txn-source">{{ txn.source }}</span>
                  </div>
                </div>
                <div class="txn-amount" [class.income-text]="txn.type === 'income'" [class.expense-text]="txn.type === 'expense'">
                  {{ txn.type === 'income' ? '+' : '-' }}{{ (txn.amount < 0 ? -txn.amount : txn.amount) | number:'1.2-2' }}
                </div>
                <button mat-icon-button [matMenuTriggerFor]="txnMenu" class="txn-menu-btn">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #txnMenu="matMenu">
                  <button mat-menu-item (click)="editCategory(txn)">
                    <mat-icon>category</mat-icon>
                    Edit Category
                  </button>
                  <button mat-menu-item (click)="deleteTransaction(txn.id)">
                    <mat-icon>delete</mat-icon>
                    Delete
                  </button>
                </mat-menu>
              </div>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .transactions-container {
      max-width: 1000px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .filters-card {
      border-radius: 12px;
      padding: 16px;
      position: sticky;
      top: 64px;
      z-index: 100;
      background: white;
    }
    .filters-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .search-field {
      flex: 1;
      min-width: 250px;
    }
    .category-filter, .source-filter {
      min-width: 160px;
    }
    .type-toggle {
      margin-top: 8px;
    }
    .filters-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      padding: 0 4px;
    }
    .result-count {
      font-size: 13px;
      color: #757575;
      font-weight: 500;
    }
    .spacer { flex: 1; }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      border-radius: 12px;
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bdbdbd;
    }
    .empty-state h2 { color: #616161; margin-top: 16px; }
    .empty-state p { color: #9e9e9e; margin-bottom: 24px; }

    .txn-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .txn-card {
      border-radius: 10px;
      border-left: 4px solid transparent;
      transition: box-shadow 0.2s;
    }
    .txn-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .income-border { border-left-color: #66bb6a; }
    .expense-border { border-left-color: #ef5350; }

    .txn-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
    }
    .txn-date {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 44px;
    }
    .date-day {
      font-size: 20px;
      font-weight: 700;
      color: #212121;
      line-height: 1;
    }
    .date-month {
      font-size: 11px;
      color: #9e9e9e;
      text-transform: uppercase;
      font-weight: 600;
    }
    .txn-details {
      flex: 1;
      min-width: 0;
    }
    .txn-desc {
      display: block;
      font-weight: 500;
      color: #212121;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .txn-meta {
      display: flex;
      gap: 12px;
      margin-top: 4px;
      align-items: center;
    }
    .txn-category {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      color: #1a237e;
      background: #e8eaf6;
      padding: 2px 8px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .txn-category:hover { background: #c5cae9; }
    .edit-hint {
      font-size: 12px;
      width: 12px;
      height: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .txn-category:hover .edit-hint { opacity: 1; }
    .txn-source {
      font-size: 12px;
      color: #9e9e9e;
    }
    .txn-amount {
      font-weight: 700;
      font-size: 16px;
      white-space: nowrap;
      min-width: 100px;
      text-align: right;
    }
    .income-text { color: #2e7d32; }
    .expense-text { color: #c62828; }
    .txn-menu-btn { flex-shrink: 0; }

    @media (max-width: 600px) {
      .filters-row { flex-direction: column; }
      .search-field, .category-filter, .source-filter { min-width: 100%; }
      .txn-amount { min-width: 80px; font-size: 14px; }
    }
  `],
})
export class TransactionsComponent {
  constructor(
    public store: TransactionStoreService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  hasActiveFilters(): boolean {
    return !!(this.store.searchTerm() || this.store.categoryFilter() || this.store.typeFilter() !== 'all' || this.store.sourceFilter());
  }

  clearFilters(): void {
    this.store.setSearch('');
    this.store.setCategoryFilter(null);
    this.store.setTypeFilter('all');
    this.store.setSourceFilter(null);
    this.store.setDateRange(null, null);
  }

  editCategory(txn: Transaction): void {
    const dialogRef = this.dialog.open(CategoryEditorComponent, {
      width: '400px',
      data: { transaction: txn },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.updateCategory(txn.id, result.category, result.type);
        this.snackBar.open(`Category updated to "${result.category}"`, 'OK', { duration: 3000 });
      }
    });
  }

  deleteTransaction(id: string): void {
    this.store.deleteTransaction(id);
    this.snackBar.open('Transaction deleted', 'OK', { duration: 3000 });
  }

  exportCsv(): void {
    const csv = this.store.exportToCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    this.snackBar.open('CSV exported successfully', 'OK', { duration: 3000 });
  }

  goToUpload(): void {
    this.router.navigate(['/upload']);
  }
}
