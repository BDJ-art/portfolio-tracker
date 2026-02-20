import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface RealEstateRow {
  id: string;
  name: string;
  address: string;
  estimated_value: number;
  mortgage_balance: number;
  monthly_mortgage_payment: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  property_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toApi(row: RealEstateRow) {
  return {
    id: row.id,
    type: 'real_estate' as const,
    name: row.name,
    address: row.address,
    estimatedValue: row.estimated_value,
    mortgageBalance: row.mortgage_balance,
    monthlyMortgagePayment: row.monthly_mortgage_payment ?? undefined,
    purchasePrice: row.purchase_price ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    propertyType: row.property_type,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllRealEstate() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM real_estate ORDER BY name').all() as RealEstateRow[];
  return rows.map(toApi);
}

export function createRealEstate(data: {
  name: string;
  address: string;
  estimatedValue: number;
  mortgageBalance: number;
  monthlyMortgagePayment?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  propertyType: string;
  notes?: string;
}) {
  const db = getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO real_estate (id, name, address, estimated_value, mortgage_balance, monthly_mortgage_payment, purchase_price, purchase_date, property_type, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.address, data.estimatedValue, data.mortgageBalance,
    data.monthlyMortgagePayment ?? null, data.purchasePrice ?? null,
    data.purchaseDate ?? null, data.propertyType, data.notes ?? null, now, now
  );
  return toApi(db.prepare('SELECT * FROM real_estate WHERE id = ?').get(id) as RealEstateRow);
}

export function updateRealEstate(id: string, data: Record<string, unknown>) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    name: 'name', address: 'address', estimatedValue: 'estimated_value',
    mortgageBalance: 'mortgage_balance', monthlyMortgagePayment: 'monthly_mortgage_payment',
    purchasePrice: 'purchase_price', purchaseDate: 'purchase_date',
    propertyType: 'property_type', notes: 'notes',
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
  db.prepare(`UPDATE real_estate SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return toApi(db.prepare('SELECT * FROM real_estate WHERE id = ?').get(id) as RealEstateRow);
}

export function deleteRealEstate(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM real_estate WHERE id = ?').run(id);
}
