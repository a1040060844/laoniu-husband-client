import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  Hourglass,
  Play,
  Send,
} from "lucide-react";
import type { Task } from "../types/domain";

const typeLabel = {
  daily: "日任务",
  weekly: "周任务",
  custom: "自定义任务",
  urgent: "紧急任务",
};

const statusLabel = {
  todo: "待执行",
  doing: "进行中",
  submitted: "待确认",
  confirmed: "已确认",
  failed: "未通过",
  completed: "已完成",
};

const statusIcon = {
  todo: Clock3,
  doing: Play,
  submitted: Hourglass,
  confirmed: CheckCircle2,
  failed: AlertTriangle,
  completed: CheckCircle2,
};

interface TaskCardProps {
  task: Task;
  index: number;
  onStart: (id: string) => void;
  onSubmit: (task: Task) => void;
}

export function TaskCard({ task, index, onStart, onSubmit }: TaskCardProps) {
  const StatusIcon = statusIcon[task.status];
  const primary =
    task.status === "todo"
      ? { label: "开始执行", action: () => onStart(task.id), disabled: false }
      : task.status === "doing"
        ? { label: "提交完成", action: () => onSubmit(task), disabled: false }
        : task.status === "submitted"
          ? { label: "等待老妞确认", action: () => undefined, disabled: true }
          : {
              label: "查看提交记录",
              action: () => onSubmit(task),
              disabled: false,
            };

  return (
    <article
      className={`task-card task-card--${task.status}`}
      style={{ "--task-step": index } as React.CSSProperties}
    >
      <div className="task-card__mark">
        <StatusIcon size={28} strokeWidth={1.6} />
      </div>
      <div className="task-card__content">
        <div className="task-card__head">
          <span className="task-type">{typeLabel[task.type]}</span>
          <span className="task-status">{statusLabel[task.status]}</span>
        </div>
        <h3>{task.title}</h3>
        <p>{task.description}</p>
        <div className="task-rewards">
          <span>
            <Gift size={14} /> +{task.rewardExp} EXP
          </span>
          {task.rewardMoney ? <span>+{task.rewardMoney} 零花钱</span> : null}
          {task.rewardBenefit ? <span>{task.rewardBenefit}</span> : null}
        </div>
        <div className="task-deadline">
          <FileText size={14} />
          <span>{task.deadline}</span>
        </div>
        {task.resultText ? (
          <p className="task-result">{task.resultText}</p>
        ) : null}
      </div>
      <button
        className="task-action"
        type="button"
        disabled={primary.disabled}
        onClick={primary.action}
      >
        {task.status === "doing" ? <Send size={15} /> : null}
        {primary.label}
      </button>
    </article>
  );
}
