import { getDatabase } from './connection';

export function runMigrations(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS real_estate (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      estimated_value REAL NOT NULL DEFAULT 0,
      mortgage_balance REAL NOT NULL DEFAULT 0,
      monthly_mortgage_payment REAL,
      purchase_price REAL,
      purchase_date TEXT,
      property_type TEXT NOT NULL DEFAULT 'other',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      shares REAL NOT NULL DEFAULT 0,
      cost_basis_per_share REAL NOT NULL DEFAULT 0,
      current_price REAL,
      last_price_update TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crypto (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coin_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      cost_basis_per_unit REAL NOT NULL DEFAULT 0,
      current_price REAL,
      last_price_update TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retirement (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      institution TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      contributions REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      debt_type TEXT NOT NULL DEFAULT 'other',
      lender TEXT NOT NULL,
      original_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      monthly_payment REAL,
      due_day INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      total_net_worth REAL NOT NULL,
      real_estate_value REAL NOT NULL,
      stocks_value REAL NOT NULL,
      crypto_value REAL NOT NULL,
      retirement_value REAL NOT NULL,
      debts_value REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cash_flow (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      flow_type TEXT NOT NULL DEFAULT 'expense',
      category TEXT NOT NULL DEFAULT 'other',
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_analyses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      model TEXT NOT NULL,
      portfolio_snapshot TEXT NOT NULL,
      response TEXT NOT NULL
    );
  `);

  console.log('Database migrations complete.');
}
