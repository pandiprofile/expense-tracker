import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, RouterLink, RouterLinkActive],
  template: `
    <mat-toolbar class="app-toolbar">
      <mat-icon class="logo-icon">account_balance_wallet</mat-icon>
      <span class="app-title">ExpenseTracker</span>
      <div class="nav-links">
        <a mat-button routerLink="/dashboard" routerLinkActive="active-link">
          <mat-icon>dashboard</mat-icon>
          Dashboard
        </a>
        <a mat-button routerLink="/transactions" routerLinkActive="active-link">
          <mat-icon>receipt_long</mat-icon>
          Transactions
        </a>
        <a mat-button routerLink="/upload" routerLinkActive="active-link">
          <mat-icon>cloud_upload</mat-icon>
          Upload
        </a>
      </div>
    </mat-toolbar>
  `,
  styles: [`
    .app-toolbar {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: white;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .logo-icon {
      margin-right: 8px;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .app-title {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .nav-links {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }
    .nav-links a {
      color: rgba(255,255,255,0.85);
      font-weight: 500;
    }
    .nav-links a:hover {
      color: white;
      background: rgba(255,255,255,0.1);
    }
    .active-link {
      color: white !important;
      background: rgba(255,255,255,0.15) !important;
    }
    .nav-links mat-icon {
      margin-right: 4px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `],
})
export class HeaderComponent {}
