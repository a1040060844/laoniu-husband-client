export type ViewKey = "role" | "benefits" | "tasks";

export type ChatSender = "husband" | "wife";

export interface ChatMessage {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
  readBy: ChatSender[];
}

export type DecreeType =
  | "experience_granted"
  | "experience_penalty"
  | "level_changed"
  | "punishment_slave"
  | "punishment_restored"
  | "punishment_continued"
  | "task_created"
  | "task_approved"
  | "task_rejected"
  | "wallet_ledger"
  | "benefit_approved"
  | "benefit_rejected";

export type MonthlyAllowanceStatus =
  | "PENDING_WIFE_ACTION"
  | "PAYING"
  | "WAITING_WIFE_CONFIRM"
  | "PAID_CONFIRMED_BY_WIFE"
  | "RECEIVED_BY_HUSBAND"
  | "HUSBAND_REPORTED_NOT_RECEIVED"
  | "RETRY_PAYING"
  | "REBUKED_AS_BLIND"
  | "CANCELLED_BY_WIFE";

export interface MonthlyAllowanceRecord {
  id: string;
  month: string;
  settlementMonth: string;
  status: MonthlyAllowanceStatus;
  roleLevel: number;
  roleTitle: string;
  baseSalary: number;
  completedTaskCount: number;
  taskBonus: number;
  wifeAdjustmentAmount: number;
  totalAmount: number;
  wifeConfirmedAt?: string;
  husbandReceivedAt?: string;
  husbandReportedAt?: string;
  cancelledAt?: string;
  rebukedAt?: string;
  retryCount: number;
  creditedAt?: string;
}

export interface DecreeEvent {
  id: string;
  type: DecreeType;
  title: string;
  text: string;
  tone: "upgrade" | "down" | "punish" | "normal";
  createdAt: string;
  target: "husband";
  readAt?: string;
  acknowledgedAt?: string;
  sourceLogId?: string;
  payload: Record<string, unknown>;
}

export type BenefitStatus =
  | "available"
  | "cooldown"
  | "pending"
  | "frozen"
  | "locked";

export type TaskStatus =
  | "todo"
  | "doing"
  | "submitted"
  | "confirmed"
  | "failed"
  | "expired"
  | "failed_pending"
  | "completed";

export type TaskType = "daily" | "weekly" | "repeat" | "custom" | "urgent";

export type TaskSource = "wife" | "daily";

export type TaskModuleId =
  | "cleaning"
  | "laundry"
  | "cooking"
  | "shopping"
  | "movie"
  | "game"
  | "photo"
  | "custom";

export type TaskTimeType =
  | "immediate"
  | "today"
  | "tomorrow"
  | "within_24h"
  | "within_3d"
  | "within_7d"
  | "this_week"
  | "this_month"
  | "custom"
  | "repeat";

export type TaskRewardType =
  | "experience"
  | "allowance"
  | "level_up"
  | "benefit"
  | "custom"
  | "none";

export interface TaskReward {
  id: string;
  type: TaskRewardType;
  label: string;
  value?: number;
  unit?: string;
  benefitName?: string;
  customName?: string;
  customDescription?: string;
}

export interface TaskTimeConfig {
  type: TaskTimeType;
  label: string;
  deadlineAt?: string;
  repeatFrequency?: "daily" | "weekly" | "monthly" | "custom";
  repeatCount?: number;
  completedCount?: number;
}

export interface Role {
  level: number;
  title: string;
  salary: number;
  expCurrent: number;
  expRequired: number;
  biography: string;
  roleImage: string;
  benefitImage: string;
}

export interface BenefitRequest {
  id: string;
  requestedAt: string;
  reason?: string;
  rejectedAt?: string;
  rejectedReason?: string;
}

export interface Benefit {
  id: string;
  levelRequired: number;
  name: string;
  frequency: string;
  description: string;
  status: BenefitStatus;
  cooldownText?: string;
  lastRequestedAt?: string;
  lastApprovedAt?: string;
  cooldownUntil?: string;
  availableBonusCount?: number;
  pendingRequest?: BenefitRequest;
  icon: string;
}

export type PunishmentStatus = "normal" | "slave";

export interface Punishment {
  status: PunishmentStatus;
  startedAt?: string;
  durationDays: number;
  recoveryExp: number;
  requiredRecoveryExp: number;
  restoreLevel?: number;
  restoreExp?: number;
  restoreWallet?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  source: TaskSource;
  moduleId?: TaskModuleId;
  moduleLabel?: string;
  target?: string;
  action?: string;
  standard?: string;
  timeConfig?: TaskTimeConfig;
  cycleId?: string;
  dueAt?: string;
  expiredAt?: string;
  completedCount?: number;
  repeatCount?: number;
  rewards?: TaskReward[];
  rewardExp: number;
  rewardMoney: number;
  rewardBenefit?: string;
  deadline: string;
  status: TaskStatus;
  createdAt?: string;
  submittedAt?: string;
  confirmedAt?: string;
  rewardedAt?: string;
  submitNote?: string;
  resultText?: string;
}

export type EventLogType =
  | "task_created"
  | "task_submitted"
  | "task_approved"
  | "task_rejected"
  | "task_expired"
  | "anomaly"
  | "level_changed"
  | "benefit_requested"
  | "benefit_approved"
  | "benefit_rejected"
  | "wallet_ledger"
  | "punishment_status_changed";

export type WalletLedgerType =
  | "experience"
  | "allowance"
  | "salary"
  | "level_up"
  | "benefit"
  | "custom"
  | "punishment";

export interface WalletLedgerEntry {
  id: string;
  type: WalletLedgerType;
  source: string;
  amount: number;
  unit: "EXP" | "CNY" | "LEVEL" | "BENEFIT" | "COUNT";
  createdAt: string;
  taskId?: string;
  taskTitle?: string;
  benefitId?: string;
  benefitName?: string;
  note?: string;
  monthKey?: string;
}

export interface TaskReviewDecision {
  rewards?: TaskReward[];
  rejectReason?: string;
  extraRewardName?: string;
  extraPunishment?: string;
}

export interface EventLog {
  id: string;
  type: EventLogType;
  createdAt: string;
  title: string;
  description?: string;
  taskId?: string;
  taskTitle?: string;
  benefitId?: string;
  benefitName?: string;
  amount?: number;
  unit?: string;
  fromLevel?: number;
  toLevel?: number;
  fromStatus?: string;
  toStatus?: string;
  anomalyKey?: string;
  anomalyCategory?: string;
  anomalySeverity?: number;
  resolvedAt?: string;
}

export interface StoryEvent {
  title: string;
  text: string;
  tone?: "upgrade" | "down" | "punish" | "normal";
}
