import { Injectable } from '@angular/core';

interface CategoryRule {
  keywords: string[];
  category: string;
  type: 'income' | 'expense';
}

@Injectable({ providedIn: 'root' })
export class CategorizationService {
  private rules: CategoryRule[] = [
    // Income rules
    { keywords: ['salary', 'payroll', 'wages'], category: 'Salary', type: 'income' },
    { keywords: ['freelance', 'consulting', 'contract'], category: 'Freelance Income', type: 'income' },
    { keywords: ['interest earned', 'interest credit', 'int earned'], category: 'Interest Income', type: 'income' },
    { keywords: ['rental income', 'rent received'], category: 'Rental Income', type: 'income' },
    { keywords: ['refund', 'reversal', 'cashback'], category: 'Refund', type: 'income' },
    { keywords: ['incoming', 'received', 'credit transfer', 'inward'], category: 'Incoming Transfer', type: 'income' },

    // Expense rules
    { keywords: ['restaurant', 'cafe', 'coffee', 'toast box', 'toastbox', 'ya kun', 'kaya toast', 'mcdonald', 'kfc', 'pizza', 'burger', 'food', 'bakes', 'bakery', 'dining', 'f&b', 'gianni', 'zafaraan', 'romerantiss'], category: 'Food & Dining', type: 'expense' },
    { keywords: ['ntuc', 'fairprice', 'cold storage', 'giant', 'sheng siong', 'grocery', 'supermarket', '7 eleven', '7-eleven', 'murugan trading', 'selvi store', 'provision'], category: 'Groceries', type: 'expense' },
    { keywords: ['grab', 'gojek', 'gopay', 'taxi', 'cabcharge', 'uber', 'mrt', 'bus', 'train', 'ktmb', 'wahdah', 'getgo', 'car rental', 'parking', 'otwc', 'klia', 'transport'], category: 'Transportation', type: 'expense' },
    { keywords: ['petron', 'esso', 'shell', 'caltex', 'spc', 'fuel', 'petrol', 'diesel'], category: 'Fuel', type: 'expense' },
    { keywords: ['cotton on', 'converse', 'nike', 'adidas', 'uniqlo', 'h&m', 'zara', 'challenger', 'courts', 'art friend', 'book point', 'akemi', 'outlet', 'mall', 'shop'], category: 'Shopping & Retail', type: 'expense' },
    { keywords: ['cinema', 'movie', 'genting', 'skyworlds', 'theme park', 'formula fun', 'digiphoto', 'cable car', 'museum', 'zoo', 'concert', 'event', 'ticket'], category: 'Entertainment & Leisure', type: 'expense' },
    { keywords: ['hotel', 'agoda', 'booking.com', 'airbnb', 'resort', 'hostel', 'travel', 'flight', 'airline'], category: 'Travel & Accommodation', type: 'expense' },
    { keywords: ['prudential', 'aia', 'great eastern', 'aviva', 'ntuc income', 'income insurance', 'insurance', 'manulife'], category: 'Insurance', type: 'expense' },
    { keywords: ['sp services', 'electricity', 'water', 'gas', 'utility', 'utilities', 'power supply'], category: 'Utilities', type: 'expense' },
    { keywords: ['starhub', 'singtel', 'simba', 'm1 ltd', 'm1ltd', 'mobile', 'broadband', 'telecom', 'phone bill'], category: 'Telecommunications', type: 'expense' },
    { keywords: ['netflix', 'spotify', 'disney', 'youtube', 'apple music', 'amazon prime', 'subscription', 'sph', 'news'], category: 'Subscriptions', type: 'expense' },
    { keywords: ['town council', 'hdb', 'rent', 'condo', 'mortgage', 'housing'], category: 'Housing & Rent', type: 'expense' },
    { keywords: ['iras', 'tax', 'cpf', 'ministry', 'manpower', 'moe', 'government', 'levy'], category: 'Government & Tax', type: 'expense' },
    { keywords: ['clinic', 'hospital', 'doctor', 'dental', 'pharmacy', 'medical', 'health'], category: 'Healthcare', type: 'expense' },
    { keywords: ['school', 'tuition', 'course', 'university', 'education', 'learning'], category: 'Education', type: 'expense' },
    { keywords: ['paynow', 'transfer to', 'fund transfer', 'fast transfer', 'dcs card'], category: 'Personal Transfers', type: 'expense' },
    { keywords: ['atm', 'cash withdrawal', 'cash w/d'], category: 'Cash Withdrawal', type: 'expense' },
    { keywords: ['fee', 'charge', 'penalty', 'conversion fee', 'annual fee', 'late charge'], category: 'Bank Fees & Charges', type: 'expense' },
    { keywords: ['paylah', 'paynow', 'ewallet', 'grabpay', 'shopeepay', 'tng', 'top-up', 'topup'], category: 'eWallet Top-Up', type: 'expense' },
    { keywords: ['loan', 'emi', 'instalment', 'installment', 'mortgage payment'], category: 'Loan & EMI', type: 'expense' },
    { keywords: ['invest', 'stock', 'bond', 'mutual fund', 'etf', 'robo'], category: 'Investments', type: 'expense' },
  ];

  categorize(description: string, amount: number): { category: string; type: 'income' | 'expense' } {
    const lower = description.toLowerCase();
    const isCredit = amount > 0;

    if (isCredit) {
      for (const rule of this.rules.filter(r => r.type === 'income')) {
        if (rule.keywords.some(kw => lower.includes(kw))) {
          return { category: rule.category, type: 'income' };
        }
      }
      return { category: 'Other Income', type: 'income' };
    }

    for (const rule of this.rules.filter(r => r.type === 'expense')) {
      if (rule.keywords.some(kw => lower.includes(kw))) {
        return { category: rule.category, type: 'expense' };
      }
    }
    return { category: 'Other Expenses', type: 'expense' };
  }

  getRules(): CategoryRule[] {
    return [...this.rules];
  }
}
