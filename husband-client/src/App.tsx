import { useEffect, useMemo, useRef, useState } from "react";
import { useCallback } from "react";
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
import { RolePage } from "./components/RolePage";
import { SlavePage } from "./components/SlavePage";
import { SlaveRulingModal } from "./components/SlaveRulingModal";
import { StoryModal } from "./components/StoryModal";
import { TaskPage } from "./components/TaskPage";
import { WifeDashboard } from "./components/WifeDashboard";
import { PixelTransition } from "./components/effects/PixelTransition";
import { roles } from "./data/roles";
import {
  MIN_LEVEL,
  clampLevel,
  expRequiredForLevel,
  grantExperience,
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
  mergeDecrees,
  persistLocalTaskSystem,
  readLocalTaskSystem,
  refreshTaskCycles,
  saveTaskSystem,
} from "./lib/taskSystem";
import { publicAsset } from "./lib/assets";
import {
  preloadRouteAssets,
  type AppRoute,
} from "./lib/preloadAssets";
import { taskRewardExp, taskRewardMoney, taskRewardText } from "./lib/taskRewards";
import { LoginPage } from "./pages/LoginPage";
import type {
  Benefit,
  DecreeEvent,
  EventLog,
  StoryEvent,
  Task,
  TaskReward,
  TaskReviewDecision,
  ViewKey,
  WalletLedgerEntry,
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

function routeFromPathname(pathname: string): RouteKey {
  if (pathname === "/") return "login";
  if (pathname.startsWith("/wife")) return "wife";
  if (pathname.startsWith("/husband")) return "husband";
  return "husband";
}

function ledgerId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function decreeId() {
  return `decree-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function taskSystemFingerprint(state: LoadedTaskSystem) {
  return JSON.stringify(state);
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

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function benefitCooldownMs(benefit: Benefit) {
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
        return {
          id: ledgerId("ledger-money"),
          type: "allowance",
          source: "任务奖励",
          amount,
          unit: "CNY",
          createdAt,
          taskId: task.id,
          taskTitle: task.title,
          note: reward.label,
        };
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
  const [route, setRoute] = useState<RouteKey>(initialRoute);
  const [activePage, setActivePage] = useState<number>(HUSBAND_PAGES.ROLE);
  const [slaveActivePage, setSlaveActivePage] = useState<number>(
    SLAVE_PAGES.STATUS,
  );
  const [progress, setProgress] = useState(initialState.progress);
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
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [story, setStory] = useState<StoryEvent | null>(null);
  const [showSlaveRuling, setShowSlaveRuling] = useState(false);
  const [husbandSyncReady, setHusbandSyncReady] = useState(false);
  const [taskSystemReady, setTaskSystemReady] = useState(false);
  const [decreeSaving, setDecreeSaving] = useState(false);
  const [decreeError, setDecreeError] = useState<string>();
  const [loadingTarget, setLoadingTarget] = useState<AppRoute | null>(
    initialRoute === "login" ? null : initialRoute,
  );
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(initialRoute !== "login");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("loading");
  const [isLoadingPreview, setIsLoadingPreview] = useState(
    initialRoute !== "login" && isLoadingPreviewRoute(initialRoute),
  );
  const [loadingBackdropMode, setLoadingBackdropMode] =
    useState<LoadingBackdropMode>(initialRoute === "login" ? "current" : "room");
  const hasLoadedServerState = useRef(false);
  const loadingAttemptRef = useRef(0);
  const navigationLockedRef = useRef(initialRoute !== "login");
  const loadingPushHistoryRef = useRef(false);
  const pixelTransitionActionRef = useRef<(() => void) | null>(null);
  const decreesRef = useRef(initialState.decrees);
  const lastRemoteFingerprintRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const salaryProcessingRef = useRef(new Set<string>());
  const [pixelTransitionKey, setPixelTransitionKey] = useState(0);

  const runPixelTransition = useCallback((action: () => void) => {
    pixelTransitionActionRef.current = action;
    setPixelTransitionKey((current) => current + 1);
  }, []);

  const handlePixelCovered = useCallback(() => {
    const action = pixelTransitionActionRef.current;
    pixelTransitionActionRef.current = null;
    action?.();
  }, []);

  const currentRole = roleWithProgress(roles[progress.level], progress);
  const previewRole = roleWithProgress(roles[previewLevel], progress);

  const sortedBenefits = useMemo(() => {
    return [...benefits].sort((a, b) => a.levelRequired - b.levelRequired);
  }, [benefits]);

  const pendingDecrees = useMemo(
    () =>
      decrees
        .filter((decree) => decree.target === "husband" && !decree.acknowledgedAt)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [decrees],
  );
  const activeDecree =
    route === "husband" && husbandSyncReady ? pendingDecrees[0] ?? null : null;

  const applyRemoteState = useCallback((serverState: LoadedTaskSystem) => {
    const mergedDecrees = mergeDecrees(
      serverState.decrees,
      decreesRef.current,
    );
    lastRemoteFingerprintRef.current = taskSystemFingerprint(serverState);
    decreesRef.current = mergedDecrees;
    setProgress(serverState.progress);
    setTasks(serverState.tasks);
    setLogs(serverState.logs);
    setPunishment(serverState.punishment);
    setBenefits(serverState.benefits);
    setWalletLedger(serverState.walletLedger);
    setDecrees(mergedDecrees);
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

  const commitLoadedRoute = useCallback(
    (target: Exclude<AppRoute, "login">, pushHistory: boolean) => {
      const nextPath = target === "husband" ? "/husband" : "/wife";
      if (pushHistory && window.location.pathname !== nextPath) {
        window.history.pushState(null, "", nextPath);
      }
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
      loadingAttemptRef.current = attempt;
      loadingPushHistoryRef.current = pushHistory;
      navigationLockedRef.current = true;
      setLoadingTarget(target);
      setLoadingBackdropMode(backdropMode);
      setLoadingPercent(1);
      setLoadingPhase("loading");
      setIsLoadingPreview(previewMode);
      setIsLoading(true);

      const visualProgressRequest = new Promise<void>((resolve) => {
        const startedAt = window.performance.now();
        let settled = false;
        const finish = (showFinalProgress: boolean) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(fallbackTimer);
          if (
            showFinalProgress &&
            loadingAttemptRef.current === attempt
          ) {
            setLoadingPercent(99);
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
      });

      Promise.all([
        preloadRouteAssets(target),
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

  function appendDecree(
    decree: Omit<DecreeEvent, "id" | "createdAt" | "target"> & {
      createdAt?: string;
    },
  ) {
    const nextDecree: DecreeEvent = {
      ...decree,
      id: decreeId(),
      createdAt: decree.createdAt ?? new Date().toISOString(),
      target: "husband",
    };
    setDecrees((current) => [...current, nextDecree]);
    return nextDecree;
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
    if (route !== "husband") {
      setHusbandSyncReady(false);
      return;
    }

    let cancelled = false;
    const syncFresh = async () => {
      try {
        const serverState = await loadTaskSystemFresh();
        if (!cancelled) applyRemoteState(serverState);
      } catch {
        // Keep the last local state when the sync service is temporarily offline.
      } finally {
        if (!cancelled) setHusbandSyncReady(true);
      }
    };

    void syncFresh();
    const timer = window.setInterval(syncFresh, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [applyRemoteState, route]);

  useEffect(() => {
    if (initialRoute === "login") {
      preloadRouteAssets("login").catch(() => undefined);
      return;
    }

    runLoadingAttempt(initialRoute, false, "room");
    return () => {
      loadingAttemptRef.current += 1;
    };
  }, [initialRoute, runLoadingAttempt]);

  useEffect(() => {
    decreesRef.current = decrees;
  }, [decrees]);

  useEffect(() => {
    const state = {
      progress,
      punishment,
      tasks,
      logs,
      benefits,
      walletLedger,
      decrees,
    };
    persistLocalTaskSystem(state);

    if (taskSystemFingerprint(state) === lastRemoteFingerprintRef.current) return;
    if (!hasLoadedServerState.current) return;
    const timeout = window.setTimeout(() => {
      void enqueueSave(async () => {
          const serverState = await loadTaskSystemFresh();
          await saveTaskSystem({
            ...state,
            decrees: mergeDecrees(serverState.decrees, state.decrees),
          });
        }).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    benefits,
    decrees,
    enqueueSave,
    logs,
    progress,
    punishment,
    tasks,
    walletLedger,
  ]);

  useEffect(() => {
    if (!activeDecree || activeDecree.readAt) return;
    const readAt = new Date().toISOString();
    setDecrees((current) =>
      current.map((decree) =>
        decree.id === activeDecree.id ? { ...decree, readAt } : decree,
      ),
    );
  }, [activeDecree]);

  useEffect(() => {
    setDecreeError(undefined);
  }, [activeDecree?.id]);

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
        setStory({
          title: "恢复经验累计",
          text: `卖身奴隶状态下，任务奖励转入恢复进度：+${recoveryExp}。`,
          tone: "normal",
        });
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
    const entries = newlyRewardedTasks.flatMap((task) =>
      ledgerEntriesFromTask(task, rewardedAt),
    );
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
    setStory(settled.stories[settled.stories.length - 1]);
  }, [progress, punishment.status, tasks]);

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

        runLoadingAttempt(nextRoute, false, "current");
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [runLoadingAttempt, runPixelTransition]);

  useEffect(() => {
    if (!taskSystemReady || punishment.status === "slave") return;
    const monthKey = getCurrentMonthKey();
    if (
      walletLedger.some(
        (entry) => entry.type === "salary" && entry.monthKey === monthKey,
      )
    ) {
      salaryProcessingRef.current.add(monthKey);
      return;
    }
    if (salaryProcessingRef.current.has(monthKey)) return;
    salaryProcessingRef.current.add(monthKey);
    const salary = currentRole.salary;
    const createdAt = new Date().toISOString();
    setProgress((current) => ({
      ...current,
      wallet: current.wallet + salary,
    }));
    addLedger({
      id: `salary-${monthKey}`,
      type: "salary",
      source: "月薪发放",
      amount: salary,
      unit: "CNY",
      monthKey,
      createdAt,
      note: `${monthKey} 月薪`,
    });
  }, [currentRole.salary, punishment.status, taskSystemReady, walletLedger]);

  function handleSelectView(view: ViewKey) {
    const pageMap: Record<ViewKey, number> = {
      benefits: HUSBAND_PAGES.BENEFIT,
      role: HUSBAND_PAGES.ROLE,
      tasks: HUSBAND_PAGES.TASK,
    };
    setActivePage(pageMap[view]);
  }

  function handlePreviewPrev() {
    setPreviewDirection("prev");
    setPreviewLevel((level) => Math.max(0, level - 1));
  }

  function handlePreviewNext() {
    setPreviewDirection("next");
    setPreviewLevel((level) => Math.min(roles.length - 1, level + 1));
  }

  function handleStartTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status: "doing" } : task,
      ),
    );
  }

  function handleSubmitTask(id: string, submitNote: string) {
    const submittedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
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
    }
    setStory({
      title: "任务已提交",
      text: "你把结果递到老婆大人案前，经验和零花钱会在她确认后正式入账。",
      tone: "normal",
    });
  }

  function handleCreateTask(task: Task) {
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
    setStory({
      title: "任务已下达",
      text: `老婆大人发布了「${nextTask.title}」，老哥即刻进入待命状态。`,
      tone: nextTask.type === "urgent" ? "punish" : "normal",
    });
  }

  function handleApproveTask(id: string, decision?: TaskReviewDecision) {
    const confirmedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    const isSlave = punishment.status === "slave";
    const repeatTarget = target
      ? Math.max(1, target.repeatCount ?? target.timeConfig?.repeatCount ?? 1)
      : 1;
    const nextCompleted = target
      ? Math.min(repeatTarget, (target.completedCount ?? target.timeConfig?.completedCount ?? 0) + 1)
      : 1;
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? nextCompleted < repeatTarget
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
                status: "confirmed",
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
    setStory({
      title: "任务被打回",
      text: "老婆大人轻轻敲了敲桌面：这次不算，重新来过。",
      tone: "punish",
    });
  }

  function handleUseBenefit(benefit: Benefit) {
    if (punishment.status === "slave") return;
    const currentBenefit = benefits.find((item) => item.id === benefit.id) ?? benefit;
    if ((currentBenefit.availableBonusCount ?? 0) > 0) {
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
    if (currentBenefit.pendingRequest) {
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
      setSelectedBenefit(null);
      setStory({
        title: "权益冷却中",
        text: `「${currentBenefit.name}」冷却至 ${formatDateTime(currentBenefit.cooldownUntil)}。`,
        tone: "normal",
      });
      return;
    }
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
    setSelectedBenefit(null);
    setStory({
      title: `申请：${currentBenefit.name}`,
      text: "申请已经递交。老婆大人会根据表现决定是否恩准这次权益。",
      tone: currentBenefit.levelRequired >= 9 ? "upgrade" : "normal",
    });
  }

  function handleApproveBenefit(benefit: Benefit) {
    const approvedAt = new Date().toISOString();
    const cooldownUntil = new Date(
      Date.now() + benefitCooldownMs(benefit),
    ).toISOString();
    setBenefits((current) =>
      current.map((item) =>
        item.id === benefit.id
          ? {
              ...item,
              lastApprovedAt: approvedAt,
              cooldownUntil,
              cooldownText: `冷却至 ${formatDateTime(cooldownUntil)}`,
              pendingRequest: undefined,
              status: "cooldown",
            }
          : item,
      ),
    );
    const log = addLog({
      type: "benefit_approved",
      title: benefit.name,
      description: `已批准，冷却至 ${formatDateTime(cooldownUntil)}。`,
      benefitId: benefit.id,
      benefitName: benefit.name,
      createdAt: approvedAt,
    });
    appendDecree({
      type: "benefit_approved",
      title: `恩准：${benefit.name}`,
      text: `老妞大人准许本次「${benefit.name}」申请。${benefit.description}`,
      tone: benefit.levelRequired >= 8 ? "upgrade" : "normal",
      createdAt: approvedAt,
      sourceLogId: log.id,
      payload: { benefitId: benefit.id, cooldownUntil },
    });
    setStory({
      title: `恩准：${benefit.name}`,
      text: `老婆大人准许本次「${benefit.name}」申请。${benefit.description}`,
      tone: benefit.levelRequired >= 8 ? "upgrade" : "normal",
    });
  }

  function handleRejectBenefit(benefit: Benefit, reason?: string) {
    const rejectedAt = new Date().toISOString();
    const rejectedReason = reason?.trim() || "老婆大人暂不批准本次权益申请。";
    setBenefits((current) =>
      current.map((item) =>
        item.id === benefit.id
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
      title: benefit.name,
      description: rejectedReason,
      benefitId: benefit.id,
      benefitName: benefit.name,
      createdAt: rejectedAt,
    });
    appendDecree({
      type: "benefit_rejected",
      title: `暂缓：${benefit.name}`,
      text: rejectedReason,
      tone: "down",
      createdAt: rejectedAt,
      sourceLogId: log.id,
      payload: { benefitId: benefit.id, reason: rejectedReason },
    });
    setStory({
      title: `暂缓：${benefit.name}`,
      text: rejectedReason,
      tone: "normal",
    });
  }

  function handleAdjustExperience(amount: number) {
    const createdAt = new Date().toISOString();
    if (amount > 0) {
      const result = grantExperience(
        progress,
        amount,
        roles,
        "老妞大人亲自赏赐",
      );
      setProgress(result.progress);
      if (result.stories.length) {
        setStory(result.stories[result.stories.length - 1]);
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
          title: roles[result.progress.level].title,
          description: "经验奖励触发等级变化",
          fromLevel: progress.level,
          toLevel: result.progress.level,
          createdAt: levelCreatedAt,
        });
        appendDecree({
          type: "level_changed",
          title: "职务晋升",
          text: `老妞大人已赐予新职务：「${roles[result.progress.level].title}」。`,
          tone: "upgrade",
          createdAt: levelCreatedAt,
          sourceLogId: levelLog.id,
          payload: { fromLevel: progress.level, toLevel: result.progress.level },
        });
      }
      return;
    }

    if (amount === 0) return;
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

  function handleSetLevel(level: number, reason: string) {
    const safeLevel = clampLevel(level);
    const previousLevel = progress.level;
    const previousPunishmentStatus = punishment.status;
    setPunishment(createNormalPunishment());
    setProgress((current) => ({
      ...current,
      level: safeLevel,
      exp: Math.min(current.exp, expRequiredForLevel(safeLevel)),
    }));
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
        title: roles[safeLevel].title,
        description: reason,
        fromLevel: previousLevel,
        toLevel: safeLevel,
      });
      appendDecree({
        type: "level_changed",
        title: safeLevel > previousLevel ? "职务晋升" : "职务降级",
        text:
          safeLevel > previousLevel
            ? `老妞大人已赐予新职务：「${roles[safeLevel].title}」。`
            : `老妞大人收回原职，现降为「${roles[safeLevel].title}」。`,
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
    setStory({
      title: "职务裁定",
      text: `老婆大人已${reason}，当前职务定为「${roles[safeLevel].title}」。`,
      tone:
        safeLevel > progress.level
          ? "upgrade"
          : safeLevel < progress.level
            ? "down"
            : "normal",
    });
  }

  function handlePunishStatus() {
    if (punishment.status === "slave") return;
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
        title: roles[MIN_LEVEL].title,
        description: "最终裁定",
        fromLevel: progress.level,
        toLevel: MIN_LEVEL,
      });
    }
    setStory({
      title: "最终裁定",
      text: "老婆大人执行卖身奴隶状态：冻结权益与零花钱，职务降至流落街头。",
      tone: "punish",
    });
  }

  function handleRestoreNormal() {
    if (punishment.status !== "slave") return;
    const restoredLevel = clampLevel(punishment.restoreLevel ?? progress.level);
    const restoredExp = Math.min(
      punishment.restoreExp ?? progress.exp,
      expRequiredForLevel(restoredLevel),
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
      description: `卖身奴隶状态解除，官复原职为「${roles[restoredLevel].title}」。`,
      fromStatus: "slave",
      toStatus: "normal",
    });
    appendDecree({
      type: "punishment_restored",
      title: "官复原职",
      text: `老妞大人解除卖身奴隶状态，恢复「${roles[restoredLevel].title}」职务、原有经验与零花钱。`,
      tone: "upgrade",
      createdAt: restoredLog.createdAt,
      sourceLogId: restoredLog.id,
      payload: { restoredLevel, restoredExp, restoredWallet },
    });
    if (restoredLevel !== progress.level) {
      addLog({
        type: "level_changed",
        title: roles[restoredLevel].title,
        description: "赎回后官复原职",
        fromLevel: progress.level,
        toLevel: restoredLevel,
      });
    }
    setStory({
      title: "赎回成功",
      text: `老婆大人已赎回骆老哥，卖身奴隶状态解除，恢复「${roles[restoredLevel].title}」职务、原有经验与零花钱。`,
      tone: "upgrade",
    });
    setShowSlaveRuling(false);
  }

  function handleContinueSlaveLabor() {
    if (punishment.status !== "slave") return;
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

  async function handleAcknowledgeDecree() {
    if (!activeDecree || decreeSaving) return;
    setDecreeSaving(true);
    setDecreeError(undefined);
    const acknowledgedAt = new Date().toISOString();
    const localAcknowledged = decrees.map((decree) =>
      decree.id === activeDecree.id
        ? { ...decree, acknowledgedAt }
        : decree,
    );
    try {
      const savedState = await enqueueSave(async () => {
        const serverState = await loadTaskSystemFresh();
        const nextState = {
          ...serverState,
          decrees: mergeDecrees(serverState.decrees, localAcknowledged),
        };
        await saveTaskSystem(nextState);
        return nextState;
      });
      applyRemoteState(savedState);
    } catch {
      setDecreeError("领旨保存失败，请检查连接后重试。");
    } finally {
      setDecreeSaving(false);
    }
  }

  function handleEnterRole(role: "husband" | "wife") {
    if (navigationLockedRef.current) return;
    navigationLockedRef.current = true;
    runPixelTransition(() => runLoadingAttempt(role, true, "current"));
  }

  function handleReturnToLogin() {
    runPixelTransition(() => {
      loadingAttemptRef.current += 1;
      navigationLockedRef.current = false;
      window.history.pushState(null, "", "/");
      setLoadingTarget(null);
      setLoadingPhase("loading");
      setIsLoadingPreview(false);
      setIsLoading(false);
      setRoute("login");
      preloadRouteAssets("login").catch(() => undefined);
    });
  }

  function handleRetryLoading() {
    if (
      loadingPhase !== "error" ||
      !loadingTarget ||
      loadingTarget === "login"
    ) return;
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
      decree={activeDecree}
      remainingCount={Math.max(0, pendingDecrees.length - 1)}
      saving={decreeSaving}
      error={decreeError}
      onAcknowledge={handleAcknowledgeDecree}
    />
  );

  if (loadingOverlay && loadingBackdropMode === "room") {
    return (
      <>
        {loadingOverlay}
        {pixelTransition}
      </>
    );
  }

  if (route === "login") {
    return (
      <main className="app">
        <LoginPage onEnterRole={handleEnterRole} isEntering={isLoading} />
        {loadingOverlay}
        {pixelTransition}
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
          punishment={punishment}
          benefits={sortedBenefits}
          roles={roles}
          onCreateTask={handleCreateTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
          onApproveBenefit={handleApproveBenefit}
          onRejectBenefit={handleRejectBenefit}
          onAdjustExperience={handleAdjustExperience}
          onSetLevel={(level) =>
            handleSetLevel(
              level,
              level === MIN_LEVEL ? "打入流落街头" : "重新指定等级",
            )
          }
          onLevelDelta={(delta) =>
            handleSetLevel(
              clampLevel(progress.level + delta),
              delta > 0 ? "赐予新职务" : "收回当前职务",
            )
          }
          onPunishStatus={handlePunishStatus}
          onRestoreNormal={handleRestoreNormal}
          onReturnToLogin={handleReturnToLogin}
        />
        <StoryModal
          story={showSlaveRuling ? null : story}
          confirmLabel="下旨"
          onClose={() => setStory(null)}
        />
        <SlaveRulingModal
          open={showSlaveRuling}
          onRestore={handleRestoreNormal}
          onContinueLabor={handleContinueSlaveLabor}
        />
        {loadingOverlay}
        {pixelTransition}
      </main>
    );
  }

  if (punishment.status === "slave") {
    const slaveImage = publicAsset("/assets/slave/slave-page-latest.png");
    const slaveRole = {
      ...roleWithProgress(roles[MIN_LEVEL], {
        ...progress,
        level: MIN_LEVEL,
        exp: 0,
      }),
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
          onClose={() => setStory(null)}
        />
        {decreeModal}
        {loadingOverlay}
        {pixelTransition}
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
          canNext={previewLevel < roles.length - 1}
          selectedBenefit={selectedBenefit}
          onPreviewPrev={handlePreviewPrev}
          onPreviewNext={handlePreviewNext}
          onOpenBenefit={setSelectedBenefit}
          onCloseBenefit={() => setSelectedBenefit(null)}
          onUseBenefit={handleUseBenefit}
          onSelectView={handleSelectView}
        />

        <RolePage
          key={`role-page-${previewRole.level}`}
          role={currentRole}
          previewRole={previewRole}
          previewDirection={previewDirection}
          canPrev={previewLevel > 0}
          canNext={previewLevel < roles.length - 1}
          roleCount={roles.length}
          wallet={progress.wallet}
          onPreviewPrev={handlePreviewPrev}
          onPreviewNext={handlePreviewNext}
          onReturnToLogin={handleReturnToLogin}
          onSelectView={handleSelectView}
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
        onClose={() => setStory(null)}
      />
      {decreeModal}
      {loadingOverlay}
      {pixelTransition}
    </main>
  );
}
