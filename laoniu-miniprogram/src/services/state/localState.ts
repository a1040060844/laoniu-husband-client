import Taro from "@tarojs/taro";
import { benefits as initialBenefits } from "../../data/benefits";
import { initialTasks } from "../../data/tasks";
import { roles } from "../../data/roles";
import { initialProgress, settleConfirmedTasks } from "../../game/progression";
import { taskRewardExp, taskRewardMoney } from "../../domain/taskRewards";
import { refreshTaskCycles } from "../../domain/taskSchedule";
import { APP_STATE_STORAGE_KEY } from "../storageKeys";
import type {
  Benefit,
  DecreeEvent,
  EventLog,
  Punishment,
  Task,
  TaskReward,
  WalletLedgerEntry,
} from "../../types/domain";
import type {
  AppState,
  ApproveBenefitPayload,
  ApproveTaskPayload,
  CreateDecreePayload,
  CreateTaskPayload,
  FailTaskPayload,
  RejectBenefitPayload,
  RejectTaskPayload,
  RequestBenefitPayload,
  RestoreNormalModePayload,
  StateService,
  StartSlaveModePayload,
  SubmitTaskPayload,
} from "./types";

const DEFAULT_PUNISHMENT: Punishment = {
  status: "normal",
  durationDays: 7,
  recoveryExp: 0,
  requiredRecoveryExp: 100,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState(): AppState {
  return {
    progress: clone(initialProgress),
    tasks: refreshTaskCycles(clone(initialTasks)),
    benefits: clone(initialBenefits),
    logs: [],
    punishment: { ...DEFAULT_PUNISHMENT },
    walletLedger: [],
    decrees: [],
  };
}

function safeArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : clone(fallback);
}

function hydrate(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return defaultState();
  const value = raw as Partial<AppState>;
  return {
    progress: value.progress || clone(initialProgress),
    tasks: refreshTaskCycles(safeArray<Task>(value.tasks, initialTasks)),
    benefits: safeArray<Benefit>(value.benefits, initialBenefits),
    logs: safeArray<EventLog>(value.logs, []),
    punishment: value.punishment || { ...DEFAULT_PUNISHMENT },
    walletLedger: safeArray<WalletLedgerEntry>(value.walletLedger, []),
    decrees: safeArray<DecreeEvent>(value.decrees, []),
  };
}

function readState() {
  return hydrate(Taro.getStorageSync<AppState>(APP_STATE_STORAGE_KEY));
}

function writeState(state: AppState) {
  Taro.setStorageSync(APP_STATE_STORAGE_KEY, state);
  return state;
}

function appendLog(
  state: AppState,
  log: Omit<EventLog, "id" | "createdAt"> & { createdAt?: string },
) {
  const next: EventLog = {
    ...log,
    id: id("log"),
    createdAt: log.createdAt || nowIso(),
  };
  state.logs = [next, ...state.logs];
  return next;
}

function appendDecree(
  state: AppState,
  decree: Omit<DecreeEvent, "id" | "createdAt" | "target"> & {
    createdAt?: string;
  },
) {
  const next: DecreeEvent = {
    ...decree,
    id: id("decree"),
    target: "husband",
    createdAt: decree.createdAt || nowIso(),
  };
  state.decrees = [next, ...state.decrees];
  return next;
}

function appendLedger(
  state: AppState,
  entry: Omit<WalletLedgerEntry, "id" | "createdAt"> & { createdAt?: string },
) {
  const next: WalletLedgerEntry = {
    ...entry,
    id: id("ledger"),
    createdAt: entry.createdAt || nowIso(),
  };
  state.walletLedger = [next, ...state.walletLedger];
  appendLog(state, {
    type: "wallet_ledger",
    title: entry.source,
    description: entry.note,
    amount: entry.amount,
    unit: entry.unit,
    taskId: entry.taskId,
    taskTitle: entry.taskTitle,
    benefitId: entry.benefitId,
    benefitName: entry.benefitName,
  });
  return next;
}

