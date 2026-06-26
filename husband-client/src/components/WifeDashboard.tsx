import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Crown,
  FilePenLine,
  Gavel,
  ScrollText,
  Shield,
  ShieldCheck,
  Utensils,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import {
  benefitRewardNames,
  buildTaskDescription,
  buildTaskTitle,
  createRewardLabel,
  createTaskTimeConfig,
  findTaskModule,
  taskModules,
  taskRewardOptions,
  taskTimeOptions,
} from "../data/taskModules";
import { expRequiredForLevel, type GameProgress } from "../game/progression";
import { publicAsset } from "../lib/assets";
import {
  getPunishmentRemainingDays,
} from "../lib/taskSystem";
import {
  eventLogRecordLabel,
  walletLedgerRecordLabel,
} from "../lib/recordLabels";
import { resolveTaskSchedule, taskTypeForTimeConfig } from "../lib/taskSchedule";
import {
  taskRewardChips,
  taskRewardExp,
  taskRewardMoney,
  taskRewardText,
} from "../lib/taskRewards";
import type {
  Benefit,
  EventLog,
  Punishment,
  Role,
  Task,
  TaskModuleId,
  TaskReward,
  TaskRewardType,
  TaskReviewDecision,
  TaskTimeConfig,
  TaskTimeType,
  WalletLedgerEntry,
} from "../types/domain";
import { ChatMessageButton } from "./ChatMessagePanel";
import { OrnateSwipeHint } from "./OrnateSwipeHint";
import { SwipeBackHint } from "./SwipeBackHint";
import { VerticalMagicSwipeHint } from "./VerticalMagicSwipeHint";
import { AnimatedContent } from "./effects/AnimatedContent";
import { ClickSpark } from "./effects/ClickSpark";
import { WifeCommandMotion } from "./effects/WifeCommandMotion";

type WifeSheet = "task" | "review" | "benefit" | "level" | "redeem" | null;
type WifePage = "today" | "main" | "growth";
type WifeSubPage = "tasks" | "review" | "benefits" | "records" | "order";
type RewardFormType = TaskRewardType | "experience_allowance";
type GrowthFeedback = "exp-up" | "exp-down" | "level-up" | "level-down" | "punish";

interface WifeDashboardProps {
  role: Role;
  progress: GameProgress;
  tasks: Task[];
  logs: EventLog[];
  walletLedger: WalletLedgerEntry[];
  punishment: Punishment;
  benefits: Benefit[];
  roles: Role[];
  onCreateTask: (task: Task) => void;
  onApproveTask: (taskId: string, decision?: TaskReviewDecision) => void;
  onRejectTask: (taskId: string, reason?: string) => void;
  onApproveBenefit: (benefit: Benefit) => void;
  onRejectBenefit: (benefit: Benefit, reason?: string) => void;
  onAdjustExperience: (amount: number) => void;
  onSetLevel: (level: number) => void;
  onLevelDelta: (delta: number) => void;
  onPunishStatus: () => void;
  onRestoreNormal: () => void;
  onReturnToLogin: () => void;
  chatUnreadCount: number;
  onOpenChat: () => void;
}

interface TaskDraft {
  title: string;
  description: string;
  moduleId: TaskModuleId;
  target: string;
  action: string;
  customTarget: string;
  customAction: string;
  standard: string;
  timeType: TaskTimeType;
  customDeadlineAt: string;
  repeatFrequency: NonNullable<TaskTimeConfig["repeatFrequency"]>;
  repeatCount: number;
  rewardType: RewardFormType;
  rewardExp: number;
  rewardMoney: number;
  levelUpCount: number;
  benefitName: string;
  benefitCount: number;
  customRewardName: string;
  customRewardDescription: string;
}

interface ReviewEdit {
  exp: string;
  money: string;
  reason: string;
  extraRewardName: string;
  extraPunishment: string;
}

const initialDraft: TaskDraft = {
  action: "简单整理",
  customAction: "",
  customDeadlineAt: "",
  customTarget: "",
  description:
    "请完成「卧室」的「简单整理」，验收标准以老妞大人最终裁定为准。",
  benefitCount: 1,
  benefitName: "奶茶",
  customRewardDescription: "",
  customRewardName: "今晚免骂券",
  levelUpCount: 1,
  moduleId: "cleaning",
  repeatCount: 1,
  repeatFrequency: "daily",
  rewardExp: 15,
  rewardMoney: 0,
  rewardType: "experience",
  standard: "",
  target: "卧室",
  timeType: "today",
  title: "打扫卧室",
};

const WIFE_PAGE_INDEX: Record<WifePage, number> = {
  growth: 0,
  main: 1,
  today: 2,
};

const WIFE_SUB_PAGE_HASH: Record<WifeSubPage, string> = {
  benefits: "#wife-benefits",
  order: "#wife-order",
  records: "#wife-records",
  review: "#wife-review",
  tasks: "#wife-tasks",
};

const orderOptions = [
  { name: "奶茶特赦", desc: "奖励表现稳定时的一杯甜口慰问", cost: "权益申请" },
  { name: "正餐加封", desc: "今日可指定一顿正餐安排", cost: "月薪抵扣 30" },
  { name: "宵夜恩准", desc: "深夜表现优秀时开放一次", cost: "经验 -5" },
  { name: "甜点赏赐", desc: "适合任务完成后的轻量奖励", cost: "经验 -3" },
];

const SWIPE_THRESHOLD = 60;
const WHEEL_THRESHOLD = 42;

interface TouchPoint {
  x: number;
  y: number;
}

