import type Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface MigrationSummary {
  applied: string[];
  skipped: string[];
}

function migrationId(fileName: string) {
  return fileName.replace(/\.sql$/i, "");
}

export function runMigrations(
  db: Database.Database,
  migrationsDir: string,
): MigrationSummary {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const appliedRows = db
    .prepare("SELECT id FROM schema_migrations")
    .all() as Array<{ id: string }>;
  const appliedIds = new Set(appliedRows.map((row) => row.id));
  const summary: MigrationSummary = { applied: [], skipped: [] };
  const applyMigration = db.transaction((id: string, sql: string) => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(id);
  });

  for (const file of files) {
    const id = migrationId(file);
    if (appliedIds.has(id)) {
      summary.skipped.push(id);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    applyMigration(id, sql);
    summary.applied.push(id);
  }

  return summary;
}
