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
      const pageText = this.reconstructLines(content.items as any[]);
      fullText += pageText + '\n';
    }

    const stripped = fullText.replace(/\s+/g, '').replace(/page\d+of\d+/gi, '');
    if (stripped.length < 50) {
      throw new Error('This PDF appears to be image-based (scanned). Please export a text-based statement from your bank or use CSV format.');
    }

    const bankName = this.detectBankFromFilename(file.name);
    const transactions = this.extractTransactionsFromPdfText(fullText, file.name);

    const source: StatementSource = {
      fileName: file.name,
      fileType: 'pdf',
      bankName,
      uploadDate: new Date(),
      transactionCount: transactions.length,
    };

    return { transactions, source };
  }

  private reconstructLines(items: any[]): string {
    if (items.length === 0) return '';

    interface TextItem { x: number; y: number; str: string; width: number }
    const textItems: TextItem[] = [];

    for (const item of items) {
      if (!item.str || item.str.trim() === '') continue;
      if (!item.transform) continue;
      textItems.push({
        x: item.transform[4],
        y: Math.round(item.transform[5]),
        str: item.str,
        width: item.width || item.str.length * 5,
      });
    }

    if (textItems.length === 0) return '';

    const lineGroups = new Map<number, TextItem[]>();
    const threshold = 3;

    for (const ti of textItems) {
      let foundKey: number | null = null;
      for (const key of lineGroups.keys()) {
        if (Math.abs(key - ti.y) < threshold) {
          foundKey = key;
          break;
        }
      }
      if (foundKey !== null) {
        lineGroups.get(foundKey)!.push(ti);
      } else {
        lineGroups.set(ti.y, [ti]);
      }
    }

    const sortedLines = Array.from(lineGroups.entries())
      .sort((a, b) => b[0] - a[0]);

    return sortedLines.map(([, lineItems]) => {
      lineItems.sort((a, b) => a.x - b.x);
      let line = '';
      for (let i = 0; i < lineItems.length; i++) {
        if (i > 0) {
          const prevEnd = lineItems[i - 1].x + lineItems[i - 1].width;
          const gap = lineItems[i].x - prevEnd;
          if (gap > 20) {
            line += '   ';
          } else if (gap > 1.5) {
            line += ' ';
          }
          // gap <= 1.5: characters belong to the same word, no separator
        }
        line += lineItems[i].str;
      }
      return line;
    }).join('\n');
  }

  private extractTransactionsFromPdfText(text: string, fileName: string): Transaction[] {
    const bankName = this.detectBankFromFilename(fileName);
    const lower = text.toLowerCase();

    if (lower.includes('citibank') || lower.includes('citi cash back') || lower.includes('citiphone')) {
      if (lower.includes('credit limit') || lower.includes('citi cash back') || lower.includes('amount (sgd)')) {
        return this.parseCitiCreditCardPdf(text, bankName);
      }
      return this.parseCitiAccountPdf(text, bankName);
    }

    return this.parseGenericPdf(text, bankName);
  }

  private parseCitiAccountPdf(text: string, bankName: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');

    const txnLineRe = /^\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4})\s+(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4})?\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = txnLineRe.exec(line);
      if (!m) continue;

      const dateStr = m[1];
      let rest = m[2].trim();

      const amounts = [...rest.matchAll(/([\d,]+\s*\.\s*\d{2})/g)].map(am => ({
        value: this.parseAmount(am[1]),
        index: am.index!,
        raw: am[0],
      }));

      if (amounts.length === 0) continue;

      const firstAmtIdx = amounts[0].index;
      let desc = rest.substring(0, firstAmtIdx).trim()
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-]+/, '')
        .replace(/\s+[A-Z]{5,}\d+[A-Z]?\d*\s*$/, '');

      if (desc.length < 3) {
        let j = i + 1;
        while (j < lines.length && !txnLineRe.test(lines[j])) {
          const continuation = lines[j].trim();
          if (continuation && !/^\d/.test(continuation) && !/^Page /.test(continuation) && !/^SGN/.test(continuation)) {
            if (/^[A-Z][A-Z\s&\-]+$/.test(continuation) && continuation.length > 3) {
              desc = continuation.replace(/\s+/g, ' ').trim();
              break;
            }
          }
          j++;
        }
      }

      if (desc.length < 3) continue;
      if (/opening balance|closing balance|total|^page /i.test(desc)) continue;

      // Last amount is always the running balance; preceding amounts are debit or credit
      let amount = 0;
      if (amounts.length >= 3) {
        // debit, credit, balance
        const debit = amounts[0].value;
        const credit = amounts[1].value;
        amount = credit > 0 ? credit : -debit;
      } else if (amounts.length === 2) {
        // Either (debit, balance) or (credit, balance) — first amount is the transaction
        amount = amounts[0].value;
      } else {
        amount = amounts[0].value;
      }

      if (amount === 0) continue;

      // Determine sign from description context
      const isIncoming = /incoming|salary|interest earned|deposit|giro from/i.test(desc) ||
        /incoming|salary|interest earned|deposit|giro from/i.test(rest);
      const isOutgoing = /payment to|external transfer|paynow external|fast external/i.test(desc);

      if (isIncoming) {
        amount = Math.abs(amount);
      } else if (isOutgoing) {
        amount = -Math.abs(amount);
      } else {
        amount = -Math.abs(amount);
      }

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

  private parseCitiCreditCardPdf(text: string, bankName: string): Transaction[] {
    const transactions: Transaction[] = [];
    const lines = text.split('\n');

    const txnLineRe = /^\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(.+)/i;
    const yearMatch = text.match(/Statement\s+Date[:\s]+.*?(\d{4})/i);
    const statementYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    for (const line of lines) {
      const m = txnLineRe.exec(line);
      if (!m) continue;

      const day = m[1];
      const month = m[2];
      const rest = m[3].trim();

      const parenMatch = rest.match(/\(([\d,]+\.\d{2})\)\s*$/);
      const normalMatch = rest.match(/([\d,]+\.\d{2})\s*$/);

      let amount = 0;
      let desc = '';

      if (parenMatch) {
        amount = this.parseAmount(parenMatch[1]);
        desc = rest.substring(0, rest.lastIndexOf('(')).trim();
      } else if (normalMatch) {
        amount = -this.parseAmount(normalMatch[1]);
        desc = rest.substring(0, rest.lastIndexOf(normalMatch[1])).trim();
      } else {
        continue;
      }

      desc = desc.replace(/\s+/g, ' ').replace(/[\s\-]+$/, '');
      if (desc.length < 3) continue;
      if (/sub-total|grand total|balance previous|foreign amount/i.test(desc)) continue;

      if (amount === 0) continue;

      const dateStr = `${month} ${day}, ${statementYear}`;

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

  private parseGenericPdf(text: string, bankName: string): Transaction[] {
    const transactions: Transaction[] = [];

    const datePatterns = [
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{0,4})/gi,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s*\d{4})/gi,
    ];

    const lines = text.split('\n');
    for (const line of lines) {
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
    const cleaned = str.replace(/\s+/g, '').replace(/[^0-9.\-]/g, '');
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
