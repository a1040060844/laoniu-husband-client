import type {
  EventLog,
  MonthlyAllowanceRecord,
  MonthlyAllowanceStatus,
  Role,
  Task,
} from "../types/domain";

const env = (
  import.meta as ImportMeta & {
    env?: { VITE_ALIPAY_QR_IMAGE?: string; VITE_ALIPAY_RECEIVE_URL?: string };
  }
).env;

export const ALIPAY_RECEIVE_URL = env?.VITE_ALIPAY_RECEIVE_URL || "";
export const ALIPAY_QR_IMAGE = env?.VITE_ALIPAY_QR_IMAGE || "";

export function monthKeyForDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function previousMonthKey(date = new Date()) {
  return monthKeyForDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function nextMonthKey(date = new Date()) {
  return monthKeyForDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

export function previousMonthKeyForAllowanceMonth(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return previousMonthKey();
  }
  return monthKeyForDate(new Date(year, monthIndex - 1, 1));
}

function monthBounds(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }
  return {
    end: new Date(year, monthIndex + 1, 1).getTime(),
    start: new Date(year, monthIndex, 1).getTime(),
  };
}

function clampRoleLevel(level: number, roles: Role[]) {
  return Math.min(Math.max(0, Math.trunc(level)), Math.max(0, roles.length - 1));
}

export function roleAtEndOfMonth({
  currentLevel,
  logs,
  month,
  roles,
}: {
  currentLevel: number;
  logs: EventLog[];
  month: string;
  roles: Role[];
}) {
  const bounds = monthBounds(month);
  let level = clampRoleLevel(currentLevel, roles);
  if (!bounds) return roles[level] ?? roles[0];

  const cutoff = bounds.end - 1;
  logs
    .filter((log) => log.type === "level_changed")
    .filter((log) => Date.parse(log.createdAt) > cutoff)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .forEach((log) => {
      if (typeof log.fromLevel === "number") {
        level = clampRoleLevel(log.fromLevel, roles);
      }
    });

  return roles[level] ?? roles[0];
}

function taskMoneyReward(task: Task) {
  if (task.rewards?.length) {
    return task.rewards
      .filter((reward) => reward.type === "allowance")
      .reduce(
        (sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)),
        0,
      );
  }
  return Math.max(0, Math.trunc(task.rewardMoney ?? 0));
}

export function taskSettledInMonth(task: Task, month: string) {
  const bounds = monthBounds(month);
  const settledAt = task.rewardedAt ?? task.confirmedAt;
  if (!bounds || !settledAt) return false;
  if (task.status !== "confirmed" && task.status !== "completed") return false;
  const settledAtMs = Date.parse(settledAt);
  return (
    Number.isFinite(settledAtMs) &&
    settledAtMs >= bounds.start &&
    settledAtMs < bounds.end
  );
}

export function monthlyTaskBonus(tasks: Task[], settlementMonth: string) {
  const completedTasks = tasks.filter((task) =>
    taskSettledInMonth(task, settlementMonth),
  );
  return {
    completedTaskCount: completedTasks.length,
    taskBonus: completedTasks.reduce(
      (sum, task) => sum + taskMoneyReward(task),
      0,
    ),
  };
}

export function allowanceTotal(
  baseSalary: number,
  taskBonus: number,
  wifeAdjustmentAmount: number,
) {
  return Math.max(
    0,
    Math.trunc(baseSalary) + Math.trunc(taskBonus) + Math.trunc(wifeAdjustmentAmount),
  );
}

export function createMonthlyAllowanceRecord({
  month = monthKeyForDate(),
  role,
  tasks,
  wifeAdjustmentAmount = 0,
}: {
  month?: string;
  now?: Date;
  role: Role;
  tasks: Task[];
  wifeAdjustmentAmount?: number;
}): MonthlyAllowanceRecord {
  const settlementMonth = previousMonthKeyForAllowanceMonth(month);
  const { completedTaskCount, taskBonus } = monthlyTaskBonus(
    tasks,
    settlementMonth,
  );
  const baseSalary = Math.max(0, Math.trunc(role.salary));
  const adjustment = Math.trunc(wifeAdjustmentAmount);

  return {
    id: `allowance-${month}`,
    month,
    settlementMonth,
    status: "PENDING_WIFE_ACTION",
    roleLevel: role.level,
    roleTitle: role.title,
    baseSalary,
    completedTaskCount,
    taskBonus,
    wifeAdjustmentAmount: adjustment,
    totalAmount: allowanceTotal(baseSalary, taskBonus, adjustment),
    retryCount: 0,
  };
}

