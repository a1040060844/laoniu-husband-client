import type Database from "better-sqlite3";

export interface CompatStateRecord {
  revision: number;
  state: Record<string, unknown>;
  updatedAt: string;
}

interface StateRow {
  state_json: string;
  revision: number;
  updated_at: string;
}

function parseState(value: string) {
  const parsed = JSON.parse(value || "{}") as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

export class StateRepository {
  constructor(private readonly db: Database.Database) {}

  getCompatState(): CompatStateRecord {
    const row = this.db
      .prepare(
        "SELECT state_json, revision, updated_at FROM app_state WHERE id = 'main'",
      )
      .get() as StateRow | undefined;

    if (!row) {
      this.db
        .prepare("INSERT INTO app_state (id, state_json, revision) VALUES ('main', '{}', 1)")
        .run();
      return this.getCompatState();
    }

    return {
      revision: row.revision,
      state: parseState(row.state_json),
      updatedAt: row.updated_at,
    };
  }

  putCompatState(state: Record<string, unknown>): CompatStateRecord {
    const payload = JSON.stringify(state);
    const writeState = this.db.transaction(() => {
      const current = this.getCompatState();
      const nextRevision = current.revision + 1;
      this.db
        .prepare(
          `
          UPDATE app_state
          SET state_json = ?, revision = ?, updated_at = datetime('now')
          WHERE id = 'main'
        `,
        )
        .run(payload, nextRevision);
      return this.getCompatState();
    });

    return writeState();
  }
}
