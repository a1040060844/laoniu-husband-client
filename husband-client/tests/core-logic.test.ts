import assert from "node:assert/strict";
import test from "node:test";

import {
  clampLevel,
  expRequiredForLevel,
  grantExperience,
  hydrateProgress,
  progressWithLevelRule,
  settleTaskReward,
  type GameProgress,
} from "../src/game/progression.ts";
import {
  refreshTaskCycles,
  resolveTaskSchedule,
  taskTypeForTimeConfig,
} from "../src/lib/taskSchedule.ts";
import {
  isTaskCompleteStatus,
  isTaskSubmittableStatus,
  taskStatusAfterApproval,
} from "../src/lib/taskStatus.ts";
import {
  eventLogRecordLabel,
  walletLedgerRecordLabel,
} from "../src/lib/recordLabels.ts";
import { calculateActiveAnomalies } from "../src/lib/anomalyRules.ts";
import { mergeChatMessages } from "../src/lib/chatMessages.ts";
import {
  aggregatePendingExperienceDecrees,
  decreeAcknowledgeIds,
  pendingWifeRoleUpgradeDecrees,
} from "../src/lib/decreeQueue.ts";
import { benefitForLevel, benefits } from "../src/data/benefits.ts";
import {
  createMonthlyAllowanceRecord,
  mergeMonthlyAllowanceRecords,
  roleAtEndOfMonth,
  updateMonthlyAllowanceStatus,
} from "../src/lib/monthlyAllowance.ts";
import {
  buildNotificationQueue,
  createNotification,
  markNotificationSkipped,
  markNotificationViewed,
} from "../src/lib/notifications.ts";
import { wifeHomeIllustrationTransitionForLevelChange } from "../src/data/wifeIllustrations.ts";
import type {
  DecreeEvent,
  ChatMessage,
  NotificationEvent,
  Role,
  Task,
  TaskTimeConfig,
} from "../src/types/domain.ts";

