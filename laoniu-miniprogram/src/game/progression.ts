import type { Role, StoryEvent, Task, TaskReward } from "../types/domain";

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
  if (!Number.isFinite(level)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(level)));
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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
  const level = clampLevel(finiteNumber(value.level, initialProgress.level));
  const required = expRequiredForLevel(level);

  return {
    level,
    exp: Math.min(
      required,
      Math.max(0, finiteNumber(value.exp, initialProgress.exp)),
    ),
    totalExp: Math.max(0, finiteNumber(value.totalExp, initialProgress.totalExp)),
    wallet: Math.max(0, finiteNumber(value.wallet, initialProgress.wallet)),
    rewardedTaskIds: Array.isArray(value.rewardedTaskIds)
      ? value.rewardedTaskIds.filter(
          (taskId): taskId is string => typeof taskId === "string" && Boolean(taskId),
        )
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

  while (level < MAX_LEVEL && exp >= expRequiredForLevel(level)) {
    const from = roles[level];
    exp -= expRequiredForLevel(level);
    level += 1;
    const to = roles[level];
    stories.push({
      title: "职务晋升",
      text: `老妞大人对你点了点头：${reason}，从“${from.title}”升为“${to.title}”。`,
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

export function taskRewardKey(task: Task) {
  return task.cycleId ? `${task.id}:${task.cycleId}` : task.id;
}

export function settleTaskReward(
  current: GameProgress,
  task: Task,
  roles: Role[],
): ProgressResult {
  const rewardKey = taskRewardKey(task);
  if (current.rewardedTaskIds.includes(rewardKey)) {
    return { progress: current, stories: [] };
  }

  const rewards: TaskReward[] = task.rewards?.length
    ? task.rewards
    : [
        {
          id: `${task.id}-legacy-exp`,
          type: "experience",
          label: `${task.rewardExp} 经验`,
          value: task.rewardExp,
          unit: "经验",
        },
        ...(task.rewardMoney
          ? [
              {
                id: `${task.id}-legacy-money`,
                type: "allowance" as const,
                label: `${task.rewardMoney} 元`,
                value: task.rewardMoney,
                unit: "元",
              },
            ]
          : []),
        ...(task.rewardBenefit
          ? [
              {
                id: `${task.id}-legacy-benefit`,
                type: "benefit" as const,
                label: task.rewardBenefit,
                benefitName: task.rewardBenefit,
                value: 1,
                unit: "次",
              },
            ]
          : []),
      ];

  let progress = current;
  const stories: StoryEvent[] = [];
  const resultTexts: string[] = [];

  rewards.forEach((reward) => {
    if (reward.type === "experience") {
      const amount = Math.min(30, Math.max(0, Math.trunc(reward.value ?? 0)));
      const expResult = grantExperience(progress, amount, roles, `完成“${task.title}”`);
      progress = expResult.progress;
      stories.push(...expResult.stories);
      if (amount > 0) resultTexts.push(`获得 ${amount} EXP`);
      return;
    }

    if (reward.type === "allowance") {
      const amount = Math.max(0, Math.trunc(reward.value ?? 0));
      progress = { ...progress, wallet: progress.wallet + amount };
      if (amount > 0) resultTexts.push(`获得 ${amount} 元零花钱`);
      return;
    }

    if (reward.type === "level_up") {
      const amount = Math.min(1, Math.max(1, Math.trunc(reward.value ?? 1)));
      const fromLevel = progress.level;
      const level = clampLevel(progress.level + amount);
      progress = {
        ...progress,
        level,
        exp: Math.min(progress.exp, expRequiredForLevel(level)),
      };
      if (level !== fromLevel) {
        stories.push({
          title: "老妞大人直接赐予晋升",
          text: `“${task.title}”已确认，老妞大人直接赐予晋升：Lv.${String(fromLevel).padStart(2, "0")} -> Lv.${String(level).padStart(2, "0")}。`,
          tone: "upgrade",
        });
      }
      if (level > fromLevel) resultTexts.push(`直接升级 ${level - fromLevel} 级`);
      return;
    }

    if (reward.type === "benefit") {
      const name = reward.benefitName || reward.label || "权益";
      const amount = Math.max(1, Math.trunc(reward.value ?? 1));
      resultTexts.push(`获得权益奖励：${name} ${amount} 次`);
      stories.push({
        title: "权益奖励",
        text: `获得权益奖励：${name} ${amount} 次。`,
        tone: "normal",
      });
      return;
    }

    if (reward.type === "custom") {
      const name = reward.customName || reward.label || "自定义奖励";
      resultTexts.push(`获得自定义奖励：${name}`);
      stories.push({
        title: "自定义奖励",
        text: `获得自定义奖励：${name}${reward.customDescription ? `。${reward.customDescription}` : "。"}`,
        tone: "normal",
      });
    }
  });

  progress = {
    ...progress,
    rewardedTaskIds: [...progress.rewardedTaskIds, rewardKey],
  };

  const rewardStory: StoryEvent = {
    title: "奖励入账",
    text: resultTexts.length
      ? `“${task.title}”已确认，${resultTexts.join("；")}。`
      : `“${task.title}”已确认，本次无额外奖励。`,
    tone: stories.some((story) => story.tone === "upgrade") ? "upgrade" : "normal",
  };

  return {
    progress,
    stories: [
      rewardStory,
      ...stories.filter((story) => story.title !== "权益奖励" && story.title !== "自定义奖励"),
      ...stories.filter((story) => story.title === "权益奖励" || story.title === "自定义奖励"),
    ],
  };
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
