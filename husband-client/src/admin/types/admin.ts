import type {
  Benefit,
  DecreeEvent,
  EventLog,
  MonthlyAllowanceRecord,
  NotificationEvent,
  Role,
  Task,
  WalletLedgerEntry,
} from "../../types/domain";
import type { GameProgress } from "../../game/progression";
import type { TaskSystemState } from "../../lib/taskSystem";

export type AdminRouteId =
  | "dashboard"
  | "roles"
  | "benefits"
  | "tasks"
  | "wallet"
  | "assets"
  | "accounts"
  | "system";

export type AdminPreviewMode =
  | "husband-role"
  | "husband-benefits"
  | "husband-tasks"
  | "wife-home";

export type AdminDataSource = "server-state" | "local-fallback" | "mock";

export interface AdminRouteConfig {
  id: AdminRouteId;
  label: string;
  path: string;
}

export interface AdminSystemStatus {
  apiStatus: "online" | "degraded" | "offline";
  databaseStatus: "json-state" | "mock" | "unknown";
  dataSyncStatus: "synced" | "pending" | "offline";
  serverTime: string;
  version: string;
  lastSavedAt?: string;
  lastBackupAt?: string;
  mobileUrl: string;
}

export interface AdminRoleThemeConfig {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface AdminRoleConfig extends Role {
  englishName?: string;
  description?: string;
  backgroundMusic?: string;
  theme?: AdminRoleThemeConfig;
  source: "default" | "override";
}

export type AdminRoleOverride = Partial<
  Omit<AdminRoleConfig, "level" | "source">
> & {
  level: number;
};

export interface AdminBenefitConfig extends Benefit {
  applyButtonText?: string;
  applyHintText?: string;
  approvedHintText?: string;
  rejectedHintText?: string;
  illustration?: string;
  source: "default" | "override";
}

export type AdminBenefitOverride = Partial<
  Omit<AdminBenefitConfig, "id" | "source">
> & {
  id: string;
};

export interface AdminConfigBundle<TDefault, TOverride, TMerged> {
  defaults: TDefault[];
  overrides: TOverride[];
  merged: TMerged[];
  updatedAt?: string;
}

export interface AdminDashboardMetric {
  label: string;
  value: string;
  tone?: "default" | "gold" | "danger" | "burgundy";
}

export interface AdminTodoItem {
  id: string;
  title: string;
  description: string;
  route: AdminRouteId;
  count?: number;
}

export interface AdminActivityItem {
  id: string;
  at: string;
  type: string;
  title: string;
  description?: string;
  amount?: number;
  unit?: string;
}

export interface AdminDashboardData {
  source: AdminDataSource;
  state: TaskSystemState;
  progress: GameProgress;
  currentRole: Role;
  currentExpRequired: number;
  completedTasksThisMonth: number;
  pendingReviewTasks: number;
  pendingBenefits: number;
  walletBalance: number;
  metrics: AdminDashboardMetric[];
  todos: AdminTodoItem[];
  recentActivity: AdminActivityItem[];
  generatedAt: string;
}

export interface AdminAssetRecord {
  id: string;
  category: string;
  fileName: string;
  fileType: string;
  path: string;
  usedBy: string[];
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface AdminAccount {
  id: string;
  username: string;
  nickname: string;
  role: "admin" | "wife" | "husband";
  status: "active" | "disabled";
  lastLoginAt?: string;
}

export interface AdminMutationResult {
  ok: boolean;
  message: string;
  savedAt?: string;
}

export interface AdminStateExtras {
  adminConfig?: {
    roles?: {
      overrides?: AdminRoleOverride[];
      updatedAt?: string;
    };
    benefits?: {
      overrides?: AdminBenefitOverride[];
      updatedAt?: string;
    };
  };
  adminAccounts?: AdminAccount[];
  adminBackups?: {
    lastBackupAt?: string;
  };
}
