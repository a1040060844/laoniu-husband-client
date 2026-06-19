import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { EventLog, EventLogType, WalletLedgerEntry } from "../../../../types/domain";
import "./index.scss";

type LogFilter = "all" | "task" | "benefit" | "wallet" | "punishment";

interface TimelineItem {
  id: string;
  kind: "log" | "wallet" | "state";
  type: string;
  title: string;
  description: string;
  createdAt: string;
  amountText?: string;
  raw: EventLog | WalletLedgerEntry | Record<string, unknown>;
}

const filters: Array<{ key: LogFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "task", label: "任务" },
  { key: "benefit", label: "权益" },
  { key: "wallet", label: "流水" },
  { key: "punishment", label: "状态" },
];

const typeLabel: Record<EventLogType, string> = {
  task_created: "任务发布",
  task_submitted: "任务提交",
  task_approved: "任务确认",
  task_rejected: "任务打回",
  task_failed: "任务失败",
  task_expired: "任务过期",
  level_changed: "等级变化",
  benefit_requested: "权益申请",
  benefit_approved: "权益批准",
  benefit_rejected: "权益驳回",
  wallet_ledger: "钱包流水",
  punishment_status_changed: "状态变化",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatLedgerAmount(entry: WalletLedgerEntry) {
  const sign = entry.amount > 0 ? "+" : "";
  if (entry.unit === "CNY") return `${sign}${entry.amount} 元`;
  if (entry.unit === "EXP") return `${sign}${entry.amount} EXP`;
  if (entry.unit === "LEVEL") return `${sign}${entry.amount} 级`;
  if (entry.unit === "BENEFIT") return `${sign}${entry.amount} 次`;
  return `${sign}${entry.amount}`;
}

function matchFilter(item: TimelineItem, filter: LogFilter) {
  if (filter === "all") return true;
  if (filter === "wallet") return item.kind === "wallet" || item.type === "wallet_ledger";
  if (filter === "task") return item.type.startsWith("task_");
  if (filter === "benefit") return item.type.startsWith("benefit_");
  return item.kind === "state" || item.type === "punishment_status_changed" || item.type === "level_changed";
}

function logToTimeline(log: EventLog): TimelineItem {
  return {
    id: `log-${log.id}`,
    kind: "log",
    type: log.type,
    title: `${typeLabel[log.type] || log.type} · ${log.title}`,
    description: log.description || "无备注",
    createdAt: log.createdAt,
    amountText: log.amount !== undefined ? `${log.amount}${log.unit || ""}` : undefined,
    raw: log,
  };
}

function ledgerToTimeline(entry: WalletLedgerEntry): TimelineItem {
  const parts = [
    entry.taskTitle ? `任务：${entry.taskTitle}` : "",
    entry.benefitName ? `权益：${entry.benefitName}` : "",
    entry.note,
  ].filter(Boolean);

  return {
    id: `wallet-${entry.id}`,
    kind: "wallet",
    type: "wallet_ledger",
    title: `钱包流水 · ${entry.source}`,
    description: parts.join(" · ") || "本地流水记录",
    createdAt: entry.createdAt,
    amountText: formatLedgerAmount(entry),
    raw: entry,
  };
}

export default function WifeLogsPage() {
  const [state, setState] = useState<AppState>();
  const [filter, setFilter] = useState<LogFilter>("all");

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  const timeline = useMemo(() => {
    if (!state) return [];
    const stateItem: TimelineItem = {
      id: "current-state",
      kind: "state",
      type: state.punishment.status === "slave" ? "punishment_status_changed" : "level_changed",
      title: state.punishment.status === "slave" ? "当前状态：卖身奴隶" : `当前职务：Lv.${String(state.progress.level).padStart(2, "0")}`,
      description: state.punishment.status === "slave"
        ? `恢复经验 ${state.punishment.recoveryExp} / ${state.punishment.requiredRecoveryExp}，零花钱与权益暂停。`
        : `经验 ${state.progress.exp} / 100，当前零花钱 ${state.progress.wallet} 元。`,
      createdAt: new Date().toISOString(),
      raw: {
        progress: state.progress,
        punishment: state.punishment,
      },
    };

    return [
      stateItem,
      ...state.walletLedger.map(ledgerToTimeline),
      ...state.logs.map(logToTimeline),
    ]
      .filter((item) => matchFilter(item, filter))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 100);
  }, [filter, state]);

  const summary = useMemo(() => {
    if (!state) return { logs: 0, wallet: 0, tasks: 0, benefits: 0 };
    return {
      benefits: state.logs.filter((log) => log.type.startsWith("benefit_")).length,
      logs: state.logs.length,
      tasks: state.logs.filter((log) => log.type.startsWith("task_")).length,
      wallet: state.walletLedger.length,
    };
  }, [state]);

  async function showDetail(item: TimelineItem) {
    await Taro.showModal({
      title: item.title.slice(0, 18),
      content: JSON.stringify(item.raw, null, 2).slice(0, 900),
      showCancel: false,
      confirmText: "知道了",
    });
  }

  if (!state) {
    return (
      <View className="page logs-page">
        <Text className="logs-loading">加载裁定录...</Text>
      </View>
    );
  }

  return (
    <View className="page logs-page">
      <View className="logs-hero">
        <Text className="logs-kicker">老妞端</Text>
        <Text className="logs-heading">裁定录</Text>
        <Text className="logs-sub">记录老哥近期表现与老妞裁定。</Text>
        <View className="logs-stats">
          <View>
            <Text>{summary.logs}</Text>
            <Text>事件</Text>
          </View>
          <View>
            <Text>{summary.wallet}</Text>
            <Text>流水</Text>
          </View>
          <View>
            <Text>{summary.tasks}</Text>
            <Text>任务</Text>
          </View>
          <View>
            <Text>{summary.benefits}</Text>
            <Text>权益</Text>
          </View>
        </View>
      </View>

      <View className="log-filter-row">
        {filters.map((item) => (
          <Button key={item.key} className={`filter-chip ${filter === item.key ? "is-active" : ""}`} onClick={() => setFilter(item.key)}>
            {item.label}
          </Button>
        ))}
      </View>

      <View className="wife-record-timeline">
        {timeline.length ? timeline.map((item) => (
          <View className={`timeline-item timeline-item--${item.kind}`} key={item.id} onClick={() => showDetail(item)}>
            <View className="timeline-dot" />
            <View className="timeline-card">
              <View className="timeline-card__header">
                <Text className="log-title">{item.title}</Text>
                {item.amountText ? <Text className="amount-pill">{item.amountText}</Text> : <Text className="type-pill">{item.kind === "wallet" ? "流水" : item.kind === "state" ? "当前" : "事件"}</Text>}
              </View>
              <Text className="log-desc">{item.description}</Text>
              <Text className="log-meta">{formatTime(item.createdAt)} / {item.type}</Text>
            </View>
          </View>
        )) : <View className="logs-empty">当前筛选下暂无记录。</View>}
      </View>
    </View>
  );
}
