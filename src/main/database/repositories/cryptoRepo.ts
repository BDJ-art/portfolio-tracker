import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface CryptoRow {
  id: string;
  name: string;
  coin_id: string;
  symbol: string;
  quantity: number;
  cost_basis_per_unit: number;
  current_price: number | null;
  last_price_update: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: CryptoRow) {
  return {
    id: row.id,
    type: 'crypto' as const,
    name: row.name,
    coinId: row.coin_id,
    symbol: row.symbol,
    quantity: row.quantity,
    costBasisPerUnit: row.cost_basis_per_unit,
    currentPrice: row.current_price ?? undefined,
    lastPriceUpdate: row.last_price_update ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllCrypto() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM crypto ORDER BY name').all() as CryptoRow[];
  return rows.map(toApi);
}

export function createCrypto(data: {
  name: string;
  coinId: string;
  symbol: string;
  quantity: number;
  costBasisPerUnit: number;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO crypto (id, name, coin_id, symbol, quantity, cost_basis_per_unit, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.coinId, data.symbol.toUpperCase(), data.quantity, data.costBasisPerUnit, data.notes ?? null, now, now);
  return toApi(db.prepare('SELECT * FROM crypto WHERE id = ?').get(id) as CryptoRow);
}

export function updateCrypto(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', coinId: 'coin_id', symbol: 'symbol',
    quantity: 'quantity', costBasisPerUnit: 'cost_basis_per_unit', notes: 'notes',
  };
  const sets: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  for (const [key, val] of Object.entries(data)) {
    if (fieldMap[key]) {
      sets.push(`${fieldMap[key]} = ?`);
      values.push(val ?? null);
    }
  }
  values.push(id);
  db.prepare(`UPDATE crypto SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM crypto WHERE id = ?').get(id) as CryptoRow);
}

export function deleteCrypto(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM crypto WHERE id = ?').run(id);
}

export function updateCryptoPrices(updates: Array<{ coinId: string; price: number }>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE crypto SET current_price = ?, last_price_update = ?, updated_at = ? WHERE coin_id = ?');
  const updateMany = db.transaction((items: Array<{ coinId: string; price: number }>) => {
    for (const item of items) {
      stmt.run(item.price, now, now, item.coinId);
    }
  });
  updateMany(updates);
}

export function getAllCoinIds(): string[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT coin_id FROM crypto').all() as Array<{ coin_id: string }>;
  return rows.map(r => r.coin_id);
}

export function getAllSymbols(): string[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT symbol FROM crypto').all() as Array<{ symbol: string }>;
  return rows.map(r => r.symbol);
}

export function updateCryptoPricesBySymbol(updates: Array<{ symbol: string; price: number; coinId: string }>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE crypto SET current_price = ?, last_price_update = ?, updated_at = ?, coin_id = ? WHERE symbol = ?');
  const updateMany = db.transaction((items: Array<{ symbol: string; price: number; coinId: string }>) => {
    for (const item of items) {
      stmt.run(item.price, now, now, item.coinId, item.symbol);
    }
  });
  updateMany(updates);
}
