import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { openDatabase } from "./db/database.js";
import { errorHandler } from "./middleware/errors.js";
import { StateRepository } from "./repositories/stateRepository.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerStateRoutes } from "./routes/state.js";
import { registerSystemRoutes } from "./routes/system.js";

export function createApp() {
  const context = openDatabase();
  const stateRepository = new StateRepository(context.db);
  const app = express();
  const router = express.Router();

  if (config.corsOrigin) {
    app.use(cors({ origin: config.corsOrigin }));
  }

  app.disable("x-powered-by");
  app.use(express.json({ limit: config.jsonLimit }));

  registerHealthRoutes(router, context);
  registerStateRoutes(router, stateRepository);
  registerSystemRoutes(router, context);

  app.use(router);

  if (existsSync(config.clientDistDir)) {
    app.use(
      express.static(config.clientDistDir, {
        etag: true,
        index: false,
        maxAge: config.nodeEnv === "production" ? "1h" : 0,
      }),
    );
    app.use((request, response, next) => {
      if (request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(path.join(config.clientDistDir, "index.html"));
    });
  }

  app.use(errorHandler);

  return { app, context };
}

const isDirectRun = process.argv[1]?.endsWith("app.js") || process.argv[1]?.endsWith("app.ts");

if (isDirectRun) {
  const { app, context } = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`Laoniu control server: http://${config.host}:${config.port}`);
    console.log(`SQLite database: ${config.databasePath}`);
    if (context.migrationSummary.applied.length) {
      console.log(`Applied migrations: ${context.migrationSummary.applied.join(", ")}`);
    }
  });
}
