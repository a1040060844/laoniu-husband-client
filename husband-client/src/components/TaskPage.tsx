import { CircleDollarSign, ClipboardList, Hourglass, Send, Sparkles, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "./StatCard";
import { TaskCard } from "./TaskCard";
import type { GameProgress } from "../game/progression";
import type { Role, Task, TaskSource, TaskStatus, ViewKey } from "../types/domain";

type FilterKey = "all" | "todo" | "doing" | "submitted" | "completed";

interface TaskPageProps {
  role: Role;
  progress: GameProgress;
  tasks: Task[];
  onStartTask: (id: string) => void;
  onSubmitTask: (id: string, note: string) => void;
  onSelectView: (view: ViewKey) => void;
}

const statusForFilter: Record<FilterKey, TaskStatus[]> = {
  all: ["todo", "doing", "submitted", "confirmed", "failed", "completed"],
  todo: ["todo"],
  doing: ["doing"],
  submitted: ["submitted"],
  completed: ["confirmed", "completed"],
};

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "todo", label: "待执行" },
  { key: "doing", label: "进行中" },
  { key: "submitted", label: "待确认" },
  { key: "completed", label: "已完成" },
];

export function TaskPage({ role, progress, tasks, onStartTask, onSubmitTask, onSelectView }: TaskPageProps) {
  const [source, setSource] = useState<TaskSource>("wife");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [submittingTask, setSubmittingTask] = useState<Task | null>(null);
  const [note, setNote] = useState("");

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => task.source === source && statusForFilter[filter].includes(task.status));
  }, [filter, source, tasks]);

  const overview = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "todo").length;
    const doing = tasks.filter((task) => task.status === "doing").length;
    const submitted = tasks.filter((task) => task.status === "submitted").length;
    const todayExp = tasks
      .filter((task) => task.status === "todo" || task.status === "doing")
      .reduce((sum, task) => sum + task.rewardExp, 0);

    return { pending, doing, submitted, todayExp };
  }, [tasks]);

  const month = useMemo(() => {
    const done = tasks.filter((task) => task.status === "completed" || task.status === "confirmed");
    return {
      money: progress.wallet,
      count: Math.max(done.length, progress.rewardedTaskIds.length),
      exp: progress.totalExp,
    };
  }, [progress.rewardedTaskIds.length, progress.totalExp, progress.wallet, tasks]);

  function submitCurrentTask() {
    if (!submittingTask) return;
    onSubmitTask(submittingTask.id, note.trim() || "已完成，请老妞大人确认。");
    setSubmittingTask(null);
    setNote("");
  }

  return (
    <section className="task-page">
      <img className="task-backdrop" src="/assets/tasks/task-lv01.png" alt="" />
      <div className="task-scrim" />

      <div className="task-shell">
        <button className="swipe-hint swipe-hint--task-top" type="button" onClick={() => onSelectView("role")}>
          <span>⌄</span>
          下滑进入主页
        </button>

        <header className="task-header">
          <div>
            <p className="level-line level-line--small">Lv. {String(role.level).padStart(2, "0")}</p>
            <h1>{role.title}</h1>
            <span>老哥任务簿 · 今日待执行</span>
          </div>
          <img src={role.roleImage} alt={`${role.title}小头像`} />
        </header>

        <section className="overview-panel">
          <p className="panel-title">
            <span /> 今日执行概况 <span />
          </p>
          <div className="stats-grid stats-grid--four">
            <StatCard label="待执行" value={overview.pending} icon={<ClipboardList size={19} />} />
            <StatCard label="待提交" value={overview.doing} icon={<Send size={19} />} />
            <StatCard label="待确认" value={overview.submitted} icon={<Hourglass size={19} />} />
            <StatCard label="今日可得" value={`+${overview.todayExp}`} muted="EXP" icon={<Sparkles size={19} />} />
          </div>
        </section>

        <nav className="source-tabs" aria-label="任务来源">
          <button type="button" className={source === "wife" ? "active" : ""} onClick={() => setSource("wife")}>
            老婆发布
          </button>
          <button type="button" className={source === "daily" ? "active" : ""} onClick={() => setSource("daily")}>
            每日任务
          </button>
        </nav>

        <div className="filter-row">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={filter === item.key ? "active" : ""}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="task-list">
          {visibleTasks.map((task) => (
            <TaskCard key={task.id} task={task} onStart={onStartTask} onSubmit={setSubmittingTask} />
          ))}
        </div>

        <section className="month-panel">
          <p className="panel-title">
            <span /> 本月收获 <span />
          </p>
          <div className="stats-grid">
            <StatCard label="本月获得零花钱" value={`¥ ${month.money}`} icon={<CircleDollarSign size={21} />} />
            <StatCard label="本月完成任务数" value={month.count} icon={<UserRoundCheck size={21} />} />
            <StatCard label="本月经验总数" value={`${month.exp} EXP`} icon={<Sparkles size={21} />} />
          </div>
          <p className="month-note">本月表现正在稳步提升</p>
        </section>
      </div>

      {submittingTask ? (
        <div className="modal-backdrop" role="presentation">
          <section className="sheet-modal submit-modal" role="dialog" aria-modal="true">
            <button className="icon-close" type="button" onClick={() => setSubmittingTask(null)} aria-label="关闭">
              ×
            </button>
            <p className="kicker">提交任务</p>
            <h2>{submittingTask.title}</h2>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="写下完成说明，后续可扩展上传图片。"
              rows={5}
            />
            <button className="primary-button" type="button" onClick={submitCurrentTask}>
              提交给老妞确认
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
