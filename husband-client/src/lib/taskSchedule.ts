import type { Task, TaskTimeConfig, TaskType } from "../types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

function endOfMonth(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function taskTypeForTimeConfig(timeConfig: TaskTimeConfig): TaskType {
  if (timeConfig.type === "repeat") return "repeat";
  if (timeConfig.type === "immediate") return "urgent";
  return "custom";
}

export function resolveTaskSchedule(
  type: TaskType,
  timeConfig: TaskTimeConfig | undefined,
  now = new Date(),
) {
  if (timeConfig?.type === "repeat") {
    if (timeConfig.repeatFrequency === "weekly") {
      return {
        cycleId: weekKey(now),
        dueAt: endOfWeek(now).toISOString(),
      };
    }
    if (timeConfig.repeatFrequency === "monthly") {
      return {
        cycleId: localDateKey(endOfMonth(now)).slice(0, 7),
        dueAt: endOfMonth(now).toISOString(),
      };
    }
    if (timeConfig.repeatFrequency === "custom") {
      const due = new Date(timeConfig.deadlineAt || "");
      return Number.isNaN(due.getTime())
        ? { cycleId: undefined, dueAt: undefined }
        : { cycleId: localDateKey(now), dueAt: due.toISOString() };
    }
    return {
      cycleId: localDateKey(now),
      dueAt: endOfDay(now).toISOString(),
    };
  }

  if (timeConfig) {
    if (timeConfig.type === "custom") {
      const due = new Date(timeConfig.deadlineAt || "");
      return Number.isNaN(due.getTime())
        ? { cycleId: undefined, dueAt: undefined }
        : { cycleId: undefined, dueAt: due.toISOString() };
    }
    if (timeConfig.type === "tomorrow") {
      return { cycleId: undefined, dueAt: endOfDay(addDays(now, 1)).toISOString() };
    }
    if (timeConfig.type === "within_24h") {
      return { cycleId: undefined, dueAt: addDays(now, 1).toISOString() };
    }
    if (timeConfig.type === "within_3d") {
      return { cycleId: undefined, dueAt: addDays(now, 3).toISOString() };
    }
    if (timeConfig.type === "within_7d") {
      return { cycleId: undefined, dueAt: addDays(now, 7).toISOString() };
    }
    if (timeConfig.type === "this_week") {
      return { cycleId: undefined, dueAt: endOfWeek(now).toISOString() };
    }
    if (timeConfig.type === "this_month") {
      return { cycleId: undefined, dueAt: endOfMonth(now).toISOString() };
    }
    return { cycleId: undefined, dueAt: endOfDay(now).toISOString() };
  }

  if (type === "daily") {
    return {
      cycleId: localDateKey(now),
      dueAt: endOfDay(now).toISOString(),
    };
  }
  if (type === "weekly") {
    return {
      cycleId: weekKey(now),
      dueAt: endOfWeek(now).toISOString(),
    };
  }
  return { cycleId: undefined, dueAt: undefined };
}

export function refreshTaskCycles(tasks: Task[], now = new Date()): Task[] {
  return tasks.map((task) => {
    const cycle = resolveTaskSchedule(task.type, task.timeConfig, now);
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
