export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  source: string;
  originalCategory?: string;
  currency: string;
  foreignAmount?: number;
  foreignCurrency?: string;
}

export interface StatementSource {
  fileName: string;
  fileType: 'csv' | 'pdf';
  bankName: string;
  uploadDate: Date;
  transactionCount: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
  type: 'income' | 'expense';
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  incomeByCategory: CategorySummary[];
  expenseByCategory: CategorySummary[];
  sources: StatementSource[];
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Fuel',
  'Shopping & Retail',
  'Entertainment & Leisure',
  'Travel & Accommodation',
  'Insurance',
  'Utilities',
  'Telecommunications',
  'Subscriptions',
  'Housing & Rent',
  'Government & Tax',
  'Healthcare',
  'Education',
  'Personal Transfers',
  'Cash Withdrawal',
  'Bank Fees & Charges',
  'eWallet Top-Up',
  'Loan & EMI',
  'Investments',
  'Other Expenses',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance Income',
  'Interest Income',
  'Rental Income',
  'Incoming Transfer',
  'Refund',
  'Other Income',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
