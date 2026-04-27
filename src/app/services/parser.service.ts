import { Injectable } from '@angular/core';
import { Transaction, StatementSource } from '../models/transaction.model';
import { CategorizationService } from './categorization.service';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

@Injectable({ providedIn: 'root' })
export class ParserService {
  constructor(private categorizationService: CategorizationService) {}

  async parseFile(file: File): Promise<{ transactions: Transaction[]; source: StatementSource }> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      return this.parseCsv(file);
    } else if (ext === 'pdf') {
      return this.parsePdf(file);
    }
    throw new Error(`Unsupported file type: ${ext}`);
  }

  private async parseCsv(file: File): Promise<{ transactions: Transaction[]; source: StatementSource }> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          try {
            const transactions = this.mapCsvRows(results.data as Record<string, string>[], file.name);
            const source: StatementSource = {
              fileName: file.name,
              fileType: 'csv',
              bankName: this.detectBankFromFilename(file.name),
              uploadDate: new Date(),
              transactionCount: transactions.length,
            };
            resolve({ transactions, source });
          } catch (e) {
            reject(e);
          }
        },
        error: (err: Error) => reject(err),
      });
    });
  }

  private mapCsvRows(rows: Record<string, string>[], fileName: string): Transaction[] {
    if (rows.length === 0) return [];

    const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());

    const dateCol = headers.find(h => h.includes('date') || h.includes('txn') || h.includes('transaction date') || h.includes('posting'));
    const descCol = headers.find(h => h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details') || h.includes('memo'));
    const amountCol = headers.find(h => h === 'amount' || h.includes('amount'));
    const debitCol = headers.find(h => h.includes('debit') || h.includes('withdrawal'));
    const creditCol = headers.find(h => h.includes('credit') || h.includes('deposit'));

    const originalHeaders = Object.keys(rows[0]);
    const getCol = (normalized: string | undefined) => {
      if (!normalized) return undefined;
      const idx = headers.indexOf(normalized);
      return idx >= 0 ? originalHeaders[idx] : undefined;
    };

    const dateFld = getCol(dateCol);
    const descFld = getCol(descCol);
    const amtFld = getCol(amountCol);
    const debitFld = getCol(debitCol);
    const creditFld = getCol(creditCol);

    const transactions: Transaction[] = [];
    const bankName = this.detectBankFromFilename(fileName);

    for (const row of rows) {
      const dateStr = dateFld ? row[dateFld]?.trim() : '';
      const desc = descFld ? row[descFld]?.trim() : '';
      if (!dateStr || !desc) continue;

      let amount = 0;
      if (amtFld && row[amtFld]) {
        amount = this.parseAmount(row[amtFld]);
      } else if (debitFld || creditFld) {
        const debit = debitFld && row[debitFld] ? this.parseAmount(row[debitFld]) : 0;
        const credit = creditFld && row[creditFld] ? this.parseAmount(row[creditFld]) : 0;
        amount = credit > 0 ? credit : -debit;
      }

      if (amount === 0) continue;

      const { category, type } = this.categorizationService.categorize(desc, amount);

      transactions.push({
        id: this.generateId(),
        date: this.parseDate(dateStr),
        description: desc,
        amount,
        type,
        category,
        originalCategory: category,
        source: bankName,
        currency: 'SGD',
      });
    }
    return transactions;
  }

  private async parsePdf(file: File): Promise<{ transactions: Transaction[]; source: StatementSource }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    const transactions = this.extractTransactionsFromPdfText(fullText, file.name);
    const bankName = this.detectBankFromFilename(file.name);

    const source: StatementSource = {
      fileName: file.name,
      fileType: 'pdf',
      bankName,
      uploadDate: new Date(),
      transactionCount: transactions.length,
    };

    return { transactions, source };
  }

  private extractTransactionsFromPdfText(text: string, fileName: string): Transaction[] {
    const transactions: Transaction[] = [];
    const bankName = this.detectBankFromFilename(fileName);

    // Pattern: date followed by description and amount
    // Supports formats: DD MMM, DD/MM/YYYY, MMM DD YYYY, etc.
    const datePatterns = [
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{0,4})/gi,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4})/gi,
    ];

    const lines = text.split('\n');
    for (const line of lines) {
      // Try to find transaction lines with amounts
      const amountMatch = line.match(/(?:SGD\s*)?-?\s*\$?\s*([\d,]+\.\d{2})\s*(?:CR|DR)?/i);
      if (!amountMatch) continue;

      let dateStr = '';
      for (const pattern of datePatterns) {
        pattern.lastIndex = 0;
        const m = pattern.exec(line);
        if (m) {
          dateStr = m[1];
          break;
        }
      }
      if (!dateStr) continue;

      // Extract description (text between date and amount)
      const dateIdx = line.indexOf(dateStr);
      const amtIdx = line.indexOf(amountMatch[0]);
      if (dateIdx < 0 || amtIdx < 0) continue;

      const desc = line.substring(dateIdx + dateStr.length, amtIdx).trim()
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-]+/, '');

      if (desc.length < 3) continue;

      let amount = this.parseAmount(amountMatch[1]);
      const isCR = /CR/i.test(line);
      const isDR = /DR/i.test(line);
      const hasNegSign = line.includes(`-${amountMatch[1]}`) || line.includes(`- ${amountMatch[1]}`);

      if (isDR || hasNegSign) amount = -Math.abs(amount);
      if (isCR) amount = Math.abs(amount);

      // Skip if likely a balance line
      if (/balance|total|subtotal|sub-total|grand total|minimum|limit|previous/i.test(desc)) continue;

      const { category, type } = this.categorizationService.categorize(desc, amount);

      transactions.push({
        id: this.generateId(),
        date: this.parseDate(dateStr),
        description: desc,
        amount,
        type,
        category,
        originalCategory: category,
        source: bankName,
        currency: 'SGD',
      });
    }

    return transactions;
  }

  private detectBankFromFilename(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.includes('dbs')) return 'DBS';
    if (lower.includes('ocbc')) return 'OCBC';
    if (lower.includes('uob')) return 'UOB';
    if (lower.includes('citi')) return 'Citibank';
    if (lower.includes('sc') || lower.includes('standard')) return 'Standard Chartered';
    if (lower.includes('hsbc')) return 'HSBC';
    if (lower.includes('maybank')) return 'Maybank';
    return 'Unknown Bank';
  }

  private parseAmount(str: string): number {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  private parseDate(str: string): Date {
    const cleaned = str.trim();
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;

    // Try DD MMM YYYY or DD MMM
    const match = cleaned.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})?/i);
    if (match) {
      const day = parseInt(match[1]);
      const month = match[2];
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      return new Date(`${month} ${day}, ${year}`);
    }

    // Try DD/MM/YYYY
    const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1]);
      const month = parseInt(slashMatch[2]) - 1;
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }

    return new Date();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}
