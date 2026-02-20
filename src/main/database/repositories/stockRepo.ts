import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface StockRow {
  id: string;
  name: string;
  ticker: string;
  shares: number;
  cost_basis_per_share: number;
  current_price: number | null;
  last_price_update: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: StockRow) {
  return {
    id: row.id,
    type: 'stock' as const,
    name: row.name,
    ticker: row.ticker,
    shares: row.shares,
    costBasisPerShare: row.cost_basis_per_share,
    currentPrice: row.current_price ?? undefined,
    lastPriceUpdate: row.last_price_update ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllStocks() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM stocks ORDER BY ticker').all() as StockRow[];
  return rows.map(toApi);
}

export function createStock(data: {
  name: string;
  ticker: string;
  shares: number;
  costBasisPerShare: number;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO stocks (id, name, ticker, shares, cost_basis_per_share, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.ticker.toUpperCase(), data.shares, data.costBasisPerShare, data.notes ?? null, now, now);
  return toApi(db.prepare('SELECT * FROM stocks WHERE id = ?').get(id) as StockRow);
}

export function updateStock(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', ticker: 'ticker', shares: 'shares',
    costBasisPerShare: 'cost_basis_per_share', notes: 'notes',
  };
  const sets: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  for (const [key, val] of Object.entries(data)) {
    if (fieldMap[key]) {
      sets.push(`${fieldMap[key]} = ?`);
      values.push(key === 'ticker' && typeof val === 'string' ? val.toUpperCase() : val ?? null);
    }
  }
  values.push(id);
  db.prepare(`UPDATE stocks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM stocks WHERE id = ?').get(id) as StockRow);
}

export function deleteStock(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM stocks WHERE id = ?').run(id);
}

export function updateStockPrices(updates: Array<{ ticker: string; price: number }>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE stocks SET current_price = ?, last_price_update = ?, updated_at = ? WHERE ticker = ?');
  const updateMany = db.transaction((items: Array<{ ticker: string; price: number }>) => {
    for (const item of items) {
      stmt.run(item.price, now, now, item.ticker);
    }
  });
  updateMany(updates);
}

export function getAllTickers(): string[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT ticker FROM stocks').all() as Array<{ ticker: string }>;
  return rows.map(r => r.ticker);
}
