import type { Router } from "express";
import { StateRepository } from "../repositories/stateRepository.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function registerStateRoutes(router: Router, repository: StateRepository) {
  router.get("/api/state", (_request, response) => {
    const record = repository.getCompatState();
    response.setHeader("Cache-Control", "no-store");
    response.json({
      state: record.state,
      revision: record.revision,
      updatedAt: record.updatedAt,
    });
  });

  router.put("/api/state", (request, response) => {
    const body = request.body as { state?: unknown };
    if (!isRecord(body?.state)) {
      response.status(400).json({ error: "Missing state payload." });
      return;
    }
    const record = repository.putCompatState(body.state);
    response.json({
      ok: true,
      revision: record.revision,
      updatedAt: record.updatedAt,
    });
  });
}
