import assert from "node:assert/strict";
import test from "node:test";

import {
  clampLevel,
  grantExperience,
  hydrateProgress,
  settleTaskReward,
  type GameProgress,
} from "../src/game/progression.ts";
import {
  refreshTaskCycles,
  resolveTaskSchedule,
  taskTypeForTimeConfig,
} from "../src/lib/taskSchedule.ts";
import type { Role, Task, TaskTimeConfig } from "../src/types/domain.ts";

const roles: Role[] = Array.from({ length: 12 }, (_, level) => ({
  level,
  title: `等级${level}`,
  salary: 0,
  expCurrent: 0,
  expRequired: 100,
  biography: "测试",
  roleImage: "",
  benefitImage: "",
}));

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "测试任务",
    description: "测试",
    type: "custom",
    source: "wife",
    rewardExp: 10,
    rewardMoney: 0,
    deadline: "测试期限",
    status: "todo",
    ...overrides,
  };
}

test("hydrateProgress rejects invalid persisted numbers", () => {
  assert.equal(clampLevel(Number.NaN), 0);
  assert.deepEqual(
    hydrateProgress({
      level: "broken",
      exp: Number.NaN,
      totalExp: Infinity,
      wallet: "not-a-number",
      rewardedTaskIds: ["valid", 12, null, ""],
    }),
    {
      level: 1,
      exp: 15,
      totalExp: 286,
      wallet: 52,
      rewardedTaskIds: ["valid"],
    },
  );
});

test("experience can cross multiple levels and stops at max level", () => {
  const current: GameProgress = {
    level: 1,
    exp: 90,
    totalExp: 90,
    wallet: 0,
    rewardedTaskIds: [],
  };
  const result = grantExperience(current, 250, roles, "测试升级");
  assert.equal(result.progress.level, 4);
  assert.equal(result.progress.exp, 40);
  assert.equal(result.progress.totalExp, 340);
  assert.equal(result.stories.length, 3);
});

test("task rewards are settled only once per task cycle", () => {
  const current: GameProgress = {
    level: 1,
    exp: 0,
    totalExp: 0,
    wallet: 0,
    rewardedTaskIds: [],
  };
  const completed = task({
    cycleId: "2026-06-15",
    status: "confirmed",
    rewards: [
      { id: "exp", type: "experience", label: "10经验", value: 10 },
      { id: "money", type: "allowance", label: "5元", value: 5 },
    ],
  });
  const first = settleTaskReward(current, completed, roles);
  const second = settleTaskReward(first.progress, completed, roles);
  assert.equal(first.progress.exp, 10);
  assert.equal(first.progress.wallet, 5);
  assert.deepEqual(second.progress, first.progress);
  assert.deepEqual(second.stories, []);
});

test("one-off deadline choices produce their real deadlines without cycles", () => {
  const now = new Date(2026, 5, 15, 10, 30, 0, 0);
  const tomorrow: TaskTimeConfig = { type: "tomorrow", label: "明日" };
  const withinSevenDays: TaskTimeConfig = { type: "within_7d", label: "7天内" };

  const tomorrowSchedule = resolveTaskSchedule("custom", tomorrow, now);
  const sevenDaySchedule = resolveTaskSchedule("custom", withinSevenDays, now);

  assert.equal(tomorrowSchedule.cycleId, undefined);
  assert.equal(new Date(tomorrowSchedule.dueAt!).getDate(), 16);
  assert.equal(new Date(tomorrowSchedule.dueAt!).getHours(), 23);
  assert.equal(
    new Date(sevenDaySchedule.dueAt!).getTime() - now.getTime(),
    7 * 24 * 60 * 60 * 1000,
  );
  assert.equal(taskTypeForTimeConfig(tomorrow), "custom");
});

test("only explicitly repeating tasks reopen in a new cycle", () => {
  const now = new Date(2026, 5, 16, 9, 0, 0, 0);
  const repeated = task({
    type: "repeat",
    timeConfig: {
      type: "repeat",
      label: "每天 1 次",
      repeatFrequency: "daily",
      repeatCount: 1,
    },
    cycleId: "2026-06-15",
    dueAt: new Date(2026, 5, 15, 23, 59, 59, 999).toISOString(),
    status: "confirmed",
    rewardedAt: new Date(2026, 5, 15, 12).toISOString(),
  });
  const oneOff = task({
    id: "one-off",
    timeConfig: { type: "within_7d", label: "7天内" },
    status: "confirmed",
  });

  const [nextRepeated, sameOneOff] = refreshTaskCycles([repeated, oneOff], now);
  assert.equal(nextRepeated.status, "todo");
  assert.equal(nextRepeated.cycleId, "2026-06-16");
  assert.equal(nextRepeated.rewardedAt, undefined);
  assert.equal(sameOneOff.status, "confirmed");
  assert.equal(sameOneOff.cycleId, undefined);
});

test("open tasks become pending failures after their deadline", () => {
  const now = new Date(2026, 5, 16, 9, 0, 0, 0);
  const expired = task({
    dueAt: new Date(2026, 5, 16, 8, 59, 0, 0).toISOString(),
    status: "doing",
  });
  const [result] = refreshTaskCycles([expired], now);
  assert.equal(result.status, "failed_pending");
  assert.equal(result.expiredAt, now.toISOString());
});
