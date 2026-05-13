# ExpenseTracker

A personal expense tracking Angular web application that allows you to upload and parse bank and credit card statements, automatically categorize transactions, and view a consolidated financial dashboard.

## Features

- **Statement Upload** - Drag-and-drop upload for CSV and PDF bank/credit card statements
- **Auto-Categorization** - 20+ keyword-based rules automatically classify transactions into categories (Food & Dining, Insurance, Transportation, Subscriptions, etc.)
- **Dashboard** - Summary cards for total income, expenses, net cash flow, and transaction count; doughnut chart for expense breakdown; bar chart for income vs expenses; category breakdown with progress bars
- **Transactions View** - Searchable and filterable transaction list with type toggle (All/Income/Expenses), category and source filters
- **Manual Category Editing** - Click any category tag to reassign it via a dialog with income/expense toggle
- **CSV Export** - Export filtered transactions as CSV
- **Extensible Parsing** - Modular parser architecture makes it easy to add support for new statement formats

## Tech Stack

- **Angular 19** with standalone components
- **Angular Material** for UI components
- **Chart.js** with ng2-charts for visualizations
- **PapaParse** for CSV parsing
- **pdf.js** for PDF text extraction
- **Signal-based state management** (no external state library needed)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/`.

### Build

```bash
ng build
```

Build artifacts are stored in `dist/`.

## Project Structure

```
src/app/
  models/
    transaction.model.ts       # Data models & category definitions
  services/
    parser.service.ts          # Extensible CSV/PDF parsing
    categorization.service.ts  # Auto-categorization rules engine
    transaction-store.service.ts # Signal-based state management
  components/
    header/                    # App navigation bar
    upload/                    # File upload with drag-and-drop
    dashboard/                 # Dashboard with charts & summaries
    transactions/              # Transaction list with search/filter
    category-editor/           # Category edit dialog
```

## Adding Custom Parsers

The parser service uses a modular design. To add support for a new bank format:

1. Add detection logic in `detectBankFromFilename()` in `parser.service.ts`
2. Customize column mapping in `mapCsvRows()` for bank-specific CSV formats
3. Add new keyword rules in `categorization.service.ts` for bank-specific transaction descriptions

## License

MIT
