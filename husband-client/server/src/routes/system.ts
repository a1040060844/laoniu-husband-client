import type { Router } from "express";
import { createDatabaseBackup } from "../services/backupService.js";
import type { DatabaseContext } from "../db/database.js";

export function registerSystemRoutes(router: Router, context: DatabaseContext) {
  router.post("/api/admin/system/backup", async (_request, response, next) => {
    try {
      const backup = await createDatabaseBackup(context.db);
      response.json({ ok: true, backup });
    } catch (error) {
      next(error);
    }
  });
}
