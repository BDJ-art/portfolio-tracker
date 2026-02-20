import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface RetirementRow {
  id: string;
  name: string;
  account_type: string;
  institution: string;
  balance: number;
  contributions: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: RetirementRow) {
  return {
    id: row.id,
    type: 'retirement' as const,
    name: row.name,
    accountType: row.account_type,
    institution: row.institution,
    balance: row.balance,
    contributions: row.contributions ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllRetirement() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM retirement ORDER BY name').all() as RetirementRow[];
  return rows.map(toApi);
}

export function createRetirement(data: {
  name: string;
  accountType: string;
  institution: string;
  balance: number;
  contributions?: number;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO retirement (id, name, account_type, institution, balance, contributions, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.accountType, data.institution, data.balance, data.contributions ?? null, data.notes ?? null, now, now);
  return toApi(db.prepare('SELECT * FROM retirement WHERE id = ?').get(id) as RetirementRow);
}

export function updateRetirement(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', accountType: 'account_type', institution: 'institution',
    balance: 'balance', contributions: 'contributions', notes: 'notes',
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
  db.prepare(`UPDATE retirement SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM retirement WHERE id = ?').get(id) as RetirementRow);
}

export function deleteRetirement(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM retirement WHERE id = ?').run(id);
}
