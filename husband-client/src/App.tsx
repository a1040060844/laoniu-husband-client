import { useEffect, useMemo, useRef, useState } from "react";
import { BenefitPage } from "./components/BenefitPage";
import {
  HUSBAND_PAGES,
  HusbandVerticalPager,
} from "./components/HusbandVerticalPager";
import { RolePage } from "./components/RolePage";
import { SlavePage } from "./components/SlavePage";
import { StoryModal } from "./components/StoryModal";
import { TaskPage } from "./components/TaskPage";
import { WifeDashboard } from "./components/WifeDashboard";
import { benefits as benefitData } from "./data/benefits";
import { roles } from "./data/roles";
import {
  MIN_LEVEL,
  clampLevel,
  expRequiredForLevel,
  grantExperience,
  roleWithProgress,
  settleConfirmedTasks,
} from "./game/progression";
import {
  createNormalPunishment,
  createSlavePunishment,
  isPunishmentRecoverable,
  loadTaskSystem,
  persistLocalTaskSystem,
  readLocalTaskSystem,
  saveTaskSystem,
} from "./lib/taskSystem";
import { publicAsset } from "./lib/assets";
import { taskRewardExp, taskRewardText } from "./lib/taskRewards";
import type {
  Benefit,
  EventLog,
  StoryEvent,
  Task,
  ViewKey,
} from "./types/domain";
import "./styles.css";

export type PreviewDirection = "none" | "next" | "prev";

const SLAVE_PAGES = {
  BENEFIT: 0,
  STATUS: 1,
  TASK: 2,
} as const;

