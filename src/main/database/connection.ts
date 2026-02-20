import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): void {
  if (db) return;
  const dbPath = path.join(app.getPath('userData'), 'portfolio.db');
  console.log('Database path:', dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
