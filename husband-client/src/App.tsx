import { useEffect, useMemo, useRef, useState } from "react";
import { useCallback } from "react";
import { useLayoutEffect } from "react";
import {
  AppLoadingPage,
  type LoadingBackdropMode,
  type LoadingPhase,
} from "./components/AppLoadingPage";
import { BenefitPage } from "./components/BenefitPage";
import { DecreeModal } from "./components/DecreeModal";
import {
  HUSBAND_PAGES,
  HusbandVerticalPager,
} from "./components/HusbandVerticalPager";
import { ChatMessagePanel } from "./components/ChatMessagePanel";
import {
  MonthlyAllowanceModal,
  type MonthlyAllowanceModalMode,
} from "./components/MonthlyAllowanceModal";
import { NotificationReplayModal } from "./components/NotificationCenter";
import { RolePage } from "./components/RolePage";
import { SlavePage } from "./components/SlavePage";
import { SlaveRulingModal } from "./components/SlaveRulingModal";
import { StoryModal } from "./components/StoryModal";
import { TaskPage } from "./components/TaskPage";
import { TipAmountModal } from "./components/TipAmountModal";
import {
  WifeDashboard,
  type WifeIllustrationTransitionEvent,
} from "./components/WifeDashboard";
import { PixelTransition } from "./components/effects/PixelTransition";
import {
  RoleUpgradeCinematic,
  type RoleUpgradeCinematicEvent,
} from "./components/effects/RoleUpgradeCinematic";
import {
  SlaveStateCinematic,
  type SlaveStateCinematicEvent,
} from "./components/effects/SlaveStateCinematic";
import {
  TaskRewardFlight,
  type TaskRewardFlightEvent,
} from "./components/effects/TaskRewardFlight";
import { roles as defaultRoles } from "./data/roles";
import {
  benefitForLevel,
  makeNewlyUnlockedBenefitsAvailable,
} from "./data/benefits";
import {
  wifeHomeIllustrationTransitionForLevelChange,
  wifeIllustrationForLevel,
  wifeTaskCompleteIllustration,
} from "./data/wifeIllustrations";
import {
  MIN_LEVEL,
  clampLevel,
  expRequiredForLevel,
  grantExperience,
  progressWithLevelRule,
  roleWithProgress,
  settleConfirmedTasks,
  taskRewardKey,
} from "./game/progression";
import {
  createNormalPunishment,
  createNextSlavePunishment,
  createSlavePunishment,
  isPunishmentCycleComplete,
  loadTaskSystem,
  loadTaskSystemFresh,
  loadTaskSystemSnapshotFresh,
  mergeDecrees,
  mergeTaskSystemStateForSave,
  persistLocalTaskSystem,
  readLocalTaskSystem,
  refreshTaskCycles,
  saveTaskSystem,
  TaskSystemConflictError,
} from "./lib/taskSystem";
import { publicAsset } from "./lib/assets";
import {
  getMaxLevel,
  getRoleByLevel,
  illustrationLayoutFor,
  type AdminConfigState,
} from "./lib/adminConfig";
import {
  preloadRouteAssets,
  type AppRoute,
} from "./lib/preloadAssets";
import { playSoundEffect } from "./lib/soundEffects";
import {
  playRoleBgm,
  playLoginBgm,
  playSlaveBgm,
  playWifeBgm,
  playWifeTaskCompleteBgm,
  registerRoleBgm,
  stopBgm,
  unlockAudio,
} from "./lib/audioManager";
import {
  createChatMessage,
  markChatMessagesRead,
  mergeChatMessages,
  unreadChatCount,
} from "./lib/chatMessages";
import {
  isTaskSubmittableStatus,
  taskStatusAfterApproval,
} from "./lib/taskStatus";
import {
  aggregatePendingExperienceDecrees,
  decreeAcknowledgeIds,
  pendingWifeRoleUpgradeDecrees,
} from "./lib/decreeQueue";
import {
  buildNotificationQueue,
  createNotification,
  hasUnreadNotifications,
  markNotificationSkipped,
  markNotificationViewed,
  mergeNotifications,
  notificationId,
  upsertNotification,
  type NotificationQueueItem,
} from "./lib/notifications";
import { calculateActiveAnomalies } from "./lib/anomalyRules";
import {
  ALIPAY_RECEIVE_URL,
  createMonthlyAllowanceRecord,
  monthKeyForDate,
  monthlyTaskBonus,
  mergeMonthlyAllowanceRecords,
  nextMonthKey,
  openAlipayReceivePage,
  previousMonthKeyForAllowanceMonth,
  refreshMonthlyAllowanceRecord,
  roleAtEndOfMonth,
  updateMonthlyAllowanceStatus,
} from "./lib/monthlyAllowance";
import { taskRewardExp, taskRewardMoney, taskRewardText } from "./lib/taskRewards";
import { LoginPage } from "./pages/LoginPage";
import type {
  Benefit,
  DecreeEvent,
  EventLog,
  MonthlyAllowanceRecord,
  NotificationEvent,
  StoryEvent,
  Task,
  TaskReward,
  TaskReviewDecision,
  ViewKey,
  WalletLedgerEntry,
  ChatMessage,
  ChatSender,
} from "./types/domain";
import "./styles.css";

export type PreviewDirection = "none" | "next" | "prev";
type RouteKey = AppRoute;

const SLAVE_PAGES = {
  BENEFIT: 0,
  STATUS: 1,
  TASK: 2,
} as const;

type LoadedTaskSystem = Awaited<ReturnType<typeof loadTaskSystem>>;

let taskSystemLoadPromise: Promise<LoadedTaskSystem | null> | null = null;
const MIN_LOADING_DURATION_MS = 3_000;
const DAILY_LOADING_STORAGE_KEY = "laoniu.daily-loading-delay-date.v1";
const OPEN_ROUTE_STORAGE_KEY = "laoniu.open-route.v1";
const WIFE_TIP_PENDING_STORAGE_KEY = "laoniu-wife-tip-pending-v1";
let dailyLoadingDelayCompletedInMemory = false;

function loadTaskSystemOnce() {
  if (taskSystemLoadPromise) return taskSystemLoadPromise;

  taskSystemLoadPromise = new Promise<LoadedTaskSystem | null>((resolve) => {
    let settled = false;
    const finish = (state: LoadedTaskSystem | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(state);
    };
    const timeoutId = window.setTimeout(() => finish(null), 8_000);

    loadTaskSystem()
      .then((state) => finish(state))
      .catch(() => finish(null));
  });

  return taskSystemLoadPromise;
}

function isLoadingPreviewRoute(target: Exclude<AppRoute, "login">) {
  return (
    routeFromPathname(window.location.pathname) === target &&
    new URLSearchParams(window.location.search).get("loading-preview") === "1"
  );
}

function adminPreviewParam() {
  return new URLSearchParams(window.location.search).get("admin-preview");
}

function isAdminPreviewRoute(route: RouteKey) {
  const preview = adminPreviewParam();
  if (route === "husband") {
    return preview === "role" || preview === "benefits" || preview === "tasks";
  }
  return route === "wife" && preview === "home";
}

function husbandPageFromAdminPreview() {
  const preview = adminPreviewParam();
  if (preview === "benefits") return HUSBAND_PAGES.BENEFIT;
  if (preview === "tasks") return HUSBAND_PAGES.TASK;
  if (preview === "role") return HUSBAND_PAGES.ROLE;
  return null;
}

function routeFromPathname(pathname: string): RouteKey {
  if (pathname === "/") return "login";
  if (pathname.startsWith("/wife")) return "wife";
  if (pathname.startsWith("/husband")) return "husband";
  return "husband";
}

function todayStorageKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function hasCompletedDailyLoadingDelay() {
  if (dailyLoadingDelayCompletedInMemory) return true;
  try {
    return (
      window.localStorage.getItem(DAILY_LOADING_STORAGE_KEY) ===
      todayStorageKey()
    );
  } catch {
    return dailyLoadingDelayCompletedInMemory;
  }
}

function markDailyLoadingDelayComplete() {
  dailyLoadingDelayCompletedInMemory = true;
  try {
    window.localStorage.setItem(DAILY_LOADING_STORAGE_KEY, todayStorageKey());
  } catch {
    // The in-memory flag still prevents repeated forced waits this session.
  }
}

function rememberOpenRoute(route: Exclude<AppRoute, "login">) {
  try {
    window.sessionStorage.setItem(OPEN_ROUTE_STORAGE_KEY, route);
  } catch {
    // Session resume is an enhancement; normal loading still works without it.
  }
}

