import { initialTasks } from "../data/tasks";
import { clearSyntheticBenefitCooldown } from "../data/benefits";
import {
  hydrateProgress,
  initialProgress,
  type GameProgress,
} from "../game/progression";
import {
  emptyAdminConfig,
  getMaxLevel,
  normalizeAdminConfig,
  resolveBenefits,
  resolveRoles,
  type AdminConfigState,
} from "./adminConfig";
import {
  CHAT_STORAGE_KEY,
  hydrateChatMessages,
  mergeChatMessages,
} from "./chatMessages";
import { mergeMonthlyAllowanceRecords } from "./monthlyAllowance";
import { mergeNotifications } from "./notifications";
import { mergeProgressForSave } from "./progressMerge";
import { refreshTaskCycles, resolveTaskSchedule } from "./taskSchedule";
import type {
  ChatMessage,
  DecreeEvent,
  DecreeType,
  EventLog,
  EventLogType,
  Benefit,
  BenefitStatus,
  BenefitRequest,
  MonthlyAllowanceRecord,
  MonthlyAllowanceStatus,
  NotificationEvent,
  Punishment,
  PunishmentStatus,
  Role,
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
  roles: Role[];
  tasks: Task[];
  logs: EventLog[];
  punishment: Punishment;
  benefits: Benefit[];
  walletLedger: WalletLedgerEntry[];
  decrees: DecreeEvent[];
  monthlyAllowances: MonthlyAllowanceRecord[];
  notifications: NotificationEvent[];
  chatMessages: ChatMessage[];
  adminConfig: AdminConfigState;
}

export const PROGRESS_STORAGE_KEY = "laoniu-husband-progress-v1";
export const TASKS_STORAGE_KEY = "laoniu-husband-tasks-v1";
export const LOGS_STORAGE_KEY = "laoniu-husband-logs-v1";
export const PUNISHMENT_STORAGE_KEY = "laoniu-husband-punishment-v1";
export const BENEFITS_STORAGE_KEY = "laoniu-husband-benefits-v1";
export const WALLET_LEDGER_STORAGE_KEY = "laoniu-husband-wallet-ledger-v1";
export const DECREES_STORAGE_KEY = "laoniu-husband-decrees-v1";
export const MONTHLY_ALLOWANCES_STORAGE_KEY =
  "laoniu-husband-monthly-allowances-v1";
export const NOTIFICATIONS_STORAGE_KEY = "laoniu-notifications-v1";
export const ADMIN_CONFIG_STORAGE_KEY = "laoniu-admin-config-v1";
export const DEFAULT_PUNISHMENT_DURATION_DAYS = 7;
export const DEFAULT_REQUIRED_RECOVERY_EXP = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);
const ALLOW_LOCAL_FALLBACK = Boolean(import.meta.env?.DEV) && !API_BASE_URL;

export class TaskSystemConflictError extends Error {
  readonly revision?: string;

  constructor(revision?: string) {
    super("任务状态已被另一端更新，请重试。");
    this.name = "TaskSystemConflictError";
    this.revision = revision;
  }
}

export interface TaskSystemSnapshot {
  state: TaskSystemState;
  revision?: string;
}

const decreeTypes = new Set<DecreeType>([
  "experience_granted",
  "experience_penalty",
  "level_changed",
  "punishment_slave",
  "punishment_restored",
  "punishment_continued",
  "task_created",
  "task_approved",
  "task_rejected",
  "wallet_ledger",
  "benefit_approved",
  "benefit_rejected",
]);

const monthlyAllowanceStatuses = new Set<MonthlyAllowanceStatus>([
  "PENDING_WIFE_ACTION",
  "PAYING",
  "WAITING_WIFE_CONFIRM",
  "PAID_CONFIRMED_BY_WIFE",
  "RECEIVED_BY_HUSBAND",
  "HUSBAND_REPORTED_NOT_RECEIVED",
  "RETRY_PAYING",
  "REBUKED_AS_BLIND",
  "CANCELLED_BY_WIFE",
]);

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
  anomaly: "anomaly",
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
  const cycle = resolveTaskSchedule(type, timeConfig);
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

export { refreshTaskCycles } from "./taskSchedule";

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
    anomalyKey:
      typeof value.anomalyKey === "string" ? value.anomalyKey : undefined,
    anomalyCategory:
      typeof value.anomalyCategory === "string"
        ? value.anomalyCategory
        : undefined,
    anomalySeverity:
      typeof value.anomalySeverity === "number"
        ? value.anomalySeverity
        : undefined,
    resolvedAt:
      typeof value.resolvedAt === "string" ? value.resolvedAt : undefined,
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

  return clearSyntheticBenefitCooldown({
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
  });
}