export function refreshMonthlyAllowanceRecord(
  record: MonthlyAllowanceRecord,
  role: Role,
  tasks: Task[],
) {
  const { completedTaskCount, taskBonus } = monthlyTaskBonus(
    tasks,
    record.settlementMonth,
  );
  const baseSalary = Math.max(0, Math.trunc(role.salary));
  return {
    ...record,
    roleLevel: role.level,
    roleTitle: role.title,
    baseSalary,
    completedTaskCount,
    taskBonus,
    totalAmount: allowanceTotal(
      baseSalary,
      taskBonus,
      record.wifeAdjustmentAmount,
    ),
  };
}

export function updateMonthlyAllowanceStatus(
  record: MonthlyAllowanceRecord,
  status: MonthlyAllowanceStatus,
  at = new Date().toISOString(),
) {
  return {
    ...record,
    status,
    ...(status === "PAID_CONFIRMED_BY_WIFE" ? { wifeConfirmedAt: at } : {}),
    ...(status === "RECEIVED_BY_HUSBAND" ? { husbandReceivedAt: at } : {}),
    ...(status === "HUSBAND_REPORTED_NOT_RECEIVED"
      ? { husbandReportedAt: at }
      : {}),
    ...(status === "CANCELLED_BY_WIFE" ? { cancelledAt: at } : {}),
    ...(status === "REBUKED_AS_BLIND" ? { rebukedAt: at } : {}),
  };
}

const monthlyAllowanceStatusRank: Record<MonthlyAllowanceStatus, number> = {
  PENDING_WIFE_ACTION: 0,
  PAYING: 1,
  RETRY_PAYING: 2,
  WAITING_WIFE_CONFIRM: 3,
  PAID_CONFIRMED_BY_WIFE: 4,
  HUSBAND_REPORTED_NOT_RECEIVED: 5,
  REBUKED_AS_BLIND: 6,
  CANCELLED_BY_WIFE: 6,
  RECEIVED_BY_HUSBAND: 7,
};

function latestRecordTime(record: MonthlyAllowanceRecord) {
  return Math.max(
    0,
    ...[
      record.wifeConfirmedAt,
      record.husbandReportedAt,
      record.rebukedAt,
      record.cancelledAt,
      record.husbandReceivedAt,
      record.creditedAt,
    ].map((value) => {
      const time = value ? Date.parse(value) : 0;
      return Number.isFinite(time) ? time : 0;
    }),
  );
}

function preferMonthlyAllowanceRecord(
  first: MonthlyAllowanceRecord,
  second: MonthlyAllowanceRecord,
) {
  if (first.retryCount !== second.retryCount) {
    return first.retryCount > second.retryCount ? first : second;
  }
  const firstRank = monthlyAllowanceStatusRank[first.status];
  const secondRank = monthlyAllowanceStatusRank[second.status];
  if (firstRank !== secondRank) {
    return firstRank > secondRank ? first : second;
  }
  return latestRecordTime(first) >= latestRecordTime(second) ? first : second;
}

function mergeMonthlyAllowanceRecord(
  first: MonthlyAllowanceRecord,
  second: MonthlyAllowanceRecord,
) {
  const preferred = preferMonthlyAllowanceRecord(first, second);
  const other = preferred === first ? second : first;
  const wifeAdjustmentAmount = preferred.wifeAdjustmentAmount;
  const baseSalary = preferred.baseSalary;
  const taskBonus = preferred.taskBonus;

  return {
    ...preferred,
    baseSalary,
    completedTaskCount: preferred.completedTaskCount,
    creditedAt: preferred.creditedAt ?? other.creditedAt,
    husbandReceivedAt: preferred.husbandReceivedAt ?? other.husbandReceivedAt,
    husbandReportedAt: preferred.husbandReportedAt ?? other.husbandReportedAt,
    wifeConfirmedAt: preferred.wifeConfirmedAt ?? other.wifeConfirmedAt,
    cancelledAt: preferred.cancelledAt ?? other.cancelledAt,
    rebukedAt: preferred.rebukedAt ?? other.rebukedAt,
    retryCount: Math.max(preferred.retryCount, other.retryCount),
    taskBonus,
    totalAmount: allowanceTotal(baseSalary, taskBonus, wifeAdjustmentAmount),
    wifeAdjustmentAmount,
  };
}

export function mergeMonthlyAllowanceRecords(
  firstRecords: MonthlyAllowanceRecord[],
  secondRecords: MonthlyAllowanceRecord[],
) {
  const merged = new Map<string, MonthlyAllowanceRecord>();
  firstRecords.forEach((record) => merged.set(record.id, record));
  secondRecords.forEach((record) => {
    const existing = merged.get(record.id);
    merged.set(
      record.id,
      existing ? mergeMonthlyAllowanceRecord(existing, record) : record,
    );
  });
  return [...merged.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export function openAlipayReceivePage() {
  if (!ALIPAY_RECEIVE_URL) return false;
  window.location.href = ALIPAY_RECEIVE_URL;
  return true;
}
