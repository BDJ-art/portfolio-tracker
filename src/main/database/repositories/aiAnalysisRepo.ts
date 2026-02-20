import { getDatabase } from '../connection';
import { v4 as uuid } from 'uuid';

export interface AiAnalysisRow {
  id: string;
  created_at: string;
  model: string;
  portfolio_snapshot: string;
  response: string;
}

function toApi(row: AiAnalysisRow) {
  return {
    id: row.id,
    createdAt: row.created_at,
    model: row.model,
    portfolioSnapshot: row.portfolio_snapshot,
    response: row.response,
  };
}

export function getAllAnalyses() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM ai_analyses ORDER BY created_at DESC').all() as AiAnalysisRow[];
  return rows.map(toApi);
}

export function createAnalysis(data: { model: string; portfolioSnapshot: string; response: string }) {
  const db = getDatabase();
  const id = uuid();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO ai_analyses (id, created_at, model, portfolio_snapshot, response) VALUES (?, ?, ?, ?, ?)'
  ).run(id, createdAt, data.model, data.portfolioSnapshot, data.response);
  return { id, createdAt, model: data.model, portfolioSnapshot: data.portfolioSnapshot, response: data.response };
}

export function deleteAnalysis(id: string) {
  const db = getDatabase();
  db.prepare('DELETE FROM ai_analyses WHERE id = ?').run(id);
}
