import type Database from "better-sqlite3";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export interface BackupResult {
  fileName: string;
  path: string;
  createdAt: string;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function pruneOldBackups() {
  const entries = await readdir(config.backupDir).catch(() => []);
  const backupFiles = entries
    .filter((file) => file.endsWith(".sqlite"))
    .map((file) => path.join(config.backupDir, file));
  const stats = await Promise.all(
    backupFiles.map(async (file) => ({ file, stat: await stat(file) })),
  );
  const sorted = stats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  const extra = sorted.slice(Math.max(0, config.backupRetention));
  await Promise.all(extra.map((entry) => rm(entry.file, { force: true })));
}

export async function createDatabaseBackup(
  db: Database.Database,
): Promise<BackupResult> {
  await mkdir(config.backupDir, { recursive: true });
  const createdAt = new Date().toISOString();
  const fileName = `laoniu-${timestampForFile(new Date(createdAt))}.sqlite`;
  const destination = path.join(config.backupDir, fileName);
  await db.backup(destination);
  await pruneOldBackups();
  return { fileName, path: destination, createdAt };
}
