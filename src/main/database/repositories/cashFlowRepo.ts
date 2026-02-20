import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface CashFlowRow {
  id: string;
  name: string;
  flow_type: string;
  category: string;
  amount: number;
  frequency: string;
  is_active: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: CashFlowRow) {
  return {
    id: row.id,
    type: 'cash_flow' as const,
    name: row.name,
    flowType: row.flow_type as 'income' | 'expense',
    category: row.category,
    amount: row.amount,
    frequency: row.frequency as 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    isActive: row.is_active === 1,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllCashFlow() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM cash_flow ORDER BY flow_type ASC, amount DESC').all() as CashFlowRow[];
  return rows.map(toApi);
}

export function createCashFlow(data: {
  name: string;
  flowType: string;
  category: string;
  amount: number;
  frequency: string;
  isActive?: boolean;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO cash_flow (id, name, flow_type, category, amount, frequency, is_active, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.flowType, data.category,
    data.amount, data.frequency, data.isActive !== false ? 1 : 0,
    data.notes ?? null, now, now
  );
  return toApi(db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(id) as CashFlowRow);
}

export function updateCashFlow(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', flowType: 'flow_type', category: 'category',
    amount: 'amount', frequency: 'frequency', notes: 'notes',
  };
  const sets: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  for (const [key, val] of Object.entries(data)) {
    if (key === 'isActive') {
      sets.push('is_active = ?');
      values.push(val ? 1 : 0);
    } else if (fieldMap[key]) {
      sets.push(`${fieldMap[key]} = ?`);
      values.push(val ?? null);
    }
  }
  values.push(id);
  db.prepare(`UPDATE cash_flow SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM cash_flow WHERE id = ?').get(id) as CashFlowRow);
}

export function deleteCashFlow(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM cash_flow WHERE id = ?').run(id);
}