function hydrateBenefits(
  raw: unknown,
  adminConfig: AdminConfigState = emptyAdminConfig,
): Benefit[] {
  const definitions = resolveBenefits(adminConfig);
  if (!Array.isArray(raw)) return definitions;
  return definitions.map((benefit) => {
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
  const entries = raw
    .map(normalizeWalletLedgerEntry)
    .filter((entry): entry is WalletLedgerEntry => Boolean(entry));
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key =
      entry.type === "salary" && entry.monthKey
        ? `salary:${entry.monthKey}`
        : `id:${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function duplicatedSalaryAmount(raw: unknown) {
  if (!Array.isArray(raw)) return 0;
  const seenMonths = new Set<string>();
  let duplicatedAmount = 0;
  for (const item of raw) {
    const entry = normalizeWalletLedgerEntry(item);
    if (entry?.type !== "salary" || !entry.monthKey) continue;
    if (seenMonths.has(entry.monthKey)) {
      duplicatedAmount += Math.max(0, entry.amount);
      continue;
    }
    seenMonths.add(entry.monthKey);
  }
  return duplicatedAmount;
}

function normalizeDecree(raw: unknown): DecreeEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    !decreeTypes.has(value.type as DecreeType) ||
    typeof value.title !== "string" ||
    typeof value.text !== "string" ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    return null;
  }
  const tone =
    value.tone === "upgrade" ||
    value.tone === "down" ||
    value.tone === "punish"
      ? value.tone
      : "normal";
  const target = value.target === "wife" ? "wife" : "husband";

  return {
    id: value.id,
    type: value.type as DecreeType,
    title: value.title,
    text: value.text,
    tone,
    createdAt: value.createdAt,
    target,
    readAt: typeof value.readAt === "string" ? value.readAt : undefined,
    acknowledgedAt:
      typeof value.acknowledgedAt === "string" ? value.acknowledgedAt : undefined,
    sourceLogId:
      typeof value.sourceLogId === "string" ? value.sourceLogId : undefined,
    payload:
      value.payload && typeof value.payload === "object" && !Array.isArray(value.payload)
        ? (value.payload as Record<string, unknown>)
        : {},
  };
}

export function hydrateDecrees(raw: unknown): DecreeEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeDecree)
    .filter((decree): decree is DecreeEvent => Boolean(decree));
}

function normalizeNotification(raw: unknown): NotificationEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    (value.target !== "husband" && value.target !== "wife") ||
    (value.source !== "decree" &&
      value.source !== "story" &&
      value.source !== "monthly_allowance") ||
    typeof value.sourceId !== "string" ||
    typeof value.title !== "string" ||
    typeof value.text !== "string" ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    return null;
  }
  const tone =
    value.tone === "upgrade" ||
    value.tone === "down" ||
    value.tone === "punish"
      ? value.tone
      : "normal";

  return {
    id: value.id,
    target: value.target,
    source: value.source,
    sourceId: value.sourceId,
    title: value.title,
    text: value.text,
    tone,
    createdAt: value.createdAt,
    viewedAt: typeof value.viewedAt === "string" ? value.viewedAt : undefined,
    skippedAt: typeof value.skippedAt === "string" ? value.skippedAt : undefined,
    payload:
      value.payload && typeof value.payload === "object" && !Array.isArray(value.payload)
        ? (value.payload as Record<string, unknown>)
        : undefined,
  };
}

export function hydrateNotifications(raw: unknown): NotificationEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeNotification)
    .filter((notification): notification is NotificationEvent =>
      Boolean(notification),
    );
}

export function mergeDecrees(
  serverDecrees: DecreeEvent[],
  localDecrees: DecreeEvent[],
) {
  const merged = new Map<string, DecreeEvent>();
  for (const decree of serverDecrees) merged.set(decree.id, decree);
  for (const local of localDecrees) {
    const server = merged.get(local.id);
    merged.set(local.id, {
      ...(server ?? local),
      ...local,
      readAt: local.readAt ?? server?.readAt,
      acknowledgedAt: local.acknowledgedAt ?? server?.acknowledgedAt,
    });
  }
  return [...merged.values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

function sameJson(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function chooseChangedPart<T>(
  serverPart: T,
  localPart: T,
  basePart: T | undefined,
) {
  if (basePart === undefined) return localPart;
  const localChanged = !sameJson(localPart, basePart);
  const serverChanged = !sameJson(serverPart, basePart);
  if (localChanged && !serverChanged) return localPart;
  if (!localChanged && serverChanged) return serverPart;
  if (localChanged && serverChanged) return localPart;
  return serverPart;
}

const taskStatusRank: Record<TaskStatus, number> = {
  todo: 0,
  doing: 1,
  submitted: 2,
  failed_pending: 2,
  failed: 3,
  expired: 3,
  confirmed: 4,
  completed: 5,
};

function safeTime(value?: string) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function taskLatestTime(task: Task) {
  return Math.max(
    safeTime(task.createdAt),
    safeTime(task.submittedAt),
    safeTime(task.confirmedAt),
    safeTime(task.rewardedAt),
    safeTime(task.expiredAt),
  );
}

export function preferTask(first: Task, second: Task) {
  if (first.cycleId && second.cycleId && first.cycleId !== second.cycleId) {
    const firstDue = safeTime(first.dueAt);
    const secondDue = safeTime(second.dueAt);
    if (firstDue !== secondDue) return firstDue > secondDue ? first : second;
    return first.cycleId > second.cycleId ? first : second;
  }

  const firstCompleted = first.status === "confirmed" || first.status === "completed";
  const secondCompleted = second.status === "confirmed" || second.status === "completed";
  if (firstCompleted !== secondCompleted) return firstCompleted ? first : second;

  const firstCompletedCount = first.completedCount ?? first.timeConfig?.completedCount ?? 0;
  const secondCompletedCount = second.completedCount ?? second.timeConfig?.completedCount ?? 0;
  if (firstCompletedCount !== secondCompletedCount) {
    return firstCompletedCount > secondCompletedCount ? first : second;
  }

  const firstRank = taskStatusRank[first.status];
  const secondRank = taskStatusRank[second.status];
  if (firstRank !== secondRank) return firstRank > secondRank ? first : second;

  return taskLatestTime(first) >= taskLatestTime(second) ? first : second;
}

function mergeTaskForSave(serverTask: Task, localTask: Task, baseTask?: Task) {
  if (!baseTask) return preferTask(serverTask, localTask);
  const localChanged = !sameJson(localTask, baseTask);
  const serverChanged = !sameJson(serverTask, baseTask);
  if (localChanged && !serverChanged) return localTask;
  if (!localChanged && serverChanged) return serverTask;
  if (!localChanged && !serverChanged) return serverTask;
  return preferTask(serverTask, localTask);
}

function mergeTasksForSave(
  serverTasks: Task[],
  localTasks: Task[],
  baseTasks: Task[] = [],
) {
  const baseById = new Map(baseTasks.map((task) => [task.id, task]));
  const merged = new Map<string, Task>();
  serverTasks.forEach((task) => merged.set(task.id, task));
  localTasks.forEach((task) => {
    const serverTask = merged.get(task.id);
    merged.set(
      task.id,
      serverTask ? mergeTaskForSave(serverTask, task, baseById.get(task.id)) : task,
    );
  });
  return [...merged.values()].sort((a, b) => taskLatestTime(b) - taskLatestTime(a));
}

const benefitStatusRank: Record<BenefitStatus, number> = {
  locked: 0,
  available: 1,
  pending: 2,
  cooldown: 3,
  frozen: 4,
};

function benefitLatestTime(benefit: Benefit) {
  return Math.max(
    safeTime(benefit.lastRequestedAt),
    safeTime(benefit.pendingRequest?.requestedAt),
    safeTime(benefit.pendingRequest?.rejectedAt),
    safeTime(benefit.lastApprovedAt),
    safeTime(benefit.cooldownUntil),
  );
}

function preferBenefit(first: Benefit, second: Benefit) {
  const firstRank = benefitStatusRank[first.status];
  const secondRank = benefitStatusRank[second.status];
  if (firstRank !== secondRank) return firstRank > secondRank ? first : second;

  const firstBonus = first.availableBonusCount ?? 0;
  const secondBonus = second.availableBonusCount ?? 0;
  if (firstBonus !== secondBonus) {
    return firstBonus > secondBonus ? first : second;
  }

  return benefitLatestTime(first) >= benefitLatestTime(second) ? first : second;
}

function mergeBenefitForSave(
  serverBenefit: Benefit,
  localBenefit: Benefit,
  baseBenefit?: Benefit,
) {
  if (!baseBenefit) return preferBenefit(serverBenefit, localBenefit);
  const localChanged = !sameJson(localBenefit, baseBenefit);
  const serverChanged = !sameJson(serverBenefit, baseBenefit);
  if (localChanged && !serverChanged) return localBenefit;
  if (!localChanged && serverChanged) return serverBenefit;
  if (!localChanged && !serverChanged) return serverBenefit;
  return preferBenefit(serverBenefit, localBenefit);
}

function mergeBenefitsForSave(
  serverBenefits: Benefit[],
  localBenefits: Benefit[],
  baseBenefits: Benefit[] = [],
) {
  const baseById = new Map(baseBenefits.map((benefit) => [benefit.id, benefit]));
  const merged = new Map<string, Benefit>();
  serverBenefits.forEach((benefit) => merged.set(benefit.id, benefit));
  localBenefits.forEach((benefit) => {
    const serverBenefit = merged.get(benefit.id);
    merged.set(
      benefit.id,
      serverBenefit
        ? mergeBenefitForSave(serverBenefit, benefit, baseById.get(benefit.id))
        : benefit,
    );
  });
  return [...merged.values()].sort((a, b) => a.levelRequired - b.levelRequired);
}

function mergeAppendOnlyById<T extends { id: string; createdAt: string }>(
  firstItems: T[],
  secondItems: T[],
) {
  const merged = new Map<string, T>();
  firstItems.forEach((item) => merged.set(item.id, item));
  secondItems.forEach((item) => merged.set(item.id, item));
  return [...merged.values()].sort(
    (a, b) => safeTime(b.createdAt) - safeTime(a.createdAt),
  );
}

export function mergeTaskSystemStateForSave(
  serverState: TaskSystemState,
  localState: TaskSystemState,
  baseState?: TaskSystemState | null,
): TaskSystemState {
  return {
    progress: mergeProgressForSave(
      serverState.progress,
      localState.progress,
      baseState?.progress,
    ),
    roles: chooseChangedPart(serverState.roles, localState.roles, baseState?.roles),
    tasks: mergeTasksForSave(serverState.tasks, localState.tasks, baseState?.tasks),
    logs: mergeAppendOnlyById(serverState.logs, localState.logs),
    punishment: chooseChangedPart(
      serverState.punishment,
      localState.punishment,
      baseState?.punishment,
    ),
    benefits: mergeBenefitsForSave(
      serverState.benefits,
      localState.benefits,
      baseState?.benefits,
    ),
    walletLedger: mergeAppendOnlyById(
      serverState.walletLedger,
      localState.walletLedger,
    ),
    decrees: mergeDecrees(serverState.decrees, localState.decrees),
    monthlyAllowances: mergeMonthlyAllowanceRecords(
      serverState.monthlyAllowances,
      localState.monthlyAllowances,
    ),
    notifications: mergeNotifications(
      serverState.notifications,
      localState.notifications,
    ),
    chatMessages: mergeChatMessages(serverState.chatMessages, localState.chatMessages),
    adminConfig: chooseChangedPart(
      serverState.adminConfig,
      localState.adminConfig,
      baseState?.adminConfig,
    ),
  };
}

function normalizeMonthlyAllowanceRecord(
  raw: unknown,
): MonthlyAllowanceRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.month !== "string" ||
    typeof value.status !== "string" ||
    !monthlyAllowanceStatuses.has(value.status as MonthlyAllowanceStatus)
  ) {
    return null;
  }

  const baseSalary = safeNonNegativeInt(value.baseSalary);
  const taskBonus = safeNonNegativeInt(value.taskBonus);
  const wifeAdjustmentAmount = safeSignedInt(value.wifeAdjustmentAmount);
  const totalAmount = safeNonNegativeInt(
    value.totalAmount,
    Math.max(0, baseSalary + taskBonus + wifeAdjustmentAmount),
  );

  return {
    id: value.id,
    month: value.month,
    settlementMonth:
      typeof value.settlementMonth === "string"
        ? value.settlementMonth
        : value.month,
    status: value.status as MonthlyAllowanceStatus,
    roleLevel: safeNonNegativeInt(value.roleLevel),
    roleTitle:
      typeof value.roleTitle === "string" ? value.roleTitle : "未知职务",
    baseSalary,
    completedTaskCount: safeNonNegativeInt(value.completedTaskCount),
    taskBonus,
    wifeAdjustmentAmount,
    totalAmount,
    wifeConfirmedAt:
      typeof value.wifeConfirmedAt === "string" ? value.wifeConfirmedAt : undefined,
    husbandReceivedAt:
      typeof value.husbandReceivedAt === "string"
        ? value.husbandReceivedAt
        : undefined,
    husbandReportedAt:
      typeof value.husbandReportedAt === "string"
        ? value.husbandReportedAt
        : undefined,
    cancelledAt:
      typeof value.cancelledAt === "string" ? value.cancelledAt : undefined,
    rebukedAt:
      typeof value.rebukedAt === "string" ? value.rebukedAt : undefined,
    retryCount: safeNonNegativeInt(value.retryCount),
    creditedAt:
      typeof value.creditedAt === "string" ? value.creditedAt : undefined,
  };
}

export function hydrateMonthlyAllowances(
  raw: unknown,
): MonthlyAllowanceRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMonthlyAllowanceRecord)
    .filter((record): record is MonthlyAllowanceRecord => Boolean(record));
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

function safeSignedInt(value: unknown, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

function safeOptionalNonNegativeInt(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(0, Math.trunc(number));
}

export function createSlavePunishment(
  restoreState?: Pick<GameProgress, "level" | "exp" | "wallet">,
  startedAt = new Date().toISOString(),
): Punishment {
  return {
    ...initialPunishment,
    status: "slave",
    startedAt,
    restoreLevel: restoreState?.level,
    restoreExp: restoreState?.exp,
    restoreWallet: restoreState?.wallet,
  };
}

export function createNormalPunishment(): Punishment {
  return { ...initialPunishment };
}

export function createNextSlavePunishment(
  punishment: Punishment,
  startedAt = new Date().toISOString(),
): Punishment {
  return {
    ...initialPunishment,
    status: "slave",
    startedAt,
    restoreLevel: punishment.restoreLevel,
    restoreExp: punishment.restoreExp,
    restoreWallet: punishment.restoreWallet,
  };
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
    restoreLevel:
      status === "slave" ? safeOptionalNonNegativeInt(value.restoreLevel) : undefined,
    restoreExp:
      status === "slave" ? safeOptionalNonNegativeInt(value.restoreExp) : undefined,
    restoreWallet:
      status === "slave" ? safeOptionalNonNegativeInt(value.restoreWallet) : undefined,
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

export function isPunishmentCycleComplete(
  punishment: Punishment,
  now = Date.now(),
) {
  return (
    punishment.status === "slave" &&
    (punishment.recoveryExp >= punishment.requiredRecoveryExp ||
      isPunishmentDurationComplete(punishment, now))
  );
}

function stateFromUnknown(raw: unknown): TaskSystemState {
  if (!raw || typeof raw !== "object") {
    lastStateExtras = {};
    const adminConfig = normalizeAdminConfig(
      readJson(ADMIN_CONFIG_STORAGE_KEY) ?? emptyAdminConfig,
    );
    const roles = resolveRoles(adminConfig);
    return {
      progress: hydrateProgress(
        readJson(PROGRESS_STORAGE_KEY) ?? initialProgress,
        getMaxLevel(roles),
      ),
      roles,
      tasks: refreshTaskCycles(hydrateTasks(readJson(TASKS_STORAGE_KEY))),
      logs: hydrateEventLogs(readJson(LOGS_STORAGE_KEY)),
      punishment: hydratePunishment(readJson(PUNISHMENT_STORAGE_KEY)),
      benefits: hydrateBenefits(readJson(BENEFITS_STORAGE_KEY), adminConfig),
      walletLedger: hydrateWalletLedger(readJson(WALLET_LEDGER_STORAGE_KEY)),
      decrees: hydrateDecrees(readJson(DECREES_STORAGE_KEY)),
      monthlyAllowances: hydrateMonthlyAllowances(
        readJson(MONTHLY_ALLOWANCES_STORAGE_KEY),
      ),
      notifications: hydrateNotifications(readJson(NOTIFICATIONS_STORAGE_KEY)),
      chatMessages: hydrateChatMessages(readJson(CHAT_STORAGE_KEY)),
      adminConfig,
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
    decrees,
    monthlyAllowances,
    notifications,
    chatMessages,
    adminConfig: rawAdminConfig,
    totalExp,
    wallet,
    ...extras
  } = value;
  lastStateExtras = extras;
  const adminConfig = normalizeAdminConfig(rawAdminConfig);
  const roles = resolveRoles(adminConfig);
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

  const hydratedProgress = hydrateProgress(progressSource, getMaxLevel(roles));
  const hydratedPunishment = hydratePunishment(
    punishment ?? punishmentStatus ?? slaveStatus,
  );
  const duplicateSalary = duplicatedSalaryAmount(walletLedger);

  return {
    progress:
      duplicateSalary > 0
        ? {
            ...hydratedProgress,
            wallet: Math.max(0, hydratedProgress.wallet - duplicateSalary),
          }
        : hydratedProgress,
    roles,
    tasks: refreshTaskCycles(hydrateTasks(tasks)),
    logs: hydrateEventLogs(logs),
    punishment:
      duplicateSalary > 0 &&
      hydratedPunishment.status === "slave" &&
      hydratedPunishment.restoreWallet !== undefined
        ? {
            ...hydratedPunishment,
            restoreWallet: Math.max(
              0,
              hydratedPunishment.restoreWallet - duplicateSalary,
            ),
          }
        : hydratedPunishment,
    benefits: hydrateBenefits(benefits, adminConfig),
    walletLedger: hydrateWalletLedger(walletLedger),
    decrees: hydrateDecrees(decrees),
    monthlyAllowances: hydrateMonthlyAllowances(monthlyAllowances),
    notifications: hydrateNotifications(notifications),
    chatMessages: hydrateChatMessages(chatMessages),
    adminConfig,
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
  localStorage.setItem(DECREES_STORAGE_KEY, JSON.stringify(state.decrees));
  localStorage.setItem(
    MONTHLY_ALLOWANCES_STORAGE_KEY,
    JSON.stringify(state.monthlyAllowances),
  );
  localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(state.notifications),
  );
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state.chatMessages));
  localStorage.setItem(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(state.adminConfig));
}

function serializeTaskSystem(state: TaskSystemState) {
  return {
    ...lastStateExtras,
    ...state.progress,
    progress: state.progress,
    punishment: state.punishment,
    punishmentStatus: state.punishment.status,
    adminConfig: state.adminConfig,
    tasks: state.tasks,
    logs: state.logs,
    benefits: state.benefits,
    walletLedger: state.walletLedger,
    decrees: state.decrees,
    monthlyAllowances: state.monthlyAllowances,
    notifications: state.notifications,
    chatMessages: state.chatMessages,
  };
}

async function loadTaskSystemSnapshotRemote(): Promise<TaskSystemSnapshot> {
  const response = await fetch(apiUrl("/api/state"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`任务状态读取失败：${response.status}`);
  }
  const payload = (await response.json()) as {
    state?: unknown;
    revision?: unknown;
  };
  return {
    state: stateFromUnknown(payload.state),
    revision:
      typeof payload.revision === "string" ? payload.revision : undefined,
  };
}

export async function loadTaskSystem(): Promise<TaskSystemState> {
  try {
    return (await loadTaskSystemSnapshotRemote()).state;
  } catch (error) {
    if (ALLOW_LOCAL_FALLBACK) return readLocalTaskSystem();
    throw error;
  }
}

export function loadTaskSystemFresh() {
  return loadTaskSystem();
}

export async function loadTaskSystemSnapshotFresh(): Promise<TaskSystemSnapshot> {
  try {
    return await loadTaskSystemSnapshotRemote();
  } catch (error) {
    if (ALLOW_LOCAL_FALLBACK) return { state: readLocalTaskSystem() };
    throw error;
  }
}

export async function saveTaskSystem(
  state: TaskSystemState,
  expectedRevision?: string,
): Promise<string | undefined> {
  try {
    return await saveTaskSystemRemote(state, expectedRevision);
  } catch (error) {
    if (ALLOW_LOCAL_FALLBACK) {
      persistLocalTaskSystem(state);
      return undefined;
    }
    throw error;
  }
}

async function saveTaskSystemRemote(
  state: TaskSystemState,
  expectedRevision?: string,
): Promise<string | undefined> {
  const response = await fetch(apiUrl("/api/state"), {
    body: JSON.stringify({
      state: serializeTaskSystem(state),
      revision: expectedRevision,
    }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  if (response.status === 409) {
    const payload = (await response.json().catch(() => ({}))) as {
      revision?: unknown;
    };
    throw new TaskSystemConflictError(
      typeof payload.revision === "string" ? payload.revision : undefined,
    );
  }
  if (!response.ok) {
    throw new Error(`任务状态保存失败：${response.status}`);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    revision?: unknown;
  };
  return typeof payload.revision === "string" ? payload.revision : undefined;
}
