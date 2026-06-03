import { initialTasks } from "../data/tasks";
import { benefits as initialBenefits } from "../data/benefits";
import {
  hydrateProgress,
  initialProgress,
  type GameProgress,
} from "../game/progression";
import type {
  EventLog,
  EventLogType,
  Benefit,
  BenefitRequest,
  Punishment,
  PunishmentStatus,
  Task,
  TaskModuleId,
  TaskReward,
  TaskRewardType,
  TaskSource,
  TaskStatus,
  TaskTimeConfig,
  TaskTimeType,
  TaskType,
  WalletLedgerEntry,
  WalletLedgerType,
} from "../types/domain";

export interface TaskSystemState {
  progress: GameProgress;
  tasks: Task[];
  logs: EventLog[];
  punishment: Punishment;
  benefits: Benefit[];
  walletLedger: WalletLedgerEntry[];
}

export const PROGRESS_STORAGE_KEY = "laoniu-husband-progress-v1";
export const TASKS_STORAGE_KEY = "laoniu-husband-tasks-v1";
export const LOGS_STORAGE_KEY = "laoniu-husband-logs-v1";
export const PUNISHMENT_STORAGE_KEY = "laoniu-husband-punishment-v1";
export const BENEFITS_STORAGE_KEY = "laoniu-husband-benefits-v1";
export const WALLET_LEDGER_STORAGE_KEY = "laoniu-husband-wallet-ledger-v1";
export const DEFAULT_PUNISHMENT_DURATION_DAYS = 7;
export const DEFAULT_REQUIRED_RECOVERY_EXP = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

export const initialPunishment: Punishment = {
  status: "normal",
  durationDays: DEFAULT_PUNISHMENT_DURATION_DAYS,
  recoveryExp: 0,
  requiredRecoveryExp: DEFAULT_REQUIRED_RECOVERY_EXP,
};

const typeMap: Record<string, TaskType> = {
  custom: "custom",
  daily: "daily",
  repeat: "repeat",
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
  expired: "expired",
  failed_pending: "failed_pending",
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
  task_expired: "task_expired",
  task_rejected: "task_rejected",
  task_submitted: "task_submitted",
  benefit_rejected: "benefit_rejected",
  wallet_ledger: "wallet_ledger",
};

