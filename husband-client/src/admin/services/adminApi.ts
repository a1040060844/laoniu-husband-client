import {
  clampLevel,
  expRequiredForLevel,
  grantExperience,
  progressWithLevelRule,
  roleWithProgress,
} from "../../game/progression";
import {
  monthKeyForDate,
  monthlyTaskBonus,
} from "../../lib/monthlyAllowance";
import {
  loadTaskSystemFresh,
  saveTaskSystem,
  type TaskSystemState,
} from "../../lib/taskSystem";
import {
  assetUrlWithVersion,
  createDefaultTaskTemplates,
  emptyAdminConfig,
  getDefaultBenefitDefinitions,
  getDefaultRoleDefinitions,
  getMaxLevel,
  getRoleByLevel,
  normalizeAdminConfig,
  resolveBenefits,
  resolveRoles,
  type AdminConfigState,
  type AssetReference,
  type BenefitDefinition,
  type BenefitOverride,
  type RoleDefinition,
  type RoleOverride,
  type TaskTemplate,
} from "../../lib/adminConfig";
import type {
  AdminAccount,
  AdminActivityItem,
  AdminDashboardData,
  AdminMutationResult,
  AdminSystemStatus,
} from "../types/admin";
import type {
  Benefit,
  DecreeEvent,
  EventLog,
  NotificationEvent,
  Task,
  TaskReward,
  WalletLedgerEntry,
} from "../../types/domain";

export const adminEndpoints = {
  dashboard: "/api/admin/dashboard",
  roles: "/api/admin/roles",
  role: (level: number) => `/api/admin/roles/${level}`,
  benefits: "/api/admin/benefits",
  benefit: (id: string) => `/api/admin/benefits/${id}`,
  taskTemplates: "/api/admin/task-templates",
  taskTemplate: (id: string) => `/api/admin/task-templates/${id}`,
  wallet: "/api/admin/wallet",
  walletAdjustments: "/api/admin/wallet/adjustments",
  assets: "/api/admin/assets",
  accounts: "/api/admin/accounts",
  systemStatus: "/api/admin/system/status",
} as const;

const PROJECT_VERSION = import.meta.env.PACKAGE_VERSION || "0.1.0";

type RawState = Record<string, unknown>;

interface RoleConfigBundle {
  defaults: RoleDefinition[];
  overrides: RoleOverride[];
  customRoles: RoleDefinition[];
  resolved: ReturnType<typeof resolveRoles>;
  updatedAt?: string;
}

interface BenefitConfigBundle {
  defaults: BenefitDefinition[];
  overrides: BenefitOverride[];
  customBenefits: BenefitDefinition[];
  resolved: ReturnType<typeof resolveBenefits>;
  runtime: Benefit[];
  updatedAt?: string;
}

