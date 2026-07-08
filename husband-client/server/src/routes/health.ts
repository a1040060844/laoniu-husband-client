import type { Router } from "express";
import { config } from "../config.js";
import type { DatabaseContext } from "../db/database.js";

export function registerHealthRoutes(router: Router, context: DatabaseContext) {
  router.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      api: "online",
      database: "sqlite",
      databasePath: config.databasePath,
      migrations: context.migrationSummary,
      serverTime: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
    });
  });
}
