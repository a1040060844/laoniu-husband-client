import type { Task, TaskReward } from "../types/domain";

function safeCount(value: number | undefined, fallback: number) {
  const count = Math.trunc(value ?? fallback);
  return Number.isFinite(count) ? Math.max(0, count) : fallback;
}

export function rewardChipLabel(reward: TaskReward) {
  if (reward.type === "experience") return `+${safeCount(reward.value, 0)} EXP`;
  if (reward.type === "allowance") return `+${safeCount(reward.value, 0)} 零花钱`;
  if (reward.type === "level_up") {
    return `直接升级 ${Math.max(1, safeCount(reward.value, 1))} 级`;
  }
  if (reward.type === "benefit") {
    return `${reward.benefitName || reward.label || "权益"} ${Math.max(1, safeCount(reward.value, 1))} 次`;
  }
  if (reward.type === "custom") return reward.customName || reward.label || "自定义奖励";
  return "无奖励";
}

export function taskRewardChips(task: Task) {
  if (task.rewards?.length) {
    return task.rewards.map(rewardChipLabel);
  }

  const chips = [`+${task.rewardExp} EXP`];
  if (task.rewardMoney) chips.push(`+${task.rewardMoney} 零花钱`);
  if (task.rewardBenefit) chips.push(task.rewardBenefit);
  return chips;
}

export function taskRewardText(task: Task) {
  return taskRewardChips(task).join(" + ");
}

export function taskRewardExp(task: Task) {
  if (!task.rewards?.length) return task.rewardExp;
  return task.rewards
    .filter((reward) => reward.type === "experience")
    .reduce((sum, reward) => sum + safeCount(reward.value, 0), 0);
}

export function taskRewardMoney(task: Task) {
  if (!task.rewards?.length) return task.rewardMoney;
  return task.rewards
    .filter((reward) => reward.type === "allowance")
    .reduce((sum, reward) => sum + safeCount(reward.value, 0), 0);
}