interface WalletAdjustmentInput {
  kind: "wallet" | "experience" | "level" | "benefit";
  amount?: number;
  level?: number;
  benefitId?: string;
  reason: string;
  note?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function safeDate(value?: string) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function latestTimestamp(state: TaskSystemState) {
  const times = [
    ...state.logs.map((item) => item.createdAt),
    ...state.walletLedger.map((item) => item.createdAt),
    ...state.decrees.map((item) => item.createdAt),
    ...state.notifications.map((item) => item.createdAt),
    ...state.monthlyAllowances.flatMap((item) => [
      item.wifeConfirmedAt,
      item.husbandReceivedAt,
      item.husbandReportedAt,
      item.cancelledAt,
      item.rebukedAt,
      item.creditedAt,
    ]),
  ].map(safeDate);
  const latest = Math.max(0, ...times);
  return latest > 0 ? new Date(latest).toISOString() : undefined;
}

async function loadRawState(): Promise<RawState> {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error(`读取 /api/state 失败：${response.status}`);
  const payload = (await response.json()) as { state?: unknown };
  return payload.state && typeof payload.state === "object"
    ? (payload.state as RawState)
    : {};
}

async function saveRawState(state: RawState) {
  const response = await fetch("/api/state", {
    body: JSON.stringify({ state }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  if (!response.ok) throw new Error(`保存 /api/state 失败：${response.status}`);
}

async function updateRawState(
  updater: (state: RawState, config: AdminConfigState) => RawState,
) {
  const raw = await loadRawState();
  const config = normalizeAdminConfig(raw.adminConfig);
  await saveRawState(updater(raw, config));
  return { ok: true, message: "已保存", savedAt: nowIso() };
}

function touchConfig(config: AdminConfigState): AdminConfigState {
  return { ...config, updatedAt: nowIso() };
}

function roleSource(level: number, config: AdminConfigState) {
  if (config.roles.customRoles.some((role) => role.level === level)) return "custom";
  if (config.roles.overrides.some((role) => role.level === level)) return "override";
  return "default";
}

function benefitSource(idValue: string, config: AdminConfigState) {
  if (config.benefits.customBenefits.some((benefit) => benefit.id === idValue)) {
    return "custom";
  }
  if (config.benefits.overrides.some((benefit) => benefit.id === idValue)) {
    return "override";
  }
  return "default";
}

function activityFromLog(log: EventLog): AdminActivityItem {
  return {
    id: `log:${log.id}`,
    at: log.createdAt,
    type: log.type,
    title: log.title,
    description: log.description ?? log.taskTitle ?? log.benefitName,
    amount: log.amount,
    unit: log.unit,
  };
}

function activityFromLedger(entry: WalletLedgerEntry): AdminActivityItem {
  return {
    id: `ledger:${entry.id}`,
    at: entry.createdAt,
    type: entry.type,
    title: entry.source,
    description: entry.note ?? entry.taskTitle ?? entry.benefitName,
    amount: entry.amount,
    unit: entry.unit,
  };
}

function activityFromDecree(decree: DecreeEvent): AdminActivityItem {
  return {
    id: `decree:${decree.id}`,
    at: decree.createdAt,
    type: decree.type,
    title: decree.title,
    description: decree.text,
    amount:
      typeof decree.payload.amount === "number"
        ? decree.payload.amount
        : undefined,
    unit:
      typeof decree.payload.unit === "string" ? decree.payload.unit : undefined,
  };
}

function activityFromNotification(
  notification: NotificationEvent,
): AdminActivityItem {
  return {
    id: `notification:${notification.id}`,
    at: notification.createdAt,
    type: notification.source,
    title: notification.title,
    description: notification.text,
  };
}

function buildRecentActivity(state: TaskSystemState) {
  return [
    ...state.logs.map(activityFromLog),
    ...state.walletLedger.map(activityFromLedger),
    ...state.decrees.map(activityFromDecree),
    ...state.notifications.map(activityFromNotification),
  ]
    .sort((a, b) => safeDate(b.at) - safeDate(a.at))
    .slice(0, 10);
}

function isTaskInMonth(task: Task, month: string) {
  const confirmedAt = task.rewardedAt ?? task.confirmedAt;
  return (
    (task.status === "confirmed" || task.status === "completed") &&
    Boolean(confirmedAt?.startsWith(month))
  );
}

function buildDashboardData(state: TaskSystemState): AdminDashboardData {
  const roles = state.roles;
  const maxLevel = getMaxLevel(roles);
  const role = roleWithProgress(
    getRoleByLevel(roles, state.progress.level),
    state.progress,
    maxLevel,
  );
  const month = currentMonthKey();
  const completedTasksThisMonth = state.tasks.filter((task) =>
    isTaskInMonth(task, month),
  ).length;
  const pendingReviewTasks = state.tasks.filter(
    (task) => task.status === "submitted",
  ).length;
  const pendingBenefits = state.benefits.filter(
    (benefit) => benefit.pendingRequest || benefit.status === "pending",
  ).length;
  const taskStats = monthlyTaskBonus(state.tasks, month);

  return {
    source: "server-state",
    state,
    progress: state.progress,
    currentRole: role,
    currentExpRequired: expRequiredForLevel(state.progress.level, maxLevel),
    completedTasksThisMonth,
    pendingReviewTasks,
    pendingBenefits,
    walletBalance: state.progress.wallet,
    metrics: [
      { label: "当前等级", value: `Lv.${String(role.level).padStart(2, "0")}`, tone: "gold" },
      { label: "当前职务", value: role.title, tone: "burgundy" },
      { label: "当前经验", value: `${role.expCurrent}/${role.expRequired} EXP` },
      { label: "当前钱包", value: `¥${state.progress.wallet}`, tone: "gold" },
      { label: "本月任务", value: `${completedTasksThisMonth} 个` },
      { label: "本月任务奖励", value: `¥${taskStats.taskBonus}` },
    ],
    todos: [
      {
        id: "task-review",
        title: `${pendingReviewTasks} 个任务待审核`,
        description: "来自老哥端的任务提交需要处理。",
        route: "tasks",
        count: pendingReviewTasks,
      },
      {
        id: "benefit-review",
        title: `${pendingBenefits} 个权益待审批`,
        description: "权益申请需要老妞或管理员裁定。",
        route: "benefits",
        count: pendingBenefits,
      },
      {
        id: "allowance-review",
        title: "本月零花钱待确认",
        description: "基础工资、任务奖励和人工调整会汇总到月度记录。",
        route: "wallet",
      },
    ],
    recentActivity: buildRecentActivity(state),
    generatedAt: nowIso(),
  };
}

function defaultAssetsFromRolesAndBenefits(state: TaskSystemState): AssetReference[] {
  const defaultRoleMax = getMaxLevel(getDefaultRoleDefinitions());
  const defaultBenefitIds = new Set(
    getDefaultBenefitDefinitions().map((benefit) => benefit.id),
  );
  const roleAssets = state.roles.map((role) => ({
    id: `role-${role.level}`,
    category: "role-illustration" as const,
    label: `Lv.${String(role.level).padStart(2, "0")} ${role.title}`,
    url: role.roleImage,
    fileName: role.roleImage.split("/").pop(),
    fileType: "image",
    usedBy: ["老哥职务页", "升级动画"],
    isDefault: role.level <= defaultRoleMax,
    placementKey: `role-${role.level}`,
  }));
  const roleBenefitAssets = state.roles.map((role) => ({
    id: `role-benefit-${role.level}`,
    category: "benefit-illustration" as const,
    label: `Lv.${String(role.level).padStart(2, "0")} ${role.title}权益背景`,
    url: role.benefitImage,
    fileName: role.benefitImage.split("/").pop(),
    fileType: "image",
    usedBy: ["老哥权益页"],
    isDefault: role.level <= defaultRoleMax,
    placementKey: `role-benefit-${role.level}`,
  }));
  const benefitAssets = state.benefits.map((benefit) => ({
    id: `benefit-${benefit.id}`,
    category: "benefit-illustration" as const,
    label: benefit.name,
    url:
      "illustration" in benefit && typeof benefit.illustration === "string"
        ? benefit.illustration
        : `/assets/benefits/benefit-${String(benefit.levelRequired).padStart(2, "0")}.png`,
      fileType: "image",
      usedBy: ["权益配置素材"],
    isDefault: defaultBenefitIds.has(benefit.id),
  }));
  return [
    ...roleAssets,
    ...roleBenefitAssets,
    ...benefitAssets,
    {
      id: "wife-home",
      category: "wife-illustration",
      label: "老妞默认插画",
      url: "/assets/wife/wife-home-throne.png",
      fileName: "wife-home-throne.png",
      fileType: "image",
      usedBy: ["老妞主页"],
      isDefault: true,
      placementKey: "wife-home",
    },
    {
      id: "wife-growth",
      category: "wife-illustration",
      label: "老妞成长页插画",
      url: "/assets/wife/wife-growth-library.png",
      fileName: "wife-growth-library.png",
      fileType: "image",
      usedBy: ["老妞成长页"],
      isDefault: true,
      placementKey: "wife-growth",
    },
    {
      id: "wife-today",
      category: "wife-illustration",
      label: "老妞今日事务插画",
      url: "/assets/wife/wife-today-bg.png",
      fileName: "wife-today-bg.png",
      fileType: "image",
      usedBy: ["老妞今日页", "老妞子页面"],
      isDefault: true,
      placementKey: "wife-today",
    },
  ];
}

function mockAccounts(): AdminAccount[] {
  return [
    { id: "admin", username: "admin", nickname: "后台管理员", role: "admin", status: "active" },
    { id: "wife", username: "wife", nickname: "老妞大人", role: "wife", status: "active" },
    { id: "husband", username: "husband", nickname: "老哥", role: "husband", status: "active" },
  ];
}

function buildTaskFromTemplate(
  template: TaskTemplate,
  overrides: Partial<Task> = {},
): Task {
  const rewards = overrides.rewards ?? template.defaultRewards;
  const rewardExp = rewards
    .filter((reward) => reward.type === "experience")
    .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0);
  const rewardMoney = rewards
    .filter((reward) => reward.type === "allowance")
    .reduce((sum, reward) => sum + Math.max(0, Math.trunc(reward.value ?? 0)), 0);
  return {
    id: id("admin-task"),
    title: overrides.title ?? template.title,
    description: overrides.description ?? template.description,
    type: "custom",
    source: "wife",
    moduleId: template.module,
    target: overrides.target ?? template.target,
    action: overrides.action ?? template.action,
    standard: overrides.standard ?? template.standard,
    timeConfig: overrides.timeConfig ?? template.defaultTimeConfig,
    rewards,
    rewardExp,
    rewardMoney,
    deadline: overrides.deadline ?? template.defaultTimeConfig?.label ?? "后台发布",
    status: "todo",
    createdAt: nowIso(),
    ...overrides,
  };
}

function effectiveTaskTemplates(config: AdminConfigState) {
  if (!config.taskTemplates.length) return createDefaultTaskTemplates();
  const merged = new Map<string, TaskTemplate>();
  createDefaultTaskTemplates().forEach((template) => merged.set(template.id, template));
  config.taskTemplates.forEach((template) => merged.set(template.id, template));
  return [...merged.values()];
}

function createWalletLedger(
  input: WalletAdjustmentInput,
  taskTitle?: string,
): WalletLedgerEntry {
  const unit =
    input.kind === "experience"
      ? "EXP"
      : input.kind === "level"
        ? "LEVEL"
        : input.kind === "benefit"
          ? "BENEFIT"
          : "CNY";
  return {
    id: id("ledger-admin"),
    type:
      input.kind === "wallet"
        ? "custom"
        : input.kind === "experience"
          ? "experience"
          : input.kind === "level"
            ? "level_up"
            : "benefit",
    source: "后台调整",
    amount:
      input.kind === "level"
        ? input.level ?? 0
        : input.kind === "benefit"
          ? input.amount ?? 1
          : input.amount ?? 0,
    unit,
    createdAt: nowIso(),
    benefitId: input.benefitId,
    benefitName: taskTitle,
    note: [input.reason, input.note].filter(Boolean).join(" · "),
    monthKey: monthKeyForDate(),
  };
}

export const adminApi = {
  async getDashboard() {
    return buildDashboardData(await loadTaskSystemFresh());
  },

  async getRolesConfig(): Promise<RoleConfigBundle> {
    const state = await loadTaskSystemFresh();
    const config = state.adminConfig;
    return {
      defaults: getDefaultRoleDefinitions(),
      overrides: config.roles.overrides,
      customRoles: config.roles.customRoles,
      resolved: resolveRoles(config),
      updatedAt: config.roles.updatedAt,
    };
  },

  async saveRole(level: number, patch: RoleOverride): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => {
      const defaultMax = getMaxLevel(getDefaultRoleDefinitions());
      const roles = { ...config.roles };
      if (level <= defaultMax) {
        const existing = roles.overrides.find((item) => item.level === level);
        roles.overrides = existing
          ? roles.overrides.map((item) =>
              item.level === level ? { ...item, ...patch, level } : item,
            )
          : [...roles.overrides, { ...patch, level }];
      } else {
        roles.customRoles = roles.customRoles.map((item) =>
          item.level === level ? { ...item, ...patch, level } : item,
        );
      }
      const nextConfig = touchConfig({
        ...config,
        roles: { ...roles, updatedAt: nowIso() },
      });
      return { ...raw, adminConfig: nextConfig };
    });
  },

  async createRole(): Promise<RoleDefinition> {
    let created: RoleDefinition | null = null;
    await updateRawState((raw, config) => {
      const resolved = resolveRoles(config);
      const previous = getRoleByLevel(resolved, getMaxLevel(resolved));
      const level = getMaxLevel(resolved) + 1;
      created = {
        level,
        title: `自定义职务 ${level}`,
        englishTitle: `Custom Role ${level}`,
        salary: previous.salary + 20,
        description: "后台新增的自定义职务描述。",
        story: "后台新增的自定义职务小传。",
        illustration: previous.roleImage,
        benefitIllustration: previous.benefitImage,
        bgm: "bgm" in previous ? previous.bgm : undefined,
        theme: "theme" in previous ? previous.theme : undefined,
      };
      const nextConfig = touchConfig({
        ...config,
        roles: {
          ...config.roles,
          customRoles: [...config.roles.customRoles, created],
          updatedAt: nowIso(),
        },
      });
      return { ...raw, adminConfig: nextConfig };
    });
    return created!;
  },

  async resetRole(level: number): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => {
      const nextConfig = touchConfig({
        ...config,
        roles: {
          ...config.roles,
          overrides: config.roles.overrides.filter((item) => item.level !== level),
          updatedAt: nowIso(),
        },
      });
      return { ...raw, adminConfig: nextConfig };
    });
  },

  async deleteCustomRole(level: number): Promise<AdminMutationResult> {
    const state = await loadTaskSystemFresh();
    if (state.progress.level >= level) {
      return {
        ok: false,
        message: "当前老哥正在使用该等级或更高等级，请先调整当前等级。",
      };
    }
    return updateRawState((raw, config) => {
      const nextConfig = touchConfig({
        ...config,
        roles: {
          ...config.roles,
          customRoles: config.roles.customRoles.filter((item) => item.level !== level),
          updatedAt: nowIso(),
        },
      });
      return { ...raw, adminConfig: nextConfig };
    });
  },

  async getBenefitsConfig(): Promise<BenefitConfigBundle> {
    const state = await loadTaskSystemFresh();
    const config = state.adminConfig;
    return {
      defaults: getDefaultBenefitDefinitions(),
      overrides: config.benefits.overrides,
      customBenefits: config.benefits.customBenefits,
      resolved: state.benefits as ReturnType<typeof resolveBenefits>,
      runtime: state.benefits,
      updatedAt: config.benefits.updatedAt,
    };
  },

  async saveBenefit(
    benefitId: string,
    patch: BenefitOverride,
  ): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => {
      const isCustom = config.benefits.customBenefits.some(
        (benefit) => benefit.id === benefitId,
      );
      const benefits = { ...config.benefits };
      if (isCustom) {
        benefits.customBenefits = benefits.customBenefits.map((benefit) =>
          benefit.id === benefitId ? { ...benefit, ...patch, id: benefitId } : benefit,
        );
      } else {
        const existing = benefits.overrides.find((item) => item.id === benefitId);
        benefits.overrides = existing
          ? benefits.overrides.map((item) =>
              item.id === benefitId ? { ...item, ...patch, id: benefitId } : item,
            )
          : [...benefits.overrides, { ...patch, id: benefitId }];
      }
      return {
        ...raw,
        adminConfig: touchConfig({
          ...config,
          benefits: { ...benefits, updatedAt: nowIso() },
        }),
      };
    });
  },

  async createBenefit(): Promise<BenefitDefinition> {
    let created: BenefitDefinition | null = null;
    await updateRawState((raw, config) => {
      created = {
        id: `custom-benefit-${Date.now()}`,
        name: "新增权益",
        subtitle: "后台新增",
        description: "后台新增的自定义权益。",
        unlockLevel: 0,
        frequencyLabel: "不限",
        cooldown: { amount: 0, unit: "none" },
        icon: "gift",
        illustration: "/assets/benefits/benefit-00.png",
        requestButtonText: "申请权益",
        requestSuccessText: "申请已提交，等待老妞大人审批。",
        approveText: "老妞大人已批准。",
        rejectText: "老妞大人已驳回。",
        enabled: true,
      };
      return {
        ...raw,
        adminConfig: touchConfig({
          ...config,
          benefits: {
            ...config.benefits,
            customBenefits: [...config.benefits.customBenefits, created],
            updatedAt: nowIso(),
          },
        }),
      };
    });
    return created!;
  },

  async resetBenefit(benefitId: string): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => ({
      ...raw,
      adminConfig: touchConfig({
        ...config,
        benefits: {
          ...config.benefits,
          overrides: config.benefits.overrides.filter((item) => item.id !== benefitId),
          updatedAt: nowIso(),
        },
      }),
    }));
  },

  async deleteCustomBenefit(benefitId: string): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => ({
      ...raw,
      adminConfig: touchConfig({
        ...config,
        benefits: {
          ...config.benefits,
          customBenefits: config.benefits.customBenefits.filter(
            (item) => item.id !== benefitId,
          ),
          updatedAt: nowIso(),
        },
      }),
    }));
  },

  async getTasks() {
    const state = await loadTaskSystemFresh();
    return state.tasks;
  },

  async getTaskTemplates() {
    const raw = await loadRawState();
    const config = normalizeAdminConfig(raw.adminConfig);
    return effectiveTaskTemplates(config);
  },

  async saveTaskTemplate(
    template: TaskTemplate,
  ): Promise<AdminMutationResult> {
    return updateRawState((raw, config) => {
      const currentTemplates = effectiveTaskTemplates(config);
      const exists = currentTemplates.some((item) => item.id === template.id);
      const templates = exists
        ? currentTemplates.map((item) =>
            item.id === template.id
              ? { ...template, updatedAt: nowIso() }
              : item,
          )
        : [...currentTemplates, template];
      return {
        ...raw,
        adminConfig: touchConfig({
          ...config,
          taskTemplates: templates,
        }),
      };
    });
  },

  async createTaskTemplate(): Promise<TaskTemplate> {
    const createdAt = nowIso();
    return {
      id: id("template"),
      name: "新任务模板",
      title: "新任务",
      description: "由后台任务模板生成。",
      module: "custom",
      target: "",
      action: "",
      standard: "以老妞大人最终验收为准",
      defaultTimeConfig: { type: "today", label: "今日 23:59 前" },
      defaultRewards: [
        {
          id: id("template-reward"),
          type: "experience",
          label: "10经验",
          value: 10,
          unit: "经验",
        },
      ],
      tags: [],
      enabled: true,
      createdAt,
      updatedAt: createdAt,
    };
  },

  async duplicateTaskTemplate(templateId: string) {
    const templates = await adminApi.getTaskTemplates();
    const source = templates.find((template) => template.id === templateId);
    if (!source) throw new Error("模板不存在");
    const duplicate = {
      ...source,
      id: id("template"),
      name: `${source.name} 副本`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await adminApi.saveTaskTemplate(duplicate);
    return duplicate;
  },

  async deleteTaskTemplate(templateId: string) {
    return updateRawState((raw, config) => ({
      ...raw,
      adminConfig: touchConfig({
        ...config,
        taskTemplates: effectiveTaskTemplates(config).filter(
          (template) => template.id !== templateId,
        ),
      }),
    }));
  },

  async createTaskFromTemplate(templateId: string, overrides: Partial<Task> = {}) {
    const templates = await adminApi.getTaskTemplates();
    const template = templates.find((item) => item.id === templateId);
    if (!template) throw new Error("模板不存在");
    const task = buildTaskFromTemplate(template, overrides);
    const state = await loadTaskSystemFresh();
    const log: EventLog = {
      id: id("log-admin-task"),
      type: "task_created",
      title: "后台发布任务",
      description: `从模板「${template.name}」发布`,
      taskId: task.id,
      taskTitle: task.title,
      createdAt: nowIso(),
    };
    await saveTaskSystem({
      ...state,
      tasks: [task, ...state.tasks],
      logs: [log, ...state.logs],
    });
    return task;
  },

  async getWallet() {
    const state = await loadTaskSystemFresh();
    const role = roleWithProgress(
      getRoleByLevel(state.roles, state.progress.level),
      state.progress,
      getMaxLevel(state.roles),
    );
    const month = monthKeyForDate();
    const taskStats = monthlyTaskBonus(state.tasks, month);
    const currentRecord = state.monthlyAllowances.find(
      (record) => record.month === month,
    );
    return {
      progress: state.progress,
      currentRole: role,
      baseSalary: role.salary,
      taskBonus: taskStats.taskBonus,
      wifeAdjustmentAmount: currentRecord?.wifeAdjustmentAmount ?? 0,
      expectedTotal: Math.max(
        0,
        role.salary + taskStats.taskBonus + (currentRecord?.wifeAdjustmentAmount ?? 0),
      ),
      walletLedger: state.walletLedger,
      monthlyAllowances: state.monthlyAllowances,
      benefits: state.benefits,
      roles: state.roles,
    };
  },

  async adjustWallet(input: WalletAdjustmentInput): Promise<AdminMutationResult> {
    if (!input.reason.trim()) {
      return { ok: false, message: "必须填写原因。" };
    }
    const state = await loadTaskSystemFresh();
    const roles = state.roles;
    const maxLevel = getMaxLevel(roles);
    let progress = state.progress;
    let benefits = state.benefits;
    const amount = Math.trunc(input.amount ?? 0);

    if (input.kind === "wallet") {
      progress = { ...progress, wallet: Math.max(0, progress.wallet + amount) };
    }
    if (input.kind === "experience") {
      if (amount >= 0) {
        progress = grantExperience(progress, amount, roles, input.reason).progress;
      } else {
        progress = {
          ...progress,
          exp: Math.max(0, progress.exp + amount),
          totalExp: Math.max(0, progress.totalExp + amount),
        };
      }
    }
    if (input.kind === "level") {
      progress = progressWithLevelRule(
        progress,
        clampLevel(input.level ?? progress.level, maxLevel),
        maxLevel,
      );
    }
    if (input.kind === "benefit" && input.benefitId) {
      benefits = benefits.map((benefit) =>
        benefit.id === input.benefitId
          ? {
              ...benefit,
              availableBonusCount:
                (benefit.availableBonusCount ?? 0) + Math.max(1, amount || 1),
            }
          : benefit,
      );
    }

    const benefitName = input.benefitId
      ? benefits.find((benefit) => benefit.id === input.benefitId)?.name
      : undefined;
    const ledger = createWalletLedger(input, benefitName);
    const log: EventLog = {
      id: id("log-admin-adjustment"),
      type: "wallet_ledger",
      title: "后台调整",
      description: [input.reason, input.note].filter(Boolean).join(" · "),
      amount: ledger.amount,
      unit: ledger.unit,
      benefitId: input.benefitId,
      benefitName,
      createdAt: ledger.createdAt,
    };

    await saveTaskSystem({
      ...state,
      progress,
      benefits,
      walletLedger: [ledger, ...state.walletLedger],
      logs: [log, ...state.logs],
    });

    return { ok: true, message: "调整已记录流水和日志。", savedAt: ledger.createdAt };
  },

  async getAssets(category?: AssetReference["category"]) {
    const state = await loadTaskSystemFresh();
    const mergedAssets = new Map(
      defaultAssetsFromRolesAndBenefits(state).map((asset) => [asset.id, asset]),
    );
    state.adminConfig.assets.forEach((asset) => {
      mergedAssets.set(asset.id, { ...mergedAssets.get(asset.id), ...asset });
    });
    const assets = [...mergedAssets.values()];
    return category ? assets.filter((asset) => asset.category === category) : assets;
  },

  async saveAsset(asset: AssetReference) {
    const nextAsset = { ...asset, createdAt: asset.createdAt ?? nowIso() };
    await updateRawState((raw, config) => ({
      ...raw,
      adminConfig: touchConfig({
        ...config,
        assets: [
          nextAsset,
          ...config.assets.filter((current) => current.id !== nextAsset.id),
        ],
      }),
    }));
    return nextAsset;
  },

  async registerAsset(asset: Omit<AssetReference, "id" | "createdAt">) {
    const nextAsset: AssetReference = {
      ...asset,
      id: id("asset"),
      url: assetUrlWithVersion(asset.url, asset.version),
      createdAt: nowIso(),
    };
    await updateRawState((raw, config) => ({
      ...raw,
      adminConfig: touchConfig({
        ...config,
        assets: [nextAsset, ...config.assets],
      }),
    }));
    return nextAsset;
  },

  async getAccounts() {
    const raw = await loadRawState();
    return Array.isArray(raw.adminAccounts)
      ? (raw.adminAccounts as AdminAccount[])
      : mockAccounts();
  },

  async getSystemStatus(): Promise<AdminSystemStatus> {
    try {
      const state = await loadTaskSystemFresh();
      return {
        apiStatus: "online",
        databaseStatus: "json-state",
        dataSyncStatus: "synced",
        serverTime: nowIso(),
        version: PROJECT_VERSION,
        lastSavedAt: latestTimestamp(state),
        mobileUrl: window.location.origin,
      };
    } catch {
      return {
        apiStatus: "offline",
        databaseStatus: "unknown",
        dataSyncStatus: "offline",
        serverTime: nowIso(),
        version: PROJECT_VERSION,
        mobileUrl: window.location.origin,
      };
    }
  },

  roleSource,
  benefitSource,
};
