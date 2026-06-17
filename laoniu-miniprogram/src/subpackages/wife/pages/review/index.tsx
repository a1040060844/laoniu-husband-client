import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { taskRewardText } from "../../../../domain/taskRewards";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { Benefit, Task } from "../../../../types/domain";
import "./index.scss";

type ReviewTab = "tasks" | "benefits" | "records";

const tabs: Array<{ key: ReviewTab; label: string }> = [
  { key: "tasks", label: "任务确认" },
  { key: "benefits", label: "权益审批" },
  { key: "records", label: "最近处理" }
];

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function WifeReviewPage() {
  const [state, setState] = useState<AppState>();
  const [tab, setTab] = useState<ReviewTab>("tasks");

  useDidShow(() => { stateService.loadState().then(setState); });

  const submitted = useMemo(() => state?.tasks.filter((task) => task.status === "submitted") || [], [state]);
  const activeTasks = useMemo(() => state?.tasks.filter((task) => ["todo", "doing", "failed_pending"].includes(task.status)).slice(0, 5) || [], [state]);
  const requests = useMemo(() => state?.benefits.filter((benefit) => benefit.pendingRequest) || [], [state]);
  const recentLogs = useMemo(() => state?.logs.filter((log) => ["task_approved", "task_rejected", "task_failed", "benefit_approved", "benefit_rejected"].includes(log.type)).slice(0, 8) || [], [state]);

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  async function confirmAction(title: string, content: string, confirmText: string) {
    const result = await Taro.showModal({
      title,
      content,
      confirmText,
      confirmColor: "#6f3f2c"
    });
    return result.confirm;
  }

  async function approveTask(task: Task) {
    if (!await confirmAction("确认任务", `确认《${task.title}》完成并发放奖励吗？`, "确认")) return;
    try {
      setState(await stateService.approveTask(task.id));
      await Taro.showToast({ title: "已确认", icon: "success" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "确认失败", icon: "none" });
    }
  }

  async function rejectTask(task: Task) {
    if (!await confirmAction("驳回任务", `驳回《${task.title}》，让老哥重新做吗？`, "驳回")) return;
    try {
      setState(await stateService.rejectTask(task.id, { reason: "老妞驳回，需要重做。" }));
      await Taro.showToast({ title: "已驳回", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "驳回失败", icon: "none" });
    }
  }

  async function failTask(task: Task) {
    if (!await confirmAction("判定失败", `判定《${task.title}》失败，本次不会发放奖励。`, "判失败")) return;
    try {
      setState(await stateService.failTask(task.id, { reason: "老妞判定失败，本次不发放奖励。" }));
      await Taro.showToast({ title: "已判失败", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
    }
  }

  async function approveBenefit(benefit: Benefit) {
    if (!await confirmAction("批准权益", `批准老哥使用《${benefit.name}》吗？`, "批准")) return;
    try {
      setState(await stateService.approveBenefit(benefit.id));
      await Taro.showToast({ title: "已批准", icon: "success" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "批准失败", icon: "none" });
    }
  }

  async function rejectBenefit(benefit: Benefit) {
    if (!await confirmAction("驳回权益", `驳回《${benefit.name}》申请吗？`, "驳回")) return;
    try {
      setState(await stateService.rejectBenefit(benefit.id, { reason: "老妞暂缓批准。" }));
      await Taro.showToast({ title: "已驳回", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "驳回失败", icon: "none" });
    }
  }

  return (
    <View className="page scene-page wife-review-page">
      <Text className="title">审核</Text>
      <Text className="subtitle">待确认任务 {submitted.length} · 待审批权益 {requests.length}</Text>

      <View className="review-tabs">
        {tabs.map((item) => (
          <Button key={item.key} className={`filter-chip ${tab === item.key ? "is-active" : ""}`} onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      {tab === "tasks" ? (
        <>
          <Text className="section-title">待确认任务</Text>
          {submitted.length ? submitted.map((task) => (
            <View className="panel section review-card" key={task.id}>
              <View className="review-card__header">
                <Text className="review-title">{task.title}</Text>
                <Text className="status-pill">待确认</Text>
              </View>
              <Text className="subtitle">{task.submitNote || task.description}</Text>
              <Text className="review-meta">奖励：{taskRewardText(task)}</Text>
              <Text className="review-meta">提交：{formatTime(task.submittedAt)}</Text>
              <View className="row-wrap section">
                <Button className="btn" onClick={() => approveTask(task)}>确认完成</Button>
                <Button className="btn btn-secondary" onClick={() => rejectTask(task)}>驳回重做</Button>
                <Button className="btn btn-secondary danger" onClick={() => failTask(task)}>判失败</Button>
              </View>
            </View>
          )) : <View className="empty">暂无待确认任务</View>}

          <Text className="section-title">进行中的任务</Text>
          {activeTasks.length ? activeTasks.map((task) => (
            <View className="panel section review-card muted" key={task.id}>
              <Text className="review-title">{task.title}</Text>
              <Text className="subtitle">{task.description}</Text>
              <Text className="review-meta">状态：{task.status} · 奖励：{taskRewardText(task)}</Text>
              <Button className="btn btn-secondary danger section" onClick={() => failTask(task)}>直接判失败</Button>
            </View>
          )) : <View className="empty">暂无进行中任务</View>}
        </>
      ) : null}

      {tab === "benefits" ? (
        <>
          <Text className="section-title">待审批权益</Text>
          {requests.length ? requests.map((benefit) => (
            <View className="panel section review-card" key={benefit.id}>
              <View className="review-card__header">
                <Text className="review-title">{benefit.name}</Text>
                <Text className="status-pill">待审批</Text>
              </View>
              <Text className="subtitle">{benefit.description}</Text>
              <Text className="review-meta">申请理由：{benefit.pendingRequest?.reason || "老哥申请使用权益"}</Text>
              <Text className="review-meta">频次：{benefit.frequency} · 解锁 Lv.{benefit.levelRequired}</Text>
              <View className="row-wrap section">
                <Button className="btn" onClick={() => approveBenefit(benefit)}>批准</Button>
                <Button className="btn btn-secondary" onClick={() => rejectBenefit(benefit)}>驳回</Button>
              </View>
            </View>
          )) : <View className="empty">暂无权益申请</View>}
        </>
      ) : null}

      {tab === "records" ? (
        <>
          <Text className="section-title">最近处理</Text>
          {recentLogs.length ? recentLogs.map((log) => (
            <View className="panel section review-log" key={log.id}>
              <Text className="review-title">{log.title}</Text>
              <Text className="subtitle">{log.description}</Text>
              <Text className="review-meta">{formatTime(log.createdAt)} · {log.type}</Text>
            </View>
          )) : <View className="empty">暂无处理记录</View>}
        </>
      ) : null}
    </View>
  );
}