const roles: Role[] = Array.from({ length: 12 }, (_, level) => ({
  level,
  title: `等级${level}`,
  salary: 0,
  expCurrent: 0,
  expRequired: expRequiredForLevel(level),
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

function decree(overrides: Partial<DecreeEvent>): DecreeEvent {
  return {
    id: "decree-1",
    type: "task_created",
    title: "Task",
    text: "Task",
    tone: "normal",
    createdAt: new Date(0).toISOString(),
    target: "husband",
    payload: {},
    ...overrides,
  };
}

function chat(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "chat-1",
    sender: "husband",
    text: "hello",
    createdAt: "2026-06-26T00:00:00.000Z",
    readBy: ["husband"],
    ...overrides,
  };
}

test("record prefixes describe the actual wallet, experience, level, and slave changes", () => {
  assert.equal(walletLedgerRecordLabel({ amount: 10, unit: "CNY" }), "钱包流水");
  assert.equal(walletLedgerRecordLabel({ amount: 10, unit: "EXP" }), "经验变化");
  assert.equal(walletLedgerRecordLabel({ amount: 1, unit: "LEVEL" }), "等级提升");
  assert.equal(walletLedgerRecordLabel({ amount: -1, unit: "LEVEL" }), "等级降低");
  assert.equal(
    eventLogRecordLabel({
      id: "slave",
      type: "punishment_status_changed",
      title: "卖身奴隶状态",
      createdAt: new Date(0).toISOString(),
      fromStatus: "normal",
      toStatus: "slave",
    }),
    "卖身奴隶",
  );
});

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

test("level experience requirements start at 500 and grow by 500", () => {
  assert.equal(expRequiredForLevel(0), 500);
  assert.equal(expRequiredForLevel(1), 500);
  assert.equal(expRequiredForLevel(2), 1000);
  assert.equal(expRequiredForLevel(3), 1500);
});

test("pending wife experience changes are merged into one husband popup", () => {
  const pending = aggregatePendingExperienceDecrees([
    decree({ id: "task", type: "task_created", createdAt: "2026-06-26T00:00:00.000Z" }),
    decree({
      id: "exp-1",
      type: "experience_granted",
      title: "Grant",
      text: "Grant",
      tone: "upgrade",
      createdAt: "2026-06-26T00:01:00.000Z",
      payload: { amount: 10 },
    }),
    decree({
      id: "exp-2",
      type: "experience_granted",
      title: "Grant",
      text: "Grant",
      tone: "upgrade",
      createdAt: "2026-06-26T00:02:00.000Z",
      payload: { amount: 10 },
    }),
    decree({
      id: "penalty",
      type: "experience_penalty",
      title: "Penalty",
      text: "Penalty",
      tone: "down",
      createdAt: "2026-06-26T00:03:00.000Z",
      payload: { amount: -5 },
    }),
  ]);

  assert.equal(pending.length, 2);
  assert.equal(pending[1].type, "experience_granted");
  assert.equal(pending[1].payload.amount, 15);
  assert.deepEqual(decreeAcknowledgeIds(pending[1]), ["exp-1", "exp-2", "penalty"]);
});

test("wife-target decrees do not enter the husband popup queue", () => {
  const decrees = [
    decree({
      id: "wife-upgrade",
      type: "level_changed",
      target: "wife",
      tone: "upgrade",
      payload: { fromLevel: 1, toLevel: 2 },
    }),
    decree({
      id: "husband-exp",
      type: "experience_granted",
      tone: "upgrade",
      payload: { amount: 8 },
    }),
  ];
  const husbandPending = aggregatePendingExperienceDecrees(
    decrees.filter((item) => item.target === "husband"),
  );

  assert.equal(husbandPending.length, 1);
  assert.equal(husbandPending[0].id, "husband-exp");
});

test("wife role upgrade queue includes only unacknowledged upgrades", () => {
  const pending = pendingWifeRoleUpgradeDecrees([
    decree({
      id: "wife-up",
      type: "level_changed",
      target: "wife",
      tone: "upgrade",
      createdAt: "2026-06-26T00:02:00.000Z",
      payload: { fromLevel: 1, toLevel: 2 },
    }),
    decree({
      id: "wife-down",
      type: "level_changed",
      target: "wife",
      tone: "down",
      createdAt: "2026-06-26T00:01:00.000Z",
      payload: { fromLevel: 2, toLevel: 1 },
    }),
    decree({
      id: "wife-acknowledged",
      type: "level_changed",
      target: "wife",
      tone: "upgrade",
      acknowledgedAt: "2026-06-26T00:03:00.000Z",
      payload: { fromLevel: 2, toLevel: 3 },
    }),
    decree({
      id: "husband-up",
      type: "level_changed",
      tone: "upgrade",
      payload: { fromLevel: 1, toLevel: 2 },
    }),
  ]);

  assert.deepEqual(
    pending.map((item) => item.id),
    ["wife-up"],
  );
});

test("wife home illustration transition only appears across illustration ranges", () => {
  assert.deepEqual(wifeHomeIllustrationTransitionForLevelChange(4, 5), {
    fromHomePath: "/assets/wife/wife-home-level-03-04.png",
    toHomePath: "/assets/wife/wife-home-level-05-06.png",
  });

  assert.equal(wifeHomeIllustrationTransitionForLevelChange(3, 4), null);
  assert.equal(wifeHomeIllustrationTransitionForLevelChange(5, 4), null);
  assert.equal(wifeHomeIllustrationTransitionForLevelChange(2, 3), null);
});

test("benefit copy and frequency follow the current role level", () => {
  const takeout = benefits.find((benefit) => benefit.id === "takeout")!;
  const feast = benefits.find((benefit) => benefit.id === "feast")!;
  const cos = benefits.find((benefit) => benefit.id === "cos")!;
  const lovePlus = benefits.find((benefit) => benefit.id === "love-plus")!;

  assert.equal(benefitForLevel(takeout, 9).frequency, "2周1次");
  assert.equal(benefitForLevel(takeout, 10).frequency, "周1次");
  assert.equal(benefitForLevel(feast, 3).frequency, "月1次");
  assert.equal(benefitForLevel(feast, 4).frequency, "2周1次");
  assert.equal(benefitForLevel(feast, 10).frequency, "周1次");
  assert.equal(benefitForLevel(cos, 8).name, "cos一下");
  assert.equal(benefitForLevel(cos, 9).name, "cos时刻");
  assert.match(benefitForLevel(lovePlus, 10).description, /不能和恩爱奖励叠加使用/);
  assert.match(benefitForLevel(lovePlus, 11).description, /可以和恩爱奖励叠加使用/);
});

test("notification queue orders unread notices by creation time", () => {
  const notifications: NotificationEvent[] = [
    createNotification({
      target: "husband",
      source: "story",
      sourceId: "late",
      title: "Late",
      text: "Late",
      createdAt: "2026-06-26T00:02:00.000Z",
    }),
    createNotification({
      target: "husband",
      source: "story",
      sourceId: "early",
      title: "Early",
      text: "Early",
      createdAt: "2026-06-26T00:01:00.000Z",
    }),
  ];

  const queue = buildNotificationQueue({
    decrees: [],
    notifications,
    target: "husband",
  });

  assert.deepEqual(
    queue.map((item) => item.title),
    ["Early", "Late"],
  );
  assert.equal(queue[0].remainingCount, 1);
});

test("skipping a notification keeps it in the unread queue", () => {
  const [notification] = [
    createNotification({
      target: "wife",
      source: "story",
      sourceId: "skipped",
      title: "Skipped",
      text: "Skipped",
    }),
  ];
  const skipped = markNotificationSkipped([notification], notification.id);

  const queue = buildNotificationQueue({
    decrees: [],
    notifications: skipped,
    target: "wife",
  });

  assert.equal(queue.length, 1);
  assert.equal(queue[0].title, "Skipped");
});

test("viewing a notification removes it from the unread queue", () => {
  const notification = createNotification({
    target: "husband",
    source: "monthly_allowance",
    sourceId: "paid",
    title: "Paid",
    text: "Paid",
  });
  const viewed = markNotificationViewed([notification], notification.id);

  const queue = buildNotificationQueue({
    decrees: [],
    notifications: viewed,
    target: "husband",
  });

  assert.equal(queue.length, 0);
});

test("acknowledged decrees do not appear in the notification queue", () => {
  const queue = buildNotificationQueue({
    decrees: [
      decree({
        id: "ack",
        type: "task_created",
        acknowledgedAt: "2026-06-26T00:02:00.000Z",
      }),
    ],
    notifications: [],
    target: "husband",
  });

  assert.equal(queue.length, 0);
});

test("notification queue only includes the selected target side", () => {
  const notifications = [
    createNotification({
      target: "husband",
      source: "story",
      sourceId: "husband-only",
      title: "Husband",
      text: "Husband",
    }),
    createNotification({
      target: "wife",
      source: "story",
      sourceId: "wife-only",
      title: "Wife",
      text: "Wife",
    }),
  ];

  const husbandQueue = buildNotificationQueue({
    decrees: [],
    notifications,
    target: "husband",
  });
  const wifeQueue = buildNotificationQueue({
    decrees: [],
    notifications,
    target: "wife",
  });

  assert.deepEqual(husbandQueue.map((item) => item.title), ["Husband"]);
  assert.deepEqual(wifeQueue.map((item) => item.title), ["Wife"]);
});

test("experience resets to zero when a grant upgrades the role", () => {
  const current: GameProgress = {
    level: 1,
    exp: 490,
    totalExp: 490,
    wallet: 0,
    rewardedTaskIds: [],
  };
  const result = grantExperience(current, 20, roles, "测试升级");
  assert.equal(result.progress.level, 2);
  assert.equal(result.progress.exp, 0);
  assert.equal(result.progress.totalExp, 510);
  assert.equal(result.stories.length, 1);
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
  assert.equal(first.progress.wallet, 0);
  assert.deepEqual(second.progress, first.progress);
  assert.deepEqual(second.stories, []);
});

test("approved final task archives as completed and cannot be resubmitted", () => {
  assert.equal(taskStatusAfterApproval(1, 1), "completed");
  assert.equal(taskStatusAfterApproval(1, 2), "doing");
  assert.equal(isTaskCompleteStatus("completed"), true);
  assert.equal(isTaskCompleteStatus("confirmed"), true);
  assert.equal(isTaskSubmittableStatus("completed"), false);
  assert.equal(isTaskSubmittableStatus("confirmed"), false);
  assert.equal(isTaskSubmittableStatus("doing"), true);
});

test("chat merge syncs messages and read receipts from both clients", () => {
  const merged = mergeChatMessages(
    [
      chat({
        id: "shared",
        sender: "husband",
        readBy: ["husband"],
      }),
    ],
    [
      chat({
        id: "shared",
        sender: "husband",
        readBy: ["wife"],
      }),
      chat({
        id: "wife-reply",
        sender: "wife",
        text: "reply",
        readBy: ["wife"],
        createdAt: "2026-06-26T00:01:00.000Z",
      }),
    ],
  );

  assert.deepEqual(
    merged.find((message) => message.id === "shared")?.readBy.sort(),
    ["husband", "wife"],
  );
  assert.equal(merged.some((message) => message.id === "wife-reply"), true);
});

test("monthly allowance records settle the previous calendar month", () => {
  const role = { ...roles[3], salary: 40, title: "测试职务" };
  const record = createMonthlyAllowanceRecord({
    month: "2026-07",
    now: new Date(2026, 5, 20, 9, 0, 0, 0),
    role,
    tasks: [
      task({
        id: "june-money",
        status: "confirmed",
        confirmedAt: new Date(2026, 5, 15, 12).toISOString(),
        rewards: [{ id: "money", type: "allowance", label: "12元", value: 12 }],
      }),
      task({
        id: "july-money",
        status: "confirmed",
        confirmedAt: new Date(2026, 6, 1, 12).toISOString(),
        rewards: [{ id: "money", type: "allowance", label: "99元", value: 99 }],
      }),
    ],
  });

  assert.equal(record.id, "allowance-2026-07");
  assert.equal(record.settlementMonth, "2026-06");
  assert.equal(record.completedTaskCount, 1);
  assert.equal(record.taskBonus, 12);
  assert.equal(record.totalAmount, 52);
});

test("monthly allowance role salary uses the settlement month end role", () => {
  const settlementRole = roleAtEndOfMonth({
    currentLevel: 4,
    logs: [
      {
        id: "july-upgrade",
        type: "level_changed",
        title: "level 4",
        createdAt: new Date(2026, 6, 1, 0, 0, 1).toISOString(),
        fromLevel: 3,
        toLevel: 4,
      },
    ],
    month: "2026-06",
    roles: roles.map((role, level) => ({
      ...role,
      salary: 100 + level * 10,
    })),
  });

  const record = createMonthlyAllowanceRecord({
    month: "2026-07",
    role: settlementRole,
    tasks: [],
  });

  assert.equal(record.roleLevel, 3);
  assert.equal(record.baseSalary, 130);
  assert.equal(record.totalAmount, 130);
});

test("monthly allowance wife adjustment cannot make total negative", () => {
  const record = createMonthlyAllowanceRecord({
    month: "2026-07",
    now: new Date(2026, 6, 1),
    role: { ...roles[1], salary: 20 },
    tasks: [],
    wifeAdjustmentAmount: -999,
  });

  assert.equal(record.totalAmount, 0);
});

test("monthly allowance status updates write the expected timestamps", () => {
  const record = createMonthlyAllowanceRecord({
    month: "2026-07",
    now: new Date(2026, 6, 1),
    role: roles[1],
    tasks: [],
  });
  const updated = updateMonthlyAllowanceStatus(
    record,
    "HUSBAND_REPORTED_NOT_RECEIVED",
    "2026-07-02T00:00:00.000Z",
  );

  assert.equal(updated.status, "HUSBAND_REPORTED_NOT_RECEIVED");
  assert.equal(updated.husbandReportedAt, "2026-07-02T00:00:00.000Z");
});

test("monthly allowance merge keeps husband not-received reports over stale paid state", () => {
  const paid = updateMonthlyAllowanceStatus(
    createMonthlyAllowanceRecord({
      month: "2026-07",
      now: new Date(2026, 6, 1),
      role: roles[1],
      tasks: [],
    }),
    "PAID_CONFIRMED_BY_WIFE",
    "2026-07-02T00:00:00.000Z",
  );
  const reported = updateMonthlyAllowanceStatus(
    paid,
    "HUSBAND_REPORTED_NOT_RECEIVED",
    "2026-07-02T00:03:00.000Z",
  );

  const [merged] = mergeMonthlyAllowanceRecords([paid], [reported]);

  assert.equal(merged.status, "HUSBAND_REPORTED_NOT_RECEIVED");
  assert.equal(merged.husbandReportedAt, "2026-07-02T00:03:00.000Z");
});

test("monthly allowance merge preserves husband receipt timestamps over stale state", () => {
  const paid = updateMonthlyAllowanceStatus(
    createMonthlyAllowanceRecord({
      month: "2026-07",
      now: new Date(2026, 6, 1),
      role: { ...roles[1], salary: 20 },
      tasks: [],
    }),
    "PAID_CONFIRMED_BY_WIFE",
    "2026-07-02T00:00:00.000Z",
  );
  const received = {
    ...updateMonthlyAllowanceStatus(
      paid,
      "RECEIVED_BY_HUSBAND",
      "2026-07-02T00:05:00.000Z",
    ),
    creditedAt: "2026-07-02T00:05:00.000Z",
  };

  const [merged] = mergeMonthlyAllowanceRecords([paid], [received]);

  assert.equal(merged.status, "RECEIVED_BY_HUSBAND");
  assert.equal(merged.husbandReceivedAt, "2026-07-02T00:05:00.000Z");
  assert.equal(merged.creditedAt, "2026-07-02T00:05:00.000Z");
});

test("direct level-up task rewards reset current experience", () => {
  const current: GameProgress = {
    level: 1,
    exp: 80,
    totalExp: 80,
    wallet: 0,
    rewardedTaskIds: [],
  };
  const completed = task({
    status: "confirmed",
    rewards: [{ id: "level", type: "level_up", label: "直接升级1级", value: 1 }],
  });

  const result = settleTaskReward(current, completed, roles);

  assert.equal(result.progress.level, 2);
  assert.equal(result.progress.exp, 0);
});

test("level rule resets current experience only when level increases", () => {
  const current: GameProgress = {
    level: 3,
    exp: 80,
    totalExp: 80,
    wallet: 0,
    rewardedTaskIds: [],
  };

  assert.equal(progressWithLevelRule(current, 4).exp, 0);
  assert.equal(progressWithLevelRule(current, 3).exp, 80);
  assert.equal(progressWithLevelRule({ ...current, exp: 1200 }, 2).exp, 1000);
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

test("anomaly rules report the most severe no-completed-task threshold", () => {
  const anomalies = calculateActiveAnomalies({
    now: new Date("2026-06-10T00:00:00.000Z"),
    tasks: [
      task({
        id: "idle-task",
        createdAt: "2026-06-04T00:00:00.000Z",
        status: "todo",
      }),
    ],
    logs: [],
    walletLedger: [],
  });

  assert.equal(
    anomalies.filter((anomaly) => anomaly.category === "no_task_completed").length,
    1,
  );
  assert.equal(
    anomalies.some((anomaly) => anomaly.key === "no-task-completed:5"),
    true,
  );
});

test("anomaly rules report daily no-completed-task entries after seven days", () => {
  const anomalies = calculateActiveAnomalies({
    now: new Date("2026-06-13T00:00:00.000Z"),
    tasks: [
      task({
        id: "long-idle-task",
        createdAt: "2026-06-04T00:00:00.000Z",
        status: "todo",
      }),
    ],
    logs: [],
    walletLedger: [],
  });

  assert.equal(
    anomalies.some((anomaly) => anomaly.key === "no-task-completed:9"),
    true,
  );
});

test("anomaly rules report each timed-out task", () => {
  const anomalies = calculateActiveAnomalies({
    now: new Date("2026-06-10T00:00:00.000Z"),
    tasks: [
      task({
        id: "timeout-task",
        createdAt: "2026-06-08T00:00:00.000Z",
        dueAt: "2026-06-09T00:00:00.000Z",
        status: "doing",
      }),
    ],
    logs: [],
    walletLedger: [],
  });

  assert.equal(
    anomalies.some((anomaly) => anomaly.key === "task-timeout:timeout-task"),
    true,
  );
});

test("anomaly rules report weekly no-experience thresholds", () => {
  const anomalies = calculateActiveAnomalies({
    now: new Date("2026-06-15T00:00:00.000Z"),
    tasks: [
      task({
        id: "exp-watch-task",
        createdAt: "2026-06-01T00:00:00.000Z",
        status: "confirmed",
        confirmedAt: "2026-06-02T00:00:00.000Z",
      }),
    ],
    logs: [],
    walletLedger: [],
  });

  assert.equal(
    anomalies.some((anomaly) => anomaly.key === "no-experience:14"),
    true,
  );
});

test("anomaly rules report monthly no-level-up thresholds", () => {
  const anomalies = calculateActiveAnomalies({
    now: new Date("2026-08-10T00:00:00.000Z"),
    tasks: [
      task({
        id: "level-watch-task",
        createdAt: "2026-06-01T00:00:00.000Z",
        status: "confirmed",
        confirmedAt: "2026-06-02T00:00:00.000Z",
      }),
    ],
    logs: [],
    walletLedger: [],
  });

  assert.equal(
    anomalies.some((anomaly) => anomaly.key === "no-level-up:2"),
    true,
  );
});
