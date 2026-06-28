import type { EventLog, Task, WalletLedgerEntry } from "../types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AnomalyCategory =
  | "no_task_completed"
  | "task_timeout"
  | "no_experience"
  | "no_level_up";

export interface ActiveAnomaly {
  category: AnomalyCategory;
  createdAt: string;
  description: string;
  key: string;
  severity: number;
  title: string;
}

function timeValue(value?: string) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function latestTime(values: Array<string | undefined>) {
  return values.reduce<number | null>((latest, value) => {
    const time = timeValue(value);
    if (time === null) return latest;
    return latest === null ? time : Math.max(latest, time);
  }, null);
}

function earliestTime(values: Array<string | undefined>) {
  return values.reduce<number | null>((earliest, value) => {
    const time = timeValue(value);
    if (time === null) return earliest;
    return earliest === null ? time : Math.min(earliest, time);
  }, null);
}

function daysSince(start: number, now: number) {
  return Math.max(0, Math.floor((now - start) / DAY_MS));
}

function addDays(start: number, days: number) {
  return new Date(start + days * DAY_MS).toISOString();
}

function addMonths(start: number, months: number) {
  const date = new Date(start);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

function monthCount(start: number, now: number) {
  const startDate = new Date(start);
  const nowDate = new Date(now);
  let months =
    (nowDate.getFullYear() - startDate.getFullYear()) * 12 +
    nowDate.getMonth() -
    startDate.getMonth();
  if (nowDate.getDate() < startDate.getDate()) months -= 1;
  return Math.max(0, months);
}

function weekText(weeks: number) {
  if (weeks === 1) return "7天";
  if (weeks === 2) return "两周";
  return `${weeks}周`;
}

function activityStart(
  tasks: Task[],
  logs: EventLog[],
  walletLedger: WalletLedgerEntry[],
) {
  return earliestTime([
    ...tasks.map((task) => task.createdAt ?? task.submittedAt ?? task.confirmedAt),
    ...logs.map((log) => log.createdAt),
    ...walletLedger.map((entry) => entry.createdAt),
  ]);
}

function lastTaskCompletedAt(tasks: Task[]) {
  return latestTime(
    tasks
      .filter((task) => task.status === "confirmed" || task.status === "completed")
      .map((task) => task.rewardedAt ?? task.confirmedAt ?? task.submittedAt),
  );
}

function noTaskCompletedAnomaly(tasks: Task[], now: number): ActiveAnomaly | null {
  if (!tasks.length) return null;
  const firstTaskAt = earliestTime(tasks.map((task) => task.createdAt ?? task.dueAt));
  const lastCompletedAt = lastTaskCompletedAt(tasks);
  const since = lastCompletedAt ?? firstTaskAt;
  if (since === null) return null;
  const days = daysSince(since, now);
  if (days < 3) return null;
  const severity = days >= 7 ? days : days >= 5 ? 5 : 3;
  return {
    category: "no_task_completed",
    createdAt: addDays(since, severity),
    description: `老哥已经 ${severity} 天没有完成任务，需要老妞大人留意。`,
    key: `no-task-completed:${severity}`,
    severity,
    title: `老哥${severity}天没有完成任务了`,
  };
}

function taskTimeoutAnomalies(tasks: Task[], now: number): ActiveAnomaly[] {
  return tasks
    .filter((task) => {
      if (task.status === "expired" || task.status === "failed_pending") {
        return true;
      }
      const dueAt = timeValue(task.dueAt);
      return (
        dueAt !== null &&
        dueAt < now &&
        (task.status === "todo" || task.status === "doing")
      );
    })
    .map((task) => {
      const occurredAt =
        timeValue(task.expiredAt) ?? timeValue(task.dueAt) ?? timeValue(task.createdAt) ?? now;
      const overdueDays = Math.max(1, daysSince(occurredAt, now) + 1);
      return {
        category: "task_timeout" as const,
        createdAt: new Date(occurredAt).toISOString(),
        description: `任务「${task.title}」已经超时，等待老妞大人查看。`,
        key: `task-timeout:${task.id}`,
        severity: overdueDays,
        title: `任务超时：${task.title}`,
      };
    });
}

function noExperienceAnomaly(
  tasks: Task[],
  logs: EventLog[],
  walletLedger: WalletLedgerEntry[],
  now: number,
): ActiveAnomaly | null {
  const lastExpAt = latestTime(
    walletLedger
      .filter((entry) => entry.unit === "EXP" && entry.amount > 0)
      .map((entry) => entry.createdAt),
  );
  const since = lastExpAt ?? activityStart(tasks, logs, walletLedger);
  if (since === null) return null;
  const weeks = Math.floor(daysSince(since, now) / 7);
  if (weeks < 1) return null;
  const severity = weeks * 7;
  return {
    category: "no_experience",
    createdAt: addDays(since, severity),
    description: `老哥已经 ${weekText(weeks)} 没有获得经验值。`,
    key: `no-experience:${severity}`,
    severity,
    title: `老哥${weekText(weeks)}没有获得经验值了`,
  };
}

function noLevelUpAnomaly(logs: EventLog[], activityAt: number | null, now: number) {
  const lastLevelUpAt = latestTime(
    logs
      .filter(
        (log) =>
          log.type === "level_changed" &&
          typeof log.fromLevel === "number" &&
          typeof log.toLevel === "number" &&
          log.toLevel > log.fromLevel,
      )
      .map((log) => log.createdAt),
  );
  const since = lastLevelUpAt ?? activityAt;
  if (since === null) return null;
  const months = monthCount(since, now);
  if (months < 1) return null;
  return {
    category: "no_level_up" as const,
    createdAt: addMonths(since, months),
    description: `老哥已经 ${months} 个月没有升级。`,
    key: `no-level-up:${months}`,
    severity: months,
    title: `老哥${months}个月没有升级了`,
  };
}

export function calculateActiveAnomalies({
  logs,
  now = new Date(),
  tasks,
  walletLedger,
}: {
  logs: EventLog[];
  now?: Date;
  tasks: Task[];
  walletLedger: WalletLedgerEntry[];
}) {
  const nowMs = now.getTime();
  const activityAt = activityStart(tasks, logs, walletLedger);
  const anomalies = [
    noTaskCompletedAnomaly(tasks, nowMs),
    ...taskTimeoutAnomalies(tasks, nowMs),
    noExperienceAnomaly(tasks, logs, walletLedger, nowMs),
    noLevelUpAnomaly(logs, activityAt, nowMs),
  ].filter((anomaly): anomaly is ActiveAnomaly => Boolean(anomaly));

  return anomalies.sort((a, b) => {
    if (a.category === "task_timeout" && b.category === "task_timeout") {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (a.category === "task_timeout") return -1;
    if (b.category === "task_timeout") return 1;
    return b.severity - a.severity;
  });
}
