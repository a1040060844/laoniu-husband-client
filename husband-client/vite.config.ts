import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const STATE_PATH = path.resolve(process.cwd(), "../app-data/state.json");
const STATE_TEMP_PATH = `${STATE_PATH}.tmp`;
const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

let writeQueue = Promise.resolve();

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

function writeState(state: unknown) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      await mkdir(path.dirname(STATE_PATH), { recursive: true });
      await writeFile(STATE_TEMP_PATH, JSON.stringify(state, null, 2), "utf8");
      await rename(STATE_TEMP_PATH, STATE_PATH);
    });
  return writeQueue;
}

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  payload: unknown,
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function stateApiMiddleware(): Plugin {
  const install = (middlewares: {
    use: (
      handler: (
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
        next: () => void,
      ) => void,
    ) => void;
  }) => {
    middlewares.use(async (request, response, next) => {
      if (request.url?.split("?", 1)[0] !== "/api/state") {
        next();
        return;
      }

      try {
        if (request.method === "GET") {
          sendJson(response, 200, { state: await readState() });
          return;
        }

        if (request.method === "PUT") {
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of request) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > MAX_REQUEST_BYTES) {
              sendJson(response, 413, { error: "State payload is too large." });
              return;
            }
            chunks.push(buffer);
          }

          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            state?: unknown;
          };
          if (!("state" in payload)) {
            sendJson(response, 400, { error: "Missing state payload." });
            return;
          }
          await writeState(payload.state);
          sendJson(response, 200, { ok: true });
          return;
        }

        response.setHeader("Allow", "GET, PUT");
        sendJson(response, 405, { error: "Method not allowed." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        sendJson(response, 500, { error: message });
      }
    });
  };

  return {
    name: "laoniu-state-api",
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const externalApiBaseUrl = env.VITE_API_BASE_URL?.trim();

  return {
    base: env.VITE_PUBLIC_BASE_PATH || "/",
    plugins: [react(), ...(externalApiBaseUrl ? [] : [stateApiMiddleware()])],
    server: {
      host: "0.0.0.0",
      port: 5174,
      strictPort: false,
      proxy: externalApiBaseUrl
        ? {
            "/api": externalApiBaseUrl,
          }
        : undefined,
    },
    preview: {
      host: "0.0.0.0",
      port: 4174,
    },
  };
});
