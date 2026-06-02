import { initialTasks } from "../data/tasks";
import {
  hydrateProgress,
  initialProgress,
  type GameProgress,
} from "../game/progression";
import type { Task, TaskSource, TaskStatus, TaskType } from "../types/domain";

export interface TaskSystemState {
  progress: GameProgress;
  tasks: Task[];
  punishmentStatus: PunishmentStatus;
}

export const PROGRESS_STORAGE_KEY = "laoniu-husband-progress-v1";
export const TASKS_STORAGE_KEY = "laoniu-husband-tasks-v1";
export const PUNISHMENT_STORAGE_KEY = "laoniu-husband-punishment-v1";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

export type PunishmentStatus = "normal" | "slave";

const typeMap: Record<string, TaskType> = {
  custom: "custom",
  daily: "daily",
  urgent: "urgent",
  weekly: "weekly",
  周任务: "weekly",
  日任务: "daily",
  紧急任务: "urgent",
  自定义: "custom",
  自定义任务: "custom",
};

const statusMap: Record<string, TaskStatus> = {
  completed: "completed",
  confirmed: "confirmed",
  doing: "doing",
  failed: "failed",
  open: "todo",
  submitted: "submitted",
  todo: "todo",
};

let lastStateExtras: Record<string, unknown> = {};

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") as T | null;
  } catch {
    return null;
  }
}

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const title = String(value.title || "").trim();
  if (!title) return null;

  const source =
    value.source === "daily" ? "daily" : ("wife" satisfies TaskSource);
  const type =
    typeMap[String(value.type || value.urgency || "custom")] ?? "custom";
  const rewardExp = Number(value.rewardExp ?? value.exp ?? 0);
  const rewardMoney = Number(value.rewardMoney ?? value.money ?? 0);

  return {
    id: String(
      value.id ||
        `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ),
    title,
    description: String(
      value.description || "由老妞大人发布，验收标准以老妞大人裁定为准。",
    ),
    type: value.urgency === "urgent" ? "urgent" : type,
    source,
    rewardExp: Number.isFinite(rewardExp)
      ? Math.max(0, Math.trunc(rewardExp))
      : 0,
    rewardMoney: Number.isFinite(rewardMoney)
      ? Math.max(0, Math.trunc(rewardMoney))
      : 0,
    rewardBenefit:
      typeof value.rewardBenefit === "string" ? value.rewardBenefit : undefined,
    deadline: String(value.deadline || "今日完成"),
    status: statusMap[String(value.status || "todo")] ?? "todo",
    submitNote:
      typeof value.submitNote === "string" ? value.submitNote : undefined,
    resultText:
      typeof value.resultText === "string" ? value.resultText : undefined,
  };
}

function hydrateTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return initialTasks;
  const tasks = raw
    .map(normalizeTask)
    .filter((task): task is Task => Boolean(task));
  return tasks.length ? tasks : initialTasks;
}

function hydratePunishmentStatus(raw: unknown): PunishmentStatus {
  return raw === "slave" ? "slave" : "normal";
}

function stateFromUnknown(raw: unknown): TaskSystemState {
  if (!raw || typeof raw !== "object") {
    lastStateExtras = {};
    return {
      progress: hydrateProgress(
        readJson(PROGRESS_STORAGE_KEY) ?? initialProgress,
      ),
      tasks: hydrateTasks(readJson(TASKS_STORAGE_KEY)),
      punishmentStatus: hydratePunishmentStatus(
        readJson(PUNISHMENT_STORAGE_KEY),
      ),
    };
  }

  const value = raw as Record<string, unknown>;
  const {
    exp,
    level,
    progress,
    punishmentStatus,
    rewardedTaskIds,
    slaveStatus,
    tasks,
    totalExp,
    wallet,
    ...extras
  } = value;
  lastStateExtras = extras;
  const progressSource =
    progress && typeof progress === "object"
      ? progress
      : {
          level,
          exp,
          totalExp,
          wallet,
          rewardedTaskIds,
        };

  return {
    progress: hydrateProgress(progressSource),
    tasks: hydrateTasks(tasks),
    punishmentStatus: hydratePunishmentStatus(punishmentStatus ?? slaveStatus),
  };
}

export function readLocalTaskSystem(): TaskSystemState {
  return stateFromUnknown(null);
}

export function persistLocalTaskSystem(state: TaskSystemState) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.progress));
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(
    PUNISHMENT_STORAGE_KEY,
    JSON.stringify(state.punishmentStatus),
  );
}

function serializeTaskSystem(state: TaskSystemState) {
  return {
    ...lastStateExtras,
    ...state.progress,
    progress: state.progress,
    punishmentStatus: state.punishmentStatus,
    tasks: state.tasks,
  };
}

export async function loadTaskSystem(): Promise<TaskSystemState> {
  const response = await fetch(apiUrl("/api/state"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`任务状态读取失败：${response.status}`);
  }
  const payload = (await response.json()) as { state?: unknown };
  return stateFromUnknown(payload.state);
}

export async function saveTaskSystem(state: TaskSystemState): Promise<void> {
  const response = await fetch(apiUrl("/api/state"), {
    body: JSON.stringify({ state: serializeTaskSystem(state) }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`任务状态保存失败：${response.status}`);
  }
}
