export type ViewKey = "role" | "benefits" | "tasks";

export type BenefitStatus = "available" | "cooldown" | "locked";

export type TaskStatus = "todo" | "doing" | "submitted" | "confirmed" | "failed" | "completed";

export type TaskType = "daily" | "weekly" | "custom" | "urgent";

export type TaskSource = "wife" | "daily";

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
  rewardExp: number;
  rewardMoney: number;
  rewardBenefit?: string;
  deadline: string;
  status: TaskStatus;
  submitNote?: string;
  resultText?: string;
}

export interface StoryEvent {
  title: string;
  text: string;
  tone?: "upgrade" | "down" | "punish" | "normal";
}