const walletTypeMap: Record<string, WalletLedgerType> = {
  allowance: "allowance",
  benefit: "benefit",
  custom: "custom",
  experience: "experience",
  level_up: "level_up",
  punishment: "punishment",
  salary: "salary",
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

const LEGACY_COOKING_CLEANUP = ["做完收拾", "厨房"].join("");

function sanitizeTaskText(value: unknown) {
  return String(value || "").split(LEGACY_COOKING_CLEANUP).join("按老妞口味来");
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const day = target.getDay() || 7;
  target.setDate(target.getDate() + 4 - day);
  const yearStart = new Date(target.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7,
  );
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function endOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() + (7 - day));
  result.setHours(23, 59, 59, 999);
  return result;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function endOfMonth(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

function cycleForTask(
  type: TaskType,
  timeConfig: TaskTimeConfig | undefined,
  now = new Date(),
) {
  const frequency = timeConfig?.repeatFrequency;
  if (type === "daily" || frequency === "daily") {
    return { cycleId: dateKey(now), dueAt: endOfDay(now).toISOString() };
  }
  if (type === "weekly" || frequency === "weekly") {
    return { cycleId: weekKey(now), dueAt: endOfWeek(now).toISOString() };
  }
  if (frequency === "monthly") {
    return { cycleId: monthKey(now), dueAt: endOfMonth(now).toISOString() };
  }
  if (timeConfig?.deadlineAt) {
    const due = new Date(timeConfig.deadlineAt);
    if (!Number.isNaN(due.getTime())) {
      return { cycleId: dateKey(now), dueAt: due.toISOString() };
    }
  }
  return { cycleId: undefined, dueAt: undefined };
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
  const timeConfig = normalizeTimeConfig(value.timeConfig);
  const cycle = cycleForTask(type, timeConfig);
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
    description: sanitizeTaskText(
      value.description || "由老妞大人发布，验收标准以老妞大人裁定为准。",
    ),
    type: value.urgency === "urgent" ? "urgent" : type,
    source,
    moduleId,
    moduleLabel:
      moduleId ? moduleLabelMap[moduleId] : undefined,
    target:
      typeof value.target === "string" ? sanitizeTaskText(value.target) : undefined,
    action:
      typeof value.action === "string" ? sanitizeTaskText(value.action) : undefined,
    standard:
      typeof value.standard === "string"
        ? sanitizeTaskText(value.standard)
        : undefined,
    timeConfig,
    cycleId:
      typeof value.cycleId === "string" ? value.cycleId : cycle.cycleId,
    dueAt: typeof value.dueAt === "string" ? value.dueAt : cycle.dueAt,
    expiredAt:
      typeof value.expiredAt === "string" ? value.expiredAt : undefined,
    completedCount:
      typeof value.completedCount === "number"
        ? Math.max(0, Math.trunc(value.completedCount))
        : timeConfig?.completedCount,
    repeatCount:
      typeof value.repeatCount === "number"
        ? Math.max(1, Math.trunc(value.repeatCount))
        : timeConfig?.repeatCount,
    rewards: normalizeRewards(value.rewards),
    rewardExp: Number.isFinite(rewardExp)
      ? Math.max(0, Math.trunc(rewardExp))
      : 0,
    rewardMoney: Number.isFinite(rewardMoney)
      ? Math.max(0, Math.trunc(rewardMoney))
      : 0,
    rewardBenefit:
      typeof value.rewardBenefit === "string" ? value.rewardBenefit : undefined,
    deadline: sanitizeTaskText(value.deadline || "今日完成"),
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
      typeof value.submitNote === "string"
        ? sanitizeTaskText(value.submitNote)
        : undefined,
    resultText:
      typeof value.resultText === "string"
        ? sanitizeTaskText(value.resultText)
        : undefined,
  };
}

function hydrateTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return initialTasks;
  const tasks = raw
    .map(normalizeTask)
    .filter((task): task is Task => Boolean(task));
  return tasks.length ? tasks : initialTasks;
}

export function refreshTaskCycles(tasks: Task[], now = new Date()): Task[] {
  return tasks.map((task) => {
    const cycle = cycleForTask(task.type, task.timeConfig, now);
    const dueAt = task.dueAt ?? cycle.dueAt;
    const dueTime = dueAt ? Date.parse(dueAt) : Number.NaN;
    const isOpen = task.status === "todo" || task.status === "doing";

    if (isOpen && !Number.isNaN(dueTime) && dueTime < now.getTime()) {
      return {
        ...task,
        status: "failed_pending",
        expiredAt: task.expiredAt ?? now.toISOString(),
        resultText: task.resultText ?? "任务已过期，待老妞大人裁定。",
      };
    }

    if (
      cycle.cycleId &&
      task.cycleId &&
      cycle.cycleId !== task.cycleId &&
      (task.status === "confirmed" ||
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "expired" ||
        task.status === "failed_pending")
    ) {
      return {
        ...task,
        status: "todo",
        cycleId: cycle.cycleId,
        dueAt: cycle.dueAt,
        expiredAt: undefined,
        submittedAt: undefined,
        confirmedAt: undefined,
        rewardedAt: undefined,
        submitNote: undefined,
        resultText: undefined,
        completedCount: 0,
      };
    }

    return {
      ...task,
      cycleId: task.cycleId ?? cycle.cycleId,
      dueAt,
      repeatCount: task.repeatCount ?? task.timeConfig?.repeatCount,
      completedCount: task.completedCount ?? task.timeConfig?.completedCount,
    };
  });
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
    amount: typeof value.amount === "number" ? value.amount : undefined,
    unit: typeof value.unit === "string" ? value.unit : undefined,
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

function normalizeBenefitRequest(raw: unknown): BenefitRequest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const requestedAt =
    typeof value.requestedAt === "string"
      ? value.requestedAt
      : new Date().toISOString();
  return {
    id: String(value.id || `benefit-request-${Date.now()}`),
    requestedAt,
    reason: typeof value.reason === "string" ? value.reason : undefined,
    rejectedAt:
      typeof value.rejectedAt === "string" ? value.rejectedAt : undefined,
    rejectedReason:
      typeof value.rejectedReason === "string"
        ? value.rejectedReason
        : undefined,
  };
}

