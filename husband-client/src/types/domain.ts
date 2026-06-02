export type ViewKey = "role" | "benefits" | "tasks";

export type BenefitStatus = "available" | "cooldown" | "locked";

export type TaskStatus =
  | "todo"
  | "doing"
  | "submitted"
  | "confirmed"
  | "failed"
  | "completed";

export type TaskType = "daily" | "weekly" | "custom" | "urgent";

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

export interface Benefit {
  id: string;
  levelRequired: number;
  name: string;
  frequency: string;
  description: string;
  status: BenefitStatus;
  cooldownText?: string;
  icon: string;
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
  | "level_changed"
  | "benefit_requested"
  | "benefit_approved"
  | "punishment_status_changed";

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
  fromLevel?: number;
  toLevel?: number;
  fromStatus?: string;
  toStatus?: string;
}

export interface StoryEvent {
  title: string;
  text: string;
  tone?: "upgrade" | "down" | "punish" | "normal";
}
