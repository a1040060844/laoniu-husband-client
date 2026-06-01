import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  BookOpen,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Crown,
  Edit3,
  FilePenLine,
  Gavel,
  KeyRound,
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
import { expRequiredForLevel, type GameProgress } from "../game/progression";
import type { Benefit, Role, Task, TaskType } from "../types/domain";

type WifeSheet = "task" | "review" | "benefit" | null;
type WifePage = "today" | "main" | "growth";
type WifeSubPage = "tasks" | "review" | "benefits" | "records" | "order";

interface WifeDashboardProps {
  role: Role;
  progress: GameProgress;
  tasks: Task[];
  benefits: Benefit[];
  roles: Role[];
  onCreateTask: (task: Task) => void;
  onApproveTask: (taskId: string) => void;
  onRejectTask: (taskId: string) => void;
  onApproveBenefit: (benefit: Benefit) => void;
  onAdjustExperience: (amount: number) => void;
  onCustomExperience: (amount: number) => void;
  onSetLevel: (level: number) => void;
  onLevelDelta: (delta: number) => void;
  onPunishStatus: () => void;
}

interface TaskDraft {
  title: string;
  description: string;
  type: TaskType;
  rewardExp: number;
  rewardMoney: number;
  deadline: string;
}

const initialDraft: TaskDraft = {
  title: "整理房间",
  description: "今晚睡前把房间整理干净，不许拖延。",
  type: "daily",
  rewardExp: 20,
  rewardMoney: 5,
  deadline: "今日 23:00 前",
};

const typeOptions: Array<{ value: TaskType; label: string }> = [
  { value: "daily", label: "日任务" },
  { value: "weekly", label: "周任务" },
  { value: "custom", label: "自定义" },
  { value: "urgent", label: "紧急" },
];

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
  { name: "正餐加封", desc: "今日可指定一顿认真吃饭", cost: "月薪抵扣 30" },
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

