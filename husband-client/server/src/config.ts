import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(srcDir, "..");

function resolveFromServer(value: string | undefined, fallback: string) {
  const candidate = value || fallback;
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(serverRoot, candidate);
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  backupDir: resolveFromServer(process.env.BACKUP_DIR, "./data/backups"),
  backupRetention: numberFromEnv(process.env.BACKUP_RETENTION, 10),
  clientDistDir: resolveFromServer(process.env.CLIENT_DIST_DIR, "../dist"),
  corsOrigin: process.env.CORS_ORIGIN || "",
  databasePath: resolveFromServer(process.env.DATABASE_PATH, "./data/laoniu.sqlite"),
  host: process.env.HOST || "0.0.0.0",
  jsonLimit: process.env.JSON_LIMIT || "8mb",
  migrationsDir: path.resolve(serverRoot, "migrations"),
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberFromEnv(process.env.PORT, 4180),
  uploadDir: resolveFromServer(process.env.UPLOAD_DIR, "./uploads"),
};