function taskId() {
  return `wife-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function rewardId() {
  return `reward-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createDraftReward(type: TaskRewardType): TaskReward {
  const base: TaskReward = { id: rewardId(), label: "", type };
  if (type === "experience") {
    return { ...base, label: "15经验", unit: "经验", value: 15 };
  }
  if (type === "allowance") {
    return { ...base, label: "5元", unit: "元", value: 5 };
  }
  if (type === "level_up") {
    return { ...base, label: "直接升级1级", unit: "级", value: 1 };
  }
  if (type === "benefit") {
    return {
      ...base,
      benefitName: "奶茶",
      label: "奶茶 1次",
      unit: "次",
      value: 1,
    };
  }
  if (type === "custom") {
    return { ...base, customName: "今晚免骂券", label: "今晚免骂券" };
  }
  return { ...base, label: "无奖励" };
}

function clampExperience(value: number) {
  return Math.min(30, Math.max(0, Math.trunc(value)));
}

function finalizeReward(reward: TaskReward): TaskReward {
  const value =
    reward.type === "experience"
      ? clampExperience(reward.value ?? 0)
      : reward.type === "level_up"
        ? Math.min(1, Math.max(1, Math.trunc(reward.value ?? 1)))
        : reward.type === "benefit"
          ? Math.max(1, Math.trunc(reward.value ?? 1))
          : typeof reward.value === "number"
            ? Math.max(0, Math.trunc(reward.value))
            : undefined;

  return {
    ...reward,
    label: createRewardLabel(reward),
    value,
  };
}

function rewardsFromDraft(draft: TaskDraft): TaskReward[] {
  if (draft.rewardType === "experience") {
    return [
      finalizeReward({
        id: "draft-reward-exp",
        label: "",
        type: "experience",
        unit: "经验",
        value: draft.rewardExp,
      }),
    ];
  }

  if (draft.rewardType === "allowance") {
    return [
      finalizeReward({
        id: "draft-reward-money",
        label: "",
        type: "allowance",
        unit: "元",
        value: draft.rewardMoney,
      }),
    ];
  }

  if (draft.rewardType === "experience_allowance") {
    return [
      finalizeReward({
        id: "draft-reward-exp",
        label: "",
        type: "experience",
        unit: "经验",
        value: draft.rewardExp,
      }),
      finalizeReward({
        id: "draft-reward-money",
        label: "",
        type: "allowance",
        unit: "元",
        value: draft.rewardMoney,
      }),
    ];
  }

  if (draft.rewardType === "level_up") {
    return [
      finalizeReward({
        id: "draft-reward-level-up",
        label: "",
        type: "level_up",
        unit: "级",
        value: draft.levelUpCount,
      }),
    ];
  }

  if (draft.rewardType === "benefit") {
    return [
      finalizeReward({
        benefitName: draft.benefitName.trim() || "奶茶",
        id: "draft-reward-benefit",
        label: "",
        type: "benefit",
        unit: "次",
        value: draft.benefitCount,
      }),
    ];
  }

  if (draft.rewardType === "custom") {
    return [
      finalizeReward({
        customDescription: draft.customRewardDescription.trim() || undefined,
        customName: draft.customRewardName.trim() || "自定义奖励",
        id: "draft-reward-custom",
        label: "",
        type: "custom",
      }),
    ];
  }

  return [
    finalizeReward({
      id: "draft-reward-none",
      label: "",
      type: "none",
    }),
  ];
}

export function WifeDashboard({
  role,
  progress,
  tasks,
  logs,
  walletLedger,
  punishment,
  benefits,
  roles,
  onCreateTask,
  onApproveTask,
  onRejectTask,
  onApproveBenefit,
  onRejectBenefit,
  onAdjustExperience,
  onSetLevel,
  onLevelDelta,
  onPunishStatus,
  onRestoreNormal,
  onReturnToLogin,
  chatUnreadCount,
  onOpenChat,
}: WifeDashboardProps) {
  const wifeImage = publicAsset("/assets/wife/wife-main.jpeg");
  const wifeHomeImage = publicAsset("/assets/wife/wife-home-throne.png");
  const wifeGrowthImage = publicAsset("/assets/wife/wife-growth-library.png");
  const wifeTodayBackground = publicAsset("/assets/wife/wife-today-bg.png");
  const [sheet, setSheet] = useState<WifeSheet>(null);
  const [activePage, setActivePage] = useState<WifePage>("main");
  const [subPage, setSubPage] = useState<WifeSubPage | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [targetLevel, setTargetLevel] = useState(progress.level);
  const [armedPunish, setArmedPunish] = useState(false);
  const [growthFeedback, setGrowthFeedback] = useState<GrowthFeedback | null>(null);
  const [reviewEdits, setReviewEdits] = useState<Record<string, ReviewEdit>>({});
  const [benefitRejectReasons, setBenefitRejectReasons] = useState<Record<string, string>>({});
  const touchStart = useRef<TouchPoint | null>(null);
  const wheelLocked = useRef(false);
  const growthFeedbackTimer = useRef<number | null>(null);
  const previousGrowthState = useRef({
    exp: progress.exp,
    level: role.level,
    punishmentStatus: punishment.status,
  });

  const isSlave = punishment.status === "slave";
  const displayRole = isSlave
    ? {
        ...role,
        title: "卖身奴隶",
        salary: 0,
        roleImage: publicAsset("/assets/slave/slave-page-latest.png"),
      }
    : role;
  const requiredExp = expRequiredForLevel(progress.level);
  const expPercent = Math.min(
    100,
    Math.round((progress.exp / requiredExp) * 100),
  );
  const expToNext = Math.max(0, requiredExp - progress.exp);
  const nextRole = roles[Math.min(roles.length - 1, role.level + 1)];
  const remainingDays = getPunishmentRemainingDays(punishment);
  const recoveryPercent =
    punishment.requiredRecoveryExp > 0
      ? Math.min(
          100,
          Math.round(
            (punishment.recoveryExp / punishment.requiredRecoveryExp) * 100,
          ),
        )
      : 100;
  const statusProgressLabel = isSlave ? "恢复" : "经验";
  const statusProgressCurrent = isSlave ? punishment.recoveryExp : progress.exp;
  const statusProgressRequired = isSlave
    ? punishment.requiredRecoveryExp
    : requiredExp;
  const statusProgressPercent = isSlave ? recoveryPercent : expPercent;
  const isNearLevelUp = !isSlave && statusProgressPercent >= 80;

  useEffect(() => {
    const previous = previousGrowthState.current;
    let nextFeedback: GrowthFeedback | null = null;

    if (previous.punishmentStatus !== punishment.status) {
      nextFeedback = "punish";
    } else if (previous.level !== role.level) {
      nextFeedback = role.level > previous.level ? "level-up" : "level-down";
    } else if (previous.exp !== progress.exp) {
      nextFeedback = progress.exp > previous.exp ? "exp-up" : "exp-down";
    }

    previousGrowthState.current = {
      exp: progress.exp,
      level: role.level,
      punishmentStatus: punishment.status,
    };

    if (!nextFeedback) return;
    setGrowthFeedback(nextFeedback);
    if (growthFeedbackTimer.current) {
      window.clearTimeout(growthFeedbackTimer.current);
    }
    growthFeedbackTimer.current = window.setTimeout(() => {
      setGrowthFeedback(null);
      growthFeedbackTimer.current = null;
    }, 720);
  }, [progress.exp, punishment.status, role.level]);

  useEffect(
    () => () => {
      if (growthFeedbackTimer.current) {
        window.clearTimeout(growthFeedbackTimer.current);
      }
    },
    [],
  );

  const submittedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === "submitted" || task.status === "failed_pending",
      ),
    [tasks],
  );
  const pendingBenefits = useMemo(
    () => benefits.filter((benefit) => Boolean(benefit.pendingRequest)),
    [benefits],
  );
  const selectedModule = useMemo(
    () => findTaskModule(draft.moduleId),
    [draft.moduleId],
  );
  const draftTarget =
    draft.moduleId === "cleaning" && draft.target === "自定义区域"
      ? draft.customTarget.trim()
      : draft.target.trim();
  const draftAction = draft.action.trim();
  const draftTimeConfig = createTaskTimeConfig(
    draft.timeType,
    draft.customDeadlineAt,
    draft.repeatFrequency,
    draft.repeatCount,
  );
  const draftRewards = rewardsFromDraft(draft);
  const previewTask: Task = {
    id: "preview-task",
    action: draftAction,
    deadline: draftTimeConfig.label,
    description: draft.description,
    moduleId: draft.moduleId,
    moduleLabel: selectedModule.label,
    rewardExp: draftRewards
      .filter((reward) => reward.type === "experience")
      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0),
    rewardMoney: draftRewards
      .filter((reward) => reward.type === "allowance")
      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0),
    rewards: draftRewards,
    source: "wife",
    standard: draft.standard.trim() || undefined,
    status: "todo",
    target: draftTarget,
    timeConfig: draftTimeConfig,
    title: draft.title,
    type: taskTypeForTimeConfig(draftTimeConfig),
  };
  const recentLog = logs[0];
  const recentSubmittedTask = submittedTasks[0];
  const pendingRulingCount = submittedTasks.length;
  const pendingBenefitCount = pendingBenefits.length;
  const abnormalCount = Math.max(
    0,
    tasks.filter(
      (task) =>
        task.status === "failed" ||
        task.status === "expired" ||
        task.status === "failed_pending",
    ).length,
  );
  const unlockedBenefits = useMemo(
    () => benefits.filter((benefit) => benefit.levelRequired <= progress.level),
    [benefits, progress.level],
  );
  const taskStatusLabel: Record<Task["status"], string> = {
    completed: "已完成",
    confirmed: "已确认",
    doing: "服役中",
    failed: "未通过",
    expired: "已过期",
    failed_pending: "待裁定",
    submitted: "待审核",
    todo: "待执行",
  };

  function formatLogTime(createdAt: string) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
    });
  }

  function updateReviewEdit(taskId: string, patch: Partial<ReviewEdit>) {
    setReviewEdits((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] ?? {
          exp: "",
          extraPunishment: "",
          extraRewardName: "",
          money: "",
          reason: "",
        }),
        ...patch,
      },
    }));
  }

  function rewardsForReview(task: Task, edit: ReviewEdit | undefined) {
    const baseRewards = task.rewards?.length
      ? task.rewards.filter(
          (reward) => reward.type !== "experience" && reward.type !== "allowance",
        )
      : [];
    const exp = edit?.exp.trim() ? Math.max(0, Math.trunc(Number(edit.exp))) : taskRewardExp(task);
    const money = edit?.money.trim()
      ? Math.max(0, Math.trunc(Number(edit.money)))
      : taskRewardMoney(task);
    const rewards: TaskReward[] = [...baseRewards];
    if (exp > 0) {
      rewards.unshift({
        id: `${task.id}-review-exp`,
        label: `${exp}经验`,
        type: "experience",
        unit: "经验",
        value: exp,
      });
    }
    if (money > 0) {
      rewards.push({
        id: `${task.id}-review-money`,
        label: `${money}元`,
        type: "allowance",
        unit: "元",
        value: money,
      });
    }
    if (edit?.extraRewardName.trim()) {
      rewards.push({
        id: `${task.id}-review-custom`,
        label: edit.extraRewardName.trim(),
        customName: edit.extraRewardName.trim(),
        type: "custom",
      });
    }
    return rewards.length
      ? rewards
      : [{ id: `${task.id}-review-none`, label: "无奖励", type: "none" as const }];
  }

  function approveWithEdit(task: Task) {
    const edit = reviewEdits[task.id];
    onApproveTask(task.id, {
      rewards: rewardsForReview(task, edit),
      extraPunishment: edit?.extraPunishment.trim() || undefined,
      extraRewardName: edit?.extraRewardName.trim() || undefined,
    });
  }

  function rejectWithReason(task: Task) {
    const edit = reviewEdits[task.id];
    onRejectTask(task.id, edit?.reason.trim() || undefined);
  }

  function formatLedgerAmount(entry: WalletLedgerEntry) {
    const sign = entry.amount > 0 ? "+" : "";
    if (entry.unit === "CNY") return `${sign}¥${entry.amount}`;
    if (entry.unit === "EXP") return `${sign}${entry.amount} EXP`;
    if (entry.unit === "LEVEL") return `${sign}${entry.amount} 级`;
    if (entry.unit === "BENEFIT") return `${sign}${entry.amount} 次`;
    return `${sign}${entry.amount}`;
  }

  useEffect(() => {
    function pageFromHash(): WifePage {
      const targetId = window.location.hash.slice(1);
      if (targetId === "wife-growth") return "growth";
      if (targetId === "wife-today") return "today";
      if (
        targetId === "wife-tasks" ||
        targetId === "wife-review" ||
        targetId === "wife-benefits" ||
        targetId === "wife-records" ||
        targetId === "wife-order"
      ) {
        return "today";
      }
      return "main";
    }

    function subPageFromHash(): WifeSubPage | null {
      const targetId = window.location.hash.slice(1);
      if (targetId === "wife-tasks") return "tasks";
      if (targetId === "wife-review") return "review";
      if (targetId === "wife-benefits") return "benefits";
      if (targetId === "wife-records") return "records";
      if (targetId === "wife-order") return "order";
      return null;
    }

    const syncHash = () => {
      window.scrollTo(0, 0);
      setActivePage(pageFromHash());
      setSubPage(subPageFromHash());
    };
    syncHash();
    window.setTimeout(syncHash, 80);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setTargetLevel(progress.level);
  }, [progress.level]);

  useEffect(() => {
    if (!armedPunish) return;
    const timer = window.setTimeout(() => setArmedPunish(false), 2800);
    return () => window.clearTimeout(timer);
  }, [armedPunish]);

  useEffect(() => {
    if (draft.moduleId === "custom") return;
    const target =
      draft.moduleId === "cleaning" && draft.target === "自定义区域"
        ? draft.customTarget.trim()
        : draft.target;
    const action = draft.action;
    const title = buildTaskTitle(draft.moduleId, target, action);
    const description = buildTaskDescription(
      draft.moduleId,
      target,
      action,
      draft.standard,
    );
    setDraft((current) => {
      if (current.title === title && current.description === description) {
        return current;
      }
      return { ...current, description, title };
    });
  }, [
    draft.action,
    draft.customTarget,
    draft.moduleId,
    draft.standard,
    draft.target,
  ]);

  function setWifePage(page: WifePage) {
    setSubPage(null);
    setActivePage(page);
    const nextHash =
      page === "main"
        ? "#wife-main"
        : page === "growth"
          ? "#wife-growth"
          : "#wife-today";
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    window.scrollTo(0, 0);
  }

  function openSubPage(page: WifeSubPage) {
    setActivePage("today");
    setSubPage(page);
    const nextHash = WIFE_SUB_PAGE_HASH[page];
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    window.scrollTo(0, 0);
  }

  function closeSubPage() {
    setSubPage(null);
    setActivePage("today");
    if (window.location.hash !== "#wife-today") {
      window.history.replaceState(null, "", "#wife-today");
    }
    window.scrollTo(0, 0);
  }

  function handleTodayTab(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    closeSubPage();
  }

  function pageFromTouchGesture(deltaY: number): WifePage | null {
    if (activePage === "main" && deltaY < 0) return "today";
    if (activePage === "main" && deltaY > 0) return "growth";
    if (activePage === "growth" && deltaY < 0) return "main";
    if (activePage === "today" && deltaY > 0) return "main";
    return null;
  }

  function pageFromWheelGesture(deltaY: number): WifePage | null {
    if (activePage === "main" && deltaY > 0) return "today";
    if (activePage === "main" && deltaY < 0) return "growth";
    if (activePage === "growth" && deltaY > 0) return "main";
    if (activePage === "today" && deltaY < 0) return "main";
    return null;
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (sheet) return;
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (sheet) return;
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX =
      (touch?.clientX ?? touchStart.current.x) - touchStart.current.x;
    const deltaY =
      (touch?.clientY ?? touchStart.current.y) - touchStart.current.y;
    touchStart.current = null;

    if (
      Math.abs(deltaX) > Math.abs(deltaY) ||
      Math.abs(deltaY) <= SWIPE_THRESHOLD
    )
      return;

    const activeScroller = (event.target as HTMLElement | null)?.closest(
      ".wife-growth, .wife-today, .wife-subpage",
    );
    if (subPage) {
      if (activeScroller instanceof HTMLElement && activeScroller.scrollTop > 2) {
        return;
      }
      if (deltaY <= 0) return;
      event.preventDefault();
      setWifePage("main");
      return;
    }

    if (activeScroller instanceof HTMLElement && activePage !== "main") {
      const canScrollDown =
        activeScroller.scrollTop + activeScroller.clientHeight <
        activeScroller.scrollHeight - 2;
      const canScrollUp = activeScroller.scrollTop > 2;
      if ((deltaY < 0 && canScrollDown) || (deltaY > 0 && canScrollUp)) return;
    }

    const nextPage = pageFromTouchGesture(deltaY);
    if (!nextPage) return;
    event.preventDefault();
    setWifePage(nextPage);
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    if (sheet) return;
    if (wheelLocked.current || Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
    const activeScroller = (event.target as HTMLElement | null)?.closest(
      ".wife-growth, .wife-today, .wife-subpage",
    );
    if (subPage) {
      if (activeScroller instanceof HTMLElement && activeScroller.scrollTop > 2) {
        return;
      }
      if (event.deltaY >= 0) return;
      event.preventDefault();
      wheelLocked.current = true;
      setWifePage("main");
      window.setTimeout(() => {
        wheelLocked.current = false;
      }, 620);
      return;
    }

    if (activeScroller instanceof HTMLElement && activePage !== "main") {
      const canScrollDown =
        activeScroller.scrollTop + activeScroller.clientHeight <
        activeScroller.scrollHeight - 2;
      const canScrollUp = activeScroller.scrollTop > 2;
      if (
        (event.deltaY > 0 && canScrollDown) ||
        (event.deltaY < 0 && canScrollUp)
      )
        return;
    }

    const nextPage = pageFromWheelGesture(event.deltaY);
    if (!nextPage) return;

    event.preventDefault();
    wheelLocked.current = true;
    setWifePage(nextPage);
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 620);
  }

  function handlePageLink(page: WifePage) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setWifePage(page);
    };
  }

  function updateDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function selectModule(moduleId: TaskModuleId) {
    const module = findTaskModule(moduleId);
    const target = module.id === "cleaning" ? (module.targets?.[0] ?? "") : "";
    const action = module.id === "cleaning" ? (module.actions?.[0] ?? "") : "";
    const title = buildTaskTitle(moduleId, target, action);
    const description = buildTaskDescription(moduleId, target, action);
    setDraft((current) => ({
      ...current,
      action,
      customAction: "",
      customTarget: "",
      description,
      moduleId,
      standard: "",
      target,
      title,
    }));
  }

  function submitTask() {
    const title =
      draft.moduleId === "custom"
        ? draft.title.trim() || "自定义任务"
        : draft.title.trim();
    if (!title) return;
    const timeConfig = createTaskTimeConfig(
      draft.timeType,
      draft.customDeadlineAt,
      draft.repeatFrequency,
      draft.repeatCount,
    );
    const rewards = rewardsFromDraft(draft);
    const taskType = taskTypeForTimeConfig(timeConfig);
    const cycleFields = resolveTaskSchedule(taskType, timeConfig);
    const rewardExp = rewards
      .filter((reward) => reward.type === "experience")
      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0);
    const rewardMoney = rewards
      .filter((reward) => reward.type === "allowance")
      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0);
    const rewardBenefit = rewards
      .filter(
        (reward) =>
          reward.type === "benefit" ||
          reward.type === "level_up" ||
          reward.type === "custom",
      )
      .map((reward) => createRewardLabel(reward))
      .join(" + ");

    onCreateTask({
      id: taskId(),
      title,
      description:
        draft.description.trim() ||
        buildTaskDescription(draft.moduleId, draftTarget, draftAction),
      type: taskType,
      source: "wife",
      moduleId: draft.moduleId,
      moduleLabel: selectedModule.label,
      target: draftTarget,
      action: draftAction,
      standard: draft.standard.trim() || undefined,
      timeConfig,
      cycleId: cycleFields.cycleId,
      dueAt: cycleFields.dueAt,
      completedCount: 0,
      repeatCount: timeConfig.repeatCount,
      rewards,
      rewardExp,
      rewardMoney,
      rewardBenefit: rewardBenefit || undefined,
      deadline: timeConfig.label,
      status: "todo",
    });
    setDraft(initialDraft);
    setSheet(null);
  }

  function openLevelSheet() {
    setTargetLevel(progress.level);
    setSheet("level");
  }

  function confirmTargetLevel() {
    onSetLevel(targetLevel);
    setSheet(null);
  }

  function confirmRedeem() {
    onRestoreNormal();
    setSheet(null);
  }

  function confirmPunishStatus() {
    if (!armedPunish) {
      setArmedPunish(true);
      return;
    }
    setArmedPunish(false);
    onPunishStatus();
  }

  return (
    <section
      className={`wife-console wife-console--${activePage}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div
        className="wife-pager-track"
        style={{
          transform: `translateY(calc(-${WIFE_PAGE_INDEX[activePage]} * var(--app-height)))`,
        }}
      >
        <section
          className={`wife-growth${activePage === "growth" ? " wife-growth--active" : ""}${growthFeedback ? ` wife-growth--feedback-${growthFeedback}` : ""}`}
          id="wife-growth"
          aria-label="成长裁定"
        >
          <img
            className="wife-growth__portrait"
            src={wifeGrowthImage}
            alt=""
          />
          <div className="wife-growth__shade" />

          <AnimatedContent
            as="header"
            className="wife-growth-title"
            duration={580}
          >
            <p>老妞端</p>
            <h1>成长裁定</h1>
            <span>升降赏罚，由老妞大人决定</span>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className={`wife-growth-card wife-growth-status${isNearLevelUp ? " is-near-level-up" : ""}`}
            aria-label="老哥成长状态"
            delay={90}
            duration={580}
          >
            <div className="wife-growth-status__head">
              <div>
                <p>老哥当前状态</p>
                <h2>
                  <small>
                    {isSlave ? "FINAL" : `Lv.${String(role.level).padStart(2, "0")}`}
                  </small>
                  {displayRole.title}
                </h2>
              </div>
              <div
                className="wife-rank-seal"
                aria-label={`当前状态插画：${displayRole.title}`}
              >
                <img src={displayRole.roleImage} alt="" />
              </div>
            </div>

            <div className="wife-growth-exp">
              <span>{statusProgressLabel}</span>
              <strong>
                {statusProgressCurrent} / {statusProgressRequired}
              </strong>
            </div>
            <div
              className={`wife-growth-progress${isNearLevelUp ? " is-near-level-up" : ""}`}
              aria-label={`${statusProgressLabel}进度 ${statusProgressPercent}%`}
            >
              <i style={{ width: `${statusProgressPercent}%` }} />
            </div>

            <div className="wife-growth-meta">
              <span>
                <BadgeDollarSign size={17} />
                月薪 {displayRole.salary}
              </span>
              <span>
                <ShieldCheck size={17} />
                {isSlave ? "卖身奴隶状态" : "正常服役中"}
              </span>
            </div>

            <p className="wife-growth-next">
              {isSlave
                ? "奴隶服役中，周期结束后由老妞大人重新裁定"
                : role.level >= roles.length - 1
                  ? "已抵达最高职务，赏罚仍由老妞大人裁定"
                  : `距 Lv.${String(nextRole.level).padStart(2, "0")} ${nextRole.title} 还差 ${expToNext} 经验`}
            </p>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-growth-card wife-growth-control-card"
            aria-label="经验与等级调整"
            delay={180}
            duration={580}
          >
            <div className="wife-growth-section-title">
              <h2>经验与等级调整</h2>
              <p>赏赐或扣除经验，升降与指定职务，皆由老妞大人裁定</p>
            </div>
            <div className="wife-growth-control-section wife-exp-control">
              <div className="wife-exp-board">
                <button
                  className="wife-exp-button wife-exp-button--danger"
                  type="button"
                  onClick={() => onAdjustExperience(-10)}
                >
                  -10
                </button>
                <button
                  className="wife-exp-button wife-exp-button--danger"
                  type="button"
                  onClick={() => onAdjustExperience(-5)}
                >
                  -5
                </button>
                <div
                  className="wife-exp-orb"
                  aria-label={`当前经验 ${progress.exp} / ${requiredExp}`}
                >
                  <Crown size={25} />
                  <div className="wife-exp-orb__value" aria-hidden="true">
                    <strong>{progress.exp}</strong>
                    <span className="wife-exp-orb__slash">/</span>
                    <span className="wife-exp-orb__required">{requiredExp}</span>
                  </div>
                  <em>当前经验</em>
                </div>
                <button
                  type="button"
                  className="wife-exp-button"
                  onClick={() => onAdjustExperience(5)}
                >
                  +5
                </button>
                <button
                  type="button"
                  className="wife-exp-button wife-exp-button--strong"
                  onClick={() => onAdjustExperience(10)}
                >
                  +10
                </button>
              </div>
            </div>
            <div className="wife-growth-control-section wife-level-control">
              <WifeCommandMotion as="div" className="wife-level-actions">
                <button
                  type="button"
                  data-wife-command="level-up"
                  onClick={() => onLevelDelta(1)}
                >
                  <ArrowUp size={27} />
                  <span>升一级</span>
                  <em>赐予新职务</em>
                </button>
                <button
                  type="button"
                  data-wife-command="level-pick"
                  onClick={openLevelSheet}
                >
                  <Crown size={27} />
                  <span>指定等级</span>
                  <em>直接裁定职务</em>
                </button>
                <button
                  type="button"
                  data-wife-command="level-down"
                  onClick={() => onLevelDelta(-1)}
                >
                  <ArrowDown size={27} />
                  <span>降一级</span>
                  <em>收回当前职务</em>
                </button>
              </WifeCommandMotion>
            </div>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-growth-card wife-punish-card"
            aria-label="惩罚状态"
            delay={270}
            duration={600}
          >
            <div className="wife-growth-section-title">
              <h2>惩罚状态</h2>
              <p>严重失败时，由老妞大人执行最终裁定</p>
            </div>
            {isSlave ? (
              <button
                className="wife-punish-state"
                type="button"
                data-wife-command="redeem"
                data-wife-command-tone="danger"
                onClick={() => setSheet("redeem")}
              >
                <Shield size={32} />
                <span>
                  <strong>赎回骆老哥</strong>
                  <em>解除奴隶状态并官复原职</em>
                </span>
                <Gavel size={27} />
              </button>
            ) : (
              <WifeCommandMotion as="div" className="wife-punish-actions">
                <button
                  className="wife-punish-state wife-punish-state--street"
                  type="button"
                  data-wife-command="street"
                  onClick={() => onSetLevel(0)}
                >
                  <Gavel size={27} />
                  <span>
                    <strong>打入流落街头</strong>
                    <em>降至最低职务</em>
                  </span>
                </button>
                <button
                  className="wife-punish-state wife-punish-state--slave"
                  type="button"
                  data-wife-command="slave"
                  data-wife-command-tone="danger"
                  data-wife-command-armed={armedPunish ? "true" : undefined}
                  onClick={confirmPunishStatus}
                >
                  <Shield size={27} />
                  <span>
                    <strong>{armedPunish ? "再次确认执行" : "卖身奴隶状态"}</strong>
                    <em>{armedPunish ? "确认后冻结权益与零花钱" : "冻结权益与零花钱"}</em>
                  </span>
                </button>
              </WifeCommandMotion>
            )}
            {isSlave ? (
              <>
                <div className="wife-punish-progress">
                  恢复进度 {punishment.recoveryExp}/{punishment.requiredRecoveryExp}
                  {" · "}
                  剩余 {remainingDays} 天
                </div>
              </>
            ) : null}
          </AnimatedContent>

          <OrnateSwipeHint
            className="wife-growth-cue"
            direction="up"
            href="#wife-main"
            onClick={handlePageLink("main")}
            text="上滑进入首页"
          />
        </section>

        <section className="wife-hero" id="wife-main" aria-label="老婆端主控台">
          <img
            className="wife-portrait wife-portrait--home"
            src={wifeHomeImage}
            alt=""
          />
          <div className="wife-hero__shade" />

          <ClickSpark>
            <button
              className="wife-return-login-button"
              type="button"
              aria-label="返回登录"
              onClick={onReturnToLogin}
            >
              <img
                src={publicAsset("/assets/ui/return-login.png?v=3f13165c")}
                alt=""
              />
            </button>
          </ClickSpark>

          <AnimatedContent as="header" className="wife-title" duration={360}>
            <p>老妞端</p>
            <h1>老妞宝座</h1>
            <span>赏罚升降，皆由老妞大人裁定</span>
            <VerticalMagicSwipeHint
              className="wife-growth-magic-hint"
              href="#wife-growth"
              onClick={handlePageLink("growth")}
              text="下滑裁定老哥成长"
            />
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-status-card"
            aria-label="老哥当前状态"
            delay={70}
            duration={380}
          >
            <p className="wife-panel-title">
              <span /> 老哥当前状态 <span />
            </p>
            <h2>
              <small>
                {isSlave ? "FINAL" : `Lv. ${String(role.level).padStart(2, "0")}`}
              </small>
              {displayRole.title}
            </h2>

            <div className="wife-exp-line">
              <span>{statusProgressLabel}</span>
              <strong>
                {statusProgressCurrent} / {statusProgressRequired}
              </strong>
            </div>
            <div
              className="wife-progress"
              aria-label={`${statusProgressLabel}进度 ${statusProgressPercent}%`}
            >
              <i style={{ width: `${statusProgressPercent}%` }} />
            </div>

            <div className="wife-salary-line">
              <span>月薪</span>
              <strong>{displayRole.salary}</strong>
              <em className={isSlave ? "wife-salary-status--slave" : undefined}>
                {isSlave ? "· 卖身奴隶状态" : "· 正常服役中"}
              </em>
            </div>
            <p className="wife-next-line">
              {isSlave
                ? "奴隶服役中，周期结束后由老妞大人重新裁定"
                : role.level >= 11
                  ? "已抵达最高职务，赏罚仍由老妞大人裁定"
                  : `距 Lv.${String(role.level + 1).padStart(2, "0")} 下一职务还差 ${expToNext} 经验`}
            </p>
          </AnimatedContent>

          <ChatMessageButton
            className="wife-chat-entry"
            viewer="wife"
            unreadCount={chatUnreadCount}
            onClick={onOpenChat}
          />

          <WifeCommandMotion
            as="nav"
            className="wife-actions"
            aria-label="老婆端快捷操作"
          >
            <button
              className="wife-action wife-action--primary"
              type="button"
              data-wife-command="publish"
              onClick={() => setSheet("task")}
            >
              <FilePenLine size={21} />
              发布任务
            </button>
            <button
              type="button"
              data-wife-command="review"
              data-wife-command-pending={
                submittedTasks.length ? "true" : undefined
              }
              onClick={() => setSheet("review")}
            >
              <ClipboardCheck size={19} />
              审核提交
              {submittedTasks.length ? <b>{submittedTasks.length}</b> : null}
            </button>
            <button
              type="button"
              data-wife-command="benefit"
              data-wife-command-pending={
                pendingBenefits.length ? "true" : undefined
              }
              onClick={() => setSheet("benefit")}
            >
              <ShieldCheck size={19} />
              权益审批
            </button>
          </WifeCommandMotion>

          <a
            className="wife-scroll-cue"
            href="#wife-today"
            onClick={handlePageLink("today")}
          >
            <img
              src={publicAsset("/assets/ui/swipe-up-wife.png")}
              alt="上滑查看今日事务"
            />
          </a>
        </section>

        <section className="wife-today" id="wife-today" aria-label="今日事务">
          <img
            className="wife-today__portrait"
            src={wifeTodayBackground}
            alt=""
          />
          <div className="wife-today__shade" />
          <SwipeBackHint
            href="#wife-main"
            onClick={handlePageLink("main")}
          />

          <AnimatedContent
            as="header"
            className="wife-today-title"
            duration={360}
          >
            <p>老妞端</p>
            <h1>今日事务</h1>
            <span>老妞大人今日需要裁定的事项</span>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-today-card wife-overview"
            aria-label="今日概览"
            delay={50}
            duration={360}
          >
            <h2>今日概览</h2>
            <div className="wife-overview-grid">
              <AnimatedContent as="article" duration={300}>
                <ClipboardList size={44} />
                <span>待裁定</span>
                <strong>{pendingRulingCount}</strong>
                <em>项</em>
                <button
                  className="wife-overview-action"
                  type="button"
                  onClick={() => openSubPage("review")}
                >
                  去处理
                </button>
              </AnimatedContent>
              <AnimatedContent as="article" delay={45} duration={300}>
                <ShieldCheck size={44} />
                <span>待批准</span>
                <strong>{pendingBenefitCount}</strong>
                <em>项</em>
                <button
                  className="wife-overview-action"
                  type="button"
                  onClick={() => openSubPage("benefits")}
                >
                  去处理
                </button>
              </AnimatedContent>
              <AnimatedContent
                as="article"
                className="wife-overview-alert"
                delay={90}
                duration={300}
              >
                <AlertTriangle size={44} />
                <span>异常</span>
                <strong>{abnormalCount}</strong>
                <em>条</em>
                <button
                  className="wife-overview-action"
                  type="button"
                  onClick={() => openSubPage("records")}
                >
                  去处理
                </button>
              </AnimatedContent>
            </div>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-today-card wife-quick-panel"
            aria-label="快速发布"
            delay={110}
            duration={380}
          >
            <h2>快速发布</h2>
            <button
              className="wife-quick-task"
              type="button"
              data-wife-command="quick-publish"
              onClick={() => setSheet("task")}
            >
              <ScrollText size={39} />
              <span>
                <strong>发布新任务</strong>
                <em>安排今日差事</em>
              </span>
              <i aria-hidden="true">›</i>
            </button>
            <p>任务发布后，老哥将在任务中心收到指令。</p>
          </AnimatedContent>

          <AnimatedContent
            as="section"
            className="wife-today-card wife-recent-panel"
            aria-label="最近动态"
            delay={140}
            duration={390}
          >
            <h2>最近动态</h2>
            {recentLog ? (
              <article className="wife-recent-item">
                <div className="wife-affair-icon">
                  <ClipboardCheck size={29} />
                </div>
                <div>
                  <h3>
                    {eventLogRecordLabel(recentLog)} · {recentLog.title}
                  </h3>
                  <p>
                    {[formatLogTime(recentLog.createdAt), recentLog.description]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {recentLog.taskTitle || recentLog.benefitName ? (
                    <strong>
                      {recentLog.taskTitle
                        ? `任务：${recentLog.taskTitle}`
                        : `权益：${recentLog.benefitName}`}
                    </strong>
                  ) : null}
                </div>
                <button type="button" onClick={() => openSubPage("records")}>
                  查看
                  <i aria-hidden="true">›</i>
                </button>
              </article>
            ) : recentSubmittedTask ? (
              <article className="wife-recent-item">
                <div className="wife-affair-icon">
                  <ClipboardCheck size={29} />
                </div>
                <div>
                  <h3>{recentSubmittedTask.title}</h3>
                  <p>
                    {recentSubmittedTask.submitNote ||
                      recentSubmittedTask.resultText ||
                      "老哥已提交完成结果，等待裁定。"}
                  </p>
                  <strong>奖励：{taskRewardText(recentSubmittedTask)}</strong>
                </div>
                <button type="button" onClick={() => openSubPage("review")}>
                  审核
                  <i aria-hidden="true">›</i>
                </button>
              </article>
            ) : (
              <p className="wife-subpage-empty">暂无最近动态。</p>
            )}
          </AnimatedContent>
        </section>
      </div>

      {subPage ? (
        <section className="wife-subpage" aria-label="老婆端子页面">
          <img
            className="wife-subpage__portrait"
            src={wifeTodayBackground}
            alt=""
          />
          <div className="wife-subpage__shade" />
          <a
            className="wife-today-back"
            href="#wife-main"
            onClick={handlePageLink("main")}
          >
            <img
              src={publicAsset("/assets/ui/swipe-down-return.png")}
              alt="下滑返回主页"
            />
          </a>

          {subPage === "tasks" ? (
            <div className="wife-subpage-inner">
              <AnimatedContent as="header" className="wife-subpage-title" duration={340}>
                <p>老妞端</p>
                <h1>任务殿</h1>
                <span>老妞大人发布与查看今日差事</span>
              </AnimatedContent>
              <button
                className="wife-subpage-hero-action"
                type="button"
                onClick={() => setSheet("task")}
              >
                <ScrollText size={34} />
                <span>
                  <strong>发布新任务</strong>
                  <em>安排老哥今日差事</em>
                </span>
                <i aria-hidden="true">›</i>
              </button>
              <div className="wife-subpage-list">
                {tasks.map((task) => (
                  <article key={task.id}>
                    <div className="wife-subpage-icon">
                      <ClipboardList size={25} />
                    </div>
                    <div>
                      <h2>{task.title}</h2>
                      <p>{task.description}</p>
                      <small>
                        {task.timeConfig?.label || task.deadline} ·{" "}
                        {taskRewardText(task)}
                      </small>
                    </div>
                    <span>{taskStatusLabel[task.status]}</span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {subPage === "review" ? (
            <div className="wife-subpage-inner">
              <AnimatedContent as="header" className="wife-subpage-title" duration={340}>
                <p>老妞端</p>
                <h1>审核殿</h1>
                <span>老哥提交的结果，皆待老妞裁定</span>
              </AnimatedContent>
              <div className="wife-subpage-stats">
                <AnimatedContent as="article" duration={300}>
                  <strong>{submittedTasks.length}</strong>
                  <span>待审核</span>
                </AnimatedContent>
                <AnimatedContent as="article" delay={55} duration={300}>
                  <strong>
                    {tasks.filter((task) => task.status === "confirmed").length}
                  </strong>
                  <span>已确认</span>
                </AnimatedContent>
              </div>
              <div className="wife-subpage-list wife-subpage-list--review">
                {submittedTasks.length ? (
                  submittedTasks.map((task) => (
                    <article key={task.id}>
                      <div className="wife-subpage-icon">
                        <Gavel size={25} />
                      </div>
                      <div>
                        <h2>{task.title}</h2>
                        <p>
                          {task.submitNote ||
                            "老哥已提交完成结果，等待老妞大人裁定。"}
                        </p>
                        <small>
                          奖励：{taskRewardText(task)}
                        </small>
                        <div className="wife-review-editor">
                          <input
                            inputMode="numeric"
                            placeholder={`经验 ${taskRewardExp(task)}`}
                            value={reviewEdits[task.id]?.exp ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                exp: event.target.value,
                              })
                            }
                          />
                          <input
                            inputMode="numeric"
                            placeholder={`零花钱 ${taskRewardMoney(task)}`}
                            value={reviewEdits[task.id]?.money ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                money: event.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="额外赏赐"
                            value={reviewEdits[task.id]?.extraRewardName ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                extraRewardName: event.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="追加惩罚"
                            value={reviewEdits[task.id]?.extraPunishment ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                extraPunishment: event.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="打回原因"
                            value={reviewEdits[task.id]?.reason ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                reason: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="wife-subpage-actions">
                        <ClickSpark>
                          <button
                            type="button"
                            onClick={() => rejectWithReason(task)}
                          >
                            打回
                          </button>
                        </ClickSpark>
                        <ClickSpark>
                          <button
                            type="button"
                            onClick={() => approveWithEdit(task)}
                          >
                            确认
                          </button>
                        </ClickSpark>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="wife-subpage-empty">暂无待审核提交。</p>
                )}
              </div>
            </div>
          ) : null}

          {subPage === "benefits" ? (
            <div className="wife-subpage-inner">
              <AnimatedContent as="header" className="wife-subpage-title" duration={340}>
                <p>老妞端</p>
                <h1>权益殿</h1>
                <span>恩准、暂缓，皆由老妞大人决定</span>
              </AnimatedContent>
              <div className="wife-subpage-list wife-subpage-list--benefits">
                {benefits.map((benefit) => {
                  const locked = benefit.levelRequired > progress.level;
                  const pending = Boolean(benefit.pendingRequest);
                  return (
                    <article
                      key={benefit.id}
                      className={locked ? "is-locked" : undefined}
                    >
                      <div className="wife-subpage-icon">
                        <ShieldCheck size={25} />
                      </div>
                      <div>
                        <h2>{benefit.name}</h2>
                        <p>{benefit.description}</p>
                        <small>
                          Lv.{String(benefit.levelRequired).padStart(2, "0")}{" "}
                          解锁 · {benefit.frequency}
                          {pending && benefit.pendingRequest
                            ? ` · 申请于 ${formatLogTime(benefit.pendingRequest.requestedAt)}`
                            : ""}
                        </small>
                        {pending ? (
                          <input
                            className="wife-benefit-reason"
                            placeholder="拒绝原因"
                            value={benefitRejectReasons[benefit.id] ?? ""}
                            onChange={(event) =>
                              setBenefitRejectReasons((current) => ({
                                ...current,
                                [benefit.id]: event.target.value,
                              }))
                            }
                          />
                        ) : null}
                      </div>
                      {locked ? (
                        <span>未解锁</span>
                      ) : pending ? (
                        <div className="wife-subpage-actions">
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() =>
                                onRejectBenefit(
                                  benefit,
                                  benefitRejectReasons[benefit.id],
                                )
                              }
                            >
                              拒绝
                            </button>
                          </ClickSpark>
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() => onApproveBenefit(benefit)}
                            >
                              批准
                            </button>
                          </ClickSpark>
                        </div>
                      ) : (
                        <span>
                          {(benefit.availableBonusCount ?? 0) > 0
                            ? `库存 ${benefit.availableBonusCount}`
                            : benefit.cooldownUntil
                              ? "冷却中"
                              : "可申请"}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {subPage === "records" ? (
            <div className="wife-subpage-inner">
              <AnimatedContent as="header" className="wife-subpage-title" duration={340}>
                <p>老妞端</p>
                <h1>裁定录</h1>
                <span>记录老哥近期表现与老妞裁定</span>
              </AnimatedContent>
              <div className="wife-record-timeline">
                <article>
                  <span />
                  <div>
                    <h2>
                      {isSlave
                        ? "当前状态：卖身奴隶"
                        : `当前职务：Lv.${String(role.level).padStart(2, "0")} ${role.title}`}
                    </h2>
                    <p>
                      {isSlave
                        ? `恢复经验 ${punishment.recoveryExp} / ${punishment.requiredRecoveryExp}，月薪冻结。`
                        : `经验 ${progress.exp} / ${requiredExp}，月薪 ${role.salary}。`}
                    </p>
                  </div>
                </article>
                {walletLedger.slice(0, 8).map((entry) => (
                  <article key={entry.id}>
                    <span />
                    <div>
                      <h2>
                        {walletLedgerRecordLabel(entry)} · {entry.source} ·{" "}
                        {formatLedgerAmount(entry)}
                      </h2>
                      <p>
                        {[
                          formatLogTime(entry.createdAt),
                          entry.taskTitle ? `任务：${entry.taskTitle}` : "",
                          entry.benefitName ? `权益：${entry.benefitName}` : "",
                          entry.note,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </article>
                ))}
                {logs.slice(0, 8).map((log) => (
                  <article key={log.id}>
                    <span />
                    <div>
                      <h2>
                        {eventLogRecordLabel(log)} · {log.title}
                      </h2>
                      <p>
                        {[formatLogTime(log.createdAt), log.description]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {subPage === "order" ? (
            <div className="wife-subpage-inner">
              <AnimatedContent as="header" className="wife-subpage-title" duration={340}>
                <p>老妞端</p>
                <h1>点餐殿</h1>
                <span>老哥想吃什么，先由老妞大人恩准</span>
              </AnimatedContent>
              <div className="wife-order-panel">
                <div>
                  <strong>今日点餐权</strong>
                  <span>
                    {progress.level >= 2 ? "可提交申请" : "尚需继续服役"}
                  </span>
                </div>
                <p>所有点餐都只是申请，最终是否批准以老妞大人裁定为准。</p>
              </div>
              <div className="wife-subpage-list wife-subpage-list--order">
                {orderOptions.map((option) => (
                  <article key={option.name}>
                    <div className="wife-subpage-icon">
                      <Utensils size={25} />
                    </div>
                    <div>
                      <h2>{option.name}</h2>
                      <p>{option.desc}</p>
                      <small>{option.cost}</small>
                    </div>
                    <button type="button" onClick={() => setSheet("benefit")}>
                      申请
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activePage === "today" || subPage ? (
        <nav className="wife-today-tabs" aria-label="今日事务导航">
          <a
            className={!subPage ? "active" : undefined}
            href="#wife-today"
            onClick={handleTodayTab}
          >
            <Crown size={28} />
            今日
          </a>
          <button
            className={subPage === "tasks" ? "active" : undefined}
            type="button"
            onClick={() => openSubPage("tasks")}
          >
            <ClipboardList size={28} />
            任务
          </button>
          <button
            className={subPage === "benefits" ? "active" : undefined}
            type="button"
            onClick={() => openSubPage("benefits")}
          >
            <ShieldCheck size={28} />
            权益
          </button>
          <button
            className={subPage === "records" ? "active" : undefined}
            type="button"
            onClick={() => openSubPage("records")}
          >
            <BookOpen size={28} />
            记录
          </button>
          <button
            className={subPage === "order" ? "active" : undefined}
            type="button"
            onClick={() => openSubPage("order")}
          >
            <Utensils size={28} />
            点餐
          </button>
        </nav>
      ) : null}

      {sheet ? (
        <div className="modal-backdrop wife-sheet-backdrop" role="presentation">
          <section
            className={`wife-sheet${sheet === "task" ? " wife-sheet--task" : ""}`}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="icon-close"
              type="button"
              onClick={() => setSheet(null)}
              aria-label="关闭"
            >
              <X size={22} />
            </button>

            {sheet === "task" ? (
              <>
                <p className="kicker">发布任务</p>
                <div className="task-publisher">
                  <section className="task-publisher-section">
                    <h3>选择任务内容</h3>
                    <div className="task-module-grid">
                      {taskModules.map((module) => (
                        <button
                          className={
                            draft.moduleId === module.id ? "active" : undefined
                          }
                          key={module.id}
                          type="button"
                          onClick={() => selectModule(module.id)}
                        >
                          {module.label}
                        </button>
                      ))}
                    </div>

                    {draft.moduleId === "cleaning" ? (
                      <>
                        <div className="wife-form-grid">
                          <label>
                            {selectedModule.targetLabel}
                            <select
                              value={draft.target}
                              onChange={(event) =>
                                updateDraft("target", event.target.value)
                              }
                            >
                              {(selectedModule.targets ?? []).map((target) => (
                                <option key={target} value={target}>
                                  {target}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {selectedModule.actionLabel}
                            <select
                              value={draft.action}
                              onChange={(event) =>
                                updateDraft("action", event.target.value)
                              }
                            >
                              {(selectedModule.actions ?? []).map((action) => (
                                <option key={action} value={action}>
                                  {action}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {draft.target === "自定义区域" ? (
                          <label>
                            具体区域
                            <input
                              placeholder="请输入具体区域"
                              value={draft.customTarget}
                              onChange={(event) =>
                                updateDraft("customTarget", event.target.value)
                              }
                            />
                          </label>
                        ) : null}
                        <label>
                          任务标题
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              updateDraft("title", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          任务说明
                          <textarea
                            value={draft.description}
                            onChange={(event) =>
                              updateDraft("description", event.target.value)
                            }
                          />
                        </label>
                      </>
                    ) : draft.moduleId === "custom" ? (
                      <>
                        <label>
                          任务标题
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              updateDraft("title", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          任务描述
                          <textarea
                            value={draft.description}
                            onChange={(event) =>
                              updateDraft("description", event.target.value)
                            }
                          />
                        </label>
                        <div className="wife-form-grid">
                          <label>
                            {selectedModule.targetLabel}
                            <input
                              placeholder={selectedModule.targetPlaceholder}
                              value={draft.target}
                              onChange={(event) =>
                                updateDraft("target", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            {selectedModule.actionLabel}
                            <input
                              placeholder={selectedModule.actionPlaceholder}
                              value={draft.action}
                              onChange={(event) =>
                                updateDraft("action", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="wife-form-grid">
                          <label>
                            {selectedModule.targetLabel}
                            <input
                              placeholder={selectedModule.targetPlaceholder}
                              value={draft.target}
                              onChange={(event) =>
                                updateDraft("target", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            {selectedModule.actionLabel}
                            <input
                              placeholder={selectedModule.actionPlaceholder}
                              value={draft.action}
                              onChange={(event) =>
                                updateDraft("action", event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <label>
                          任务标题
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              updateDraft("title", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          任务说明
                          <textarea
                            value={draft.description}
                            onChange={(event) =>
                              updateDraft("description", event.target.value)
                            }
                          />
                        </label>
                      </>
                    )}
                  </section>

                  <section className="task-publisher-section">
                    <h3>选择完成时间</h3>
                    <div className="task-choice-row">
                      {taskTimeOptions.map((option) => (
                        <button
                          className={
                            draft.timeType === option.type ? "active" : undefined
                          }
                          key={option.type}
                          type="button"
                          onClick={() => updateDraft("timeType", option.type)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {draft.timeType === "custom" ? (
                      <label>
                        自定义截止时间
                        <input
                          type="datetime-local"
                          value={draft.customDeadlineAt}
                          onChange={(event) =>
                            updateDraft("customDeadlineAt", event.target.value)
                          }
                        />
                      </label>
                    ) : null}
                    {draft.timeType === "repeat" ? (
                      <div className="wife-form-grid">
                        <label>
                          重复频率
                          <select
                            value={draft.repeatFrequency}
                            onChange={(event) =>
                              updateDraft(
                                "repeatFrequency",
                                event.target
                                  .value as NonNullable<
                                  TaskTimeConfig["repeatFrequency"]
                                >,
                              )
                            }
                          >
                            <option value="daily">每天</option>
                            <option value="weekly">每周</option>
                            <option value="monthly">每月</option>
                            <option value="custom">自定义</option>
                          </select>
                        </label>
                        <label>
                          完成次数
                          <input
                            min="1"
                            type="number"
                            value={draft.repeatCount}
                            onChange={(event) =>
                              updateDraft(
                                "repeatCount",
                                Number(event.target.value),
                              )
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                    <p className="task-time-preview">
                      <CalendarClock size={15} />
                      {draftTimeConfig.label}
                    </p>
                  </section>

                  <section className="task-publisher-section">
                    <h3>设置完成奖励</h3>
                    <div className="reward-add-row">
                      <select
                        value={draft.rewardType}
                        onChange={(event) =>
                          updateDraft(
                            "rewardType",
                            event.target.value as RewardFormType,
                          )
                        }
                      >
                        {taskRewardOptions.map((option) => (
                          <option key={option.type} value={option.type}>
                            {option.label}
                          </option>
                        ))}
                        <option value="experience_allowance">
                          加经验 + 零花钱
                        </option>
                      </select>
                    </div>

                    <div className="reward-editor-list">
                      {draft.rewardType === "experience" ||
                      draft.rewardType === "experience_allowance" ? (
                        <article>
                          <label>
                            奖励经验
                            <input
                              max="30"
                              min="0"
                              type="number"
                              value={draft.rewardExp}
                              onChange={(event) =>
                                updateDraft(
                                  "rewardExp",
                                  clampExperience(Number(event.target.value)),
                                )
                              }
                            />
                          </label>
                        </article>
                      ) : null}
                      {draft.rewardType === "allowance" ||
                      draft.rewardType === "experience_allowance" ? (
                        <article>
                          <label>
                            奖励金额
                            <input
                              min="0"
                              type="number"
                              value={draft.rewardMoney}
                              onChange={(event) =>
                                updateDraft(
                                  "rewardMoney",
                                  Math.max(0, Math.trunc(Number(event.target.value))),
                                )
                              }
                            />
                          </label>
                        </article>
                      ) : null}
                      {draft.rewardType === "level_up" ? (
                        <article>
                          <label>
                            升级数量
                            <input
                              max="1"
                              min="1"
                              type="number"
                              value={draft.levelUpCount}
                              onChange={(event) =>
                                updateDraft(
                                  "levelUpCount",
                                  Math.min(
                                    1,
                                    Math.max(1, Math.trunc(Number(event.target.value))),
                                  ),
                                )
                              }
                            />
                          </label>
                          <p className="wife-sheet-note">
                            第一版固定最多 1 级，确认后结算时不会超过 Lv.11。
                          </p>
                        </article>
                      ) : null}
                      {draft.rewardType === "benefit" ? (
                        <article>
                          <div className="wife-form-grid">
                            <label>
                              权益名称
                              <input
                                list="benefit-reward-names"
                                value={draft.benefitName}
                                onChange={(event) =>
                                  updateDraft("benefitName", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              数量
                              <input
                                min="1"
                                type="number"
                                value={draft.benefitCount}
                                onChange={(event) =>
                                  updateDraft(
                                    "benefitCount",
                                    Math.max(1, Math.trunc(Number(event.target.value))),
                                  )
                                }
                              />
                            </label>
                          </div>
                        </article>
                      ) : null}
                      {draft.rewardType === "custom" ? (
                        <article>
                          <label>
                            自定义奖励名称
                            <input
                              value={draft.customRewardName}
                              onChange={(event) =>
                                updateDraft("customRewardName", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            自定义奖励说明
                            <input
                              value={draft.customRewardDescription}
                              onChange={(event) =>
                                updateDraft(
                                  "customRewardDescription",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </article>
                      ) : null}
                      {draft.rewardType === "none" ? (
                        <article>
                          <p className="wife-sheet-note">
                            本任务不结算经验、零花钱或额外权益。
                          </p>
                        </article>
                      ) : null}
                    </div>
                    <datalist id="benefit-reward-names">
                      {benefitRewardNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </section>

                  <section className="task-publisher-section task-publisher-preview">
                    <h3>确认发布</h3>
                    <article>
                      <span>{selectedModule.label} / 老婆发布</span>
                      <h4>{previewTask.title || "老妞指定任务"}</h4>
                      <p>{previewTask.description}</p>
                      <small>{draftTimeConfig.label}</small>
                      <div className="task-rewards">
                        {taskRewardChips(previewTask).map((chip) => (
                          <span key={chip}>{chip}</span>
                        ))}
                      </div>
                      <em>提交方式：老公完成后提交说明，老妞确认后结算奖励。</em>
                    </article>
                  </section>
                  <button
                    className="task-publisher-quick-submit"
                    type="button"
                    onClick={submitTask}
                  >
                    确定发布
                  </button>
                </div>
              </>
            ) : null}


            {sheet === "level" ? (
              <>
                <p className="kicker">{"\u7B49\u7EA7\u88C1\u5B9A"}</p>
                <h2>{"\u6307\u5B9A\u76EE\u6807\u7B49\u7EA7"}</h2>
                <div className="wife-level-sheet-current">
                  <span>
                    {"\u5F53\u524D"} Lv.
                    {String(role.level).padStart(2, "0")} {displayRole.title}
                  </span>
                  <strong>
                    {"\u76EE\u6807"} Lv.
                    {String(targetLevel).padStart(2, "0")} {" "}
                    {roles[targetLevel]?.title}
                  </strong>
                </div>
                <div
                  className="wife-level-module"
                  aria-label={"\u7B49\u7EA7\u9009\u62E9"}
                >
                  {roles.map((targetRole) => (
                    <button
                      className={
                        targetRole.level === targetLevel ? "active" : undefined
                      }
                      key={targetRole.level}
                      type="button"
                      onClick={() => setTargetLevel(targetRole.level)}
                    >
                      <span>
                        Lv.{String(targetRole.level).padStart(2, "0")}
                      </span>
                      <strong>{targetRole.title}</strong>
                    </button>
                  ))}
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={confirmTargetLevel}
                >
                  {"\u786E\u5B9A\u6307\u5B9A"}
                </button>
              </>
            ) : null}

            {sheet === "review" ? (
              <>
                <p className="kicker">审核提交</p>
                <h2>裁定任务结果</h2>
                <div className="wife-review-list">
                  {submittedTasks.length ? (
                    submittedTasks.map((task) => (
                      <article key={task.id}>
                        <span>{taskRewardText(task)}</span>
                        <h3>{task.title}</h3>
                        <p>
                          {task.submitNote ||
                            "老哥已提交完成结果，等待老妞大人裁定。"}
                        </p>
                        <div className="wife-review-editor">
                          <input
                            inputMode="numeric"
                            placeholder={`经验 ${taskRewardExp(task)}`}
                            value={reviewEdits[task.id]?.exp ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, { exp: event.target.value })
                            }
                          />
                          <input
                            inputMode="numeric"
                            placeholder={`零花钱 ${taskRewardMoney(task)}`}
                            value={reviewEdits[task.id]?.money ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, { money: event.target.value })
                            }
                          />
                          <input
                            placeholder="额外赏赐"
                            value={reviewEdits[task.id]?.extraRewardName ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                extraRewardName: event.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="追加惩罚"
                            value={reviewEdits[task.id]?.extraPunishment ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                extraPunishment: event.target.value,
                              })
                            }
                          />
                          <input
                            placeholder="打回原因"
                            value={reviewEdits[task.id]?.reason ?? ""}
                            onChange={(event) =>
                              updateReviewEdit(task.id, {
                                reason: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() => rejectWithReason(task)}
                            >
                              打回
                            </button>
                          </ClickSpark>
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() => approveWithEdit(task)}
                            >
                              确认
                            </button>
                          </ClickSpark>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="wife-empty">暂无待确认任务。</p>
                  )}
                </div>
              </>
            ) : null}

            {sheet === "benefit" ? (
              <>
                <p className="kicker">权益审批</p>
                <h2>恩准或暂缓</h2>
                <div className="wife-review-list">
                  {pendingBenefits.length ? (
                    pendingBenefits.map((benefit) => (
                      <article key={benefit.id}>
                        <span>{benefit.frequency}</span>
                        <h3>{benefit.name}</h3>
                        <p>{benefit.description}</p>
                        <input
                          placeholder="拒绝原因"
                          value={benefitRejectReasons[benefit.id] ?? ""}
                          onChange={(event) =>
                            setBenefitRejectReasons((current) => ({
                              ...current,
                              [benefit.id]: event.target.value,
                            }))
                          }
                        />
                        <div>
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() =>
                                onRejectBenefit(
                                  benefit,
                                  benefitRejectReasons[benefit.id],
                                )
                              }
                            >
                              拒绝
                            </button>
                          </ClickSpark>
                          <ClickSpark>
                            <button
                              type="button"
                              onClick={() => onApproveBenefit(benefit)}
                            >
                              恩准
                            </button>
                          </ClickSpark>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="wife-empty">暂无待审批权益申请。</p>
                  )}
                </div>
              </>
            ) : null}

            {sheet === "redeem" ? (
              <>
                <p className="kicker">解除最终裁定</p>
                <h2>赎回骆老哥</h2>
                <div className="wife-redeem-summary">
                  <strong>确认赎回后</strong>
                  <p>卖身奴隶状态将立即解除，无需等待剩余天数或恢复经验达标。</p>
                  <p>骆老哥将恢复卖身前的职务、经验与零花钱，冻结权益同步开放。</p>
                </div>
                <div className="wife-redeem-actions">
                  <button type="button" onClick={() => setSheet(null)}>
                    暂不赎回
                  </button>
                  <ClickSpark>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={confirmRedeem}
                    >
                      确认赎回
                    </button>
                  </ClickSpark>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
