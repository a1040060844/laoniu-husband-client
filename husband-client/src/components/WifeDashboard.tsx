import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  Gavel,
  ScrollText,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { expRequiredForLevel, type GameProgress } from "../game/progression";
import {
  getPunishmentRemainingDays,
  isPunishmentDurationComplete,
  isPunishmentRecoverable,
} from "../lib/taskSystem";
import type { Benefit, EventLog, Punishment, Role, Task } from "../types/domain";

interface WifeDashboardProps {
  role: Role;
  progress: GameProgress;
  tasks: Task[];
  logs: EventLog[];
  punishment: Punishment;
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
  onRestoreNormal: () => void;
}

const taskStatusLabel: Record<Task["status"], string> = {
  completed: "已完成",
  confirmed: "已确认",
  doing: "执行中",
  failed: "未通过",
  submitted: "待确认",
  todo: "待执行",
};

const logTypeLabel: Record<EventLog["type"], string> = {
  benefit_approved: "权益批准",
  benefit_requested: "权益申请",
  level_changed: "等级调整",
  punishment_status_changed: "惩罚状态",
  task_approved: "任务确认",
  task_created: "任务下达",
  task_rejected: "任务打回",
  task_submitted: "任务提交",
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

function rewardText(task: Task) {
  if (task.rewards?.length) {
    return task.rewards.map((reward) => reward.label).join(" + ");
  }
  const chips = [`经验 +${task.rewardExp}`];
  if (task.rewardMoney > 0) chips.push(`零花钱 +${task.rewardMoney}`);
  if (task.rewardBenefit) chips.push(task.rewardBenefit);
  return chips.join(" + ");
}

export function WifeDashboard({
  role,
  progress,
  tasks,
  logs,
  punishment,
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
  onRestoreNormal,
}: WifeDashboardProps) {
  const [title, setTitle] = useState("打扫卧室");
  const [description, setDescription] = useState(
    "完成老婆大人指定事项，提交说明后等待确认。",
  );
  const [deadline, setDeadline] = useState("今日 23:59 前");
  const [rewardExp, setRewardExp] = useState(15);
  const [rewardMoney, setRewardMoney] = useState(0);
  const [customExp, setCustomExp] = useState(10);
  const [targetLevel, setTargetLevel] = useState(progress.level);
  const [now, setNow] = useState(Date.now());

  const requiredExp = expRequiredForLevel(progress.level);
  const expPercent =
    requiredExp > 0
      ? Math.min(100, Math.round((progress.exp / requiredExp) * 100))
      : 100;
  const expToNext = Math.max(0, requiredExp - progress.exp);
  const isSlave = punishment.status === "slave";
  const remainingDays = getPunishmentRemainingDays(punishment, now);
  const recoveryPercent =
    punishment.requiredRecoveryExp > 0
      ? Math.min(
          100,
          Math.round(
            (punishment.recoveryExp / punishment.requiredRecoveryExp) * 100,
          ),
        )
      : 100;
  const durationComplete = isPunishmentDurationComplete(punishment, now);
  const canRestoreNormal = isPunishmentRecoverable(punishment, now);

  const submittedTasks = useMemo(
    () => tasks.filter((task) => task.status === "submitted"),
    [tasks],
  );
  const activeTasks = useMemo(
    () =>
      tasks.filter((task) =>
        ["todo", "doing", "submitted"].includes(task.status),
      ),
    [tasks],
  );
  const recentLogs = logs.slice(0, 12);
  const unlockedBenefits = benefits.filter(
    (benefit) => benefit.levelRequired <= progress.level,
  );

  useEffect(() => {
    if (!isSlave) return;
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isSlave]);

  function createTask() {
    const safeTitle = title.trim() || "老婆大人指定任务";
    const safeDescription =
      description.trim() || "完成后提交说明，等待老婆大人确认。";
    onCreateTask({
      id: `wife-task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      deadline: deadline.trim() || "今日完成",
      description: safeDescription,
      rewardExp: Math.max(0, Math.trunc(rewardExp)),
      rewardMoney: Math.max(0, Math.trunc(rewardMoney)),
      rewards: [
        {
          id: `reward-exp-${Date.now()}`,
          label: `经验 +${Math.max(0, Math.trunc(rewardExp))}`,
          type: "experience",
          unit: "EXP",
          value: Math.max(0, Math.trunc(rewardExp)),
        },
        ...(rewardMoney > 0
          ? [
              {
                id: `reward-money-${Date.now()}`,
                label: `零花钱 +${Math.max(0, Math.trunc(rewardMoney))}`,
                type: "allowance" as const,
                unit: "元",
                value: Math.max(0, Math.trunc(rewardMoney)),
              },
            ]
          : []),
      ],
      source: "wife",
      status: "todo",
      title: safeTitle,
      type: "custom",
    });
  }

  return (
    <div className="wife-dashboard">
      <header className="wife-dashboard__hero">
        <div>
          <p>老婆端</p>
          <h1>服役裁定台</h1>
          <span>任务、奖惩、权益与状态由这里统一裁定</span>
        </div>
        <div className="wife-dashboard__hero-badge">
          <ShieldCheck size={22} />
          <span>{isSlave ? "卖身奴隶状态" : "正常服役中"}</span>
        </div>
      </header>

      <section className="wife-dashboard__grid">
        <article className="wife-card wife-status-card">
          <div className="wife-card__title">
            <Shield size={22} />
            <div>
              <p>当前状态</p>
              <h2>{isSlave ? "卖身奴隶状态" : role.title}</h2>
            </div>
          </div>
          <div className="wife-status-card__stats">
            <span>{isSlave ? "权益冻结" : `Lv.${role.level}`}</span>
            <span>{isSlave ? "零花钱暂停" : `月薪 ${role.salary}`}</span>
            <span>{isSlave ? `剩余 ${remainingDays} 天` : `还差 ${expToNext} 经验`}</span>
          </div>
          <div className="wife-progress">
            <div
              style={{
                width: `${isSlave ? recoveryPercent : expPercent}%`,
              }}
            />
          </div>
          <p className="wife-card__meta">
            {isSlave
              ? `恢复进度 ${punishment.recoveryExp}/${punishment.requiredRecoveryExp}，${
                  durationComplete ? "惩罚时间已结束" : `惩罚期剩余 ${remainingDays} 天`
                }`
              : `正常服役中，经验 ${progress.exp}/${requiredExp}`}
          </p>
          {canRestoreNormal ? (
            <button
              className="wife-restore-button"
              type="button"
              onClick={onRestoreNormal}
            >
              恢复正常
            </button>
          ) : null}
        </article>

        <article className="wife-card wife-punish-card">
          <div className="wife-card__title">
            <Gavel size={22} />
            <div>
              <p>惩罚裁定</p>
              <h2>最终状态闭环</h2>
            </div>
          </div>
          <p className="wife-card__meta">
            进入卖身奴隶后，任务确认只累计恢复经验，不发放正常等级经验。
          </p>
          <button
            className="wife-punish-state"
            type="button"
            disabled={isSlave}
            onClick={onPunishStatus}
          >
            <AlertTriangle size={22} />
            <span>{isSlave ? "已处于卖身奴隶状态" : "打入卖身奴隶状态"}</span>
          </button>
          {isSlave ? (
            <div className="wife-punish-progress">
              恢复经验 {punishment.recoveryExp}/{punishment.requiredRecoveryExp} ·
              剩余 {remainingDays} 天
            </div>
          ) : null}
        </article>

        <article className="wife-card wife-level-card">
          <div className="wife-card__title">
            <BadgeDollarSign size={22} />
            <div>
              <p>经验与等级</p>
              <h2>{role.title}</h2>
            </div>
          </div>
          <div className="wife-inline-actions">
            <button type="button" onClick={() => onLevelDelta(1)}>
              升一级
            </button>
            <button type="button" onClick={() => onLevelDelta(-1)}>
              降一级
            </button>
            <button type="button" onClick={() => onSetLevel(0)}>
              降至最低
            </button>
          </div>
          <label className="wife-field">
            <span>指定等级</span>
            <input
              max={roles.length - 1}
              min={0}
              type="number"
              value={targetLevel}
              onChange={(event) => setTargetLevel(Number(event.target.value))}
            />
          </label>
          <button type="button" onClick={() => onSetLevel(targetLevel)}>
            应用等级
          </button>
          <label className="wife-field">
            <span>追加经验</span>
            <input
              min={0}
              type="number"
              value={customExp}
              onChange={(event) => setCustomExp(Number(event.target.value))}
            />
          </label>
          <div className="wife-inline-actions">
            <button type="button" onClick={() => onAdjustExperience(10)}>
              +10
            </button>
            <button type="button" onClick={() => onAdjustExperience(30)}>
              +30
            </button>
            <button type="button" onClick={() => onCustomExperience(customExp)}>
              自定义追加
            </button>
          </div>
        </article>
      </section>

      <section className="wife-dashboard__grid wife-dashboard__grid--wide">
        <article className="wife-card wife-task-form">
          <div className="wife-card__title">
            <FilePenLine size={22} />
            <div>
              <p>发布任务</p>
              <h2>下达新指令</h2>
            </div>
          </div>
          <label className="wife-field">
            <span>任务标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="wife-field">
            <span>任务说明</span>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="wife-field">
            <span>期限</span>
            <input
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
          <div className="wife-form-row">
            <label className="wife-field">
              <span>经验</span>
              <input
                min={0}
                type="number"
                value={rewardExp}
                onChange={(event) => setRewardExp(Number(event.target.value))}
              />
            </label>
            <label className="wife-field">
              <span>零花钱</span>
              <input
                min={0}
                type="number"
                value={rewardMoney}
                onChange={(event) => setRewardMoney(Number(event.target.value))}
              />
            </label>
          </div>
          <button className="wife-action wife-action--primary" type="button" onClick={createTask}>
            <ScrollText size={20} />
            发布任务
          </button>
        </article>

        <article className="wife-card wife-review-list">
          <div className="wife-card__title">
            <ClipboardCheck size={22} />
            <div>
              <p>待确认</p>
              <h2>{submittedTasks.length} 项提交</h2>
            </div>
          </div>
          {submittedTasks.length ? (
            <div className="wife-list">
              {submittedTasks.map((task) => (
                <div className="wife-list-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.submitNote || task.description}</p>
                    <span>{isSlave ? "确认后计入恢复经验" : rewardText(task)}</span>
                  </div>
                  <div className="wife-inline-actions">
                    <button type="button" onClick={() => onApproveTask(task.id)}>
                      <CheckCircle2 size={18} />
                      通过
                    </button>
                    <button type="button" onClick={() => onRejectTask(task.id)}>
                      <XCircle size={18} />
                      打回
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="wife-empty">暂无待确认任务。</p>
          )}
        </article>
      </section>

      <section className="wife-dashboard__grid wife-dashboard__grid--wide">
        <article className="wife-card">
          <div className="wife-card__title">
            <ClipboardCheck size={22} />
            <div>
              <p>任务列表</p>
              <h2>执行状态</h2>
            </div>
          </div>
          <div className="wife-list">
            {activeTasks.slice(0, 8).map((task) => (
              <div className="wife-list-item" key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.description}</p>
                  <span>
                    {taskStatusLabel[task.status]} · {task.deadline}
                  </span>
                </div>
              </div>
            ))}
            {!activeTasks.length ? <p className="wife-empty">暂无进行中的任务。</p> : null}
          </div>
        </article>

        <article className="wife-card">
          <div className="wife-card__title">
            <ShieldCheck size={22} />
            <div>
              <p>可用权益</p>
              <h2>{unlockedBenefits.length} 项</h2>
            </div>
          </div>
          <div className="wife-list">
            {unlockedBenefits.slice(0, 8).map((benefit) => (
              <div className="wife-list-item" key={benefit.id}>
                <div>
                  <strong>{benefit.name}</strong>
                  <p>{benefit.description}</p>
                  <span>{benefit.frequency}</span>
                </div>
                <button type="button" onClick={() => onApproveBenefit(benefit)}>
                  恩准
                </button>
              </div>
            ))}
            {!unlockedBenefits.length ? <p className="wife-empty">暂无可用权益。</p> : null}
          </div>
        </article>
      </section>

      <section className="wife-card wife-log-card">
        <div className="wife-card__title">
          <ClipboardCheck size={22} />
          <div>
            <p>日志</p>
            <h2>最近裁定记录</h2>
          </div>
        </div>
        <div className="wife-log-list">
          {recentLogs.map((log) => (
            <article className="wife-log-item" key={log.id}>
              <span>{logTypeLabel[log.type]}</span>
              <strong>{log.title}</strong>
              <p>{log.description}</p>
              <time>{formatLogTime(log.createdAt)}</time>
            </article>
          ))}
          {!recentLogs.length ? <p className="wife-empty">暂无日志。</p> : null}
        </div>
      </section>
    </div>
  );
}
