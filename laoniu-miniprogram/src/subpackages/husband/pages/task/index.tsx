import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { HusbandDecreeNotice } from "../../../../components/HusbandDecreeNotice";
import { RewardFlight } from "../../../../components/RewardFlight";
import { taskRewardText } from "../../../../domain/taskRewards";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { Task, TaskStatus } from "../../../../types/domain";
import "./index.scss";

type TaskFilter = "active" | "submitted" | "confirmed" | "failed" | "all";

const filters: Array<{ key: TaskFilter; label: string }> = [
  { key: "active", label: "待完成" },
  { key: "submitted", label: "待确认" },
  { key: "confirmed", label: "已完成" },
  { key: "failed", label: "失败/驳回" },
  { key: "all", label: "全部" },
];

const statusText: Record<TaskStatus, string> = {
  todo: "待开始",
  doing: "进行中",
  submitted: "等待老妞确认",
  confirmed: "已确认",
  failed: "已失败",
  expired: "已过期",
  failed_pending: "被驳回，需重做",
  completed: "已完成",
};

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function matchFilter(task: Task, filter: TaskFilter) {
  if (filter === "all") return true;
  if (filter === "active") return ["todo", "doing", "failed_pending"].includes(task.status);
  if (filter === "failed") return ["failed", "expired", "failed_pending"].includes(task.status);
  return task.status === filter;
}

export default function HusbandTaskPage() {
  const [state, setState] = useState<AppState>();
  const [filter, setFilter] = useState<TaskFilter>("active");

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  const visibleTasks = useMemo(() => {
    if (!state) return [];
    return state.tasks.filter((task) => matchFilter(task, filter));
  }, [filter, state]);

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  async function submit(task: Task) {
    const result = await Taro.showModal({
      title: "提交任务",
      content: `确认提交“${task.title}”给老妞验收吗？`,
      confirmText: "提交",
      confirmColor: "#6f3f2c",
    });
    if (!result.confirm) return;
    try {
      setState(await stateService.submitTask(task.id, { note: "已完成，请老妞验收" }));
      await Taro.showToast({ title: "已提交", icon: "success" });
      setFilter("submitted");
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "提交失败", icon: "none" });
    }
  }

  const activeCount = state.tasks.filter((task) => matchFilter(task, "active")).length;
  const submittedCount = state.tasks.filter((task) => task.status === "submitted").length;
  const confirmedCount = state.tasks.filter((task) => task.status === "confirmed").length;

  return (
    <View className="page scene-page husband-task-page">
      <Text className="title">任务</Text>
      <Text className="subtitle">待完成 {activeCount} / 待确认 {submittedCount} / 已完成 {confirmedCount}</Text>
      <RewardFlight entries={state.walletLedger} />

      <View className="task-filter-row">
        {filters.map((item) => (
          <Button key={item.key} className={`filter-chip ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      {visibleTasks.length ? visibleTasks.map((task) => (
        <View className={`panel section task-card task-card--${task.status}`} key={task.id}>
          <View className="task-card__header">
            <Text className="task-card__title">{task.title}</Text>
            <Text className="status-pill">{statusText[task.status]}</Text>
          </View>
          <Text className="subtitle">{task.description}</Text>
          <Text className="task-meta">奖励：{taskRewardText(task)}</Text>
          <Text className="task-meta">截止：{task.deadline}</Text>
          {task.submittedAt ? <Text className="task-meta">提交：{formatTime(task.submittedAt)} / {task.submitNote}</Text> : null}
          {task.confirmedAt ? <Text className="task-meta">确认：{formatTime(task.confirmedAt)}</Text> : null}
          {task.resultText ? <Text className="task-meta">结果：{task.resultText}</Text> : null}
          {["todo", "doing", "failed_pending"].includes(task.status) ? (
            <Button className="btn section" onClick={() => submit(task)}>提交完成</Button>
          ) : null}
        </View>
      )) : <View className="empty">当前筛选下没有任务</View>}
      <HusbandDecreeNotice state={state} onStateChange={setState} />
    </View>
  );
}