function normalizeBenefit(raw: unknown, fallback: Benefit): Benefit {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const value = raw as Record<string, unknown>;
  const status =
    value.status === "cooldown" ||
    value.status === "pending" ||
    value.status === "frozen" ||
    value.status === "locked"
      ? value.status
      : "available";

  return {
    ...fallback,
    status,
    cooldownText:
      typeof value.cooldownText === "string"
        ? value.cooldownText
        : fallback.cooldownText,
    lastRequestedAt:
      typeof value.lastRequestedAt === "string"
        ? value.lastRequestedAt
        : undefined,
    lastApprovedAt:
      typeof value.lastApprovedAt === "string"
        ? value.lastApprovedAt
        : undefined,
    cooldownUntil:
      typeof value.cooldownUntil === "string" ? value.cooldownUntil : undefined,
    availableBonusCount: safeNonNegativeInt(value.availableBonusCount, 0),
    pendingRequest: normalizeBenefitRequest(value.pendingRequest),
  };
}

function hydrateBenefits(raw: unknown): Benefit[] {
  if (!Array.isArray(raw)) return initialBenefits;
  return initialBenefits.map((benefit) => {
    const saved = raw.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as Record<string, unknown>).id === benefit.id,
    );
    return normalizeBenefit(saved, benefit);
  });
}

function normalizeWalletLedgerEntry(raw: unknown): WalletLedgerEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = walletTypeMap[String(value.type || "")];
  const amount = Number(value.amount);
  if (!type || !Number.isFinite(amount)) return null;
  const unit =
    value.unit === "EXP" ||
    value.unit === "CNY" ||
    value.unit === "LEVEL" ||
    value.unit === "BENEFIT" ||
    value.unit === "COUNT"
      ? value.unit
      : "COUNT";

  return {
    id: String(value.id || `ledger-${Date.now()}`),
    type,
    source: String(value.source || type),
    amount,
    unit,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    taskId: typeof value.taskId === "string" ? value.taskId : undefined,
    taskTitle:
      typeof value.taskTitle === "string" ? value.taskTitle : undefined,
    benefitId:
      typeof value.benefitId === "string" ? value.benefitId : undefined,
    benefitName:
      typeof value.benefitName === "string" ? value.benefitName : undefined,
    note: typeof value.note === "string" ? value.note : undefined,
    monthKey: typeof value.monthKey === "string" ? value.monthKey : undefined,
  };
}

function hydrateWalletLedger(raw: unknown): WalletLedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeWalletLedgerEntry)
    .filter((entry): entry is WalletLedgerEntry => Boolean(entry));
}

function safePositiveInt(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.trunc(number));
}

function safeNonNegativeInt(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.trunc(number));
}

export function createSlavePunishment(startedAt = new Date().toISOString()): Punishment {
  return {
    ...initialPunishment,
    status: "slave",
    startedAt,
  };
}

export function createNormalPunishment(): Punishment {
  return { ...initialPunishment };
}

