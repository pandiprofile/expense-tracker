import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../models/transaction.model';

@Component({
  selector: 'app-category-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatRadioModule, MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Category</h2>
    <mat-dialog-content>
      <p class="txn-desc">{{ data.transaction.description }}</p>
      <p class="txn-amount" [class.income]="selectedType === 'income'" [class.expense]="selectedType === 'expense'">
        SGD {{ data.transaction.amount < 0 ? -data.transaction.amount : data.transaction.amount | number:'1.2-2' }}
      </p>

      <mat-radio-group [(ngModel)]="selectedType" class="type-group">
        <mat-radio-button value="income">Income</mat-radio-button>
        <mat-radio-button value="expense">Expense</mat-radio-button>
      </mat-radio-group>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Category</mat-label>
        <mat-select [(ngModel)]="selectedCategory">
          @if (selectedType === 'expense') {
            @for (cat of expenseCategories; track cat) {
              <mat-option [value]="cat">{{ cat }}</mat-option>
            }
          } @else {
            @for (cat of incomeCategories; track cat) {
              <mat-option [value]="cat">{{ cat }}</mat-option>
            }
          }
        </mat-select>
      </mat-form-field>

      @if (data.transaction.originalCategory && data.transaction.originalCategory !== selectedCategory) {
        <p class="original-cat">
          <mat-icon>info</mat-icon>
          Originally categorized as: {{ data.transaction.originalCategory }}
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .txn-desc {
      font-weight: 500;
      color: #424242;
      margin-bottom: 4px;
    }
    .txn-amount {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .income { color: #2e7d32; }
    .expense { color: #c62828; }
    .type-group {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .full-width { width: 100%; }
    .original-cat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #9e9e9e;
      margin-top: 4px;
    }
    .original-cat mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `],
})
export class CategoryEditorComponent {
  selectedCategory: string;
  selectedType: 'income' | 'expense';
  expenseCategories = [...EXPENSE_CATEGORIES];
  incomeCategories = [...INCOME_CATEGORIES];

  constructor(
    public dialogRef: MatDialogRef<CategoryEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { transaction: Transaction },
  ) {
    this.selectedCategory = data.transaction.category;
    this.selectedType = data.transaction.type;
  }

  save(): void {
    this.dialogRef.close({
      category: this.selectedCategory,
      type: this.selectedType,
    });
  }
}
