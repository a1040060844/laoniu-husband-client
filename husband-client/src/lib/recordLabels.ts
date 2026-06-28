import type { EventLog, WalletLedgerEntry } from "../types/domain";

const eventLogTypeLabel: Record<EventLog["type"], string> = {
  anomaly: "异常",
  benefit_approved: "权益恩准",
  benefit_rejected: "权益驳回",
  benefit_requested: "权益申请",
  level_changed: "等级变化",
  punishment_status_changed: "惩罚状态",
  task_approved: "任务确认",
  task_created: "任务发布",
  task_expired: "任务过期",
  task_rejected: "任务打回",
  task_submitted: "任务提交",
  wallet_ledger: "钱包流水",
};

export function walletLedgerRecordLabel(
  entry: Pick<WalletLedgerEntry, "amount" | "unit">,
) {
  if (entry.unit === "EXP") return "经验变化";
  if (entry.unit === "LEVEL") {
    if (entry.amount > 0) return "等级提升";
    if (entry.amount < 0) return "等级降低";
    return "等级变化";
  }
  return "钱包流水";
}

export function eventLogRecordLabel(log: EventLog) {
  if (log.type === "wallet_ledger") {
    return walletLedgerRecordLabel({
      amount: log.amount ?? 0,
      unit: log.unit as WalletLedgerEntry["unit"],
    });
  }
  if (log.type === "level_changed") {
    if ((log.toLevel ?? 0) > (log.fromLevel ?? 0)) return "等级提升";
    if ((log.toLevel ?? 0) < (log.fromLevel ?? 0)) return "等级降低";
  }
  if (
    log.type === "punishment_status_changed" &&
    (log.fromStatus === "slave" || log.toStatus === "slave")
  ) {
    return "卖身奴隶";
  }
  return eventLogTypeLabel[log.type];
}