export function hydratePunishment(raw: unknown): Punishment {
  if (raw === "slave") return createSlavePunishment();
  if (!raw || typeof raw !== "object") return createNormalPunishment();

  const value = raw as Record<string, unknown>;
  const status: PunishmentStatus = value.status === "slave" ? "slave" : "normal";
  const durationDays = safePositiveInt(
    value.durationDays,
    DEFAULT_PUNISHMENT_DURATION_DAYS,
  );
  const requiredRecoveryExp = safePositiveInt(
    value.requiredRecoveryExp,
    DEFAULT_REQUIRED_RECOVERY_EXP,
  );
  const recoveryExp = Math.min(
    requiredRecoveryExp,
    safeNonNegativeInt(value.recoveryExp),
  );
  const startedAt =
    typeof value.startedAt === "string" && !Number.isNaN(Date.parse(value.startedAt))
      ? value.startedAt
      : status === "slave"
        ? new Date().toISOString()
        : undefined;

  return {
    status,
    startedAt,
    durationDays,
    recoveryExp: status === "slave" ? recoveryExp : 0,
    requiredRecoveryExp,
  };
}

export function getPunishmentRemainingDays(
  punishment: Punishment,
  now = Date.now(),
) {
  if (punishment.status !== "slave") return 0;
  const startedAt = Date.parse(punishment.startedAt || "");
  if (Number.isNaN(startedAt)) return punishment.durationDays;
  const endsAt = startedAt + punishment.durationDays * DAY_MS;
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

export function isPunishmentDurationComplete(
  punishment: Punishment,
  now = Date.now(),
) {
  return punishment.status === "slave" && getPunishmentRemainingDays(punishment, now) <= 0;
}

export function isPunishmentRecoverable(
  punishment: Punishment,
  now = Date.now(),
) {
  return (
    punishment.status === "slave" &&
    punishment.recoveryExp >= punishment.requiredRecoveryExp &&
    isPunishmentDurationComplete(punishment, now)
  );
}

function stateFromUnknown(raw: unknown): TaskSystemState {
  if (!raw || typeof raw !== "object") {
    lastStateExtras = {};
    return {
      progress: hydrateProgress(
        readJson(PROGRESS_STORAGE_KEY) ?? initialProgress,
      ),
      tasks: refreshTaskCycles(hydrateTasks(readJson(TASKS_STORAGE_KEY))),
      logs: hydrateEventLogs(readJson(LOGS_STORAGE_KEY)),
      punishment: hydratePunishment(readJson(PUNISHMENT_STORAGE_KEY)),
      benefits: hydrateBenefits(readJson(BENEFITS_STORAGE_KEY)),
      walletLedger: hydrateWalletLedger(readJson(WALLET_LEDGER_STORAGE_KEY)),
    };
  }

  const value = raw as Record<string, unknown>;
  const {
    exp,
    level,
    progress,
    punishment,
    punishmentStatus,
    rewardedTaskIds,
    slaveStatus,
    tasks,
    logs,
    benefits,
    walletLedger,
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
    tasks: refreshTaskCycles(hydrateTasks(tasks)),
    logs: hydrateEventLogs(logs),
    punishment: hydratePunishment(punishment ?? punishmentStatus ?? slaveStatus),
    benefits: hydrateBenefits(benefits),
    walletLedger: hydrateWalletLedger(walletLedger),
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
    JSON.stringify(state.punishment),
  );
  localStorage.setItem(BENEFITS_STORAGE_KEY, JSON.stringify(state.benefits));
  localStorage.setItem(
    WALLET_LEDGER_STORAGE_KEY,
    JSON.stringify(state.walletLedger),
  );
}

function serializeTaskSystem(state: TaskSystemState) {
  return {
    ...lastStateExtras,
    ...state.progress,
    progress: state.progress,
    punishment: state.punishment,
    punishmentStatus: state.punishment.status,
    tasks: state.tasks,
    logs: state.logs,
    benefits: state.benefits,
    walletLedger: state.walletLedger,
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
