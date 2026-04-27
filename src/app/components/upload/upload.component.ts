import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { ParserService } from '../../services/parser.service';
import { TransactionStoreService } from '../../services/transaction-store.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatSnackBarModule, MatChipsModule, MatListModule,
  ],
  template: `
    <div class="upload-container">
      <mat-card class="upload-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="header-icon">cloud_upload</mat-icon>
          <mat-card-title>Upload Statements</mat-card-title>
          <mat-card-subtitle>
            Upload your bank or credit card statements in CSV or PDF format
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div
            class="drop-zone"
            [class.drag-over]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            <mat-icon class="upload-icon">upload_file</mat-icon>
            <p class="drop-text">Drag & drop files here or click to browse</p>
            <p class="drop-hint">Supports CSV and PDF bank/credit card statements</p>
            <input
              #fileInput
              type="file"
              multiple
              accept=".csv,.pdf"
              (change)="onFilesSelected($event)"
              hidden
            />
          </div>

          @if (isProcessing()) {
            <mat-progress-bar mode="indeterminate" class="progress-bar"></mat-progress-bar>
            <p class="processing-text">Processing {{ currentFile() }}...</p>
          }

          @if (uploadResults().length > 0) {
            <div class="results-section">
              <h3>Upload Results</h3>
              <mat-list>
                @for (result of uploadResults(); track result.fileName) {
                  <mat-list-item>
                    <mat-icon matListItemIcon [class]="result.success ? 'success-icon' : 'error-icon'">
                      {{ result.success ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <div matListItemTitle>{{ result.fileName }}</div>
                    <div matListItemLine>
                      @if (result.success) {
                        {{ result.count }} transactions imported from {{ result.bank }}
                      } @else {
                        {{ result.error }}
                      }
                    </div>
                  </mat-list-item>
                }
              </mat-list>

              <div class="action-buttons">
                <button mat-raised-button color="primary" (click)="goToDashboard()">
                  <mat-icon>dashboard</mat-icon>
                  View Dashboard
                </button>
                <button mat-raised-button (click)="goToTransactions()">
                  <mat-icon>receipt_long</mat-icon>
                  View Transactions
                </button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (store.sources().length > 0) {
        <mat-card class="sources-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="header-icon">folder</mat-icon>
            <mat-card-title>Uploaded Statements</mat-card-title>
            <mat-card-subtitle>{{ store.sources().length }} file(s) uploaded, {{ store.transactions().length }} total transactions</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              @for (source of store.sources(); track source.fileName) {
                <mat-list-item>
                  <mat-icon matListItemIcon>description</mat-icon>
                  <div matListItemTitle>{{ source.fileName }}</div>
                  <div matListItemLine>{{ source.bankName }} &middot; {{ source.transactionCount }} transactions &middot; {{ source.fileType | uppercase }}</div>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" (click)="clearAll()">
              <mat-icon>delete_sweep</mat-icon>
              Clear All Data
            </button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .upload-container {
      max-width: 800px;
      margin: 24px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-icon {
      background: #e8eaf6;
      color: #1a237e;
      border-radius: 50%;
      padding: 8px;
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .drop-zone {
      border: 2px dashed #bdbdbd;
      border-radius: 16px;
      padding: 48px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #fafafa;
      margin-top: 16px;
    }
    .drop-zone:hover, .drag-over {
      border-color: #1a237e;
      background: #e8eaf6;
    }
    .upload-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #9e9e9e;
    }
    .drop-text {
      font-size: 16px;
      font-weight: 500;
      color: #424242;
      margin: 8px 0 4px;
    }
    .drop-hint {
      font-size: 13px;
      color: #9e9e9e;
    }
    .progress-bar {
      margin-top: 16px;
    }
    .processing-text {
      text-align: center;
      color: #1a237e;
      margin-top: 8px;
      font-weight: 500;
    }
    .results-section {
      margin-top: 24px;
    }
    .results-section h3 {
      margin-bottom: 8px;
      color: #424242;
    }
    .success-icon { color: #2e7d32; }
    .error-icon { color: #c62828; }
    .action-buttons {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      justify-content: center;
    }
    .sources-card mat-card-actions {
      padding: 8px 16px;
    }
  `],
})
export class UploadComponent {
  isDragging = signal(false);
  isProcessing = signal(false);
  currentFile = signal('');
  uploadResults = signal<{ fileName: string; success: boolean; count?: number; bank?: string; error?: string }[]>([]);

  constructor(
    private parser: ParserService,
    public store: TransactionStoreService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    const files = e.dataTransfer?.files;
    if (files) this.processFiles(Array.from(files));
  }

  onFilesSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = '';
    }
  }

  async processFiles(files: File[]): Promise<void> {
    this.isProcessing.set(true);
    this.uploadResults.set([]);
    const results: { fileName: string; success: boolean; count?: number; bank?: string; error?: string }[] = [];

    for (const file of files) {
      this.currentFile.set(file.name);
      try {
        const { transactions, source } = await this.parser.parseFile(file);
        if (transactions.length === 0) {
          results.push({ fileName: file.name, success: false, error: 'No transactions found. Check file format.' });
        } else {
          this.store.addTransactions(transactions, source);
          results.push({ fileName: file.name, success: true, count: transactions.length, bank: source.bankName });
        }
      } catch (err: any) {
        results.push({ fileName: file.name, success: false, error: err.message || 'Failed to parse file' });
      }
    }

    this.uploadResults.set(results);
    this.isProcessing.set(false);
    const totalCount = results.filter(r => r.success).reduce((s, r) => s + (r.count || 0), 0);
    if (totalCount > 0) {
      this.snackBar.open(`Imported ${totalCount} transactions successfully!`, 'OK', { duration: 4000 });
    }
  }

  clearAll(): void {
    this.store.clearAll();
    this.uploadResults.set([]);
    this.snackBar.open('All data cleared', 'OK', { duration: 3000 });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToTransactions(): void {
    this.router.navigate(['/transactions']);
  }
}
