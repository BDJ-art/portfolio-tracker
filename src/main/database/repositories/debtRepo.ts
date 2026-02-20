import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface DebtRow {
  id: string;
  name: string;
  debt_type: string;
  lender: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  monthly_payment: number | null;
  due_day: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: DebtRow) {
  return {
    id: row.id,
    type: 'debt' as const,
    name: row.name,
    debtType: row.debt_type as 'credit_card' | 'student_loan' | 'auto_loan' | 'personal_loan' | 'mortgage' | 'medical' | 'other',
    lender: row.lender,
    originalBalance: row.original_balance,
    currentBalance: row.current_balance,
    interestRate: row.interest_rate,
    minimumPayment: row.minimum_payment,
    monthlyPayment: row.monthly_payment ?? undefined,
    dueDay: row.due_day ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllDebts() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM debts ORDER BY interest_rate DESC').all() as DebtRow[];
  return rows.map(toApi);
}

export function createDebt(data: {
  name: string;
  debtType: string;
  lender: string;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  monthlyPayment?: number;
  dueDay?: number;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO debts (id, name, debt_type, lender, original_balance, current_balance,
                       interest_rate, minimum_payment, monthly_payment, due_day, notes,
                       created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.debtType, data.lender,
    data.originalBalance, data.currentBalance, data.interestRate,
    data.minimumPayment, data.monthlyPayment ?? null, data.dueDay ?? null,
    data.notes ?? null, now, now
  );
  return toApi(db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as DebtRow);
}

export function updateDebt(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', debtType: 'debt_type', lender: 'lender',
    originalBalance: 'original_balance', currentBalance: 'current_balance',
    interestRate: 'interest_rate', minimumPayment: 'minimum_payment',
    monthlyPayment: 'monthly_payment', dueDay: 'due_day', notes: 'notes',
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
  db.prepare(`UPDATE debts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as DebtRow);
}

export function deleteDebt(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM debts WHERE id = ?').run(id);
}