function clearOpenRoute() {
  try {
    window.sessionStorage.removeItem(OPEN_ROUTE_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

function canResumeOpenRouteWithoutLoading(
  route: RouteKey,
  loadingPreview: boolean,
) {
  if (route === "login" || loadingPreview || !hasCompletedDailyLoadingDelay()) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(OPEN_ROUTE_STORAGE_KEY) === route;
  } catch {
    return false;
  }
}

function createPendingWifeTip() {
  const pending = {
    id: `wife-tip-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    startedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(
      WIFE_TIP_PENDING_STORAGE_KEY,
      JSON.stringify(pending),
    );
  } catch {
    // If localStorage is unavailable, the current session can still continue.
  }
  return pending;
}

function readPendingWifeTip() {
  try {
    const raw = window.localStorage.getItem(WIFE_TIP_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { id?: unknown; startedAt?: unknown };
    if (typeof value.id !== "string") return null;
    return {
      id: value.id,
      startedAt:
        typeof value.startedAt === "string"
          ? value.startedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function clearPendingWifeTip() {
  try {
    window.localStorage.removeItem(WIFE_TIP_PENDING_STORAGE_KEY);
  } catch {
    // Nothing else to clean up when storage is blocked.
  }
}

function ledgerId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function decreeId() {
  return `decree-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function taskSystemFingerprint(state: LoadedTaskSystem) {
  return JSON.stringify({
    progress: state.progress,
    roles: state.roles,
    tasks: state.tasks,
    logs: state.logs,
    punishment: state.punishment,
    benefits: state.benefits,
    walletLedger: state.walletLedger,
    decrees: state.decrees,
    monthlyAllowances: state.monthlyAllowances,
    notifications: state.notifications,
    chatMessages: state.chatMessages,
    adminConfig: state.adminConfig,
  });
}

function formatDateTime(value?: string) {
  if (!value) return "暂无记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

function benefitCooldownMs(benefit: Benefit) {
  if (benefit.frequency.includes("3月")) return 90 * 24 * 60 * 60 * 1000;
  if (benefit.frequency.includes("2月")) return 60 * 24 * 60 * 60 * 1000;
  if (benefit.frequency.includes("2周")) return 14 * 24 * 60 * 60 * 1000;
  if (benefit.frequency.includes("周")) return 7 * 24 * 60 * 60 * 1000;
  if (benefit.frequency.includes("季")) return 90 * 24 * 60 * 60 * 1000;
  if (benefit.frequency.includes("月")) return 30 * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function benefitMatchesReward(benefit: Benefit, reward: TaskReward) {
  const name = reward.benefitName || reward.label;
  if (!name) return false;
  return benefit.id === name || benefit.name.includes(name) || name.includes(benefit.name);
}

function taskRewards(task: Task): TaskReward[] {
  if (task.rewards?.length) return task.rewards;
  return [
    {
      id: `${task.id}-legacy-exp`,
      type: "experience",
      label: `${task.rewardExp}经验`,
      value: task.rewardExp,
      unit: "经验",
    },
    ...(task.rewardMoney
      ? [
          {
            id: `${task.id}-legacy-money`,
            type: "allowance" as const,
            label: `${task.rewardMoney}元`,
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
}

function ledgerEntriesFromTask(task: Task, createdAt: string): WalletLedgerEntry[] {
  return taskRewards(task)
    .map((reward): WalletLedgerEntry | null => {
      const amount = Math.max(0, Math.trunc(reward.value ?? 0));
      if (reward.type === "experience" && amount > 0) {
        return {
          id: ledgerId("ledger-exp"),
          type: "experience",
          source: "任务奖励",
          amount,
          unit: "EXP",
          createdAt,
          taskId: task.id,
          taskTitle: task.title,
          note: reward.label,
        };
      }
      if (reward.type === "allowance" && amount > 0) {
        return null;
      }
      if (reward.type === "level_up") {
        return {
          id: ledgerId("ledger-level"),
          type: "level_up",
          source: "任务奖励",
          amount: Math.max(1, amount || 1),
          unit: "LEVEL",
          createdAt,
          taskId: task.id,
          taskTitle: task.title,
          note: reward.label,
        };
      }
      if (reward.type === "benefit") {
        const count = Math.max(1, amount || 1);
        return {
          id: ledgerId("ledger-benefit"),
          type: "benefit",
          source: "任务奖励",
          amount: count,
          unit: "BENEFIT",
          createdAt,
          taskId: task.id,
          taskTitle: task.title,
          benefitName: reward.benefitName || reward.label,
          note: reward.label,
        };
      }
      if (reward.type === "custom") {
        return {
          id: ledgerId("ledger-custom"),
          type: "custom",
          source: "任务奖励",
          amount: 1,
          unit: "COUNT",
          createdAt,
          taskId: task.id,
          taskTitle: task.title,
          note: reward.customName || reward.label,
        };
      }
      return null;
    })
    .filter((entry): entry is WalletLedgerEntry => Boolean(entry));
}

export default function App() {
  const initialState = useMemo(readLocalTaskSystem, []);
  const initialRoute = useRef<RouteKey>(
    routeFromPathname(window.location.pathname),
  ).current;
  const initialLoadingPreview = useRef(
    initialRoute !== "login" && isLoadingPreviewRoute(initialRoute),
  ).current;
  const initialAdminPreview = useRef(
    initialRoute !== "login" && isAdminPreviewRoute(initialRoute),
  ).current;
  const initialAdminPreviewPage = useRef(
    initialRoute === "husband" ? husbandPageFromAdminPreview() : null,
  ).current;
  const shouldShowInitialLoading = useRef(
    initialRoute !== "login" &&
      !initialAdminPreview &&
      !canResumeOpenRouteWithoutLoading(initialRoute, initialLoadingPreview),
  ).current;
  const [route, setRoute] = useState<RouteKey>(initialRoute);
  const [activePage, setActivePage] = useState<number>(
    initialAdminPreviewPage ?? HUSBAND_PAGES.ROLE,
  );
  const [slaveActivePage, setSlaveActivePage] = useState<number>(
    SLAVE_PAGES.STATUS,
  );
  const [progress, setProgress] = useState(initialState.progress);
  const [resolvedRoles, setResolvedRoles] = useState(initialState.roles);
  const [adminConfig, setAdminConfig] = useState<AdminConfigState>(
    initialState.adminConfig,
  );
  const [previewLevel, setPreviewLevel] = useState(initialState.progress.level);
  const [previewDirection, setPreviewDirection] =
    useState<PreviewDirection>("none");
  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [logs, setLogs] = useState<EventLog[]>(initialState.logs);
  const [punishment, setPunishment] = useState(initialState.punishment);
  const [benefits, setBenefits] = useState<Benefit[]>(initialState.benefits);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>(
    initialState.walletLedger,
  );
  const [decrees, setDecrees] = useState<DecreeEvent[]>(initialState.decrees);
  const [notifications, setNotifications] = useState<NotificationEvent[]>(
    initialState.notifications,
  );
  const [monthlyAllowances, setMonthlyAllowances] = useState<
    MonthlyAllowanceRecord[]
  >(initialState.monthlyAllowances);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [story, setStory] = useState<StoryEvent | null>(null);
  const [wifeTaskCompleteIllustrationActive, setWifeTaskCompleteIllustrationActive] =
    useState(false);
  const [monthlyAllowanceModalMode, setMonthlyAllowanceModalMode] =
    useState<MonthlyAllowanceModalMode | null>(null);
  const [tipAmountModalOpen, setTipAmountModalOpen] = useState(false);
  const [showSlaveRuling, setShowSlaveRuling] = useState(
    initialRoute === "wife" &&
      !shouldShowInitialLoading &&
      isPunishmentCycleComplete(initialState.punishment),
  );
  const [husbandSyncReady, setHusbandSyncReady] = useState(false);
  const [taskSystemReady, setTaskSystemReady] = useState(false);
  const [anomalyClock, setAnomalyClock] = useState(() => Date.now());
  const [decreeError, setDecreeError] = useState<string>();
  const [saveRetryNonce, setSaveRetryNonce] = useState(0);
  const [loadingTarget, setLoadingTarget] = useState<AppRoute | null>(
    shouldShowInitialLoading ? initialRoute : null,
  );
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(shouldShowInitialLoading);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("loading");
  const [isLoadingPreview, setIsLoadingPreview] =
    useState(initialLoadingPreview);
  const [loadingBackdropMode, setLoadingBackdropMode] =
    useState<LoadingBackdropMode>(shouldShowInitialLoading ? "room" : "current");
  const hasLoadedServerState = useRef(false);
  const loadingAttemptRef = useRef(0);
  const navigationLockedRef = useRef(shouldShowInitialLoading);
  const loadingPushHistoryRef = useRef(false);
  const pixelTransitionActionRef = useRef<(() => void) | null>(null);
  const decreesRef = useRef(initialState.decrees);
  const notificationsRef = useRef(initialState.notifications);
  const monthlyAllowancesRef = useRef(initialState.monthlyAllowances);
  const chatMessagesRef = useRef(initialState.chatMessages);
  const lastRemoteFingerprintRef = useRef<string | null>(null);
  const lastAppliedRemoteStateRef = useRef<LoadedTaskSystem | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveGenerationRef = useRef(0);
  const localSavePendingRef = useRef(false);
  const saveRetryTimerRef = useRef<number | undefined>(undefined);
  const syncErrorShownRef = useRef(false);
  const allowanceSessionLocksRef = useRef(new Set<string>());
  const allowanceCreditLocksRef = useRef(new Set<string>());
  const [pixelTransitionKey, setPixelTransitionKey] = useState(0);
  const [roleUpgradeCinematic, setRoleUpgradeCinematic] =
    useState<RoleUpgradeCinematicEvent | null>(null);
  const [wifeIllustrationTransition, setWifeIllustrationTransition] =
    useState<WifeIllustrationTransitionEvent | null>(null);
  const [taskRewardFlight, setTaskRewardFlight] =
    useState<TaskRewardFlightEvent | null>(null);
  const [slaveStateCinematic, setSlaveStateCinematic] =
    useState<SlaveStateCinematicEvent | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    initialState.chatMessages,
  );
  const [activeChatViewer, setActiveChatViewer] = useState<ChatSender | null>(
    null,
  );
  const [activeNotificationViewer, setActiveNotificationViewer] =
    useState<ChatSender | null>(null);
  const [decreeAutoPaused, setDecreeAutoPaused] = useState(false);
  const [skippedMonthlyNotificationIds, setSkippedMonthlyNotificationIds] =
    useState<Set<string>>(() => new Set());
  const roles = resolvedRoles.length ? resolvedRoles : defaultRoles;
  const maxLevel = getMaxLevel(roles);

  useEffect(() => {
    return () => {
      if (saveRetryTimerRef.current !== undefined) {
        window.clearTimeout(saveRetryTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    roles.forEach((role) => {
      const bgm = "bgm" in role && typeof role.bgm === "string" ? role.bgm : undefined;
      registerRoleBgm(role.level, bgm);
    });
  }, [roles]);

  useEffect(() => {
    const handleFirstAudioGesture = () => {
      unlockAudio();
    };
    const options: AddEventListenerOptions = { capture: true, once: true };
    window.addEventListener("pointerdown", handleFirstAudioGesture, options);
    window.addEventListener("touchstart", handleFirstAudioGesture, options);
    window.addEventListener("keydown", handleFirstAudioGesture, options);
    return () => {
      window.removeEventListener("pointerdown", handleFirstAudioGesture, true);
      window.removeEventListener("touchstart", handleFirstAudioGesture, true);
      window.removeEventListener("keydown", handleFirstAudioGesture, true);
    };
  }, []);

  const runPixelTransition = useCallback((action: () => void) => {
    playSoundEffect("pixel-transition-cover");
    pixelTransitionActionRef.current = action;
    setPixelTransitionKey((current) => current + 1);
  }, []);

  const showRoleUpgradeCinematic = useCallback(
    (fromLevel: number, toLevel: number) => {
      if (toLevel <= fromLevel) return;
      if (route === "wife") return;
      const fromRole = getRoleByLevel(roles, clampLevel(fromLevel, maxLevel));
      const toRole = getRoleByLevel(roles, clampLevel(toLevel, maxLevel));
      setRoleUpgradeCinematic({
        id: `role-upgrade-${Date.now()}-${fromLevel}-${toLevel}`,
        fromLevel,
        toLevel,
        fromRoleName: fromRole.title,
        toRoleName: toRole.title,
        fromRoleImage: fromRole.roleImage,
        toRoleImage: toRole.roleImage,
      });
    },
    [route],
  );

  const handlePixelCovered = useCallback(() => {
    playSoundEffect("pixel-transition-reveal");
    const action = pixelTransitionActionRef.current;
    pixelTransitionActionRef.current = null;
    action?.();
  }, []);

  const currentRole = roleWithProgress(
    getRoleByLevel(roles, progress.level),
    progress,
    maxLevel,
  );
  const previewRole = roleWithProgress(
    getRoleByLevel(roles, previewLevel),
    progress,
    maxLevel,
  );
  const previewRoleIllustrationLayout = illustrationLayoutFor(
    adminConfig,
    `role-${previewRole.level}`,
  );
  const previewBenefitIllustrationLayout = illustrationLayoutFor(
    adminConfig,
    `role-benefit-${previewRole.level}`,
  );
  const wifeIllustrationLayouts = {
    home: illustrationLayoutFor(adminConfig, "wife-home"),
    growth: illustrationLayoutFor(adminConfig, "wife-growth"),
    today: illustrationLayoutFor(adminConfig, "wife-today"),
  };
  const wifeChatIllustration = wifeTaskCompleteIllustrationActive
    ? wifeTaskCompleteIllustration
    : wifeIllustrationForLevel(progress.level);
  const chatAvatars = {
    husband:
      punishment.status === "slave"
        ? publicAsset("/assets/slave/slave-page-latest.png")
        : currentRole.roleImage,
    wife: publicAsset(
      wifeChatIllustration?.homePath ?? "/assets/wife/wife-home-throne.png",
    ),
  };

  useEffect(() => {
    if (isLoading) {
      stopBgm();
      return;
    }

    if (route === "login") {
      playLoginBgm();
      return;
    }

    if (punishment.status === "slave") {
      playSlaveBgm();
      return;
    }

    if (route === "wife") {
      if (wifeTaskCompleteIllustrationActive) {
        playWifeTaskCompleteBgm();
        return;
      }
      playWifeBgm(progress.level);
      return;
    }

    if (
      route === "husband" &&
      (activePage === HUSBAND_PAGES.ROLE ||
        activePage === HUSBAND_PAGES.BENEFIT)
    ) {
      playRoleBgm(progress.level);
      return;
    }

    stopBgm();
  }, [
    activePage,
    isLoading,
    progress.level,
    punishment.status,
    route,
    wifeTaskCompleteIllustrationActive,
  ]);

  const currentAllowanceMonth = monthKeyForDate();
  const nextAllowanceMonth = nextMonthKey();
  const roleForAllowanceMonth = useCallback(
    (allowanceMonth: string) =>
      roleAtEndOfMonth({
        currentLevel: progress.level,
        logs,
        month: previousMonthKeyForAllowanceMonth(allowanceMonth),
        roles,
      }),
    [logs, progress.level],
  );
  const currentMonthlyAllowance = monthlyAllowances.find(
    (record) => record.month === currentAllowanceMonth,
  );
  const nextMonthlyAllowance = monthlyAllowances.find(
    (record) => record.month === nextAllowanceMonth,
  );
  const nextAllowanceRole = roleForAllowanceMonth(nextAllowanceMonth);
  const nextAllowanceSettlementMonth =
    nextMonthlyAllowance?.settlementMonth ??
    previousMonthKeyForAllowanceMonth(nextAllowanceMonth);
  const nextAllowanceTaskStats =
    nextMonthlyAllowance ??
    monthlyTaskBonus(tasks, nextAllowanceSettlementMonth);
  const nextAllowanceBaseSalary =
    nextMonthlyAllowance?.baseSalary ?? nextAllowanceRole.salary;
  const nextAllowanceAdjustment =
    nextMonthlyAllowance?.wifeAdjustmentAmount ?? 0;
  const nextAllowanceTotal =
    nextMonthlyAllowance?.totalAmount ??
    Math.max(
      0,
      Math.trunc(nextAllowanceBaseSalary) +
        Math.trunc(nextAllowanceTaskStats.taskBonus) +
        Math.trunc(nextAllowanceAdjustment),
    );
  const activeAnomalies = useMemo(
    () =>
      calculateActiveAnomalies({
        logs,
        now: new Date(anomalyClock),
        tasks,
        walletLedger,
      }),
    [anomalyClock, logs, tasks, walletLedger],
  );
  const husbandChatUnreadCount = unreadChatCount(chatMessages, "husband");
  const wifeChatUnreadCount = unreadChatCount(chatMessages, "wife");

  const sortedBenefits = useMemo(() => {
    return [...benefits].sort((a, b) => a.levelRequired - b.levelRequired);
  }, [benefits]);
  const currentLevelBenefits = useMemo(
    () => sortedBenefits.map((benefit) => benefitForLevel(benefit, progress.level)),
    [progress.level, sortedBenefits],
  );

  const pendingDecrees = useMemo(
    () =>
      aggregatePendingExperienceDecrees(
        decrees
          .filter((decree) => decree.target === "husband" && !decree.acknowledgedAt)
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
      ),
    [decrees],
  );
  const activeDecree =
    route === "husband" && husbandSyncReady && !decreeAutoPaused
      ? pendingDecrees[0] ?? null
      : null;
  const activeHusbandUpgradeDecree =
    activeDecree?.type === "level_changed" &&
    Number(activeDecree.payload.toLevel) > Number(activeDecree.payload.fromLevel)
      ? activeDecree
      : null;
  const pendingWifeUpgradeDecrees = useMemo(
    () => pendingWifeRoleUpgradeDecrees(decrees),
    [decrees],
  );
  const activeWifeUpgradeDecree =
    route === "wife" && taskSystemReady
      ? pendingWifeUpgradeDecrees[0] ?? null
      : null;
  const husbandNotificationQueue = useMemo(
    () =>
      buildNotificationQueue({
        decrees: pendingDecrees,
        notifications,
        target: "husband",
      }),
    [notifications, pendingDecrees],
  );
  const wifeNotificationQueue = useMemo(
    () =>
      buildNotificationQueue({
        decrees,
        notifications,
        target: "wife",
      }),
    [decrees, notifications],
  );
  const activeNotificationQueue =
    activeNotificationViewer === "wife"
      ? wifeNotificationQueue
      : activeNotificationViewer === "husband"
        ? husbandNotificationQueue
        : [];
  const activeNotificationItem = activeNotificationQueue[0] ?? null;
  const hasHusbandNotificationUnread =
    hasUnreadNotifications(husbandNotificationQueue);
  const hasWifeNotificationUnread = hasUnreadNotifications(wifeNotificationQueue);
  const hasVisibleWifeStoryModal =
    route === "wife" && Boolean(story && !showSlaveRuling && !activeWifeUpgradeDecree);
  const hasVisibleWifeMonthlyAllowanceModal =
    route === "wife" &&
    Boolean(monthlyAllowanceModalMode && currentMonthlyAllowance && !activeWifeUpgradeDecree);
  const hasVisibleWifeNotificationModal =
    route === "wife" && Boolean(activeNotificationItem && !activeWifeUpgradeDecree);
  const wifeIllustrationTransitionBlocked =
    route === "wife" &&
    Boolean(
      activeWifeUpgradeDecree ||
        hasVisibleWifeStoryModal ||
        hasVisibleWifeMonthlyAllowanceModal ||
        hasVisibleWifeNotificationModal ||
        (showSlaveRuling && !activeWifeUpgradeDecree) ||
        tipAmountModalOpen ||
        activeChatViewer ||
        isLoading ||
        roleUpgradeCinematic ||
        taskRewardFlight ||
        slaveStateCinematic,
    );

  const applyRemoteState = useCallback((
    serverState: LoadedTaskSystem,
    force = false,
  ) => {
    // A periodic read can finish after a local command but before its debounced
    // write. Keep that stale response from undoing the command in the UI.
    if (localSavePendingRef.current && !force) return false;

    const mergedDecrees = mergeDecrees(
      serverState.decrees,
      decreesRef.current,
    );
    const mergedMonthlyAllowances = mergeMonthlyAllowanceRecords(
      serverState.monthlyAllowances,
      monthlyAllowancesRef.current,
    );
    const mergedNotifications = mergeNotifications(
      serverState.notifications,
      notificationsRef.current,
    );
    const mergedChatMessages = mergeChatMessages(
      serverState.chatMessages,
      chatMessagesRef.current,
    );
    lastRemoteFingerprintRef.current = taskSystemFingerprint(serverState);
    lastAppliedRemoteStateRef.current = serverState;
    decreesRef.current = mergedDecrees;
    notificationsRef.current = mergedNotifications;
    monthlyAllowancesRef.current = mergedMonthlyAllowances;
    chatMessagesRef.current = mergedChatMessages;
    setProgress(serverState.progress);
    setResolvedRoles(serverState.roles);
    setAdminConfig(serverState.adminConfig);
    setTasks(serverState.tasks);
    setLogs(serverState.logs);
    setPunishment(serverState.punishment);
    setBenefits(serverState.benefits);
    setWalletLedger(serverState.walletLedger);
    setDecrees(mergedDecrees);
    setNotifications(mergedNotifications);
    setMonthlyAllowances(mergedMonthlyAllowances);
    setChatMessages(mergedChatMessages);
    return true;
  }, []);

  const enqueueSave = useCallback(
    <T,>(operation: () => Promise<T>) => {
      const result = saveQueueRef.current
        .catch(() => undefined)
        .then(operation);
      saveQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [],
  );

  const commitStateWithRetry = useCallback(
    async (buildState: (serverState: LoadedTaskSystem) => LoadedTaskSystem) => {
      let lastConflict: TaskSystemConflictError | undefined;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const snapshot = await loadTaskSystemSnapshotFresh();
        const nextState = buildState(snapshot.state);
        try {
          await saveTaskSystem(nextState, snapshot.revision);
          return nextState;
        } catch (error) {
          if (!(error instanceof TaskSystemConflictError)) throw error;
          lastConflict = error;
        }
      }
      throw lastConflict ?? new Error("任务状态冲突，请重试。");
    },
    [],
  );

  const commitLoadedRoute = useCallback(
    (target: Exclude<AppRoute, "login">, pushHistory: boolean) => {
      const nextPath = target === "husband" ? "/husband" : "/wife";
      if (pushHistory && window.location.pathname !== nextPath) {
        window.history.pushState(null, "", nextPath);
      }
      rememberOpenRoute(target);
      setRoute(target);
      setLoadingPercent(100);
      setLoadingPhase("loading");
      setIsLoadingPreview(false);
      setIsLoading(false);
      setLoadingTarget(null);
      navigationLockedRef.current = false;
    },
    [],
  );

  const runLoadingAttempt = useCallback(
    (
      target: Exclude<AppRoute, "login">,
      pushHistory: boolean,
      backdropMode: LoadingBackdropMode = "current",
    ) => {
      const attempt = loadingAttemptRef.current + 1;
      const previewMode = isLoadingPreviewRoute(target);
      const enforceMinimumDuration =
        !previewMode && !hasCompletedDailyLoadingDelay();
      loadingAttemptRef.current = attempt;
      loadingPushHistoryRef.current = pushHistory;
      navigationLockedRef.current = true;
      setLoadingTarget(target);
      setLoadingBackdropMode(backdropMode);
      setLoadingPercent(1);
      setLoadingPhase("loading");
      setIsLoadingPreview(previewMode);
      setIsLoading(true);

      const assetRequest = preloadRouteAssets(
        target,
        enforceMinimumDuration
          ? undefined
          : (percent) => {
              if (loadingAttemptRef.current !== attempt) return;
              setLoadingPercent(Math.max(1, Math.min(99, percent)));
            },
      );
      const visualProgressRequest = enforceMinimumDuration
        ? new Promise<void>((resolve) => {
            const startedAt = window.performance.now();
            let settled = false;
            const finish = (showFinalProgress: boolean) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(fallbackTimer);
              if (showFinalProgress && loadingAttemptRef.current === attempt) {
                setLoadingPercent(99);
                markDailyLoadingDelayComplete();
              }
              resolve();
            };
            const fallbackTimer = window.setTimeout(
              () => finish(true),
              MIN_LOADING_DURATION_MS,
            );
            const updateProgress = (now: number) => {
              if (settled) return;
              if (loadingAttemptRef.current !== attempt) {
                finish(false);
                return;
              }

              const elapsed = now - startedAt;
              const percent = 1 + (elapsed / MIN_LOADING_DURATION_MS) * 98;
              setLoadingPercent(Math.min(99, Math.floor(percent)));

              if (elapsed >= MIN_LOADING_DURATION_MS) {
                finish(true);
                return;
              }

              window.requestAnimationFrame(updateProgress);
            };

            window.requestAnimationFrame(updateProgress);
          })
        : Promise.resolve();

      Promise.all([
        assetRequest,
        loadTaskSystemOnce(),
        visualProgressRequest,
      ])
        .then(([assetResult]) => {
          if (loadingAttemptRef.current !== attempt) return;
          if (previewMode) {
            setLoadingPercent(100);
            setLoadingPhase("ready");
            return;
          }
          if (assetResult.failed.length > 0) {
            setLoadingPhase("error");
            return;
          }
          setLoadingPercent(100);
          setLoadingPhase("ready");
        })
        .catch(() => {
          if (loadingAttemptRef.current !== attempt) return;
          if (previewMode) {
            setLoadingPercent(100);
            setLoadingPhase("ready");
            return;
          }
          setLoadingPhase("error");
        });
    },
    [],
  );

  function addLog(
    log: Omit<EventLog, "id" | "createdAt"> & { createdAt?: string },
  ) {
    const createdAt = log.createdAt ?? new Date().toISOString();
    const nextLog: EventLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt,
    };
    setLogs((current) => [
      nextLog,
      ...current,
    ]);
    return nextLog;
  }

  useEffect(() => {
    const refreshAnomalyClock = () => setAnomalyClock(Date.now());
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAnomalyClock();
      }
    };
    const intervalId = window.setInterval(
      refreshAnomalyClock,
      60 * 60 * 1000,
    );
    window.addEventListener("focus", refreshAnomalyClock);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshAnomalyClock);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!taskSystemReady || !activeAnomalies.length) return;
    setLogs((current) => {
      const existingKeys = new Set(
        current
          .map((log) => log.anomalyKey)
          .filter((key): key is string => Boolean(key)),
      );
      const missing = activeAnomalies.filter(
        (anomaly) => !existingKeys.has(anomaly.key),
      );
      if (!missing.length) return current;
      const nextLogs: EventLog[] = missing.map((anomaly) => ({
        id: `log-anomaly-${anomaly.key}-${Date.now()}`,
        type: "anomaly",
        title: anomaly.title,
        description: anomaly.description,
        createdAt: anomaly.createdAt,
        anomalyKey: anomaly.key,
        anomalyCategory: anomaly.category,
        anomalySeverity: anomaly.severity,
      }));
      return [...nextLogs, ...current];
    });
  }, [activeAnomalies, taskSystemReady]);

  function appendDecree(
    decree: Omit<DecreeEvent, "id" | "createdAt" | "target"> & {
      createdAt?: string;
      target?: DecreeEvent["target"];
    },
  ) {
    const nextDecree: DecreeEvent = {
      ...decree,
      id: decreeId(),
      createdAt: decree.createdAt ?? new Date().toISOString(),
      target: decree.target ?? "husband",
    };
    setDecrees((current) => [...current, nextDecree]);
    return nextDecree;
  }

  function appendWifeRoleUpgradeDecree({
    fromLevel,
    toLevel,
    createdAt,
    sourceLogId,
    reason,
  }: {
    fromLevel: number;
    toLevel: number;
    createdAt: string;
    sourceLogId?: string;
    reason: string;
  }) {
    const safeFromLevel = clampLevel(fromLevel, maxLevel);
    const safeToLevel = clampLevel(toLevel, maxLevel);
    if (safeToLevel <= safeFromLevel) return;

    const notificationKey =
      sourceLogId ?? `${safeFromLevel}-${safeToLevel}-${createdAt}`;
    const nextDecree: DecreeEvent = {
      id: decreeId(),
      type: "level_changed",
      title: "老哥职务变化",
      text: `老哥已由「${getRoleByLevel(roles, safeFromLevel).title}」晋升为「${getRoleByLevel(roles, safeToLevel).title}」。`,
      tone: "upgrade",
      createdAt,
      target: "wife",
      sourceLogId,
      payload: {
        fromLevel: safeFromLevel,
        toLevel: safeToLevel,
        reason,
        notificationKey,
      },
    };

    setDecrees((current) => {
      const alreadyExists = current.some((decree) => {
        if (decree.target !== "wife" || decree.type !== "level_changed") {
          return false;
        }
        return (
          (Boolean(sourceLogId) && decree.sourceLogId === sourceLogId) ||
          decree.payload.notificationKey === notificationKey
        );
      });
      return alreadyExists ? current : [...current, nextDecree];
    });
  }

  function addLedger(
    entry: Omit<WalletLedgerEntry, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ) {
    const createdAt = entry.createdAt ?? new Date().toISOString();
    setWalletLedger((current) => [
      {
        ...entry,
        id: entry.id ?? ledgerId("ledger"),
        createdAt,
      },
      ...current,
    ]);
    return addLog({
      type: "wallet_ledger",
      title: entry.source,
      description: entry.note,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      benefitId: entry.benefitId,
      benefitName: entry.benefitName,
      amount: entry.amount,
      unit: entry.unit,
      createdAt,
    });
  }

  function appendNotification(notification: NotificationEvent) {
    setNotifications((current) => {
      const existing = current.find((item) => item.id === notification.id);
      if (
        existing &&
        existing.title === notification.title &&
        existing.text === notification.text &&
        existing.viewedAt === notification.viewedAt &&
        existing.skippedAt === notification.skippedAt
      ) {
        return current;
      }
      return upsertNotification(current, notification);
    });
    return notification;
  }

  function showStory(
    nextStory: StoryEvent,
    options: {
      notify?: boolean;
      target?: ChatSender;
      sourceId?: string;
      createdAt?: string;
    } = {},
  ) {
    if (!options.notify) {
      setStory(nextStory);
      return;
    }

    const target =
      options.target ?? (route === "wife" ? "wife" : "husband");
    const sourceId =
      options.sourceId ??
      `story-${target}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const notification = appendNotification(
      createNotification({
        target,
        source: "story",
        sourceId,
        title: nextStory.title,
        text: nextStory.text,
        tone: nextStory.tone ?? "normal",
        createdAt: options.createdAt,
      }),
    );
    setStory({ ...nextStory, notificationId: notification.id });
  }

  function monthlyAllowanceNotificationSourceId(
    mode: MonthlyAllowanceModalMode,
    record: MonthlyAllowanceRecord,
  ) {
    return `monthly-${mode}-${record.id}`;
  }

  function monthlyAllowanceNotification(
    mode: MonthlyAllowanceModalMode,
    record: MonthlyAllowanceRecord,
  ) {
    const sourceId = monthlyAllowanceNotificationSourceId(mode, record);
    if (mode === "wife-confirm") {
      return createNotification({
        target: "wife",
        source: "monthly_allowance",
        sourceId,
        title: "确认本月赏赐",
        text: `${record.month} 的零花钱等待老妞大人确认，合计 ¥${record.totalAmount}。`,
        tone: "upgrade",
        payload: { mode, recordId: record.id },
      });
    }
    if (mode === "wife-dispute") {
      return createNotification({
        target: "wife",
        source: "monthly_allowance",
        sourceId,
        title: "老哥说没收到",
        text: `${record.month} 的赏赐被老哥标记为未收到，请重新处理或裁定。`,
        tone: "down",
        payload: { mode, recordId: record.id },
      });
    }
    if (mode === "husband-paid") {
      return createNotification({
        target: "husband",
        source: "monthly_allowance",
        sourceId,
        title: "本月赏赐已发",
        text: `老妞大人确认发放 ${record.month} 零花钱，合计 ¥${record.totalAmount}。`,
        tone: "upgrade",
        payload: { mode, recordId: record.id },
      });
    }
    if (mode === "husband-rebuked") {
      return createNotification({
        target: "husband",
        source: "monthly_allowance",
        sourceId,
        title: "不许再闹",
        text: "老妞大人裁定赏赐已经发出，不许再闹。",
        tone: "punish",
        payload: { mode, recordId: record.id },
      });
    }
    if (mode === "husband-cancelled") {
      return createNotification({
        target: "husband",
        source: "monthly_allowance",
        sourceId,
        title: "本月赏赐取消",
        text: "老妞大人裁定本月赏赐取消，暂不发放。",
        tone: "punish",
        payload: { mode, recordId: record.id },
      });
    }
    return null;
  }

  function ensureMonthlyAllowanceNotification(
    mode: MonthlyAllowanceModalMode,
    record: MonthlyAllowanceRecord,
  ) {
    const notification = monthlyAllowanceNotification(mode, record);
    if (!notification) return null;
    appendNotification(notification);
    return notification;
  }

  function updateMonthlyAllowanceRecord(
    recordId: string,
    updater: (record: MonthlyAllowanceRecord) => MonthlyAllowanceRecord,
  ) {
    setMonthlyAllowances((current) =>
      current.map((record) => (record.id === recordId ? updater(record) : record)),
    );
  }

  function beginMonthlyAllowancePayment(record: MonthlyAllowanceRecord, retry = false) {
    if (!ALIPAY_RECEIVE_URL) {
      setMonthlyAllowanceModalMode("missing-config");
      return;
    }
    updateMonthlyAllowanceRecord(record.id, (current) => ({
      ...current,
      retryCount: retry ? current.retryCount + 1 : current.retryCount,
      status: retry ? "RETRY_PAYING" : "PAYING",
    }));
    openAlipayReceivePage();
  }

  function beginWifeTipPayment() {
    if (!ALIPAY_RECEIVE_URL) {
      showStory({
        title: "无法跳转支付宝",
        text: "尚未配置支付宝收款链接，请在环境变量 VITE_ALIPAY_RECEIVE_URL 中填写后再去打赏。",
        tone: "down",
      });
      return;
    }
    createPendingWifeTip();
    openAlipayReceivePage();
  }

  function dismissTipAmountModal() {
    clearPendingWifeTip();
    setTipAmountModalOpen(false);
  }

  function confirmWifeTipAmount(amount: number) {
    const safeAmount = Math.max(1, Math.trunc(amount));
    const pending = readPendingWifeTip();
    const createdAt = new Date().toISOString();
    clearPendingWifeTip();
    setTipAmountModalOpen(false);

    setProgress((current) => ({
      ...current,
      wallet: current.wallet + safeAmount,
    }));
    const log = addLedger({
      id: pending?.id ? `ledger-${pending.id}` : ledgerId("ledger-tip"),
      type: "allowance",
      source: "老妞打赏",
      amount: safeAmount,
      unit: "CNY",
      createdAt,
      note: `老妞大人打赏 ¥${safeAmount}`,
    });
    appendDecree({
      type: "wallet_ledger",
      title: "老妞打赏",
      text: `老妞大人刚刚打赏了你 ¥${safeAmount}。`,
      tone: "upgrade",
      target: "husband",
      createdAt,
      sourceLogId: log.id,
      payload: {
        amount: safeAmount,
        unit: "CNY",
        source: "wife_tip",
        pendingTipId: pending?.id,
      },
    });
    showStory({
      title: "打赏已记录",
      text: `已记下这次打赏 ¥${safeAmount}，老哥端会收到弹窗。`,
      tone: "upgrade",
    });
  }

  function confirmMonthlyAllowancePaid(record: MonthlyAllowanceRecord) {
    updateMonthlyAllowanceRecord(record.id, (current) =>
      updateMonthlyAllowanceStatus(current, "PAID_CONFIRMED_BY_WIFE"),
    );
    setMonthlyAllowanceModalMode(null);
  }

  function reportMonthlyAllowanceMissing(record: MonthlyAllowanceRecord) {
    updateMonthlyAllowanceRecord(record.id, (current) =>
      updateMonthlyAllowanceStatus(current, "HUSBAND_REPORTED_NOT_RECEIVED"),
    );
    setMonthlyAllowanceModalMode(null);
  }

  function rebukeMonthlyAllowanceReport(record: MonthlyAllowanceRecord) {
    updateMonthlyAllowanceRecord(record.id, (current) =>
      updateMonthlyAllowanceStatus(current, "REBUKED_AS_BLIND"),
    );
    setMonthlyAllowanceModalMode(null);
  }

  function cancelMonthlyAllowance(record: MonthlyAllowanceRecord) {
    updateMonthlyAllowanceRecord(record.id, (current) =>
      updateMonthlyAllowanceStatus(current, "CANCELLED_BY_WIFE"),
    );
    setMonthlyAllowanceModalMode(null);
  }

  function creditMonthlyAllowance(
    record: MonthlyAllowanceRecord,
    status: "RECEIVED_BY_HUSBAND" | "REBUKED_AS_BLIND",
  ) {
    const creditedAt = new Date().toISOString();
    const creditKey = `allowance-credit-${record.month}`;
    const shouldCredit =
      !record.creditedAt &&
      !allowanceCreditLocksRef.current.has(creditKey) &&
      record.totalAmount > 0;
    if (shouldCredit) {
      allowanceCreditLocksRef.current.add(creditKey);
      setProgress((current) => ({
        ...current,
        wallet: current.wallet + record.totalAmount,
      }));
      addLedger({
        id: creditKey,
        type: "allowance",
        source: "每月赏赐",
        amount: record.totalAmount,
        unit: "CNY",
        monthKey: record.month,
        createdAt: creditedAt,
        note: `${record.month} 零花钱赏赐`,
      });
    }
    updateMonthlyAllowanceRecord(record.id, (current) => ({
      ...current,
      status,
      husbandReceivedAt: current.husbandReceivedAt ?? creditedAt,
      creditedAt: current.creditedAt ?? creditedAt,
    }));
    setMonthlyAllowanceModalMode(null);
  }

  function acknowledgeCancelledAllowance(record: MonthlyAllowanceRecord) {
    const acknowledgedAt = new Date().toISOString();
    updateMonthlyAllowanceRecord(record.id, (current) => ({
      ...current,
      husbandReceivedAt: current.husbandReceivedAt ?? acknowledgedAt,
    }));
    setMonthlyAllowanceModalMode(null);
  }

  useEffect(() => {
    setPreviewLevel(progress.level);
  }, [progress.level]);

  useEffect(() => {
    setTasks((current) => refreshTaskCycles(current));
    const timer = window.setInterval(() => {
      setTasks((current) => refreshTaskCycles(current));
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTaskSystemOnce()
      .then((serverState) => {
        if (cancelled) return;
        hasLoadedServerState.current = true;
        if (serverState) applyRemoteState(serverState);
        setTaskSystemReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [applyRemoteState]);

  useEffect(() => {
    if (route === "login") {
      setHusbandSyncReady(false);
      return;
    }
    if (route === "husband") setHusbandSyncReady(false);

    let cancelled = false;
    let syncInFlight = false;
    let syncAgain = false;
    const syncFresh = async () => {
      if (syncInFlight) {
        syncAgain = true;
        return;
      }
      syncInFlight = true;
      try {
        const serverState = await loadTaskSystemFresh();
        if (!cancelled) applyRemoteState(serverState);
      } catch {
        // Keep the last local state when the sync service is temporarily offline.
      } finally {
        syncInFlight = false;
        if (!cancelled && route === "husband") setHusbandSyncReady(true);
        if (!cancelled && syncAgain) {
          syncAgain = false;
          void syncFresh();
        }
      }
    };

    void syncFresh();
    const events = new EventSource("/api/state/events");
    events.addEventListener("state", syncFresh);
    const timer = window.setInterval(syncFresh, 15_000);
    return () => {
      cancelled = true;
      events.close();
      window.clearInterval(timer);
    };
  }, [applyRemoteState, route]);

  useEffect(() => {
    if (initialRoute === "login") {
      preloadRouteAssets("login").catch(() => undefined);
      return;
    }

    if (!shouldShowInitialLoading) {
      preloadRouteAssets(initialRoute).catch(() => undefined);
      return;
    }

    runLoadingAttempt(initialRoute, false, "room");
    return () => {
      loadingAttemptRef.current += 1;
    };
  }, [initialRoute, runLoadingAttempt, shouldShowInitialLoading]);

  useEffect(() => {
    decreesRef.current = decrees;
  }, [decrees]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    monthlyAllowancesRef.current = monthlyAllowances;
  }, [monthlyAllowances]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  useLayoutEffect(() => {
    const state = {
      progress,
      roles,
      punishment,
      tasks,
      logs,
      benefits,
      walletLedger,
      decrees,
      notifications,
      monthlyAllowances,
      chatMessages,
      adminConfig,
    };
    persistLocalTaskSystem(state);

    if (taskSystemFingerprint(state) === lastRemoteFingerprintRef.current) return;
    if (!hasLoadedServerState.current) return;
    const saveGeneration = ++saveGenerationRef.current;
    localSavePendingRef.current = true;
    const timeout = window.setTimeout(() => {
      void enqueueSave(async () => {
        try {
          const mergedState = await commitStateWithRetry((serverState) =>
            mergeTaskSystemStateForSave(
              serverState,
              state,
              lastAppliedRemoteStateRef.current,
            ),
          );
          // Even when a newer local render supersedes this save, this state is
          // now committed remotely. Advance the merge baseline so the next
          // queued save only applies changes made after this commit.
          lastAppliedRemoteStateRef.current = mergedState;
          if (saveGeneration !== saveGenerationRef.current) return;
          syncErrorShownRef.current = false;
          if (saveRetryTimerRef.current !== undefined) {
            window.clearTimeout(saveRetryTimerRef.current);
            saveRetryTimerRef.current = undefined;
          }
          applyRemoteState(mergedState, true);
        } catch {
          if (saveGeneration !== saveGenerationRef.current) return;
          if (!syncErrorShownRef.current) {
            syncErrorShownRef.current = true;
            setStory({
              title: "同步暂时中断",
              text: "当前操作已保留在本机，正在自动重试，请保持页面打开。",
              tone: "down",
            });
          }
          if (saveRetryTimerRef.current !== undefined) {
            window.clearTimeout(saveRetryTimerRef.current);
          }
          saveRetryTimerRef.current = window.setTimeout(() => {
            saveRetryTimerRef.current = undefined;
            setSaveRetryNonce((current) => current + 1);
          }, 1_500);
        } finally {
          if (
            saveGeneration === saveGenerationRef.current &&
            saveRetryTimerRef.current === undefined
          ) {
            localSavePendingRef.current = false;
          }
        }
      }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    applyRemoteState,
    benefits,
    adminConfig,
    chatMessages,
    commitStateWithRetry,
    decrees,
    enqueueSave,
    logs,
    monthlyAllowances,
    notifications,
    progress,
    punishment,
    roles,
    saveRetryNonce,
    tasks,
    walletLedger,
  ]);

  useEffect(() => {
    if (!activeDecree || activeDecree.readAt) return;
    const readAt = new Date().toISOString();
    const readIds = new Set(decreeAcknowledgeIds(activeDecree));
    setDecrees((current) =>
      current.map((decree) =>
        readIds.has(decree.id) ? { ...decree, readAt } : decree,
      ),
    );
  }, [activeDecree]);

  useEffect(() => {
    setDecreeError(undefined);
  }, [activeDecree?.id, activeWifeUpgradeDecree?.id]);

  useEffect(() => {
    const rewardedAt = new Date().toISOString();
    const newlyRewardedTasks = tasks.filter(
      (task) =>
        (task.status === "confirmed" || task.status === "completed") &&
        !progress.rewardedTaskIds.includes(taskRewardKey(task)),
    );
    if (newlyRewardedTasks.length === 0) return;

    if (punishment.status === "slave") {
      const recoveryExp = newlyRewardedTasks.reduce(
        (sum, task) => sum + Math.min(30, Math.max(0, taskRewardExp(task))),
        0,
      );
      const rewardedTaskIds = new Set(newlyRewardedTasks.map((task) => task.id));
      setProgress((current) => ({
        ...current,
        rewardedTaskIds: [
          ...current.rewardedTaskIds,
          ...newlyRewardedTasks
            .map(taskRewardKey)
            .filter((key) => !current.rewardedTaskIds.includes(key)),
        ],
      }));
      setTasks((current) =>
        current.map((task) =>
          rewardedTaskIds.has(task.id)
            ? { ...task, rewardedAt: task.rewardedAt ?? rewardedAt }
            : task,
        ),
      );
      if (recoveryExp > 0) {
        setPunishment((current) => ({
          ...current,
          recoveryExp: Math.min(
            current.requiredRecoveryExp,
            current.recoveryExp + recoveryExp,
          ),
        }));
        showStory(
          {
            title: "恢复经验累计",
            text: `卖身奴隶状态下，任务奖励转入恢复进度：+${recoveryExp}。`,
            tone: "normal",
          },
          {
            notify: true,
            target: "husband",
            sourceId: `recovery-${rewardedAt}`,
            createdAt: rewardedAt,
          },
        );
        addLedger({
          type: "punishment",
          source: "恢复经验",
          amount: recoveryExp,
          unit: "EXP",
          createdAt: rewardedAt,
          note: "卖身奴隶状态下任务奖励转入恢复进度",
        });
      }
      return;
    }

    const settled = settleConfirmedTasks(progress, tasks, roles);
    if (settled.stories.length === 0) return;
    setProgress(settled.progress);
    if (settled.progress.level > progress.level) {
      showRoleUpgradeCinematic(progress.level, settled.progress.level);
      appendWifeRoleUpgradeDecree({
        fromLevel: progress.level,
        toLevel: settled.progress.level,
        createdAt: rewardedAt,
        reason: "任务奖励触发升级",
      });
      setBenefits((current) =>
        makeNewlyUnlockedBenefitsAvailable(
          current,
          progress.level,
          settled.progress.level,
        ),
      );
    }
    const entries = newlyRewardedTasks.flatMap((task) =>
      ledgerEntriesFromTask(task, rewardedAt),
    );
    const rewardFlightTasks = newlyRewardedTasks
      .map((task) => ({
        taskId: task.id,
        title: task.title,
        exp: taskRewardExp(task),
        money: taskRewardMoney(task),
        benefit: taskRewards(task).some((reward) => reward.type === "benefit"),
      }))
      .filter((task) => task.exp > 0 || task.money > 0 || task.benefit);
    if (rewardFlightTasks.length) {
      setTaskRewardFlight({
        id: `task-reward-${Date.now()}`,
        tasks: rewardFlightTasks,
      });
    }
    if (entries.length) {
      setWalletLedger((current) => [...entries, ...current]);
      entries.forEach((entry) => {
        addLog({
          type: "wallet_ledger",
          title: entry.source,
          description: entry.note,
          taskId: entry.taskId,
          taskTitle: entry.taskTitle,
          benefitName: entry.benefitName,
          amount: entry.amount,
          unit: entry.unit,
          createdAt: entry.createdAt,
        });
      });
    }
    setBenefits((current) =>
      current.map((benefit) => {
        const bonusCount = newlyRewardedTasks
          .flatMap(taskRewards)
          .filter((reward) => reward.type === "benefit" && benefitMatchesReward(benefit, reward))
          .reduce((sum, reward) => sum + Math.max(1, Math.trunc(reward.value ?? 1)), 0);
        return bonusCount > 0
          ? {
              ...benefit,
              availableBonusCount: (benefit.availableBonusCount ?? 0) + bonusCount,
            }
          : benefit;
      }),
    );
    if (newlyRewardedTasks.some((task) => !task.rewardedAt)) {
      const rewardedTaskIds = new Set(newlyRewardedTasks.map((task) => task.id));
      setTasks((current) =>
        current.map((task) =>
          rewardedTaskIds.has(task.id)
            ? { ...task, rewardedAt: task.rewardedAt ?? rewardedAt }
            : task,
        ),
      );
    }
    if (settled.progress.level <= progress.level) {
      showStory(settled.stories[settled.stories.length - 1], {
        notify: true,
        target: "husband",
        sourceId: `settled-${rewardedAt}`,
        createdAt: rewardedAt,
      });
    }
  }, [progress, punishment.status, showRoleUpgradeCinematic, tasks]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = routeFromPathname(window.location.pathname);
      loadingAttemptRef.current += 1;

      runPixelTransition(() => {
        if (nextRoute === "login") {
          navigationLockedRef.current = false;
          setLoadingTarget(null);
          setLoadingPhase("loading");
          setIsLoadingPreview(false);
          setIsLoading(false);
          setRoute("login");
          preloadRouteAssets("login").catch(() => undefined);
          return;
        }

        if (canResumeOpenRouteWithoutLoading(nextRoute, false)) {
          commitLoadedRoute(nextRoute, false);
          setShowSlaveRuling(
            nextRoute === "wife" && isPunishmentCycleComplete(punishment),
          );
          preloadRouteAssets(nextRoute).catch(() => undefined);
          return;
        }

        runLoadingAttempt(nextRoute, false, "current");
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [commitLoadedRoute, punishment, runLoadingAttempt, runPixelTransition]);

  useEffect(() => {
    if (!taskSystemReady) return;
    setMonthlyAllowances((current) => {
      let next = current;
      let changed = false;

      [currentAllowanceMonth, nextAllowanceMonth].forEach((allowanceMonth) => {
        const existing = next.find((record) => record.month === allowanceMonth);
        const settlementRole = roleForAllowanceMonth(allowanceMonth);
        if (!existing) {
          next = [
            createMonthlyAllowanceRecord({
              month: allowanceMonth,
              role: settlementRole,
              tasks,
            }),
            ...next,
          ];
          changed = true;
          return;
        }
        if (existing.status !== "PENDING_WIFE_ACTION") return;
        const refreshed = refreshMonthlyAllowanceRecord(
          existing,
          settlementRole,
          tasks,
        );
        if (
          refreshed.roleLevel === existing.roleLevel &&
          refreshed.roleTitle === existing.roleTitle &&
          refreshed.baseSalary === existing.baseSalary &&
          refreshed.completedTaskCount === existing.completedTaskCount &&
          refreshed.taskBonus === existing.taskBonus &&
          refreshed.totalAmount === existing.totalAmount
        ) {
          return;
        }
        next = next.map((record) =>
          record.id === existing.id ? refreshed : record,
        );
        changed = true;
      });

      if (!changed) {
        return current;
      }
      return next;
    });
  }, [
    currentAllowanceMonth,
    nextAllowanceMonth,
    roleForAllowanceMonth,
    taskSystemReady,
    tasks,
  ]);

  useEffect(() => {
    const record = currentMonthlyAllowance;
    if (!taskSystemReady || !record) {
      setMonthlyAllowanceModalMode(null);
      return;
    }

    if (route === "wife") {
      if (punishment.status === "slave" && record.status === "PENDING_WIFE_ACTION") {
        const key = `paused:${record.id}`;
        if (!allowanceSessionLocksRef.current.has(key)) {
          setMonthlyAllowanceModalMode("wife-paused");
        }
        return;
      }
      if (record.status === "PENDING_WIFE_ACTION") {
        const key = `pending:${record.id}`;
        if (!allowanceSessionLocksRef.current.has(key)) {
          setMonthlyAllowanceModalMode("wife-pending");
        }
        return;
      }
      if (record.status === "WAITING_WIFE_CONFIRM") {
        const notification = ensureMonthlyAllowanceNotification("wife-confirm", record);
        if (!notification || !skippedMonthlyNotificationIds.has(notification.id)) {
          setMonthlyAllowanceModalMode("wife-confirm");
        }
        return;
      }
      if (record.status === "HUSBAND_REPORTED_NOT_RECEIVED") {
        const notification = ensureMonthlyAllowanceNotification("wife-dispute", record);
        if (!notification || !skippedMonthlyNotificationIds.has(notification.id)) {
          setMonthlyAllowanceModalMode("wife-dispute");
        }
        return;
      }
    }

    if (route === "husband" && husbandSyncReady) {
      if (record.status === "PAID_CONFIRMED_BY_WIFE" && !record.husbandReceivedAt) {
        const notification = ensureMonthlyAllowanceNotification("husband-paid", record);
        if (!notification || !skippedMonthlyNotificationIds.has(notification.id)) {
          setMonthlyAllowanceModalMode("husband-paid");
        }
        return;
      }
      if (record.status === "REBUKED_AS_BLIND" && !record.husbandReceivedAt) {
        const notification = ensureMonthlyAllowanceNotification("husband-rebuked", record);
        if (!notification || !skippedMonthlyNotificationIds.has(notification.id)) {
          setMonthlyAllowanceModalMode("husband-rebuked");
        }
        return;
      }
      if (record.status === "CANCELLED_BY_WIFE" && !record.husbandReceivedAt) {
        const notification = ensureMonthlyAllowanceNotification("husband-cancelled", record);
        if (!notification || !skippedMonthlyNotificationIds.has(notification.id)) {
          setMonthlyAllowanceModalMode("husband-cancelled");
        }
        return;
      }
    }

    setMonthlyAllowanceModalMode(null);
  }, [
    currentMonthlyAllowance,
    husbandSyncReady,
    punishment.status,
    route,
    skippedMonthlyNotificationIds,
    taskSystemReady,
  ]);

  useEffect(() => {
    if (route !== "wife") return;
    const handleReturn = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      const record = currentMonthlyAllowance;
      if (!record || (record.status !== "PAYING" && record.status !== "RETRY_PAYING")) {
        return;
      }
      const key = `return:${record.id}:${record.retryCount}`;
      if (allowanceSessionLocksRef.current.has(key)) return;
      allowanceSessionLocksRef.current.add(key);
      updateMonthlyAllowanceRecord(record.id, (current) => ({
        ...current,
        status: "WAITING_WIFE_CONFIRM",
      }));
      setMonthlyAllowanceModalMode("wife-confirm");
    };

    window.addEventListener("pageshow", handleReturn);
    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => {
      window.removeEventListener("pageshow", handleReturn);
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, [currentMonthlyAllowance, route]);

  useEffect(() => {
    if (route !== "wife") return;
    const handleReturn = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      if (!readPendingWifeTip()) return;
      setTipAmountModalOpen(true);
    };

    handleReturn();
    window.addEventListener("pageshow", handleReturn);
    window.addEventListener("focus", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => {
      window.removeEventListener("pageshow", handleReturn);
      window.removeEventListener("focus", handleReturn);
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, [route]);

  function handleSelectView(view: ViewKey) {
    playSoundEffect("ui-swipe-up");
    const pageMap: Record<ViewKey, number> = {
      benefits: HUSBAND_PAGES.BENEFIT,
      role: HUSBAND_PAGES.ROLE,
      tasks: HUSBAND_PAGES.TASK,
    };
    setActivePage(pageMap[view]);
  }

  function handlePreviewPrev() {
    playSoundEffect("role-preview-prev");
    setPreviewDirection("prev");
    setPreviewLevel((level) => Math.max(0, level - 1));
  }

  function handlePreviewNext() {
    playSoundEffect("role-preview-next");
    setPreviewDirection("next");
    setPreviewLevel((level) => Math.min(maxLevel, level + 1));
  }

  function handleStartTask(id: string) {
    playSoundEffect("task-start");
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status: "doing" } : task,
      ),
    );
  }

  function handleSubmitTask(id: string, submitNote: string) {
    const submittedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    if (!target || !isTaskSubmittableStatus(target.status)) {
      playSoundEffect("ui-disabled");
      return;
    }
    playSoundEffect("task-submit");
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "submitted",
              submitNote,
              submittedAt,
              deadline: "刚刚提交",
            }
          : task,
      ),
    );
    if (target) {
      addLog({
        type: "task_submitted",
        title: target.title,
        description: submitNote,
        taskId: target.id,
        taskTitle: target.title,
        createdAt: submittedAt,
      });
      appendNotification(
        createNotification({
          target: "wife",
          source: "story",
          sourceId: `task-submit-wife-${id}-${submittedAt}`,
          title: "任务待确认",
          text: `老哥提交了「${target.title}」，等待老妞大人裁定。`,
          tone: "normal",
          createdAt: submittedAt,
        }),
      );
    }
    showStory(
      {
        title: "任务已提交",
        text: "你把结果递到老婆大人案前，经验和零花钱会在她确认后正式入账。",
        tone: "normal",
      },
      {
        notify: true,
        target: "husband",
        sourceId: `task-submit-${id}-${submittedAt}`,
        createdAt: submittedAt,
      },
    );
  }

  function handleCreateTask(task: Task) {
    playSoundEffect("wife-command-button");
    const createdAt = task.createdAt ?? new Date().toISOString();
    const nextTask = { ...task, createdAt };
    setTasks((current) => [nextTask, ...current]);
    const log = addLog({
      type: "task_created",
      title: nextTask.title,
      description: nextTask.description,
      taskId: nextTask.id,
      taskTitle: nextTask.title,
      createdAt,
    });
    appendDecree({
      type: "task_created",
      title: "新任务下达",
      text: `老妞大人发布了「${nextTask.title}」：${nextTask.description}`,
      tone: nextTask.type === "urgent" ? "punish" : "normal",
      createdAt,
      sourceLogId: log.id,
      payload: { taskId: nextTask.id, taskType: nextTask.type },
    });
    showStory(
      {
        title: "任务已下达",
        text: `老婆大人发布了「${nextTask.title}」，老哥即刻进入待命状态。`,
        tone: nextTask.type === "urgent" ? "punish" : "normal",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `task-create-${nextTask.id}`,
        createdAt,
      },
    );
  }

  function handleApproveTask(id: string, decision?: TaskReviewDecision) {
    const confirmedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    if (
      !target ||
      (target.status !== "submitted" && target.status !== "failed_pending")
    ) {
      playSoundEffect("ui-disabled");
      return;
    }
    playSoundEffect("task-approved");
    const isSlave = punishment.status === "slave";
    const repeatTarget = target
      ? Math.max(1, target.repeatCount ?? target.timeConfig?.repeatCount ?? 1)
      : 1;
    const nextCompleted = target
      ? Math.min(repeatTarget, (target.completedCount ?? target.timeConfig?.completedCount ?? 0) + 1)
      : 1;
    const approvedStatus = taskStatusAfterApproval(nextCompleted, repeatTarget);
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? approvedStatus === "doing"
            ? {
                ...task,
                status: "doing",
                completedCount: nextCompleted,
                resultText: `老婆大人已确认本次进度：${nextCompleted}/${repeatTarget}。`,
              }
            : {
                ...task,
                rewards: decision?.rewards?.length ? decision.rewards : task.rewards,
                rewardExp: decision?.rewards?.length
                  ? decision.rewards
                      .filter((reward) => reward.type === "experience")
                      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0)
                  : task.rewardExp,
                rewardMoney: decision?.rewards?.length
                  ? decision.rewards
                      .filter((reward) => reward.type === "allowance")
                      .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0)
                  : task.rewardMoney,
                status: approvedStatus,
                completedCount: nextCompleted,
                confirmedAt,
                resultText: isSlave
                  ? `老婆大人已确认：恢复经验 +${Math.min(30, taskRewardExp({ ...task, rewards: decision?.rewards ?? task.rewards }))}`
                  : `老婆大人已确认：${taskRewardText({ ...task, rewards: decision?.rewards ?? task.rewards })}${
                      decision?.extraPunishment ? `；追加惩罚：${decision.extraPunishment}` : ""
                    }${decision?.extraRewardName ? `；额外赏赐：${decision.extraRewardName}` : ""}`,
              }
          : task,
      ),
    );
    if (target) {
      setWifeTaskCompleteIllustrationActive(true);
      const log = addLog({
        type: "task_approved",
        title: target.title,
        description:
          nextCompleted < repeatTarget
            ? `本周期进度 ${nextCompleted}/${repeatTarget}`
            : isSlave
              ? `恢复经验 +${Math.min(30, taskRewardExp(target))}`
              : [
                  `奖励：${taskRewardText({ ...target, rewards: decision?.rewards ?? target.rewards })}`,
                  decision?.extraPunishment ? `追加惩罚：${decision.extraPunishment}` : "",
                  decision?.extraRewardName ? `额外赏赐：${decision.extraRewardName}` : "",
                ]
                  .filter(Boolean)
                  .join("；"),
        taskId: target.id,
        taskTitle: target.title,
        createdAt: confirmedAt,
      });
      appendDecree({
        type: "task_approved",
        title: "任务确认",
        text:
          nextCompleted < repeatTarget
            ? `老妞大人确认「${target.title}」本周期进度：${nextCompleted}/${repeatTarget}。`
            : `老妞大人确认「${target.title}」已经完成。${isSlave ? `恢复经验将增加 ${Math.min(30, taskRewardExp(target))}。` : `奖励为：${taskRewardText({ ...target, rewards: decision?.rewards ?? target.rewards })}。`}`,
        tone: "normal",
        createdAt: confirmedAt,
        sourceLogId: log.id,
        payload: {
          taskId: target.id,
          completedCount: nextCompleted,
          repeatTarget,
        },
      });
    }
  }
  function handleRejectTask(id: string, reason?: string) {
    const rejectedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    if (
      !target ||
      (target.status !== "submitted" && target.status !== "failed_pending")
    ) {
      playSoundEffect("ui-disabled");
      return;
    }
    playSoundEffect("task-rejected");
    const rejectReason = reason?.trim() || "老婆大人裁定未通过，需要重新表现。";
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "failed",
              resultText: rejectReason,
            }
          : task,
      ),
    );
    if (target) {
      const log = addLog({
        type: "task_rejected",
        title: target.title,
        description: rejectReason,
        taskId: target.id,
        taskTitle: target.title,
        createdAt: rejectedAt,
      });
      appendDecree({
        type: "task_rejected",
        title: "任务驳回",
        text: `老妞大人驳回了「${target.title}」：${rejectReason}`,
        tone: "punish",
        createdAt: rejectedAt,
        sourceLogId: log.id,
        payload: { taskId: target.id, reason: rejectReason },
      });
    }
    showStory(
      {
        title: "任务被打回",
        text: "老婆大人轻轻敲了敲桌面：这次不算，重新来过。",
        tone: "punish",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `task-reject-${id}-${rejectedAt}`,
        createdAt: rejectedAt,
      },
    );
  }

  function handleUseBenefit(benefit: Benefit) {
    if (punishment.status === "slave") {
      playSoundEffect("benefit-frozen");
      return;
    }
    const currentBenefit = benefitForLevel(
      benefits.find((item) => item.id === benefit.id) ?? benefit,
      progress.level,
    );
    if (progress.level < currentBenefit.levelRequired) {
      playSoundEffect("locked");
      setSelectedBenefit(null);
      setStory({
        title: "权益未解锁",
        text: `「${currentBenefit.name}」需要达到 Lv.${String(currentBenefit.levelRequired).padStart(2, "0")} 后才可使用。`,
        tone: "normal",
      });
      return;
    }
    if (currentBenefit.pendingRequest) {
      playSoundEffect("ui-disabled");
      setSelectedBenefit(null);
      setStory({
        title: "权益待审批",
        text: `「${currentBenefit.name}」已提交申请，等待老婆大人裁定。`,
        tone: "normal",
      });
      return;
    }
    if (
      currentBenefit.cooldownUntil &&
      Date.parse(currentBenefit.cooldownUntil) > Date.now()
    ) {
      playSoundEffect("benefit-frozen");
      setSelectedBenefit(null);
      setStory({
        title: "权益未冷却",
        text: `「${currentBenefit.name}」尚未冷却完成，需等到 ${formatDateTime(currentBenefit.cooldownUntil)} 后重新达到等级才可使用。`,
        tone: "normal",
      });
      return;
    }
    if (currentBenefit.status === "cooldown" && !currentBenefit.cooldownUntil) {
      playSoundEffect("benefit-frozen");
      setSelectedBenefit(null);
      setStory({
        title: "权益未冷却",
        text: `「${currentBenefit.name}」尚未冷却完成，暂不可使用。`,
        tone: "normal",
      });
      return;
    }
    if ((currentBenefit.availableBonusCount ?? 0) > 0) {
      playSoundEffect("benefit-apply");
      const usedAt = new Date().toISOString();
      setBenefits((current) =>
        current.map((item) =>
          item.id === currentBenefit.id
            ? {
                ...item,
                availableBonusCount: Math.max(0, (item.availableBonusCount ?? 0) - 1),
              }
            : item,
        ),
      );
      addLog({
        type: "benefit_approved",
        title: currentBenefit.name,
        description: "已消耗 1 次权益奖励库存。",
        benefitId: currentBenefit.id,
        benefitName: currentBenefit.name,
        createdAt: usedAt,
      });
      addLedger({
        type: "benefit",
        source: "权益奖励消耗",
        amount: -1,
        unit: "BENEFIT",
        benefitId: currentBenefit.id,
        benefitName: currentBenefit.name,
        createdAt: usedAt,
        note: "优先消耗任务奖励权益次数",
      });
      setSelectedBenefit(null);
      setStory({
        title: `使用：${currentBenefit.name}`,
        text: `已消耗 1 次「${currentBenefit.name}」奖励库存，不进入冷却申请。`,
        tone: "normal",
      });
      return;
    }
    playSoundEffect("benefit-apply");
    const requestedAt = new Date().toISOString();
    const pendingRequest = {
      id: `benefit-request-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      requestedAt,
    };
    setBenefits((current) =>
      current.map((item) =>
        item.id === currentBenefit.id
          ? {
              ...item,
              lastRequestedAt: requestedAt,
              pendingRequest,
              status: "pending",
            }
          : item,
      ),
    );
    addLog({
      type: "benefit_requested",
      title: currentBenefit.name,
      description: currentBenefit.description,
      benefitId: currentBenefit.id,
      benefitName: currentBenefit.name,
      createdAt: requestedAt,
    });
    appendNotification(
      createNotification({
        target: "wife",
        source: "story",
        sourceId: `benefit-request-wife-${currentBenefit.id}-${requestedAt}`,
        title: `权益待审批：${currentBenefit.name}`,
        text: `老哥申请使用「${currentBenefit.name}」，等待老妞大人裁定。`,
        tone: currentBenefit.levelRequired >= 9 ? "upgrade" : "normal",
        createdAt: requestedAt,
      }),
    );
    setSelectedBenefit(null);
    showStory(
      {
        title: `申请：${currentBenefit.name}`,
        text: "申请已经递交。老婆大人会根据表现决定是否恩准这次权益。",
        tone: currentBenefit.levelRequired >= 9 ? "upgrade" : "normal",
      },
      {
        notify: true,
        target: "husband",
        sourceId: `benefit-request-${currentBenefit.id}-${requestedAt}`,
        createdAt: requestedAt,
      },
    );
  }

  function handleApproveBenefit(benefit: Benefit) {
    playSoundEffect("task-approved");
    const displayBenefit = benefitForLevel(benefit, progress.level);
    const approvedAt = new Date().toISOString();
    const cooldownUntil = new Date(
      Date.now() + benefitCooldownMs(displayBenefit),
    ).toISOString();
    setBenefits((current) =>
      current.map((item) =>
        item.id === displayBenefit.id
          ? {
              ...item,
              lastApprovedAt: approvedAt,
              cooldownUntil,
              cooldownText: `未冷却至 ${formatDateTime(cooldownUntil)}`,
              pendingRequest: undefined,
              status: "cooldown",
            }
          : item,
      ),
    );
    const log = addLog({
      type: "benefit_approved",
      title: displayBenefit.name,
      description: `已批准，冷却至 ${formatDateTime(cooldownUntil)}。`,
      benefitId: displayBenefit.id,
      benefitName: displayBenefit.name,
      createdAt: approvedAt,
    });
    appendDecree({
      type: "benefit_approved",
      title: `恩准：${displayBenefit.name}`,
      text: `老妞大人准许本次「${displayBenefit.name}」申请。${displayBenefit.description}`,
      tone: displayBenefit.levelRequired >= 8 ? "upgrade" : "normal",
      createdAt: approvedAt,
      sourceLogId: log.id,
      payload: { benefitId: displayBenefit.id, cooldownUntil },
    });
    showStory(
      {
        title: `恩准：${displayBenefit.name}`,
        text: `老婆大人准许本次「${displayBenefit.name}」申请。${displayBenefit.description}`,
        tone: displayBenefit.levelRequired >= 8 ? "upgrade" : "normal",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `benefit-approved-${displayBenefit.id}-${approvedAt}`,
        createdAt: approvedAt,
      },
    );
  }

  function handleRejectBenefit(benefit: Benefit, reason?: string) {
    playSoundEffect("benefit-rejected");
    const displayBenefit = benefitForLevel(benefit, progress.level);
    const rejectedAt = new Date().toISOString();
    const rejectedReason = reason?.trim() || "老婆大人暂不批准本次权益申请。";
    setBenefits((current) =>
      current.map((item) =>
        item.id === displayBenefit.id
          ? {
              ...item,
              pendingRequest: undefined,
              status: "available",
            }
          : item,
      ),
    );
    const log = addLog({
      type: "benefit_rejected",
      title: displayBenefit.name,
      description: rejectedReason,
      benefitId: displayBenefit.id,
      benefitName: displayBenefit.name,
      createdAt: rejectedAt,
    });
    appendDecree({
      type: "benefit_rejected",
      title: `暂缓：${displayBenefit.name}`,
      text: rejectedReason,
      tone: "down",
      createdAt: rejectedAt,
      sourceLogId: log.id,
      payload: { benefitId: displayBenefit.id, reason: rejectedReason },
    });
    showStory(
      {
        title: `暂缓：${displayBenefit.name}`,
        text: rejectedReason,
        tone: "normal",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `benefit-rejected-${displayBenefit.id}-${rejectedAt}`,
        createdAt: rejectedAt,
      },
    );
  }

  function handleAdjustExperience(amount: number) {
    playSoundEffect(amount >= 0 ? "task-reward-exp" : "wife-level-down-command");
    const createdAt = new Date().toISOString();
    if (amount === 0) return;
    localSavePendingRef.current = true;
    if (amount > 0) {
      const result = grantExperience(
        progress,
        amount,
        roles,
        "老妞大人亲自赏赐",
      );
      setProgress(result.progress);
      if (result.progress.level > progress.level) {
        showRoleUpgradeCinematic(progress.level, result.progress.level);
        setBenefits((current) =>
          makeNewlyUnlockedBenefitsAvailable(
            current,
            progress.level,
            result.progress.level,
          ),
        );
      }
      if (result.stories.length && result.progress.level <= progress.level) {
        showStory(result.stories[result.stories.length - 1], {
          notify: true,
          target: "wife",
          sourceId: `adjust-exp-${createdAt}`,
          createdAt,
        });
      }
      const experienceLog = addLedger({
        type: "experience",
        source: "老妞赏赐",
        amount,
        unit: "EXP",
        createdAt,
        note: "老婆端直接调整经验",
      });
      appendDecree({
        type: "experience_granted",
        title: "老妞大人赏赐",
        text: `老妞大人赏赐 ${amount} 点经验。`,
        tone: "upgrade",
        createdAt,
        sourceLogId: experienceLog.id,
        payload: { amount, unit: "EXP" },
      });
      if (result.progress.level !== progress.level) {
        const levelCreatedAt = new Date(Date.parse(createdAt) + 1).toISOString();
        const levelLog = addLog({
          type: "level_changed",
          title: getRoleByLevel(roles, result.progress.level).title,
          description: "经验奖励触发等级变化",
          fromLevel: progress.level,
          toLevel: result.progress.level,
          createdAt: levelCreatedAt,
        });
        appendWifeRoleUpgradeDecree({
          fromLevel: progress.level,
          toLevel: result.progress.level,
          createdAt: levelCreatedAt,
          sourceLogId: levelLog.id,
          reason: "经验奖励触发等级变化",
        });
        appendDecree({
          type: "level_changed",
          title: "职务晋升",
          text: `老妞大人已赐予新职务：「${getRoleByLevel(roles, result.progress.level).title}」。`,
          tone: "upgrade",
          createdAt: levelCreatedAt,
          sourceLogId: levelLog.id,
          payload: { fromLevel: progress.level, toLevel: result.progress.level },
        });
      }
      return;
    }

    setProgress((current) => ({
      ...current,
      exp: Math.max(0, current.exp + amount),
      totalExp: Math.max(0, current.totalExp + amount),
    }));
    const experienceLog = addLedger({
      type: "experience",
      source: "老妞扣罚",
      amount,
      unit: "EXP",
      createdAt,
      note: "老婆端直接调整经验",
    });
    appendDecree({
      type: "experience_penalty",
      title: "经验扣罚",
      text: `老妞大人扣罚 ${Math.abs(amount)} 点经验，命你认真反省。`,
      tone: "down",
      createdAt,
      sourceLogId: experienceLog.id,
      payload: { amount, unit: "EXP" },
    });
  }

  function handleAdjustWallet(amount: number) {
    if (amount === 0) return;
    if (
      nextMonthlyAllowance &&
      nextMonthlyAllowance.status !== "PENDING_WIFE_ACTION"
    ) {
      setStory({
        title: "下月赏赐已定",
        text: "下个月的赏赐已经进入支付或确认流程，暂不可再调整金额。",
        tone: "normal",
      });
      return;
    }
    setMonthlyAllowances((current) => {
      const existing = current.find(
        (record) => record.month === nextAllowanceMonth,
      );
      const settlementRole = roleForAllowanceMonth(nextAllowanceMonth);
      const record =
        existing ??
        createMonthlyAllowanceRecord({
          month: nextAllowanceMonth,
          role: settlementRole,
          tasks,
        });
      if (record.status !== "PENDING_WIFE_ACTION") return current;
      const wifeAdjustmentAmount = record.wifeAdjustmentAmount + amount;
      const nextRecord = refreshMonthlyAllowanceRecord(
        {
          ...record,
          wifeAdjustmentAmount,
        },
        settlementRole,
        tasks,
      );
      if (!existing) return [nextRecord, ...current];
      return current.map((item) =>
        item.id === record.id ? nextRecord : item,
      );
    });
  }

  function handleOpenNextAllowanceDetail() {
    playSoundEffect("money-reward");
    const roleTitle = nextMonthlyAllowance?.roleTitle ?? nextAllowanceRole.title;
    const completedTaskCount =
      nextMonthlyAllowance?.completedTaskCount ??
      nextAllowanceTaskStats.completedTaskCount;
    const taskBonus =
      nextMonthlyAllowance?.taskBonus ?? nextAllowanceTaskStats.taskBonus;
    const adjustment = nextAllowanceAdjustment;
    setStory({
      title: "下月零花钱明细",
      text: `${nextAllowanceMonth} 发放的是 ${nextAllowanceSettlementMonth} 的零花钱。职务「${roleTitle}」工资 ¥${nextAllowanceBaseSalary}，任务奖励 ${completedTaskCount} 项共 ¥${taskBonus}，老妞调整 ${adjustment >= 0 ? "+" : ""}${adjustment}，预计合计 ¥${nextAllowanceTotal}。`,
      tone: "normal",
    });
  }

  function handleSetLevel(level: number, reason: string) {
    const safeLevel = clampLevel(level, maxLevel);
    const previousLevel = progress.level;
    playSoundEffect(
      safeLevel > previousLevel
        ? "wife-level-up-command"
        : safeLevel < previousLevel
          ? "wife-level-down-command"
          : "wife-command-button",
    );
    const previousPunishmentStatus = punishment.status;
    setPunishment(createNormalPunishment());
    setProgress((current) => progressWithLevelRule(current, safeLevel, maxLevel));
    if (safeLevel > previousLevel) {
      showRoleUpgradeCinematic(previousLevel, safeLevel);
      setBenefits((current) =>
        makeNewlyUnlockedBenefitsAvailable(
          current,
          previousLevel,
          safeLevel,
        ),
      );
    }
    if (safeLevel !== previousLevel) {
      addLedger({
        type: "level_up",
        source: "等级裁定",
        amount: safeLevel - previousLevel,
        unit: "LEVEL",
        note: reason,
      });
    }
    setPreviewLevel(safeLevel);
    if (safeLevel !== previousLevel) {
      const log = addLog({
        type: "level_changed",
        title: getRoleByLevel(roles, safeLevel).title,
        description: reason,
        fromLevel: previousLevel,
        toLevel: safeLevel,
      });
      if (safeLevel > previousLevel) {
        appendWifeRoleUpgradeDecree({
          fromLevel: previousLevel,
          toLevel: safeLevel,
          createdAt: log.createdAt,
          sourceLogId: log.id,
          reason,
        });
      }
      appendDecree({
        type: "level_changed",
        title: safeLevel > previousLevel ? "职务晋升" : "职务降级",
        text:
          safeLevel > previousLevel
            ? `老妞大人已赐予新职务：「${getRoleByLevel(roles, safeLevel).title}」。`
            : `老妞大人收回原职，现降为「${getRoleByLevel(roles, safeLevel).title}」。`,
        tone: safeLevel > previousLevel ? "upgrade" : "down",
        createdAt: log.createdAt,
        sourceLogId: log.id,
        payload: { fromLevel: previousLevel, toLevel: safeLevel, reason },
      });
    }
    if (previousPunishmentStatus !== "normal") {
      addLog({
        type: "punishment_status_changed",
        title: "恢复正常状态",
        description: reason,
        fromStatus: previousPunishmentStatus,
        toStatus: "normal",
      });
    }
    if (safeLevel <= previousLevel) {
      showStory(
        {
          title: "职务裁定",
          text: `老婆大人已${reason}，当前职务定为「${getRoleByLevel(roles, safeLevel).title}」。`,
          tone: safeLevel < previousLevel ? "down" : "normal",
        },
        {
          notify: true,
          target: "wife",
          sourceId: `set-level-${safeLevel}-${Date.now()}`,
        },
      );
    }
  }

  function handlePunishStatus() {
    if (punishment.status === "slave") return;
    playSoundEffect("slave-enter");
    const previousPunishmentStatus = punishment.status;
    setPunishment(
      createSlavePunishment({
        level: progress.level,
        exp: progress.exp,
        wallet: progress.wallet,
      }),
    );
    setSlaveActivePage(SLAVE_PAGES.STATUS);
    setProgress((current) => ({
      ...current,
      level: MIN_LEVEL,
      exp: 0,
      wallet: 0,
    }));
    addLedger({
      type: "punishment",
      source: "卖身奴隶状态",
      amount: -progress.wallet,
      unit: "CNY",
      note: "冻结并清空零花钱",
    });
    setPreviewLevel(MIN_LEVEL);
    const punishmentLog = addLog({
      type: "punishment_status_changed",
      title: "卖身奴隶状态",
      description: "冻结权益与零花钱，职务降至流落街头。",
      fromStatus: previousPunishmentStatus,
      toStatus: "slave",
    });
    appendDecree({
      type: "punishment_slave",
      title: "最终裁定",
      text: "老妞大人执行卖身奴隶状态：权益冻结，零花钱清零，职务降至流落街头。",
      tone: "punish",
      createdAt: punishmentLog.createdAt,
      sourceLogId: punishmentLog.id,
      payload: {
        fromLevel: progress.level,
        toLevel: MIN_LEVEL,
        clearedWallet: progress.wallet,
      },
    });
    if (progress.level !== MIN_LEVEL) {
      addLog({
        type: "level_changed",
        title: getRoleByLevel(roles, MIN_LEVEL).title,
        description: "最终裁定",
        fromLevel: progress.level,
        toLevel: MIN_LEVEL,
      });
    }
    showStory(
      {
        title: "最终裁定",
        text: "老婆大人执行卖身奴隶状态：冻结权益与零花钱，职务降至流落街头。",
        tone: "punish",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `punish-${Date.now()}`,
      },
    );
    setSlaveStateCinematic({
      id: `slave-enter-${Date.now()}`,
      mode: "enter",
      amount: progress.wallet,
    });
  }

  function handleRestoreNormal() {
    if (punishment.status !== "slave") return;
    playSoundEffect("slave-release");
    const restoredLevel = clampLevel(
      punishment.restoreLevel ?? progress.level,
      maxLevel,
    );
    const restoredExp = Math.min(
      punishment.restoreExp ?? progress.exp,
      expRequiredForLevel(restoredLevel, maxLevel),
    );
    const restoredWallet = Math.max(
      0,
      Math.trunc(punishment.restoreWallet ?? progress.wallet),
    );

    setPunishment(createNormalPunishment());
    setProgress((current) => ({
      ...current,
      level: restoredLevel,
      exp: restoredExp,
      wallet: restoredWallet,
    }));
    if (restoredLevel > progress.level) {
      setBenefits((current) =>
        makeNewlyUnlockedBenefitsAvailable(
          current,
          progress.level,
          restoredLevel,
        ),
      );
    }
    setPreviewLevel(restoredLevel);
    if (restoredWallet !== progress.wallet) {
      addLedger({
        type: "punishment",
        source: "赎回骆老哥",
        amount: restoredWallet - progress.wallet,
        unit: "CNY",
        note: "返还卖身前零花钱",
      });
    }
    const restoredLog = addLog({
      type: "punishment_status_changed",
      title: "赎回骆老哥",
      description: `卖身奴隶状态解除，官复原职为「${getRoleByLevel(roles, restoredLevel).title}」。`,
      fromStatus: "slave",
      toStatus: "normal",
    });
    appendDecree({
      type: "punishment_restored",
      title: "官复原职",
      text: `老妞大人解除卖身奴隶状态，恢复「${getRoleByLevel(roles, restoredLevel).title}」职务、原有经验与零花钱。`,
      tone: "upgrade",
      createdAt: restoredLog.createdAt,
      sourceLogId: restoredLog.id,
      payload: { restoredLevel, restoredExp, restoredWallet },
    });
    if (restoredLevel !== progress.level) {
      addLog({
        type: "level_changed",
        title: getRoleByLevel(roles, restoredLevel).title,
        description: "赎回后官复原职",
        fromLevel: progress.level,
        toLevel: restoredLevel,
      });
    }
    showStory(
      {
        title: "赎回成功",
        text: `老婆大人已赎回骆老哥，卖身奴隶状态解除，恢复「${getRoleByLevel(roles, restoredLevel).title}」职务、原有经验与零花钱。`,
        tone: "upgrade",
      },
      {
        notify: true,
        target: "wife",
        sourceId: `restore-${Date.now()}`,
      },
    );
    setSlaveStateCinematic({
      id: `slave-restore-${Date.now()}`,
      mode: "restore",
      amount: restoredWallet,
    });
    setShowSlaveRuling(false);
  }

  function handleContinueSlaveLabor() {
    if (punishment.status !== "slave") return;
    playSoundEffect("slave-ruling");
    setPunishment(createNextSlavePunishment(punishment));
    const continuedLog = addLog({
      type: "punishment_status_changed",
      title: "继续劳作",
      description: "老妞大人下旨开启新的奴隶周期：服役 7 天或重新收集 100 恢复经验。",
      fromStatus: "slave",
      toStatus: "slave",
    });
    appendDecree({
      type: "punishment_continued",
      title: "继续劳作",
      text: "老妞大人下旨开启新的奴隶周期：继续服役 7 天，或重新收集 100 恢复经验。",
      tone: "punish",
      createdAt: continuedLog.createdAt,
      sourceLogId: continuedLog.id,
      payload: { durationDays: 7, requiredRecoveryExp: 100 },
    });
    setShowSlaveRuling(false);
  }

  function dismissMonthlyAllowanceModal() {
    playSoundEffect("ui-close");
    const record = currentMonthlyAllowance;
    if (record && monthlyAllowanceModalMode === "wife-pending") {
      allowanceSessionLocksRef.current.add(`pending:${record.id}`);
    }
    if (record && monthlyAllowanceModalMode === "wife-paused") {
      allowanceSessionLocksRef.current.add(`paused:${record.id}`);
    }
    setMonthlyAllowanceModalMode(null);
  }

  function handleMonthlyAllowancePrimary() {
    playSoundEffect("wife-command-button");
    const record = currentMonthlyAllowance;
    if (!record || !monthlyAllowanceModalMode) return;
    markMonthlyAllowanceNotificationViewed(monthlyAllowanceModalMode, record);
    if (monthlyAllowanceModalMode === "wife-pending") {
      beginMonthlyAllowancePayment(record);
      return;
    }
    if (
      monthlyAllowanceModalMode === "wife-paused" ||
      monthlyAllowanceModalMode === "missing-config"
    ) {
      dismissMonthlyAllowanceModal();
      return;
    }
    if (monthlyAllowanceModalMode === "wife-confirm") {
      confirmMonthlyAllowancePaid(record);
      return;
    }
    if (monthlyAllowanceModalMode === "wife-dispute") {
      beginMonthlyAllowancePayment(record, true);
      return;
    }
    if (monthlyAllowanceModalMode === "husband-paid") {
      creditMonthlyAllowance(record, "RECEIVED_BY_HUSBAND");
      return;
    }
    if (monthlyAllowanceModalMode === "husband-rebuked") {
      creditMonthlyAllowance(record, "REBUKED_AS_BLIND");
      return;
    }
    if (monthlyAllowanceModalMode === "husband-cancelled") {
      acknowledgeCancelledAllowance(record);
    }
  }

  function handleMonthlyAllowanceSecondary() {
    playSoundEffect("ui-switch");
    const record = currentMonthlyAllowance;
    if (!record || !monthlyAllowanceModalMode) return;
    if (monthlyAllowanceModalMode === "wife-pending") {
      dismissMonthlyAllowanceModal();
      return;
    }
    if (monthlyAllowanceModalMode === "wife-confirm") {
      beginMonthlyAllowancePayment(record, true);
      return;
    }
    if (monthlyAllowanceModalMode === "wife-dispute") {
      rebukeMonthlyAllowanceReport(record);
      return;
    }
    if (monthlyAllowanceModalMode === "husband-paid") {
      reportMonthlyAllowanceMissing(record);
    }
  }

  function handleMonthlyAllowanceTertiary() {
    playSoundEffect("ui-back");
    const record = currentMonthlyAllowance;
    if (record && monthlyAllowanceModalMode === "wife-dispute") {
      cancelMonthlyAllowance(record);
    }
  }

  function handleAcknowledgeDecree() {
    if (!activeDecree) return;
    setDecreeError(undefined);
    const acknowledgedAt = new Date().toISOString();
    const acknowledgedIds = new Set(decreeAcknowledgeIds(activeDecree));
    const localAcknowledged = decrees.map((decree) =>
      acknowledgedIds.has(decree.id)
        ? { ...decree, acknowledgedAt }
        : decree,
    );
    // Confirm locally first. The normal persistence effect writes it with the
    // same revision/conflict retry as every other state change, without making
    // the modal wait behind a full-state upload.
    localSavePendingRef.current = true;
    decreesRef.current = localAcknowledged;
    setDecrees(localAcknowledged);
  }

  function handleAcknowledgeWifeRoleUpgrade() {
    if (!activeWifeUpgradeDecree) return;
    const upgradeDecree = activeWifeUpgradeDecree;
    const illustrationTransition =
      wifeHomeIllustrationTransitionForLevelChange(
        clampLevel(Number(upgradeDecree.payload.fromLevel), maxLevel),
        clampLevel(Number(upgradeDecree.payload.toLevel), maxLevel),
      );
    setDecreeError(undefined);
    const acknowledgedAt = new Date().toISOString();
    const localAcknowledged = decrees.map((decree) =>
      decree.id === upgradeDecree.id
        ? { ...decree, readAt: decree.readAt ?? acknowledgedAt, acknowledgedAt }
        : decree,
    );
    localSavePendingRef.current = true;
    decreesRef.current = localAcknowledged;
    setDecrees(localAcknowledged);
    if (illustrationTransition) {
      setWifeIllustrationTransition({
        id: `wife-illustration-${upgradeDecree.id}`,
        ...illustrationTransition,
      });
    }
  }

  function acknowledgeNotificationItem(item: NotificationQueueItem | null) {
    if (!item) return;
    const viewedAt = new Date().toISOString();
    if (item.kind === "decree") {
      const acknowledgedIds = new Set(decreeAcknowledgeIds(item.decree));
      setDecrees((current) =>
        current.map((decree) =>
          acknowledgedIds.has(decree.id)
            ? {
                ...decree,
                readAt: decree.readAt ?? viewedAt,
                acknowledgedAt: viewedAt,
              }
            : decree,
        ),
      );
      setDecreeAutoPaused(false);
      return;
    }
    setNotifications((current) =>
      markNotificationViewed(current, item.notification.id, viewedAt),
    );
  }

  function skipNotificationItem(item: NotificationQueueItem | null) {
    if (!item) {
      setActiveNotificationViewer(null);
      return;
    }
    const skippedAt = new Date().toISOString();
    if (item.kind === "notification") {
      setNotifications((current) =>
        markNotificationSkipped(current, item.notification.id, skippedAt),
      );
    }
    setActiveNotificationViewer(null);
  }

  function handleAcknowledgeNotificationReplay() {
    playSoundEffect("ui-close");
    const item = activeNotificationItem;
    acknowledgeNotificationItem(item);
    if (!item || item.remainingCount === 0) {
      setActiveNotificationViewer(null);
    }
  }

  function handleSkipNotificationReplay() {
    playSoundEffect("ui-close");
    skipNotificationItem(activeNotificationItem);
  }

  function handleSkipActiveDecree() {
    if (!activeDecree) return;
    playSoundEffect("ui-close");
    setDecreeAutoPaused(true);
    setDecrees((current) =>
      current.map((decree) =>
        decree.id === activeDecree.id
          ? { ...decree, readAt: decree.readAt ?? new Date().toISOString() }
          : decree,
      ),
    );
  }

  function handleStoryAcknowledge() {
    playSoundEffect("ui-close");
    if (story?.notificationId) {
      setNotifications((current) =>
        markNotificationViewed(current, story.notificationId!),
      );
    }
    setStory(null);
  }

  function handleStorySkip() {
    playSoundEffect("ui-close");
    if (story?.notificationId) {
      setNotifications((current) =>
        markNotificationSkipped(current, story.notificationId!),
      );
    }
    setStory(null);
  }

  function handleSkipMonthlyAllowanceModal() {
    playSoundEffect("ui-close");
    const record = currentMonthlyAllowance;
    const mode = monthlyAllowanceModalMode;
    if (!record || !mode) {
      setMonthlyAllowanceModalMode(null);
      return;
    }
    const id = notificationId(
      "monthly_allowance",
      mode.startsWith("wife") ? "wife" : "husband",
      monthlyAllowanceNotificationSourceId(mode, record),
    );
    setSkippedMonthlyNotificationIds((current) => new Set(current).add(id));
    setNotifications((current) => markNotificationSkipped(current, id));
    setMonthlyAllowanceModalMode(null);
  }

  function markMonthlyAllowanceNotificationViewed(
    mode: MonthlyAllowanceModalMode,
    record: MonthlyAllowanceRecord,
  ) {
    const notification = monthlyAllowanceNotification(mode, record);
    if (!notification) return;
    setNotifications((current) =>
      markNotificationViewed(current, notification.id),
    );
  }

  function handleEnterRole(role: "husband" | "wife") {
    if (navigationLockedRef.current) return;
    unlockAudio();
    playSoundEffect("login-enter");
    if (canResumeOpenRouteWithoutLoading(role, false)) {
      navigationLockedRef.current = true;
      runPixelTransition(() => {
        commitLoadedRoute(role, true);
        setShowSlaveRuling(
          role === "wife" && isPunishmentCycleComplete(punishment),
        );
        preloadRouteAssets(role).catch(() => undefined);
      });
      return;
    }
    navigationLockedRef.current = true;
    runPixelTransition(() => runLoadingAttempt(role, true, "current"));
  }

  function handleReturnToLogin() {
    playSoundEffect("ui-back");
    runPixelTransition(() => {
      loadingAttemptRef.current += 1;
      navigationLockedRef.current = false;
      clearOpenRoute();
      window.history.pushState(null, "", "/");
      setLoadingTarget(null);
      setLoadingPhase("loading");
      setIsLoadingPreview(false);
      setIsLoading(false);
      setRoute("login");
      preloadRouteAssets("login").catch(() => undefined);
    });
  }

  function handleOpenChat(viewer: ChatSender) {
    playSoundEffect("chat-open");
    setChatMessages((current) => markChatMessagesRead(current, viewer));
    setActiveChatViewer(viewer);
  }

  function handleOpenNotifications(viewer: ChatSender) {
    playSoundEffect("notification-open");
    setActiveNotificationViewer(viewer);
    if (viewer === "husband") setDecreeAutoPaused(true);
  }

  function handleSendChat(text: string) {
    if (!activeChatViewer) return;
    playSoundEffect(
      activeChatViewer === "wife" ? "chat-send-wife" : "chat-send-husband",
    );
    setChatMessages((current) => [
      ...current,
      createChatMessage(activeChatViewer, text),
    ]);
  }

  function handleRetryLoading() {
    if (
      loadingPhase !== "error" ||
      !loadingTarget ||
      loadingTarget === "login"
    ) return;
    playSoundEffect("ui-tap");
    runLoadingAttempt(
      loadingTarget,
      loadingPushHistoryRef.current,
      loadingBackdropMode,
    );
  }

  function handleContinueLoading() {
    if (
      loadingPhase !== "ready" ||
      isLoadingPreview ||
      !loadingTarget ||
      loadingTarget === "login"
    ) return;
    playSoundEffect("loading-complete");
    const target = loadingTarget;
    const pushHistory = loadingPushHistoryRef.current;
    runPixelTransition(() => {
      loadingAttemptRef.current += 1;
      commitLoadedRoute(target, pushHistory);
      setShowSlaveRuling(
        target === "wife" && isPunishmentCycleComplete(punishment),
      );
    });
  }

  const pixelTransition = (
    <PixelTransition
      transitionKey={pixelTransitionKey}
      onCovered={handlePixelCovered}
    />
  );

  const loadingOverlay = isLoading && loadingTarget ? (
    <AppLoadingPage
      target={loadingTarget}
      percent={loadingPercent}
      phase={loadingPhase}
      backdropMode={loadingBackdropMode}
      onRetry={handleRetryLoading}
      onContinue={handleContinueLoading}
    />
  ) : null;
  const decreeModal = (
    <DecreeModal
      decree={activeHusbandUpgradeDecree ? null : activeDecree}
      remainingCount={Math.max(0, pendingDecrees.length - 1)}
      saving={false}
      error={decreeError}
      onAcknowledge={handleAcknowledgeDecree}
      onSkip={handleSkipActiveDecree}
    />
  );
  const husbandRoleUpgradeDecreeCinematic = activeHusbandUpgradeDecree ? (
    <RoleUpgradeCinematic
      id={activeHusbandUpgradeDecree.id}
      audience="husband"
      fromLevel={clampLevel(
        Number(activeHusbandUpgradeDecree.payload.fromLevel),
        maxLevel,
      )}
      toLevel={clampLevel(
        Number(activeHusbandUpgradeDecree.payload.toLevel),
        maxLevel,
      )}
      fromRoleName={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeHusbandUpgradeDecree.payload.fromLevel), maxLevel),
        ).title
      }
      toRoleName={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeHusbandUpgradeDecree.payload.toLevel), maxLevel),
        ).title
      }
      fromRoleImage={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeHusbandUpgradeDecree.payload.fromLevel), maxLevel),
        ).roleImage
      }
      toRoleImage={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeHusbandUpgradeDecree.payload.toLevel), maxLevel),
        ).roleImage
      }
      isOpen
      onComplete={() => {
        void handleAcknowledgeDecree();
      }}
      error={decreeError}
    />
  ) : null;
  const wifeRoleUpgradeCinematic = activeWifeUpgradeDecree ? (
    <RoleUpgradeCinematic
      id={activeWifeUpgradeDecree.id}
      audience="wife"
      fromLevel={clampLevel(Number(activeWifeUpgradeDecree.payload.fromLevel), maxLevel)}
      toLevel={clampLevel(Number(activeWifeUpgradeDecree.payload.toLevel), maxLevel)}
      fromRoleName={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeWifeUpgradeDecree.payload.fromLevel), maxLevel),
        ).title
      }
      toRoleName={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeWifeUpgradeDecree.payload.toLevel), maxLevel),
        ).title
      }
      fromRoleImage={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeWifeUpgradeDecree.payload.fromLevel), maxLevel),
        ).roleImage
      }
      toRoleImage={
        getRoleByLevel(
          roles,
          clampLevel(Number(activeWifeUpgradeDecree.payload.toLevel), maxLevel),
        ).roleImage
      }
      isOpen
      onComplete={handleAcknowledgeWifeRoleUpgrade}
      confirmDisabled={false}
      confirmLabel="知道了"
      error={decreeError}
    />
  ) : null;
  const monthlyAllowanceModal =
    monthlyAllowanceModalMode && currentMonthlyAllowance && !activeWifeUpgradeDecree ? (
      <MonthlyAllowanceModal
        mode={monthlyAllowanceModalMode}
        record={currentMonthlyAllowance}
        husbandRoleTitle={currentRole.title}
        onPrimary={handleMonthlyAllowancePrimary}
        onSecondary={handleMonthlyAllowanceSecondary}
        onTertiary={handleMonthlyAllowanceTertiary}
        onDismiss={
          monthlyAllowanceModalMode === "wife-pending" ||
          monthlyAllowanceModalMode === "wife-paused" ||
          monthlyAllowanceModalMode === "missing-config"
            ? dismissMonthlyAllowanceModal
            : undefined
        }
        onSkip={
          monthlyAllowanceNotification(
            monthlyAllowanceModalMode,
            currentMonthlyAllowance,
          )
            ? handleSkipMonthlyAllowanceModal
            : undefined
        }
      />
    ) : null;
  const notificationReplayModal = (
    <NotificationReplayModal
      item={activeWifeUpgradeDecree ? null : activeNotificationItem}
      saving={false}
      error={decreeError}
      onAcknowledge={handleAcknowledgeNotificationReplay}
      onSkip={handleSkipNotificationReplay}
    />
  );
  const cinematicOverlays = (
    <>
      {husbandRoleUpgradeDecreeCinematic}
      {roleUpgradeCinematic && !activeHusbandUpgradeDecree ? (
        <RoleUpgradeCinematic
          {...roleUpgradeCinematic}
          isOpen
          onComplete={() => setRoleUpgradeCinematic(null)}
        />
      ) : null}
      <TaskRewardFlight
        event={taskRewardFlight}
        onComplete={() => setTaskRewardFlight(null)}
      />
      <SlaveStateCinematic
        event={slaveStateCinematic}
        onComplete={() => setSlaveStateCinematic(null)}
      />
    </>
  );
  const chatOverlay = (
    <ChatMessagePanel
      isOpen={Boolean(activeChatViewer)}
      viewer={activeChatViewer ?? "husband"}
      avatars={chatAvatars}
      messages={chatMessages}
      onClose={() => setActiveChatViewer(null)}
      onSend={handleSendChat}
    />
  );

  if (loadingOverlay && loadingBackdropMode === "room") {
    return (
      <>
        {loadingOverlay}
        {pixelTransition}
        {cinematicOverlays}
      </>
    );
  }

  if (route === "login") {
    return (
      <main className="app">
        <LoginPage onEnterRole={handleEnterRole} isEntering={isLoading} />
        {loadingOverlay}
        {pixelTransition}
        {cinematicOverlays}
      </main>
    );
  }

  if (route === "wife") {
    return (
      <main className="app app--wife">
        <WifeDashboard
          role={currentRole}
          progress={progress}
          tasks={tasks}
          logs={logs}
          walletLedger={walletLedger}
          activeAnomalies={activeAnomalies}
          taskCompleteIllustrationActive={wifeTaskCompleteIllustrationActive}
          punishment={punishment}
          benefits={currentLevelBenefits}
          roles={roles}
          onCreateTask={handleCreateTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
          onApproveBenefit={handleApproveBenefit}
          onRejectBenefit={handleRejectBenefit}
          onAdjustExperience={handleAdjustExperience}
          onAdjustWallet={handleAdjustWallet}
          onTipHusband={beginWifeTipPayment}
          monthlyAllowanceBaseAmount={
            nextAllowanceBaseSalary + nextAllowanceTaskStats.taskBonus
          }
          monthlyAllowanceAdjustment={nextAllowanceAdjustment}
          onSetLevel={(level) =>
            handleSetLevel(
              level,
              level === MIN_LEVEL ? "打入流落街头" : "重新指定等级",
            )
          }
          onLevelDelta={(delta) =>
            handleSetLevel(
              clampLevel(progress.level + delta, maxLevel),
              delta > 0 ? "赐予新职务" : "收回当前职务",
            )
          }
          onPunishStatus={handlePunishStatus}
          onRestoreNormal={handleRestoreNormal}
          onReturnToLogin={handleReturnToLogin}
          chatUnreadCount={wifeChatUnreadCount}
          hasNotificationUnread={hasWifeNotificationUnread}
          illustrationTransition={wifeIllustrationTransition}
          illustrationTransitionBlocked={wifeIllustrationTransitionBlocked}
          illustrationLayouts={wifeIllustrationLayouts}
          onOpenChat={() => handleOpenChat("wife")}
          onOpenNotifications={() => handleOpenNotifications("wife")}
          onIllustrationTransitionDone={(id) =>
            setWifeIllustrationTransition((current) =>
              current?.id === id ? null : current,
            )
          }
        />
        <TipAmountModal
          open={tipAmountModalOpen}
          onConfirm={confirmWifeTipAmount}
          onDismiss={dismissTipAmountModal}
        />
        <StoryModal
          story={showSlaveRuling || activeWifeUpgradeDecree ? null : story}
          confirmLabel="下旨"
          onClose={handleStoryAcknowledge}
          onSkip={story?.notificationId ? handleStorySkip : undefined}
        />
        {monthlyAllowanceModal}
        {notificationReplayModal}
        <SlaveRulingModal
          open={showSlaveRuling && !activeWifeUpgradeDecree}
          onRestore={handleRestoreNormal}
          onContinueLabor={handleContinueSlaveLabor}
        />
        {loadingOverlay}
        {chatOverlay}
        {pixelTransition}
        {wifeRoleUpgradeCinematic}
        {cinematicOverlays}
      </main>
    );
  }

  if (punishment.status === "slave") {
    const slaveImage = publicAsset("/assets/slave/slave-page-latest.png");
    const slaveRole = {
      ...roleWithProgress(getRoleByLevel(roles, MIN_LEVEL), {
        ...progress,
        level: MIN_LEVEL,
        exp: 0,
      }, maxLevel),
      title: "卖身奴隶",
      biography: "表现太糟糕了，奴隶市场又新增了一个奴隶。",
      roleImage: slaveImage,
      benefitImage: slaveImage,
    };

    return (
      <main className="app">
        <HusbandVerticalPager
          activePage={slaveActivePage}
          initialPage={SLAVE_PAGES.STATUS}
          onPageChange={setSlaveActivePage}
        >
          <BenefitPage
            key="slave-benefit-page"
            role={slaveRole}
            previewDirection="none"
            currentLevel={MIN_LEVEL}
            benefits={sortedBenefits}
            canPrev={false}
            canNext={false}
            forceFrozen
            levelLabel="FINAL"
            showAllBenefits
            selectedBenefit={null}
            onPreviewPrev={() => undefined}
            onPreviewNext={() => undefined}
            onOpenBenefit={() => undefined}
            onCloseBenefit={() => undefined}
            onUseBenefit={() => undefined}
            onSelectView={(view) => {
              if (view === "role") setSlaveActivePage(SLAVE_PAGES.STATUS);
            }}
          />

          <SlavePage
            role={slaveRole}
            punishment={punishment}
            onReturnToLogin={handleReturnToLogin}
            onSelectView={(view) => {
              if (view === "benefits") setSlaveActivePage(SLAVE_PAGES.BENEFIT);
              if (view === "tasks") setSlaveActivePage(SLAVE_PAGES.TASK);
            }}
          />

          <TaskPage
            role={slaveRole}
            progress={{ ...progress, level: MIN_LEVEL, exp: 0 }}
            tasks={tasks}
            backdropImage={slaveRole.roleImage}
            levelLabel="FINAL"
            onStartTask={handleStartTask}
            onSubmitTask={handleSubmitTask}
            onSelectView={(view) => {
              if (view === "role") setSlaveActivePage(SLAVE_PAGES.STATUS);
            }}
          />
        </HusbandVerticalPager>

        <StoryModal
          story={activeDecree ? null : story}
          onClose={handleStoryAcknowledge}
          onSkip={story?.notificationId ? handleStorySkip : undefined}
        />
        {monthlyAllowanceModal}
        {decreeModal}
        {notificationReplayModal}
        {loadingOverlay}
        {pixelTransition}
        {cinematicOverlays}
      </main>
    );
  }

  return (
    <main className="app">
      <HusbandVerticalPager
        activePage={activePage}
        onPageChange={setActivePage}
        onSwipeLeft={handlePreviewNext}
        onSwipeRight={handlePreviewPrev}
      >
        <BenefitPage
          key={`benefit-page-${previewRole.level}`}
          role={previewRole}
          previewDirection={previewDirection}
          currentLevel={progress.level}
          benefits={sortedBenefits}
          canPrev={previewLevel > 0}
          canNext={previewLevel < maxLevel}
          selectedBenefit={selectedBenefit}
          onPreviewPrev={handlePreviewPrev}
          onPreviewNext={handlePreviewNext}
          onOpenBenefit={setSelectedBenefit}
          onCloseBenefit={() => setSelectedBenefit(null)}
          onUseBenefit={handleUseBenefit}
          onSelectView={handleSelectView}
          illustrationLayout={previewBenefitIllustrationLayout}
        />

        <RolePage
          key={`role-page-${previewRole.level}`}
          role={currentRole}
          previewRole={previewRole}
          previewDirection={previewDirection}
          canPrev={previewLevel > 0}
          canNext={previewLevel < maxLevel}
          roleCount={maxLevel + 1}
          wallet={progress.wallet}
          nextAllowanceAmount={nextAllowanceTotal}
          nextAllowanceMonth={nextAllowanceMonth}
          onPreviewPrev={handlePreviewPrev}
          onPreviewNext={handlePreviewNext}
          onOpenAllowanceDetail={handleOpenNextAllowanceDetail}
          onReturnToLogin={handleReturnToLogin}
          onSelectView={handleSelectView}
          chatUnreadCount={husbandChatUnreadCount}
          hasNotificationUnread={hasHusbandNotificationUnread}
          onOpenChat={() => handleOpenChat("husband")}
          onOpenNotifications={() => handleOpenNotifications("husband")}
          illustrationLayout={previewRoleIllustrationLayout}
        />

        <TaskPage
          role={currentRole}
          progress={progress}
          tasks={tasks}
          onStartTask={handleStartTask}
          onSubmitTask={handleSubmitTask}
          onSelectView={handleSelectView}
        />
      </HusbandVerticalPager>

      <StoryModal
        story={activeDecree ? null : story}
        onClose={handleStoryAcknowledge}
        onSkip={story?.notificationId ? handleStorySkip : undefined}
      />
      {monthlyAllowanceModal}
      {decreeModal}
      {notificationReplayModal}
      {loadingOverlay}
      {chatOverlay}
      {pixelTransition}
      {cinematicOverlays}
    </main>
  );
}