export function WifeDashboard({
  role,
  progress,
  tasks,
  benefits,
  roles,
  onCreateTask,
  onApproveTask,
  onRejectTask,
  onApproveBenefit,
  onAdjustExperience,
  onCustomExperience,
  onSetLevel,
  onLevelDelta,
  onPunishStatus,
}: WifeDashboardProps) {
  const [sheet, setSheet] = useState<WifeSheet>(null);
  const [activePage, setActivePage] = useState<WifePage>("main");
  const [subPage, setSubPage] = useState<WifeSubPage | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const touchStart = useRef<TouchPoint | null>(null);
  const wheelLocked = useRef(false);

  const requiredExp = expRequiredForLevel(progress.level);
  const expPercent = Math.min(
    100,
    Math.round((progress.exp / requiredExp) * 100),
  );
  const expToNext = Math.max(0, requiredExp - progress.exp);
  const nextRole = roles[Math.min(roles.length - 1, role.level + 1)];

  const submittedTasks = useMemo(
    () => tasks.filter((task) => task.status === "submitted"),
    [tasks],
  );
  const recentTask =
    submittedTasks[0] ??
    tasks.find((task) => task.status === "doing" || task.status === "todo") ??
    tasks[0];
  const pendingRulingCount = Math.max(2, submittedTasks.length);
  const pendingBenefitCount = 1;
  const abnormalCount = Math.max(
    1,
    tasks.filter((task) => task.status === "failed").length,
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
    submitted: "待审核",
    todo: "待执行",
  };

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
    if (sheet || subPage) return;
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (sheet || subPage) return;
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
      ".wife-growth, .wife-today",
    );
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
    if (sheet || subPage) return;
    if (wheelLocked.current || Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
    const activeScroller = (event.target as HTMLElement | null)?.closest(
      ".wife-growth, .wife-today",
    );
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

  function submitTask() {
    const title = draft.title.trim();
    if (!title) return;

    onCreateTask({
      id: taskId(),
      title,
      description:
        draft.description.trim() ||
        "由老妞大人亲自发布，验收标准以老妞大人裁定为准。",
      type: draft.type,
      source: "wife",
      rewardExp: Math.max(0, Math.trunc(draft.rewardExp)),
      rewardMoney: Math.max(0, Math.trunc(draft.rewardMoney)),
      deadline: draft.deadline.trim() || "今日完成",
      status: "todo",
    });
    setDraft(initialDraft);
    setSheet(null);
  }

  function customAdjust() {
    const value = window.prompt("请输入要调整的经验值，例如 +8 或 -6");
    if (!value) return;
    const amount = Number(value.trim());
    if (!Number.isFinite(amount) || amount === 0) return;
    onCustomExperience(amount);
  }

  return (
    <section
      className="wife-console"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div
        className="wife-pager-track"
        style={{
          transform: `translateY(-${WIFE_PAGE_INDEX[activePage] * 100}dvh)`,
        }}
      >
        <section className="wife-growth" id="wife-growth" aria-label="成长裁定">
          <img
            className="wife-growth__portrait"
            src="/assets/wife/wife-main.png"
            alt=""
          />
          <div className="wife-growth__shade" />

          <header className="wife-growth-title">
            <p>老妞端</p>
            <h1>成长裁定</h1>
            <span>升降赏罚，由老妞大人决定</span>
          </header>

          <section
            className="wife-growth-card wife-growth-status"
            aria-label="老哥成长状态"
          >
            <div className="wife-growth-status__head">
              <div>
                <p>老哥当前状态</p>
                <h2>
                  <small>Lv.{String(role.level).padStart(2, "0")}</small>
                  {role.title}
                </h2>
              </div>
              <div
                className="wife-rank-seal"
                aria-label={`当前职务插画：${role.title}`}
              >
                <img src={role.roleImage} alt="" />
              </div>
            </div>

            <div className="wife-growth-exp">
              <span>经验</span>
              <strong>
                {progress.exp} / {requiredExp}
              </strong>
            </div>
            <div
              className="wife-growth-progress"
              aria-label={`经验进度 ${expPercent}%`}
            >
              <i style={{ width: `${expPercent}%` }} />
            </div>

            <div className="wife-growth-meta">
              <span>
                <BadgeDollarSign size={17} />
                月薪 {role.salary}
              </span>
              <span>
                <ShieldCheck size={17} />
                正常服役中
              </span>
            </div>

            <p className="wife-growth-next">
              {role.level >= roles.length - 1
                ? "已抵达最高职务，赏罚仍由老妞大人裁定"
                : `距 Lv.${String(nextRole.level).padStart(2, "0")} ${nextRole.title} 还差 ${expToNext} 经验`}
            </p>
          </section>

          <section
            className="wife-growth-card wife-exp-control"
            aria-label="经验调整"
          >
            <div className="wife-growth-section-title">
              <h2>经验调整</h2>
              <p>老妞大人可直接赏赐或扣除经验</p>
            </div>
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
              <div className="wife-exp-orb" aria-label="当前经验">
                <Crown size={25} />
                <strong>{progress.exp}</strong>
                <span>/ {requiredExp}</span>
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
            <button
              className="wife-custom-adjust"
              type="button"
              onClick={customAdjust}
            >
              <Edit3 size={18} />
              自定义调整
            </button>
          </section>

          <section
            className="wife-growth-card wife-level-control"
            aria-label="等级调整"
          >
            <div className="wife-growth-section-title">
              <h2>等级调整</h2>
              <p>升职、降级、流放，皆由老妞决定</p>
            </div>
            <div className="wife-level-strip">
              <span>
                当前： Lv.{String(role.level).padStart(2, "0")} {role.title}
              </span>
              <i aria-hidden="true">›</i>
              <span>
                下一： Lv.{String(nextRole.level).padStart(2, "0")}{" "}
                {nextRole.title}
              </span>
            </div>
            <div className="wife-level-actions">
              <button type="button" onClick={() => onLevelDelta(1)}>
                <ArrowUp size={27} />
                <span>升一级</span>
                <em>赐予新职务</em>
              </button>
              <button type="button" onClick={() => onLevelDelta(-1)}>
                <ArrowDown size={27} />
                <span>降一级</span>
                <em>收回当前职务</em>
              </button>
              <button type="button" onClick={() => onSetLevel(nextRole.level)}>
                <Crown size={27} />
                <span>指定等级</span>
                <em>直接裁定职务</em>
              </button>
              <button type="button" onClick={() => onSetLevel(0)}>
                <Gavel size={27} />
                <span>打入流落街头</span>
                <em>降至最低职务</em>
              </button>
            </div>
          </section>

          <section
            className="wife-growth-card wife-punish-card"
            aria-label="惩罚状态"
          >
            <div className="wife-growth-section-title">
              <h2>惩罚状态</h2>
              <p>严重失败时，由老妞大人执行最终裁定</p>
            </div>
            <button
              className="wife-punish-state"
              type="button"
              onClick={onPunishStatus}
            >
              <Shield size={32} />
              <span>
                <strong>卖身奴隶状态</strong>
                <em>冻结权益与零花钱</em>
              </span>
              <Gavel size={27} />
            </button>
          </section>

          <a
            className="wife-growth-cue"
            href="#wife-main"
            onClick={handlePageLink("main")}
          >
            <span aria-hidden="true">∨</span>
            <span>上滑返回主页</span>
          </a>
        </section>

        <section className="wife-hero" id="wife-main" aria-label="老婆端主控台">
          <img
            className="wife-portrait"
            src="/assets/wife/wife-main.png"
            alt=""
          />
          <div className="wife-hero__shade" />

          <header className="wife-title">
            <p>老妞端</p>
            <h1>老妞宝座</h1>
            <span>赏罚升降，皆由老妞大人裁定</span>
            <a
              className="wife-side-hint"
              href="#wife-growth"
              onClick={handlePageLink("growth")}
            >
              <ShieldCheck size={16} />
              <span>下滑裁定老哥成长</span>
            </a>
          </header>

          <section className="wife-status-card" aria-label="老哥当前状态">
            <p className="wife-panel-title">
              <span /> 老哥当前状态 <span />
            </p>
            <h2>
              <small>Lv. {String(role.level).padStart(2, "0")}</small>
              {role.title}
            </h2>

            <div className="wife-exp-line">
              <span>经验</span>
              <strong>
                {progress.exp} / {requiredExp}
              </strong>
            </div>
            <div
              className="wife-progress"
              aria-label={`经验进度 ${expPercent}%`}
            >
              <i style={{ width: `${expPercent}%` }} />
            </div>

            <div className="wife-salary-line">
              <span>月薪</span>
              <strong>{role.salary}</strong>
              <em>· 正常服役中</em>
            </div>
            <p className="wife-next-line">
              {role.level >= 11
                ? "已抵达最高职务，赏罚仍由老妞大人裁定"
                : `距 Lv.${String(role.level + 1).padStart(2, "0")} 下一职务还差 ${expToNext} 经验`}
            </p>
          </section>

          <nav className="wife-actions" aria-label="老婆端快捷操作">
            <button
              className="wife-action wife-action--primary"
              type="button"
              onClick={() => setSheet("task")}
            >
              <FilePenLine size={21} />
              发布任务
            </button>
            <button type="button" onClick={() => setSheet("review")}>
              <ClipboardCheck size={19} />
              审核提交
              {submittedTasks.length ? <b>{submittedTasks.length}</b> : null}
            </button>
            <button type="button" onClick={() => setSheet("benefit")}>
              <ShieldCheck size={19} />
              权益审批
            </button>
          </nav>

          <a
            className="wife-scroll-cue"
            href="#wife-today"
            onClick={handlePageLink("today")}
          >
            <span aria-hidden="true">∨</span>
            <span>上滑查看今日事务</span>
          </a>
        </section>

        <section className="wife-today" id="wife-today" aria-label="今日事务">
          <img
            className="wife-today__portrait"
            src="/assets/wife/wife-main.png"
            alt=""
          />
          <div className="wife-today__shade" />
          <a
            className="wife-today-back"
            href="#wife-main"
            onClick={handlePageLink("main")}
          >
            <span aria-hidden="true">∧</span>
            <span>下滑返回主页</span>
          </a>

          <header className="wife-today-title">
            <p>老妞端</p>
            <h1>今日事务</h1>
            <span>老妞大人今日需要裁定的事项</span>
          </header>

          <section
            className="wife-today-card wife-overview"
            aria-label="今日概览"
          >
            <h2>今日概览</h2>
            <div className="wife-overview-grid">
              <article>
                <ClipboardList size={44} />
                <span>待裁定</span>
                <strong>{pendingRulingCount}</strong>
                <em>项</em>
              </article>
              <article>
                <ShieldCheck size={44} />
                <span>待批准</span>
                <strong>{pendingBenefitCount}</strong>
                <em>项</em>
              </article>
              <article className="wife-overview-alert">
                <AlertTriangle size={44} />
                <span>异常</span>
                <strong>{abnormalCount}</strong>
                <em>条</em>
              </article>
            </div>
          </section>

          <section
            className="wife-today-card wife-pending-panel"
            aria-label="待老妞处理"
          >
            <h2>待老妞处理</h2>
            <div className="wife-affair-list">
              <article>
                <div className="wife-affair-icon">
                  <ClipboardCheck size={31} />
                </div>
                <div>
                  <h3>任务待审核</h3>
                  <p>老哥提交了 {pendingRulingCount} 项任务，等待确认。</p>
                </div>
                <span>待裁定</span>
                <button type="button" onClick={() => openSubPage("review")}>
                  去审核
                  <i aria-hidden="true">›</i>
                </button>
              </article>
              <article>
                <div className="wife-affair-icon">
                  <KeyRound size={31} />
                </div>
                <div>
                  <h3>权益申请</h3>
                  <p>奶茶申请权待批准。</p>
                </div>
                <span>待批准</span>
                <button type="button" onClick={() => openSubPage("benefits")}>
                  去处理
                  <i aria-hidden="true">›</i>
                </button>
              </article>
              <article className="wife-affair-alert">
                <div className="wife-affair-icon">
                  <AlertTriangle size={31} />
                </div>
                <div>
                  <h3>异常提醒</h3>
                  <p>连续 2 天未完成任务。</p>
                </div>
                <span>异常</span>
                <button type="button" onClick={() => openSubPage("records")}>
                  查看
                  <i aria-hidden="true">›</i>
                </button>
              </article>
            </div>
          </section>

          <section
            className="wife-today-card wife-quick-panel"
            aria-label="快速发布"
          >
            <h2>快速发布</h2>
            <button
              className="wife-quick-task"
              type="button"
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
          </section>

          <section
            className="wife-today-card wife-recent-panel"
            aria-label="最近动态"
          >
            <h2>最近动态</h2>
            <article className="wife-recent-item">
              <div className="wife-affair-icon">
                <ClipboardCheck size={29} />
              </div>
              <div>
                <h3>{recentTask?.title || "早点休息"}</h3>
                <p>老哥已提交，等待确认</p>
                <strong>奖励：经验 +{recentTask?.rewardExp ?? 10}</strong>
              </div>
              <button type="button" onClick={() => openSubPage("review")}>
                审核
                <i aria-hidden="true">›</i>
              </button>
            </article>
          </section>
        </section>
      </div>

      {subPage ? (
        <section className="wife-subpage" aria-label="老婆端子页面">
          <img
            className="wife-subpage__portrait"
            src="/assets/wife/wife-main.png"
            alt=""
          />
          <div className="wife-subpage__shade" />
          <button
            className="wife-subpage-back"
            type="button"
            onClick={closeSubPage}
          >
            <ChevronLeft size={20} />
            返回
          </button>

          {subPage === "tasks" ? (
            <div className="wife-subpage-inner">
              <header className="wife-subpage-title">
                <p>老妞端</p>
                <h1>任务殿</h1>
                <span>老妞大人发布与查看今日差事</span>
              </header>
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
                        {task.deadline} · 经验 +{task.rewardExp}
                        {task.rewardMoney
                          ? ` · 零花钱 +${task.rewardMoney}`
                          : ""}
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
              <header className="wife-subpage-title">
                <p>老妞端</p>
                <h1>审核殿</h1>
                <span>老哥提交的结果，皆待老妞裁定</span>
              </header>
              <div className="wife-subpage-stats">
                <article>
                  <strong>{submittedTasks.length}</strong>
                  <span>待审核</span>
                </article>
                <article>
                  <strong>
                    {tasks.filter((task) => task.status === "confirmed").length}
                  </strong>
                  <span>已确认</span>
                </article>
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
                          奖励：经验 +{task.rewardExp}
                          {task.rewardMoney
                            ? ` · 零花钱 +${task.rewardMoney}`
                            : ""}
                        </small>
                      </div>
                      <div className="wife-subpage-actions">
                        <button
                          type="button"
                          onClick={() => onRejectTask(task.id)}
                        >
                          打回
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveTask(task.id)}
                        >
                          确认
                        </button>
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
              <header className="wife-subpage-title">
                <p>老妞端</p>
                <h1>权益殿</h1>
                <span>恩准、暂缓，皆由老妞大人决定</span>
              </header>
              <div className="wife-subpage-list wife-subpage-list--benefits">
                {benefits.map((benefit) => {
                  const locked = benefit.levelRequired > progress.level;
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
                        </small>
                      </div>
                      {locked ? (
                        <span>未解锁</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApproveBenefit(benefit)}
                        >
                          恩准
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {subPage === "records" ? (
            <div className="wife-subpage-inner">
              <header className="wife-subpage-title">
                <p>老妞端</p>
                <h1>裁定录</h1>
                <span>记录老哥近期表现与老妞裁定</span>
              </header>
              <div className="wife-record-timeline">
                <article>
                  <span />
                  <div>
                    <h2>
                      当前职务：Lv.{String(role.level).padStart(2, "0")}{" "}
                      {role.title}
                    </h2>
                    <p>
                      经验 {progress.exp} / {requiredExp}，月薪 {role.salary}。
                    </p>
                  </div>
                </article>
                {tasks.slice(0, 8).map((task) => (
                  <article key={task.id}>
                    <span />
                    <div>
                      <h2>
                        {taskStatusLabel[task.status]} · {task.title}
                      </h2>
                      <p>
                        {task.resultText || task.submitNote || task.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {subPage === "order" ? (
            <div className="wife-subpage-inner">
              <header className="wife-subpage-title">
                <p>老妞端</p>
                <h1>点餐殿</h1>
                <span>老哥想吃什么，先由老妞大人恩准</span>
              </header>
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
          <section className="wife-sheet" role="dialog" aria-modal="true">
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
                <h2>下达新的差事</h2>
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
                  验收标准
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      updateDraft("description", event.target.value)
                    }
                  />
                </label>
                <div className="wife-form-grid">
                  <label>
                    类型
                    <select
                      value={draft.type}
                      onChange={(event) =>
                        updateDraft("type", event.target.value as TaskType)
                      }
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    截止时间
                    <input
                      value={draft.deadline}
                      onChange={(event) =>
                        updateDraft("deadline", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    经验
                    <input
                      type="number"
                      min="0"
                      value={draft.rewardExp}
                      onChange={(event) =>
                        updateDraft("rewardExp", Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    零花钱
                    <input
                      type="number"
                      min="0"
                      value={draft.rewardMoney}
                      onChange={(event) =>
                        updateDraft("rewardMoney", Number(event.target.value))
                      }
                    />
                  </label>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={submitTask}
                >
                  发布给老哥
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
                        <span>+{task.rewardExp} EXP</span>
                        <h3>{task.title}</h3>
                        <p>
                          {task.submitNote ||
                            "老哥已提交完成结果，等待老妞大人裁定。"}
                        </p>
                        <div>
                          <button
                            type="button"
                            onClick={() => onRejectTask(task.id)}
                          >
                            打回
                          </button>
                          <button
                            type="button"
                            onClick={() => onApproveTask(task.id)}
                          >
                            确认
                          </button>
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
                  {unlockedBenefits.map((benefit) => (
                    <article key={benefit.id}>
                      <span>{benefit.frequency}</span>
                      <h3>{benefit.name}</h3>
                      <p>{benefit.description}</p>
                      <div>
                        <button type="button" onClick={() => setSheet(null)}>
                          暂缓
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveBenefit(benefit)}
                        >
                          恩准
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
