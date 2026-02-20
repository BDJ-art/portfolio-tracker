import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface SnapshotRow {
  id: string;
  date: string;
  total_net_worth: number;
  real_estate_value: number;
  stocks_value: number;
  crypto_value: number;
  retirement_value: number;
  debts_value: number;
}

function toApi(row: SnapshotRow) {
  return {
    id: row.id,
    date: row.date,
    totalNetWorth: row.total_net_worth,
    realEstateValue: row.real_estate_value,
    stocksValue: row.stocks_value,
    cryptoValue: row.crypto_value,
    retirementValue: row.retirement_value,
    debtsValue: row.debts_value,
  };
}

export function getAllSnapshots() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM portfolio_snapshots ORDER BY date ASC').all() as SnapshotRow[];
  return rows.map(toApi);
}

export function getSnapshotByDate(date: string) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM portfolio_snapshots WHERE date = ?').get(date) as SnapshotRow | undefined;
}

export function upsertSnapshot(data: {
  date: string;
  totalNetWorth: number;
  realEstateValue: number;
  stocksValue: number;
  cryptoValue: number;
  retirementValue: number;
  debtsValue: number;
}) {
  const db = getDatabase();
  const existing = getSnapshotByDate(data.date);
  if (existing) {
    db.prepare(`
      UPDATE portfolio_snapshots
      SET total_net_worth = ?, real_estate_value = ?, stocks_value = ?, crypto_value = ?, retirement_value = ?, debts_value = ?
      WHERE date = ?
    `).run(data.totalNetWorth, data.realEstateValue, data.stocksValue, data.cryptoValue, data.retirementValue, data.debtsValue, data.date);
  } else {
    const id = uuid();
    db.prepare(`
      INSERT INTO portfolio_snapshots (id, date, total_net_worth, real_estate_value, stocks_value, crypto_value, retirement_value, debts_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.date, data.totalNetWorth, data.realEstateValue, data.stocksValue, data.cryptoValue, data.retirementValue, data.debtsValue);
  }
}
