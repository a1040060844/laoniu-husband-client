import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(pathToFileURL(path.resolve(here, "../../../husband-client/package.json")));
const puppeteer = require("puppeteer-core");

const args = new Map(
  process.argv.slice(2).flatMap((value) => {
    const index = value.indexOf("=");
    return index < 0 ? [[value, "true"]] : [[value.slice(0, index), value.slice(index + 1)]];
  }),
);

const url = args.get("--url") ?? "https://www.laoniulaoge.cn/husband?admin-preview=tasks";
const outputRoot = path.resolve(args.get("--out") ?? path.join(here, "..", ".acceptance", "web-task"));
const requestedSize = args.get("--size");
const sizes = requestedSize ? [requestedSize] : ["390x844", "376x806", "314x706"];
const modes = args.get("--mode") ? [args.get("--mode")] : ["live_readonly", "all_statuses", "empty", "stress", "modal_preview"];

function parseSize(value) {
  const match = /^(\d+)x(\d+)$/.exec(value ?? "");
  if (!match) throw new Error(`Invalid size: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function findExecutable() {
  const candidates = [
    process.env.BROWSER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next installed browser.
    }
  }
  throw new Error("No Chrome/Edge executable found. Set BROWSER_EXECUTABLE_PATH.");
}

function fixtureScript(mode) {
  return `(${JSON.stringify(mode)})`;
}

async function capture(page, mode, size) {
  const { width, height } = parseSize(size);
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument((fixtureMode) => {
    const nativeFetch = window.fetch.bind(window);
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const mutate = (payload) => {
      if (!payload?.state || fixtureMode === "live_readonly") return payload;
      const next = clone(payload);
      const tasks = Array.isArray(next.state.tasks) ? next.state.tasks : [];
      if (fixtureMode === "empty") {
        next.state.tasks = [];
        return next;
      }
      const statuses = ["todo", "doing", "submitted", "confirmed", "completed"];
      if (fixtureMode === "all_statuses" || fixtureMode === "modal_preview") {
        const base = tasks[0] ?? {
          id: "fixture-web-task",
          source: "wife",
          title: "验收任务",
          description: "用于检查任务页状态布局。",
          deadline: "今日 22:00 前",
          rewards: [{ type: "experience", value: 20 }],
          rewardExp: 20,
          status: "todo",
        };
        next.state.tasks = statuses.map((status, index) => ({
          ...clone(base),
          id: `fixture-web-${status}-${index}`,
          source: index % 2 ? "daily" : "wife",
          status: status === "completed" ? "completed" : status,
          title: `${base.title ?? "验收任务"} · ${status}`,
        }));
      }
      if (fixtureMode === "stress") {
        const base = tasks[0] ?? {
          id: "fixture-web-stress",
          source: "wife",
          title: "压力任务",
          description: "压力测试任务说明。",
          deadline: "今日 22:00 前",
          status: "doing",
        };
        next.state.tasks = [{
          ...clone(base),
          id: "fixture-web-stress",
          source: "wife",
          status: "doing",
          title: "这是一个用于检查长标题换行、操作区宽度和动态卡片高度的压力测试任务",
          description: "这是一段较长的任务说明，用来确认窄屏下正文、重复进度、多奖励胶囊以及结果文字不会相互挤压或溢出。",
          repeatCount: 5,
          completedCount: 2,
          rewards: [
            { type: "experience", value: 35 },
            { type: "allowance", value: 88 },
            { type: "benefit", value: 2 },
          ],
          resultText: "已完成压力测试结果展示。",
        }];
      }
      return next;
    };
    window.fetch = async (input, init = {}) => {
      const requestUrl = typeof input === "string" ? input : input?.url ?? "";
      const method = String(init.method ?? (typeof input === "object" ? input.method : "GET") ?? "GET").toUpperCase();
      if (requestUrl.includes("/api/state/events")) {
        return new Response("", { status: 204 });
      }
      if (requestUrl.includes("/api/state")) {
        if (method !== "GET") {
          return new Response(JSON.stringify({ error: "read-only parity capture" }), {
            status: 405,
            headers: { "content-type": "application/json" },
          });
        }
        const response = await nativeFetch(input, init);
        if (fixtureMode === "live_readonly") return response;
        const payload = await response.clone().json();
        return new Response(JSON.stringify(mutate(payload)), {
          status: response.status,
          headers: { "content-type": "application/json" },
        });
      }
      return nativeFetch(input, init);
    };
    navigator.sendBeacon = () => false;
  }, mode);

  const target = new URL(url);
  target.searchParams.set("acceptance", "1");
  await page.goto(target.toString(), { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector(".task-page", { timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (mode === "modal_preview") {
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("提交完成"));
      button?.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  const directory = path.join(outputRoot, mode);
  await fs.mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${size}.png`), fullPage: false });
  const bounds = await page.evaluate(() => {
    const selectors = [
      ".task-header", ".overview-panel", ".source-tabs", ".filter-row",
      ".task-list", ".task-card", ".month-panel", ".submit-modal",
    ];
    return Object.fromEntries(selectors.map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return [selector, null];
      const rect = element.getBoundingClientRect();
      return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
    }));
  });
  await fs.writeFile(path.join(directory, `${size}.bounds.json`), JSON.stringify({ mode, size, bounds }, null, 2));
}

const browser = await puppeteer.launch({
  executablePath: await findExecutable(),
  headless: "new",
  args: ["--disable-background-networking", "--disable-service-worker", "--no-first-run"],
});
try {
  const page = await browser.newPage();
  for (const mode of modes) {
    for (const size of sizes) {
      console.log(`Capturing Web task parity: mode=${mode} size=${size}`);
      await capture(page, mode, size);
    }
  }
} finally {
  await browser.close();
}
