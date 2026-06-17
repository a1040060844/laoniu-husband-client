import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { EventLog, EventLogType } from "../../../../types/domain";
import "./index.scss";

type LogFilter = "all" | "task" | "benefit" | "wallet" | "punishment";

const filters: Array<{ key: LogFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "task", label: "任务" },
  { key: "benefit", label: "权益" },
  { key: "wallet", label: "流水" },
  { key: "punishment", label: "状态" },
];

const typeLabel: Record<EventLogType, string> = {
  task_created: "任务创建",
  task_submitted: "任务提交",
  task_approved: "任务确认",
  task_rejected: "任务驳回",
  task_failed: "任务失败",
  task_expired: "任务过期",
  level_changed: "等级变化",
  benefit_requested: "权益申请",
  benefit_approved: "权益批准",
  benefit_rejected: "权益驳回",
  wallet_ledger: "钱包/经验流水",
  punishment_status_changed: "状态变化",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function matchFilter(log: EventLog, filter: LogFilter) {
  if (filter === "all") return true;
  if (filter === "task") return log.type.startsWith("task_");
  if (filter === "benefit") return log.type.startsWith("benefit_");
  if (filter === "wallet") return log.type === "wallet_ledger" || log.unit === "CNY" || log.unit === "EXP";
  return log.type === "punishment_status_changed";
}

export default function WifeLogsPage() {
  const [state, setState] = useState<AppState>();
  const [filter, setFilter] = useState<LogFilter>("all");

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  const visibleLogs = useMemo(() => {
    if (!state) return [];
    return state.logs.filter((log) => matchFilter(log, filter)).slice(0, 100);
  }, [filter, state]);

  async function showDetail(log: EventLog) {
    await Taro.showModal({
      title: typeLabel[log.type] || log.type,
      content: JSON.stringify(log, null, 2).slice(0, 900),
      showCancel: false,
      confirmText: "知道了",
    });
  }

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  return (
    <View className="page scene-page logs-page">
      <Text className="title">日志</Text>
      <Text className="subtitle">最近记录 {state.logs.length} 条，当前显示 {visibleLogs.length} 条</Text>

      <View className="log-filter-row">
        {filters.map((item) => (
          <Button key={item.key} className={`filter-chip ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      {visibleLogs.length ? visibleLogs.map((log) => (
        <View className="panel section log-card" key={log.id} onClick={() => showDetail(log)}>
          <View className="log-card__header">
            <Text className="log-title">{log.title}</Text>
            <Text className="status-pill">{typeLabel[log.type] || log.type}</Text>
          </View>
          <Text className="subtitle">{log.description || "无备注"}</Text>
          <Text className="log-meta">{formatTime(log.createdAt)}{log.amount !== undefined ? ` / ${log.amount}${log.unit || ""}` : ""}</Text>
        </View>
      )) : <View className="empty">当前筛选下暂无日志</View>}
    </View>
  );
}
