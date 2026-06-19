import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { taskRewardChips, taskRewardText } from "../../../../domain/taskRewards";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { Benefit, Task } from "../../../../types/domain";
import "./index.scss";

type ReviewTab = "tasks" | "benefits" | "records";

const tabs: Array<{ key: ReviewTab; label: string }> = [
  { key: "tasks", label: "任务确认" },
  { key: "benefits", label: "权益审批" },
  { key: "records", label: "最近处理" },
];

const reviewLogTypes = [
  "task_approved",
  "task_rejected",
  "task_failed",
  "benefit_approved",
  "benefit_rejected",
];

function formatTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(task: Task) {
  const labels: Record<string, string> = {
    completed: "已完成",
    confirmed: "已确认",
    doing: "进行中",
    expired: "已过期",
    failed: "已失败",
    failed_pending: "待裁定",
    submitted: "待审核",
    todo: "待开始",
  };
  return labels[task.status] || task.status;
}

export default function WifeReviewPage() {
  const [state, setState] = useState<AppState>();
  const [tab, setTab] = useState<ReviewTab>("tasks");

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  const submitted = useMemo(() => state?.tasks.filter((task) => task.status === "submitted") || [], [state]);
  const activeTasks = useMemo(() => state?.tasks.filter((task) => ["todo", "doing", "failed_pending"].includes(task.status)).slice(0, 5) || [], [state]);
  const confirmedCount = useMemo(() => state?.tasks.filter((task) => task.status === "confirmed").length || 0, [state]);
  const requests = useMemo(() => state?.benefits.filter((benefit) => benefit.pendingRequest) || [], [state]);
  const recentLogs = useMemo(() => state?.logs.filter((log) => reviewLogTypes.includes(log.type)).slice(0, 8) || [], [state]);

  if (!state) {
    return (
      <View className="page wife-review-page">
        <Text className="wife-review-loading">加载审核台...</Text>
      </View>
    );
  }

  async function confirmAction(title: string, content: string, confirmText: string) {
    const result = await Taro.showModal({
      title,
      content,
      confirmText,
      confirmColor: "#c89854",
    });
    return result.confirm;
  }

  async function approveTask(task: Task) {
    if (!await confirmAction("确认任务", `确认「${task.title}」完成并发放奖励吗？`, "确认")) return;
    try {
      setState(await stateService.approveTask(task.id));
      await Taro.showToast({ title: "已确认", icon: "success" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "确认失败", icon: "none" });
    }
  }

  async function rejectTask(task: Task) {
    if (!await confirmAction("打回任务", `打回「${task.title}」，让老哥重新做吗？`, "打回")) return;
    try {
      setState(await stateService.rejectTask(task.id, { reason: "老妞打回，需要重做。" }));
      await Taro.showToast({ title: "已打回", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "打回失败", icon: "none" });
    }
  }

  async function failTask(task: Task) {
    if (!await confirmAction("判定失败", `判定「${task.title}」失败，本次不会发放奖励。`, "判失败")) return;
    try {
      setState(await stateService.failTask(task.id, { reason: "老妞判定失败，本次不发放奖励。" }));
      await Taro.showToast({ title: "已判失败", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" });
    }
  }

  async function approveBenefit(benefit: Benefit) {
    if (!await confirmAction("批准权益", `批准老哥使用「${benefit.name}」吗？`, "批准")) return;
    try {
      setState(await stateService.approveBenefit(benefit.id));
      await Taro.showToast({ title: "已批准", icon: "success" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "批准失败", icon: "none" });
    }
  }

  async function rejectBenefit(benefit: Benefit) {
    if (!await confirmAction("驳回权益", `驳回「${benefit.name}」申请吗？`, "驳回")) return;
    try {
      setState(await stateService.rejectBenefit(benefit.id, { reason: "老妞暂缓批准。" }));
      await Taro.showToast({ title: "已驳回", icon: "none" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "驳回失败", icon: "none" });
    }
  }

  return (
    <View className="page wife-review-page">
      <View className="wife-review-hero">
        <View className="wife-review-title">
          <Text className="wife-review-kicker">老妞端</Text>
          <Text className="wife-review-heading">审核殿</Text>
          <Text className="wife-review-sub">老哥提交的结果，皆待老妞裁定。</Text>
        </View>
        <View className="wife-review-stats">
          <View>
            <Text>{submitted.length}</Text>
            <Text>待审核</Text>
          </View>
          <View>
            <Text>{confirmedCount}</Text>
            <Text>已确认</Text>
          </View>
          <View>
            <Text>{requests.length}</Text>
            <Text>权益申请</Text>
          </View>
        </View>
      </View>

      <View className="review-tabs">
        {tabs.map((item) => (
          <Button key={item.key} className={`filter-chip ${tab === item.key ? "is-active" : ""}`} onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      {tab === "tasks" ? (
        <View className="review-section">
          <Text className="review-section-title">待确认任务</Text>
          {submitted.length ? submitted.map((task) => (
            <View className="review-card is-primary" key={task.id}>
              <View className="review-card__icon">
                <Text>裁</Text>
              </View>
              <View className="review-card__body">
                <View className="review-card__header">
                  <Text className="review-title">{task.title}</Text>
                  <Text className="status-pill">待审核</Text>
                </View>
                <Text className="review-desc">{task.submitNote || task.description}</Text>
                <Text className="review-meta">提交：{formatTime(task.submittedAt)}</Text>
                <View className="reward-chip-row">
                  {taskRewardChips(task).map((chip) => <Text className="reward-chip" key={chip}>{chip}</Text>)}
                </View>
                <View className="review-actions">
                  <Button className="review-action is-muted" onClick={() => rejectTask(task)}>打回</Button>
                  <Button className="review-action is-danger" onClick={() => failTask(task)}>判失败</Button>
                  <Button className="review-action is-main" onClick={() => approveTask(task)}>确认</Button>
                </View>
              </View>
            </View>
          )) : <View className="wife-subpage-empty">暂无待审核提交。</View>}

          <Text className="review-section-title">进行中的任务</Text>
          {activeTasks.length ? activeTasks.map((task) => (
            <View className="review-card is-muted" key={task.id}>
              <View className="review-card__icon">
                <Text>令</Text>
              </View>
              <View className="review-card__body">
                <View className="review-card__header">
                  <Text className="review-title">{task.title}</Text>
                  <Text className="status-pill is-muted">{statusLabel(task)}</Text>
                </View>
                <Text className="review-desc">{task.description}</Text>
                <Text className="review-meta">奖励：{taskRewardText(task)}</Text>
                <Button className="review-action is-danger solo" onClick={() => failTask(task)}>直接判失败</Button>
              </View>
            </View>
          )) : <View className="wife-subpage-empty">暂无进行中任务。</View>}
        </View>
      ) : null}

      {tab === "benefits" ? (
        <View className="review-section">
          <Text className="review-section-title">待审批权益</Text>
          {requests.length ? requests.map((benefit) => (
            <View className="review-card is-primary" key={benefit.id}>
              <View className="review-card__icon">
                <Text>权</Text>
              </View>
              <View className="review-card__body">
                <View className="review-card__header">
                  <Text className="review-title">{benefit.name}</Text>
                  <Text className="status-pill">待审批</Text>
                </View>
                <Text className="review-desc">{benefit.description}</Text>
                <Text className="review-meta">申请理由：{benefit.pendingRequest?.reason || "老哥申请使用权益"}</Text>
                <Text className="review-meta">频次：{benefit.frequency} / 解锁 Lv.{benefit.levelRequired}</Text>
                <View className="review-actions">
                  <Button className="review-action is-muted" onClick={() => rejectBenefit(benefit)}>驳回</Button>
                  <Button className="review-action is-main" onClick={() => approveBenefit(benefit)}>批准</Button>
                </View>
              </View>
            </View>
          )) : <View className="wife-subpage-empty">暂无权益申请。</View>}
        </View>
      ) : null}

      {tab === "records" ? (
        <View className="review-section">
          <Text className="review-section-title">最近处理</Text>
          {recentLogs.length ? recentLogs.map((log) => (
            <View className="review-log" key={log.id}>
              <Text className="review-log__type">{log.type}</Text>
              <Text className="review-log__title">{log.title}</Text>
              <Text className="review-log__desc">{log.description || "无备注"}</Text>
              <Text className="review-meta">{formatTime(log.createdAt)}</Text>
            </View>
          )) : <View className="wife-subpage-empty">暂无处理记录。</View>}
        </View>
      ) : null}
    </View>
  );
}
