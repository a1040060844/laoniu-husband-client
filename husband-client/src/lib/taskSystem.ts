import { initialTasks } from "../data/tasks";
import {
  hydrateProgress,
  initialProgress,
  type GameProgress,
} from "../game/progression";
import type {
  EventLog,
  EventLogType,
  Task,
  TaskModuleId,
  TaskReward,
  TaskRewardType,
  TaskSource,
  TaskStatus,
  TaskTimeConfig,
  TaskTimeType,
  TaskType,
} from "../types/domain";

export interface TaskSystemState {
  progress: GameProgress;
  tasks: Task[];
  logs: EventLog[];
  punishmentStatus: PunishmentStatus;
}

export const PROGRESS_STORAGE_KEY = "laoniu-husband-progress-v1";
export const TASKS_STORAGE_KEY = "laoniu-husband-tasks-v1";
export const LOGS_STORAGE_KEY = "laoniu-husband-logs-v1";
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

const eventTypeMap: Record<string, EventLogType> = {
  benefit_approved: "benefit_approved",
  benefit_requested: "benefit_requested",
  level_changed: "level_changed",
  punishment_status_changed: "punishment_status_changed",
  task_approved: "task_approved",
  task_created: "task_created",
  task_rejected: "task_rejected",
  task_submitted: "task_submitted",
};

const moduleIdMap: Record<string, TaskModuleId> = {
  cleaning: "cleaning",
  cooking: "cooking",
  custom: "custom",
  game: "game",
  laundry: "laundry",
  movie: "movie",
  photo: "photo",
  shopping: "shopping",
};

const moduleLabelMap: Record<TaskModuleId, string> = {
  cleaning: "打扫卫生",
  cooking: "做饭",
  custom: "自定义任务",
  game: "打游戏",
  laundry: "洗衣整理",
  movie: "看电影",
  photo: "拍照",
  shopping: "买东西",
};

const timeTypeMap: Record<string, TaskTimeType> = {
  custom: "custom",
  immediate: "immediate",
  repeat: "repeat",
  this_month: "this_month",
  this_week: "this_week",
  today: "today",
  tomorrow: "tomorrow",
  within_24h: "within_24h",
  within_3d: "within_3d",
  within_7d: "within_7d",
};

const rewardTypeMap: Record<string, TaskRewardType> = {
  allowance: "allowance",
  benefit: "benefit",
  custom: "custom",
  experience: "experience",
  level_up: "level_up",
  none: "none",
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

function normalizeTimeConfig(raw: unknown): TaskTimeConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const type = timeTypeMap[String(value.type || "")];
  const label = String(value.label || "").trim();
  if (!type || !label) return undefined;

  const repeatFrequency =
    value.repeatFrequency === "daily" ||
    value.repeatFrequency === "weekly" ||
    value.repeatFrequency === "monthly" ||
    value.repeatFrequency === "custom"
      ? value.repeatFrequency
      : undefined;

  return {
    type,
    label,
    deadlineAt:
      typeof value.deadlineAt === "string" ? value.deadlineAt : undefined,
    repeatFrequency,
    repeatCount:
      typeof value.repeatCount === "number"
        ? Math.max(1, Math.trunc(value.repeatCount))
        : undefined,
    completedCount:
      typeof value.completedCount === "number"
        ? Math.max(0, Math.trunc(value.completedCount))
        : undefined,
  };
}

function normalizeReward(raw: unknown): TaskReward | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = rewardTypeMap[String(value.type || "")];
  if (!type) return null;
  const amount = Number(value.value);
  const label = String(value.label || "").trim();

  return {
    id: String(
      value.id ||
        `reward-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ),
    type,
    label: label || type,
    value: Number.isFinite(amount) ? Math.max(0, Math.trunc(amount)) : undefined,
    unit: typeof value.unit === "string" ? value.unit : undefined,
    benefitName:
      typeof value.benefitName === "string" ? value.benefitName : undefined,
    customName:
      typeof value.customName === "string" ? value.customName : undefined,
    customDescription:
      typeof value.customDescription === "string"
        ? value.customDescription
        : undefined,
  };
}

function normalizeRewards(raw: unknown): TaskReward[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rewards = raw
    .map(normalizeReward)
    .filter((reward): reward is TaskReward => Boolean(reward));
  return rewards.length ? rewards : undefined;
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
  const rawModuleId = String(value.moduleId || "");
  const moduleId = moduleIdMap[rawModuleId];
  if (rawModuleId && !moduleId) return null;

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
    moduleId,
    moduleLabel:
      moduleId ? moduleLabelMap[moduleId] : undefined,
    target: typeof value.target === "string" ? value.target : undefined,
    action: typeof value.action === "string" ? value.action : undefined,
    standard: typeof value.standard === "string" ? value.standard : undefined,
    timeConfig: normalizeTimeConfig(value.timeConfig),
    rewards: normalizeRewards(value.rewards),
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
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
    submittedAt:
      typeof value.submittedAt === "string" ? value.submittedAt : undefined,
    confirmedAt:
      typeof value.confirmedAt === "string" ? value.confirmedAt : undefined,
    rewardedAt:
      typeof value.rewardedAt === "string" ? value.rewardedAt : undefined,
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

function normalizeEventLog(raw: unknown): EventLog | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = eventTypeMap[String(value.type || "")];
  if (!type) return null;

  const title = String(value.title || "").trim();

  return {
    id: String(
      value.id ||
        `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ),
    type,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    title: title || type,
    description:
      typeof value.description === "string" ? value.description : undefined,
    taskId: typeof value.taskId === "string" ? value.taskId : undefined,
    taskTitle:
      typeof value.taskTitle === "string" ? value.taskTitle : undefined,
    benefitId:
      typeof value.benefitId === "string" ? value.benefitId : undefined,
    benefitName:
      typeof value.benefitName === "string" ? value.benefitName : undefined,
    fromLevel:
      typeof value.fromLevel === "number" ? value.fromLevel : undefined,
    toLevel: typeof value.toLevel === "number" ? value.toLevel : undefined,
    fromStatus:
      typeof value.fromStatus === "string" ? value.fromStatus : undefined,
    toStatus: typeof value.toStatus === "string" ? value.toStatus : undefined,
  };
}

function hydrateEventLogs(raw: unknown): EventLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeEventLog)
    .filter((log): log is EventLog => Boolean(log));
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
      logs: hydrateEventLogs(readJson(LOGS_STORAGE_KEY)),
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
    logs,
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
    logs: hydrateEventLogs(logs),
    punishmentStatus: hydratePunishmentStatus(punishmentStatus ?? slaveStatus),
  };
}

export function readLocalTaskSystem(): TaskSystemState {
  return stateFromUnknown(null);
}

export function persistLocalTaskSystem(state: TaskSystemState) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state.progress));
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(state.logs));
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
    logs: state.logs,
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