function benefitCooldownMs(frequency: string) {
  if (frequency.includes("2 周")) return 14 * 24 * 60 * 60 * 1000;
  if (frequency.includes("季度")) return 90 * 24 * 60 * 60 * 1000;
  if (frequency.includes("月")) return 30 * 24 * 60 * 60 * 1000;
  if (frequency.includes("年")) return 365 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function rewardForTask(payload: CreateTaskPayload): {
  rewards: TaskReward[];
  rewardExp: number;
  rewardMoney: number;
  rewardBenefit?: string;
} {
  const rewardType = payload.rewardType || "experience";
  const rewardValue = Math.max(
    0,
    Math.trunc(payload.rewardValue ?? payload.rewardExp ?? 0),
  );
  const rewardExp =
    rewardType === "experience"
      ? rewardValue
      : Math.max(0, Math.trunc(payload.rewardExp || 0));
  const rewardMoney =
    rewardType === "allowance"
      ? rewardValue
      : Math.max(0, Math.trunc(payload.rewardMoney || 0));

  if (rewardType === "none") return { rewards: [], rewardExp: 0, rewardMoney: 0 };

  const reward: TaskReward = {
    id: id("reward"),
    type: rewardType,
    label: "老妞任务奖励",
    value: rewardValue,
    unit:
      rewardType === "allowance"
        ? "CNY"
        : rewardType === "experience"
          ? "EXP"
          : rewardType === "level_up"
            ? "LEVEL"
            : "COUNT",
    benefitName:
      rewardType === "benefit" ? payload.rewardBenefit || "老妞指定权益" : undefined,
    customName:
      rewardType === "custom" ? payload.rewardBenefit || "老妞自定义奖励" : undefined,
  };

  return {
    rewards: [reward],
    rewardExp,
    rewardMoney,
    rewardBenefit: rewardType === "benefit" ? reward.benefitName : undefined,
  };
}

function settleTask(state: AppState, task: Task) {
  const beforeWallet = state.progress.wallet;
  const result = settleConfirmedTasks(state.progress, [task], roles);
  const pausedAllowance =
    state.punishment.status === "slave" ? taskRewardMoney(task) : 0;

  state.progress =
    pausedAllowance > 0
      ? {
          ...result.progress,
          wallet: Math.max(0, result.progress.wallet - pausedAllowance),
        }
      : result.progress;
  task.rewardedAt = nowIso();

  const expAmount = taskRewardExp(task);
  if (expAmount > 0) {
    appendLedger(state, {
      type: "experience",
      source: "任务奖励",
      amount: expAmount,
      unit: "EXP",
      taskId: task.id,
      taskTitle: task.title,
      note: `完成“${task.title}”`,
    });
  }

  const moneyAmount = taskRewardMoney(task);
  if (moneyAmount > 0) {
    appendLedger(state, {
      type: "allowance",
      source: state.punishment.status === "slave" ? "零花钱暂停" : "任务奖励",
      amount: state.punishment.status === "slave" ? 0 : state.progress.wallet - beforeWallet,
      unit: "CNY",
      taskId: task.id,
      taskTitle: task.title,
      note:
        state.punishment.status === "slave"
          ? "卖身奴隶状态下零花钱奖励暂停"
          : `完成“${task.title}”`,
    });
  }

  result.stories.forEach((story) => {
    appendDecree(state, {
      type: story.tone === "upgrade" ? "level_changed" : "task_approved",
      title: story.title,
      text: story.text,
      tone: story.tone || "normal",
      payload: { taskId: task.id },
    });
  });
}

export const localState: StateService = {
  async loadState() {
    const state = readState();
    return writeState({ ...state, tasks: refreshTaskCycles(state.tasks) });
  },

  async saveState(next) {
    return writeState(next);
  },

  async resetState() {
    Taro.removeStorageSync(APP_STATE_STORAGE_KEY);
    return writeState(defaultState());
  },

  async submitTask(taskId: string, payload: SubmitTaskPayload) {
    const state = readState();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("任务不存在");
    if (!["todo", "doing", "failed_pending"].includes(task.status)) {
      throw new Error("当前任务不能提交");
    }
    task.status = "submitted";
    task.submittedAt = nowIso();
    task.submitNote = payload.note || "已完成，请老妞验收";
    appendLog(state, {
      type: "task_submitted",
      title: task.title,
      description: task.submitNote,
      taskId: task.id,
      taskTitle: task.title,
    });
    return writeState(state);
  },

  async approveTask(taskId: string, _payload?: ApproveTaskPayload) {
    const state = readState();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("任务不存在");
    if (task.status !== "submitted") throw new Error("只有已提交任务可以确认");
    task.status = "confirmed";
    task.confirmedAt = nowIso();
    task.resultText = "老妞已确认，奖励已结算。";
    settleTask(state, task);
    appendLog(state, {
      type: "task_approved",
      title: task.title,
      description: task.resultText,
      taskId: task.id,
      taskTitle: task.title,
    });
    appendDecree(state, {
      type: "task_approved",
      title: "任务通过",
      text: `“${task.title}”已被老妞确认。`,
      tone: "normal",
      payload: { taskId },
    });
    return writeState(state);
  },

  async rejectTask(taskId: string, payload?: RejectTaskPayload) {
    const state = readState();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("任务不存在");
    if (task.status !== "submitted") throw new Error("只有已提交任务可以驳回");
    task.status = "failed_pending";
    task.resultText = payload?.reason || "老妞驳回，需要重做。";
    appendLog(state, {
      type: "task_rejected",
      title: task.title,
      description: task.resultText,
      taskId: task.id,
      taskTitle: task.title,
    });
    appendDecree(state, {
      type: "task_rejected",
      title: "任务驳回",
      text: task.resultText,
      tone: "down",
      payload: { taskId },
    });
    return writeState(state);
  },

  async failTask(taskId: string, payload?: FailTaskPayload) {
    const state = readState();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("任务不存在");
    if (task.status === "confirmed") throw new Error("已确认任务不能判失败");
    if (task.status === "failed") throw new Error("任务已经失败");
    task.status = "failed";
    task.resultText = payload?.reason || "老妞判定任务失败，本次不发放奖励。";
    appendLog(state, {
      type: "task_failed",
      title: task.title,
      description: task.resultText,
      taskId: task.id,
      taskTitle: task.title,
    });
    appendDecree(state, {
      type: "task_rejected",
      title: "任务失败",
      text: task.resultText,
      tone: "down",
      payload: { taskId },
    });
    return writeState(state);
  },

  async requestBenefit(benefitId: string, payload?: RequestBenefitPayload) {
    const state = readState();
    const benefit = state.benefits.find((item) => item.id === benefitId);
    if (!benefit) throw new Error("权益不存在");
    if (state.punishment.status === "slave") {
      throw new Error("卖身奴隶状态下权益暂停");
    }
    if (benefit.levelRequired > state.progress.level) {
      throw new Error("等级不足，暂未解锁");
    }
    if (benefit.pendingRequest) throw new Error("已有待审批申请");
    benefit.status = "pending";
    benefit.pendingRequest = {
      id: id("benefit-request"),
      requestedAt: nowIso(),
      reason: payload?.reason || "申请使用权益",
    };
    benefit.lastRequestedAt = benefit.pendingRequest.requestedAt;
    appendLog(state, {
      type: "benefit_requested",
      title: benefit.name,
      description: benefit.pendingRequest.reason,
      benefitId: benefit.id,
      benefitName: benefit.name,
    });
    return writeState(state);
  },

  async approveBenefit(benefitId: string, _payload?: ApproveBenefitPayload) {
    const state = readState();
    const benefit = state.benefits.find((item) => item.id === benefitId);
    if (!benefit?.pendingRequest) throw new Error("没有待审批权益");
    const approvedAt = nowIso();
    benefit.pendingRequest = undefined;
    benefit.status = "cooldown";
    benefit.lastApprovedAt = approvedAt;
    benefit.cooldownUntil = new Date(
      Date.parse(approvedAt) + benefitCooldownMs(benefit.frequency),
    ).toISOString();
    benefit.cooldownText = "冷却中";
    appendLog(state, {
      type: "benefit_approved",
      title: benefit.name,
      description: "老妞已批准",
      benefitId: benefit.id,
      benefitName: benefit.name,
    });
    appendDecree(state, {
      type: "benefit_approved",
      title: "权益批准",
      text: `老妞批准使用“${benefit.name}”。`,
      tone: "normal",
      payload: { benefitId },
    });
    return writeState(state);
  },

  async rejectBenefit(benefitId: string, payload?: RejectBenefitPayload) {
    const state = readState();
    const benefit = state.benefits.find((item) => item.id === benefitId);
    if (!benefit?.pendingRequest) throw new Error("没有待审批权益");
    const reason = payload?.reason || "老妞暂缓批准";
    benefit.pendingRequest = undefined;
    benefit.status = "available";
    appendLog(state, {
      type: "benefit_rejected",
      title: benefit.name,
      description: reason,
      benefitId: benefit.id,
      benefitName: benefit.name,
    });
    appendDecree(state, {
      type: "benefit_rejected",
      title: "权益驳回",
      text: reason,
      tone: "down",
      payload: { benefitId },
    });
    return writeState(state);
  },

  async createTask(payload: CreateTaskPayload) {
    const state = readState();
    const reward = rewardForTask(payload);
    const task: Task = {
      id: id("task"),
      title: payload.title,
      description: payload.description,
      type: "custom",
      source: "wife",
      moduleId: payload.moduleId,
      moduleLabel: payload.moduleLabel,
      target: payload.target,
      action: payload.action,
      standard: payload.standard,
      rewards: reward.rewards,
      rewardExp: reward.rewardExp,
      rewardMoney: reward.rewardMoney,
      rewardBenefit: reward.rewardBenefit,
      deadline: payload.deadline || "今天完成",
      status: "todo",
      createdAt: nowIso(),
    };
    state.tasks = [task, ...state.tasks];
    appendLog(state, {
      type: "task_created",
      title: task.title,
      description: task.description,
      taskId: task.id,
      taskTitle: task.title,
    });
    appendDecree(state, {
      type: "task_created",
      title: "新任务",
      text: `老妞下达任务：“${task.title}”。`,
      tone: "normal",
      payload: { taskId: task.id },
    });
    return writeState(state);
  },

  async createDecree(payload: CreateDecreePayload) {
    const state = readState();
    appendDecree(state, {
      type: "task_created",
      title: payload.title,
      text: payload.text,
      tone: payload.tone || "normal",
      payload: {},
    });
    return writeState(state);
  },

  async acknowledgeDecree(decreeId: string) {
    const state = readState();
    const decree = state.decrees.find((item) => item.id === decreeId);
    if (!decree) throw new Error("裁定不存在");
    const acknowledgedAt = nowIso();
    decree.acknowledgedAt = acknowledgedAt;
    decree.readAt = decree.readAt || acknowledgedAt;
    return writeState(state);
  },

  async startSlaveMode(payload?: StartSlaveModePayload) {
    const state = readState();
    const reason = payload?.reason || "老妞裁定进入卖身奴隶状态";
    const durationDays = Math.max(1, Math.trunc(payload?.durationDays || 7));
    const requiredRecoveryExp = Math.max(
      1,
      Math.trunc(payload?.requiredRecoveryExp || 100),
    );
    state.punishment = {
      status: "slave",
      startedAt: nowIso(),
      reason,
      durationDays,
      recoveryExp: 0,
      requiredRecoveryExp,
      restoreLevel: state.progress.level,
      restoreExp: state.progress.exp,
      restoreWallet: state.progress.wallet,
    };
    appendLedger(state, {
      type: "punishment",
      source: "卖身奴隶状态",
      amount: 0,
      unit: "COUNT",
      note: `开启：${reason}`,
    });
    appendLog(state, {
      type: "punishment_status_changed",
      title: "进入卖身奴隶状态",
      description: reason,
    });
    appendDecree(state, {
      type: "punishment_slave",
      title: "老妞裁定",
      text: `进入卖身奴隶状态：${reason}`,
      tone: "punish",
      payload: { durationDays, requiredRecoveryExp },
    });
    return writeState(state);
  },

  async restoreNormalMode(payload?: RestoreNormalModePayload) {
    const state = readState();
    const reason = payload?.reason || "老妞裁定恢复正常状态";
    state.punishment = {
      status: "normal",
      durationDays: 7,
      recoveryExp: 0,
      requiredRecoveryExp: 100,
    };
    appendLedger(state, {
      type: "punishment",
      source: "卖身奴隶状态",
      amount: 0,
      unit: "COUNT",
      note: `恢复：${reason}`,
    });
    appendLog(state, {
      type: "punishment_status_changed",
      title: "恢复正常状态",
      description: reason,
    });
    appendDecree(state, {
      type: "punishment_restored",
      title: "状态恢复",
      text: reason,
      tone: "normal",
      payload: {},
    });
    return writeState(state);
  },
};
