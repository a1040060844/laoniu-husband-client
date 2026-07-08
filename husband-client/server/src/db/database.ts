import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { runMigrations, type MigrationSummary } from "./migrations.js";

export interface DatabaseContext {
  db: Database.Database;
  migrationSummary: MigrationSummary;
}

let context: DatabaseContext | null = null;

export function openDatabase(): DatabaseContext {
  if (context) return context;

  mkdirSync(path.dirname(config.databasePath), { recursive: true });
  const db = new Database(config.databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  const migrationSummary = runMigrations(db, config.migrationsDir);
  context = { db, migrationSummary };
  return context;
}

export function closeDatabase() {
  if (!context) return;
  context.db.close();
  context = null;
}
