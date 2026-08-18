import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "..", "app-data"));
const STATE_PATH = path.join(DATA_DIR, "state.json");
const STATE_TEMP_PATH = `${STATE_PATH}.tmp`;
const MAX_REQUEST_BYTES = 5 * 1024 * 1024;
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4174);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

let writeQueue = Promise.resolve();
const stateEventClients = new Set();

function stateRevision(state) {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

function broadcastStateRevision(revision) {
  const event = `event: state\ndata: ${JSON.stringify({ revision })}\n\n`;
  for (const response of stateEventClients) {
    try {
      response.write(event);
    } catch {
      stateEventClients.delete(response);
    }
  }
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readState() {
  try {
    const content = await readFile(STATE_PATH, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    if (error instanceof SyntaxError) {
      await rename(STATE_PATH, `${STATE_PATH}.corrupt-${Date.now()}`).catch(
        () => undefined,
      );
      return {};
    }
    throw error;
  }
}

function writeState(state, expectedRevision) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const currentState = await readState();
      const currentRevision = stateRevision(currentState);
      if (!expectedRevision && Object.keys(currentState).length > 0) {
        const error = new Error("State revision is required. Please refresh this page.");
        error.statusCode = 428;
        error.revision = currentRevision;
        throw error;
      }
      if (expectedRevision && expectedRevision !== currentRevision) {
        const error = new Error("State revision conflict.");
        error.statusCode = 409;
        error.revision = currentRevision;
        throw error;
      }
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STATE_TEMP_PATH, JSON.stringify(state, null, 2), "utf8");
      await rename(STATE_TEMP_PATH, STATE_PATH);
      const revision = stateRevision(state);
      broadcastStateRevision(revision);
      return revision;
    });
  return writeQueue;
}

function clearSyntheticBenefitCooldowns(state) {
  if (!state || typeof state !== "object" || !Array.isArray(state.benefits)) {
    return state;
  }

  return {
    ...state,
    benefits: state.benefits.map((benefit) => {
      if (!benefit || typeof benefit !== "object") return benefit;
      const hasUsageHistory = Boolean(
        benefit.lastApprovedAt ||
          benefit.lastRequestedAt ||
          benefit.pendingRequest,
      );
      if (!benefit.cooldownUntil || hasUsageHistory) return benefit;

      const normalized = { ...benefit, status: "available" };
      delete normalized.cooldownText;
      delete normalized.cooldownUntil;
      return normalized;
    }),
  };
}

async function readRequestJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BYTES) {
      const error = new Error("State payload is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleStateApi(request, response) {
  try {
    if (request.method === "GET") {
      const state = await readState();
      sendJson(response, 200, { state, revision: stateRevision(state) });
      return;
    }

    if (request.method === "PUT") {
      const payload = await readRequestJson(request);
      if (!Object.hasOwn(payload, "state")) {
        sendJson(response, 400, { error: "Missing state payload." });
        return;
      }
      const revision = await writeState(
        clearSyntheticBenefitCooldowns(payload.state),
        typeof payload.revision === "string" ? payload.revision : undefined,
      );
      sendJson(response, 200, { ok: true, revision });
      return;
    }

    response.setHeader("Allow", "GET, PUT");
    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "Unknown error",
      revision: error.revision,
    });
  }
}

async function handleStateEvents(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const state = await readState();
  response.write(
    `event: ready\ndata: ${JSON.stringify({ revision: stateRevision(state) })}\n\n`,
  );
  stateEventClients.add(response);

  const keepAlive = setInterval(() => response.write(": keep-alive\n\n"), 20_000);
  const close = () => {
    clearInterval(keepAlive);
    stateEventClients.delete(response);
  };
  request.once("close", close);
  response.once("close", close);
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const candidate = path.resolve(DIST_DIR, relativePath);
  if (!candidate.startsWith(`${DIST_DIR}${path.sep}`) && candidate !== DIST_DIR) {
    return null;
  }
  return candidate;
}

async function serveFile(filePath, response) {
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  if (!fileStat.isFile()) return false;

  const ext = path.extname(filePath);
  response.statusCode = 200;
  response.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  response.setHeader("Content-Length", fileStat.size);

  const fileName = path.basename(filePath);
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (fileName === "sw.js" || fileName === "index.html") {
    response.setHeader("Cache-Control", "no-cache");
  } else {
    response.setHeader("Cache-Control", "public, max-age=3600");
  }

  createReadStream(filePath).pipe(response);
  return true;
}

async function handleStatic(request, response, pathname) {
  try {
    const staticPath = resolveStaticPath(pathname);
    if (staticPath && (await serveFile(staticPath, response))) return;

    await serveFile(path.join(DIST_DIR, "index.html"), response);
  } catch (error) {
    response.statusCode = error.code === "ENOENT" ? 404 : 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(error.code === "ENOENT" ? "Not found" : "Internal server error");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  if (url.pathname === "/api/state") {
    await handleStateApi(request, response);
    return;
  }

  if (url.pathname === "/api/state/events") {
    await handleStateEvents(request, response);
    return;
  }

  await handleStatic(request, response, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Laoniu app is running at http://${HOST}:${PORT}`);
  console.log(`State file: ${STATE_PATH}`);
});