export default function App() {
  const initialState = useMemo(readLocalTaskSystem, []);
  const [route, setRoute] = useState(() =>
    window.location.pathname.startsWith("/wife") ? "wife" : "husband",
  );
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
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [story, setStory] = useState<StoryEvent | null>(null);
  const hasLoadedServerState = useRef(false);

  const currentRole = roleWithProgress(roles[progress.level], progress);
  const previewRole = roleWithProgress(roles[previewLevel], progress);

  const sortedBenefits = useMemo(() => {
    return [...benefitData].sort((a, b) => a.levelRequired - b.levelRequired);
  }, []);

  function addLog(
    log: Omit<EventLog, "id" | "createdAt"> & { createdAt?: string },
  ) {
    const createdAt = log.createdAt ?? new Date().toISOString();
    setLogs((current) => [
      {
        ...log,
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt,
      },
      ...current,
    ]);
  }

  useEffect(() => {
    setPreviewLevel(progress.level);
  }, [progress.level]);

  useEffect(() => {
    let cancelled = false;
    loadTaskSystem()
      .then((serverState) => {
        if (cancelled) return;
        hasLoadedServerState.current = true;
        setProgress(serverState.progress);
        setTasks(serverState.tasks);
        setLogs(serverState.logs);
        setPunishment(serverState.punishment);
      })
      .catch(() => {
        hasLoadedServerState.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const state = { progress, punishment, tasks, logs };
    persistLocalTaskSystem(state);

    if (!hasLoadedServerState.current) return;
    const timeout = window.setTimeout(() => {
      saveTaskSystem(state).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [logs, progress, punishment, tasks]);

  useEffect(() => {
    const rewardedAt = new Date().toISOString();
    const newlyRewardedTasks = tasks.filter(
      (task) =>
        (task.status === "confirmed" || task.status === "completed") &&
        !progress.rewardedTaskIds.includes(task.id),
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
            .map((task) => task.id)
            .filter((taskId) => !current.rewardedTaskIds.includes(taskId)),
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
      }
      return;
    }

    const settled = settleConfirmedTasks(progress, tasks, roles);
    if (settled.stories.length === 0) return;
    setProgress(settled.progress);
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
      setRoute(
        window.location.pathname.startsWith("/wife") ? "wife" : "husband",
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
              deadline: "鍒氬垰鎻愪氦",
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
    addLog({
      type: "task_created",
      title: nextTask.title,
      description: nextTask.description,
      taskId: nextTask.id,
      taskTitle: nextTask.title,
      createdAt,
    });
    setStory({
      title: "任务已下达",
      text: `老婆大人发布了「${nextTask.title}」，老哥即刻进入待命状态。`,
      tone: nextTask.type === "urgent" ? "punish" : "normal",
    });
  }

  function handleApproveTask(id: string) {
    const confirmedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    const isSlave = punishment.status === "slave";
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "confirmed",
              confirmedAt,
              resultText: isSlave
                ? `老婆大人已确认：恢复经验 +${Math.min(30, taskRewardExp(task))}`
                : `老婆大人已确认：${taskRewardText(task)}`,
            }
          : task,
      ),
    );
    if (target) {
      addLog({
        type: "task_approved",
        title: target.title,
        description: isSlave
          ? `恢复经验 +${Math.min(30, taskRewardExp(target))}`
          : `奖励：${taskRewardText(target)}`,
        taskId: target.id,
        taskTitle: target.title,
        createdAt: confirmedAt,
      });
    }
  }
  function handleRejectTask(id: string) {
    const rejectedAt = new Date().toISOString();
    const target = tasks.find((task) => task.id === id);
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "failed",
              resultText: "老婆大人裁定未通过，需要重新表现。",
            }
          : task,
      ),
    );
    if (target) {
      addLog({
        type: "task_rejected",
        title: target.title,
        description: "老婆大人裁定未通过，需要重新表现。",
        taskId: target.id,
        taskTitle: target.title,
        createdAt: rejectedAt,
      });
    }
    setStory({
      title: "任务被打回",
      text: "老婆大人轻轻敲了敲桌面：这次不算，重新来过。",
      tone: "punish",
    });
  }

  function handleUseBenefit(benefit: Benefit) {
    addLog({
      type: "benefit_requested",
      title: benefit.name,
      description: benefit.description,
      benefitId: benefit.id,
      benefitName: benefit.name,
    });
    setSelectedBenefit(null);
    setStory({
      title: `申请：${benefit.name}`,
      text: "申请已经递交。老婆大人会根据表现决定是否恩准这次权益。",
      tone: benefit.levelRequired >= 9 ? "upgrade" : "normal",
    });
  }

  function handleApproveBenefit(benefit: Benefit) {
    addLog({
      type: "benefit_approved",
      title: benefit.name,
      description: benefit.description,
      benefitId: benefit.id,
      benefitName: benefit.name,
    });
    setStory({
      title: `恩准：${benefit.name}`,
      text: `老婆大人准许本次「${benefit.name}」申请。${benefit.description}`,
      tone: benefit.levelRequired >= 8 ? "upgrade" : "normal",
    });
  }

  function handleAdjustExperience(amount: number) {
    if (amount > 0) {
      setProgress((current) => {
        const result = grantExperience(
          current,
          amount,
          roles,
          "老妞大人亲自赏赐",
        );
        if (result.stories.length) {
          setStory(result.stories[result.stories.length - 1]);
        }
        if (result.progress.level !== current.level) {
          addLog({
            type: "level_changed",
            title: roles[result.progress.level].title,
            description: "经验奖励触发等级变化",
            fromLevel: current.level,
            toLevel: result.progress.level,
          });
        }
        return result.progress;
      });
      return;
    }

    setProgress((current) => ({
      ...current,
      exp: Math.max(0, current.exp + amount),
      totalExp: Math.max(0, current.totalExp + amount),
    }));
  }

  function handleCustomExperience(amount: number) {
    handleAdjustExperience(amount);
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
    setPreviewLevel(safeLevel);
    if (safeLevel !== previousLevel) {
      addLog({
        type: "level_changed",
        title: roles[safeLevel].title,
        description: reason,
        fromLevel: previousLevel,
        toLevel: safeLevel,
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
    setPunishment(createSlavePunishment());
    setSlaveActivePage(SLAVE_PAGES.STATUS);
    setProgress((current) => ({
      ...current,
      level: MIN_LEVEL,
      exp: 0,
      wallet: 0,
    }));
    setPreviewLevel(MIN_LEVEL);
    addLog({
      type: "punishment_status_changed",
      title: "卖身奴隶状态",
      description: "冻结权益与零花钱，职务降至流落街头。",
      fromStatus: previousPunishmentStatus,
      toStatus: "slave",
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
    if (!isPunishmentRecoverable(punishment)) return;
    setPunishment(createNormalPunishment());
    addLog({
      type: "punishment_status_changed",
      title: "恢复正常",
      description: "惩罚时间已结束，恢复经验已达标，卖身奴隶状态解除。",
      fromStatus: "slave",
      toStatus: "normal",
    });
    setStory({
      title: "恢复正常",
      text: "老婆大人确认恢复条件已满足，卖身奴隶状态解除，重新进入正常服役。",
      tone: "normal",
    });
  }

  if (route === "wife") {
    return (
      <main className="app app--wife">
        <WifeDashboard
          role={currentRole}
          progress={progress}
          tasks={tasks}
          logs={logs}
          punishment={punishment}
          benefits={sortedBenefits}
          roles={roles}
          onCreateTask={handleCreateTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
          onApproveBenefit={handleApproveBenefit}
          onAdjustExperience={handleAdjustExperience}
          onCustomExperience={handleCustomExperience}
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
        />
        <StoryModal story={story} onClose={() => setStory(null)} />
      </main>
    );
  }

  if (punishment.status === "slave") {
    const slaveImage = publicAsset("/assets/slave/slave-market.png");
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

        <StoryModal story={story} onClose={() => setStory(null)} />
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
          onPreviewPrev={handlePreviewPrev}
          onPreviewNext={handlePreviewNext}
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

      <StoryModal story={story} onClose={() => setStory(null)} />
    </main>
  );
}
