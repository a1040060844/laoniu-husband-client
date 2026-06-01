import type { Role, StoryEvent, Task } from "../types/domain";

export const MIN_LEVEL = 0;
export const MAX_LEVEL = 11;

const LEVEL_EXP_REQUIRED = 100;

export interface GameProgress {
  level: number;
  exp: number;
  totalExp: number;
  wallet: number;
  rewardedTaskIds: string[];
}

export interface ProgressResult {
  progress: GameProgress;
  stories: StoryEvent[];
}

export const initialProgress: GameProgress = {
  level: 1,
  exp: 15,
  totalExp: 286,
  wallet: 52,
  rewardedTaskIds: ["daily-water"],
};

export function clampLevel(level: number) {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(level)));
}

export function expRequiredForLevel(_level: number) {
  return LEVEL_EXP_REQUIRED;
}

export function salaryForLevel(level: number) {
  const safeLevel = clampLevel(level);
  return safeLevel === 0 ? 100 : 280 + (safeLevel - 1) * 20;
}

export function hydrateProgress(raw: unknown): GameProgress {
  if (!raw || typeof raw !== "object") return initialProgress;
  const value = raw as Partial<GameProgress>;
  const level = clampLevel(Number(value.level ?? initialProgress.level));
  const required = expRequiredForLevel(level);

  return {
    level,
    exp: Math.min(
      required,
      Math.max(0, Number(value.exp ?? initialProgress.exp)),
    ),
    totalExp: Math.max(0, Number(value.totalExp ?? initialProgress.totalExp)),
    wallet: Math.max(0, Number(value.wallet ?? initialProgress.wallet)),
    rewardedTaskIds: Array.isArray(value.rewardedTaskIds)
      ? value.rewardedTaskIds.filter(Boolean)
      : [],
  };
}

export function roleWithProgress(role: Role, progress: GameProgress): Role {
  const isMaxLevel = progress.level >= MAX_LEVEL;
  return {
    ...role,
    salary: salaryForLevel(role.level),
    expCurrent:
      role.level === progress.level
        ? isMaxLevel
          ? expRequiredForLevel(role.level)
          : progress.exp
        : 0,
    expRequired: expRequiredForLevel(role.level),
  };
}

export function grantExperience(
  current: GameProgress,
  amount: number,
  roles: Role[],
  reason: string,
): ProgressResult {
  const safeAmount = Math.trunc(amount);
  if (safeAmount <= 0) {
    return { progress: current, stories: [] };
  }

  let level = clampLevel(current.level);
  let exp = Math.max(0, current.exp) + safeAmount;
  const stories: StoryEvent[] = [];

  if (level < MAX_LEVEL && exp >= expRequiredForLevel(level)) {
    const from = roles[level];
    level += 1;
    exp = 0;
    const to = roles[level];
    stories.push({
      title: "职务晋升",
      text: `老妞大人对你点了点头：${reason}，从「${from.title}」升为「${to.title}」。`,
      tone: "upgrade",
    });
  }

  if (level >= MAX_LEVEL) {
    exp = Math.min(expRequiredForLevel(MAX_LEVEL), exp);
  }

  return {
    progress: {
      ...current,
      level,
      exp,
      totalExp: current.totalExp + safeAmount,
    },
    stories,
  };
}

export function settleTaskReward(
  current: GameProgress,
  task: Task,
  roles: Role[],
): ProgressResult {
  if (current.rewardedTaskIds.includes(task.id)) {
    return { progress: current, stories: [] };
  }

  const expResult = grantExperience(
    current,
    task.rewardExp,
    roles,
    `完成「${task.title}」`,
  );
  const progress = {
    ...expResult.progress,
    wallet: expResult.progress.wallet + task.rewardMoney,
    rewardedTaskIds: [...expResult.progress.rewardedTaskIds, task.id],
  };

  const rewardStory: StoryEvent = {
    title: "奖励入账",
    text: `「${task.title}」已确认，获得 ${task.rewardExp} EXP${task.rewardMoney ? ` 和 ¥${task.rewardMoney} 零花钱` : ""}。`,
    tone: expResult.stories.length ? "upgrade" : "normal",
  };

  return { progress, stories: [rewardStory, ...expResult.stories] };
}

export function settleConfirmedTasks(
  current: GameProgress,
  tasks: Task[],
  roles: Role[],
): ProgressResult {
  return tasks
    .filter(
      (task) => task.status === "confirmed" || task.status === "completed",
    )
    .reduce<ProgressResult>(
      (result, task) => {
        const settled = settleTaskReward(result.progress, task, roles);
        return {
          progress: settled.progress,
          stories: [...result.stories, ...settled.stories],
        };
      },
      { progress: current, stories: [] },
    );
}
