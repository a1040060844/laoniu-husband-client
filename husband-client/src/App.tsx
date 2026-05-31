import { useEffect, useMemo, useRef, useState } from "react";
import { BenefitPage } from "./components/BenefitPage";
import { HUSBAND_PAGES, HusbandVerticalPager } from "./components/HusbandVerticalPager";
import { RolePage } from "./components/RolePage";
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
import { loadTaskSystem, persistLocalTaskSystem, readLocalTaskSystem, saveTaskSystem } from "./lib/taskSystem";
import type { Benefit, StoryEvent, Task, ViewKey } from "./types/domain";
import "./styles.css";

export default function App() {
  const initialState = useMemo(readLocalTaskSystem, []);
  const [route, setRoute] = useState(() => (window.location.pathname.startsWith("/wife") ? "wife" : "husband"));
  const [activePage, setActivePage] = useState<number>(HUSBAND_PAGES.ROLE);
  const [progress, setProgress] = useState(initialState.progress);
  const [previewLevel, setPreviewLevel] = useState(initialState.progress.level);
  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [story, setStory] = useState<StoryEvent | null>(null);
  const hasLoadedServerState = useRef(false);

  const currentRole = roleWithProgress(roles[progress.level], progress);
  const previewRole = roleWithProgress(roles[previewLevel], progress);

  const sortedBenefits = useMemo(() => {
    return [...benefitData].sort((a, b) => a.levelRequired - b.levelRequired);
  }, []);

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
      })
      .catch(() => {
        hasLoadedServerState.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const state = { progress, tasks };
    persistLocalTaskSystem(state);

    if (!hasLoadedServerState.current) return;
    const timeout = window.setTimeout(() => {
      saveTaskSystem(state).catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [progress, tasks]);

  useEffect(() => {
    const settled = settleConfirmedTasks(progress, tasks, roles);
    if (settled.stories.length === 0) return;
    setProgress(settled.progress);
    setStory(settled.stories[settled.stories.length - 1]);
  }, [progress, tasks]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname.startsWith("/wife") ? "wife" : "husband");
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
    setPreviewLevel((level) => Math.max(0, level - 1));
  }

  function handlePreviewNext() {
    setPreviewLevel((level) => Math.min(roles.length - 1, level + 1));
  }

  function handleStartTask(id: string) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status: "doing" } : task)));
  }

  function handleSubmitTask(id: string, submitNote: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, status: "submitted", submitNote, deadline: "刚刚提交" } : task,
      ),
    );
    setStory({
      title: "任务已提交",
      text: "你把结果递到老妞大人案前，经验和零花钱会在她确认后正式入账。",
      tone: "normal",
    });
  }

  function handleCreateTask(task: Task) {
    setTasks((current) => [task, ...current]);
    setStory({
      title: "任务已下达",
      text: `老妞大人发布了「${task.title}」，老哥即刻进入待命状态。`,
      tone: task.type === "urgent" ? "punish" : "normal",
    });
  }

  function handleApproveTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "confirmed",
              resultText: `老妞大人已确认：+${task.rewardExp} EXP${task.rewardMoney ? `，+${task.rewardMoney} 零花钱` : ""}`,
            }
          : task,
      ),
    );
  }

  function handleRejectTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status: "failed",
              resultText: "老妞大人裁定未通过，需要重新表现。",
            }
          : task,
      ),
    );
    setStory({
      title: "任务被打回",
      text: "老妞大人轻轻敲了敲桌面：这次不算，重新来过。",
      tone: "punish",
    });
  }

  function handleUseBenefit(benefit: Benefit) {
    setSelectedBenefit(null);
    setStory({
      title: `申请：${benefit.name}`,
      text: "申请已经递交。老妞大人会根据你的表现，决定是否恩准这次权益。",
      tone: benefit.levelRequired >= 9 ? "upgrade" : "normal",
    });
  }

  function handleApproveBenefit(benefit: Benefit) {
    setStory({
      title: `恩准：${benefit.name}`,
      text: `老妞大人准许本次「${benefit.name}」申请。${benefit.description}`,
      tone: benefit.levelRequired >= 8 ? "upgrade" : "normal",
    });
  }

  function handleAdjustExperience(amount: number) {
    if (amount > 0) {
      setProgress((current) => {
        const result = grantExperience(current, amount, roles, "老妞大人亲自赏赐");
        if (result.stories.length) {
          setStory(result.stories[result.stories.length - 1]);
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
    setProgress((current) => ({
      ...current,
      level: safeLevel,
      exp: Math.min(current.exp, expRequiredForLevel(safeLevel)),
    }));
    setPreviewLevel(safeLevel);
    setStory({
      title: "职务裁定",
      text: `老妞大人已${reason}，当前职务定为「${roles[safeLevel].title}」。`,
      tone: safeLevel > progress.level ? "upgrade" : safeLevel < progress.level ? "down" : "normal",
    });
  }

  function handlePunishStatus() {
    setProgress((current) => ({
      ...current,
      level: MIN_LEVEL,
      exp: 0,
      wallet: 0,
    }));
    setPreviewLevel(MIN_LEVEL);
    setStory({
      title: "最终裁定",
      text: "老妞大人执行卖身奴隶状态：冻结权益与零花钱，职务降至流落街头。",
      tone: "punish",
    });
  }

  if (route === "wife") {
    return (
      <main className="app app--wife">
        <WifeDashboard
          role={currentRole}
          progress={progress}
          tasks={tasks}
          benefits={sortedBenefits}
          roles={roles}
          onCreateTask={handleCreateTask}
          onApproveTask={handleApproveTask}
          onRejectTask={handleRejectTask}
          onApproveBenefit={handleApproveBenefit}
          onAdjustExperience={handleAdjustExperience}
          onCustomExperience={handleCustomExperience}
          onSetLevel={(level) => handleSetLevel(level, level === MIN_LEVEL ? "打入流落街头" : "重新指定等级")}
          onLevelDelta={(delta) =>
            handleSetLevel(
              clampLevel(progress.level + delta),
              delta > 0 ? "赐予新职务" : "收回当前职务",
            )
          }
          onPunishStatus={handlePunishStatus}
        />
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
          role={previewRole}
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
          role={currentRole}
          previewRole={previewRole}
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
