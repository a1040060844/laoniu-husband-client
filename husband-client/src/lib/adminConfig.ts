import { benefits as defaultBenefits } from "../data/benefits";
import { roles as defaultRoles } from "../data/roles";
import { DEFAULT_MAX_LEVEL, salaryForLevel } from "../game/progression";
import type {
  Benefit,
  BenefitRequest,
  BenefitStatus,
  Role,
  TaskModuleId,
  TaskReward,
  TaskTimeConfig,
} from "../types/domain";

export type ConfigSource = "default" | "override" | "custom";

export interface IllustrationLayout {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface AssetReference {
  id: string;
  category:
    | "role-illustration"
    | "benefit-illustration"
    | "wife-illustration"
    | "bgm"
    | "sfx"
    | "sprite"
    | "background"
    | "ui";
  label: string;
  url: string;
  fileName?: string;
  fileType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  version?: string;
  usedBy?: string[];
  isDefault?: boolean;
  createdAt?: string;
  placementKey?: string;
  layout?: IllustrationLayout;
}

export interface RoleThemeConfig {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface RoleDefinition {
  level: number;
  title: string;
  englishTitle?: string;
  salary: number;
  description?: string;
  story: string;
  illustration: string;
  benefitIllustration: string;
  bgm?: string;
  theme?: RoleThemeConfig;
}

export type RoleOverride = Partial<Omit<RoleDefinition, "level">> & {
  level: number;
};

export interface ResolvedRole extends Role {
  englishTitle?: string;
  description?: string;
  story: string;
  illustration: string;
  benefitIllustration: string;
  bgm?: string;
  theme?: RoleThemeConfig;
  source: ConfigSource;
}

export interface CooldownRule {
  amount: number;
  unit: "day" | "week" | "month" | "none";
}

export interface BenefitDefinition {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  unlockLevel: number;
  frequencyLabel: string;
  cooldown: CooldownRule;
  icon: string;
  illustration?: string;
  requestButtonText: string;
  requestSuccessText: string;
  approveText: string;
  rejectText: string;
  enabled: boolean;
}

export type BenefitOverride = Partial<Omit<BenefitDefinition, "id">> & {
  id: string;
};

export interface BenefitRuntimeState {
  id: string;
  status?: BenefitStatus;
  cooldownText?: string;
  lastRequestedAt?: string;
  lastApprovedAt?: string;
  cooldownUntil?: string;
  availableBonusCount?: number;
  pendingRequest?: BenefitRequest;
}

export interface ResolvedBenefit extends Benefit {
  subtitle?: string;
  unlockLevel: number;
  frequencyLabel: string;
  cooldown: CooldownRule;
  illustration?: string;
  requestButtonText: string;
  requestSuccessText: string;
  approveText: string;
  rejectText: string;
  enabled: boolean;
  source: ConfigSource;
}

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  module: TaskModuleId;
  target?: string;
  action?: string;
  standard?: string;
  defaultTimeConfig?: TaskTimeConfig;
  defaultRewards: TaskReward[];
  tags: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConfigState {
  roles: {
    overrides: RoleOverride[];
    customRoles: RoleDefinition[];
    updatedAt?: string;
  };
  benefits: {
    overrides: BenefitOverride[];
    customBenefits: BenefitDefinition[];
    updatedAt?: string;
  };
  taskTemplates: TaskTemplate[];
  assets: AssetReference[];
  updatedAt?: string;
}

export const emptyAdminConfig: AdminConfigState = {
  roles: {
    overrides: [],
    customRoles: [],
  },
  benefits: {
    overrides: [],
    customBenefits: [],
  },
  taskTemplates: [],
  assets: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function safeInt(value: unknown, fallback: number, min = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.trunc(number));
}

function safeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeIllustrationLayout(
  raw: unknown,
): IllustrationLayout | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    offsetX: safeNumber(raw.offsetX, 0, -40, 40),
    offsetY: safeNumber(raw.offsetY, 0, -40, 40),
    scale: safeNumber(raw.scale, 100, 60, 160),
  };
}

function defaultRoleImage(level: number) {
  const mapped: Record<number, string> = {
    0: "/assets/roles/role-00-street-vagrant.png",
    3: "/assets/roles/role-03-trainee-maid.png",
    8: "/assets/roles/role-08-housekeeper.png",
    9: "/assets/roles/role-09-secretary.png",
  };
  return mapped[level] ?? `/assets/roles/role-${String(level).padStart(2, "0")}.png`;
}

function defaultBenefitImage(level: number) {
  const mapped: Record<number, string> = {
    0: "/assets/benefits/benefit-00-street-vagrant.png",
    3: "/assets/benefits/benefit-03-trainee-maid.png",
  };
  return mapped[level] ?? `/assets/benefits/benefit-${String(level).padStart(2, "0")}.png`;
}

export function defaultRoleBgm(level: number) {
  return `/assets/audio/bgm/roles/bgm-role-${String(level).padStart(2, "0")}.mp3`;
}

export function roleDefinitionFromRole(role: Role): RoleDefinition {
  return {
    level: role.level,
    title: role.title,
    englishTitle: `Level ${String(role.level).padStart(2, "0")}`,
    salary: role.salary,
    description: role.biography,
    story: role.biography,
    illustration: role.roleImage || defaultRoleImage(role.level),
    benefitIllustration: role.benefitImage || defaultBenefitImage(role.level),
    bgm: defaultRoleBgm(role.level),
  };
}

function normalizeRoleOverride(raw: unknown): RoleOverride | null {
  if (!isRecord(raw)) return null;
  const level = safeInt(raw.level, Number.NaN);
  if (!Number.isFinite(level)) return null;
  return {
    level,
    title: optionalString(raw.title),
    englishTitle: optionalString(raw.englishTitle),
    salary:
      raw.salary === undefined ? undefined : safeInt(raw.salary, 0),
    description: optionalString(raw.description),
    story: optionalString(raw.story),
    illustration: optionalString(raw.illustration),
    benefitIllustration: optionalString(raw.benefitIllustration),
    bgm: optionalString(raw.bgm),
    theme: isRecord(raw.theme) ? (raw.theme as RoleThemeConfig) : undefined,
  };
}

function normalizeRoleDefinition(raw: unknown): RoleDefinition | null {
  if (!isRecord(raw)) return null;
  const level = safeInt(raw.level, Number.NaN);
  if (!Number.isFinite(level)) return null;
  return {
    level,
    title: nonEmptyString(raw.title, `Lv.${level} 自定义职务`),
    englishTitle: optionalString(raw.englishTitle),
    salary: safeInt(
      raw.salary,
      salaryForLevel(level, Math.max(DEFAULT_MAX_LEVEL, level)),
    ),
    description: optionalString(raw.description),
    story: nonEmptyString(raw.story, "后台新增的自定义职务。"),
    illustration: nonEmptyString(raw.illustration, defaultRoleImage(level)),
    benefitIllustration: nonEmptyString(
      raw.benefitIllustration,
      defaultBenefitImage(level),
    ),
    bgm: optionalString(raw.bgm) ?? defaultRoleBgm(level),
    theme: isRecord(raw.theme) ? (raw.theme as RoleThemeConfig) : undefined,
  };
}

function normalizeCooldown(raw: unknown): CooldownRule {
  if (!isRecord(raw)) return { amount: 0, unit: "none" };
  const unit =
    raw.unit === "day" ||
    raw.unit === "week" ||
    raw.unit === "month" ||
    raw.unit === "none"
      ? raw.unit
      : "none";
  return {
    amount: unit === "none" ? 0 : safeInt(raw.amount, 0),
    unit,
  };
}

function cooldownFromFrequency(frequency: string): CooldownRule {
  if (frequency.includes("周")) return { amount: 1, unit: "week" };
  if (frequency.includes("月")) return { amount: 1, unit: "month" };
  if (frequency.includes("天")) return { amount: 1, unit: "day" };
  return { amount: 0, unit: "none" };
}

export function benefitDefinitionFromBenefit(
  benefit: Benefit,
): BenefitDefinition {
  return {
    id: benefit.id,
    name: benefit.name,
    description: benefit.description,
    unlockLevel: benefit.levelRequired,
    frequencyLabel: benefit.frequency,
    cooldown: cooldownFromFrequency(benefit.frequency),
    icon: benefit.icon,
    illustration: defaultBenefitImage(benefit.levelRequired),
    requestButtonText: "申请权益",
    requestSuccessText: "申请已提交，等待老妞大人审批。",
    approveText: "老妞大人已批准。",
    rejectText: "老妞大人已驳回。",
    enabled: true,
  };
}

function normalizeBenefitDefinition(raw: unknown): BenefitDefinition | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id);
  if (!id) return null;
  const unlockLevel = safeInt(raw.unlockLevel ?? raw.levelRequired, 0);
  const frequencyLabel = nonEmptyString(raw.frequencyLabel ?? raw.frequency, "不限");
  return {
    id,
    name: nonEmptyString(raw.name, "新权益"),
    subtitle: optionalString(raw.subtitle),
    description: nonEmptyString(raw.description, "后台新增的权益。"),
    unlockLevel,
    frequencyLabel,
    cooldown: normalizeCooldown(raw.cooldown),
    icon: nonEmptyString(raw.icon, "gift"),
    illustration: optionalString(raw.illustration) ?? defaultBenefitImage(unlockLevel),
    requestButtonText: nonEmptyString(raw.requestButtonText, "申请权益"),
    requestSuccessText: nonEmptyString(
      raw.requestSuccessText,
      "申请已提交，等待老妞大人审批。",
    ),
    approveText: nonEmptyString(raw.approveText, "老妞大人已批准。"),
    rejectText: nonEmptyString(raw.rejectText, "老妞大人已驳回。"),
    enabled: raw.enabled === undefined ? true : raw.enabled !== false,
  };
}

function normalizeBenefitOverride(raw: unknown): BenefitOverride | null {
  const definition = normalizeBenefitDefinition(raw);
  if (!definition) return null;
  return definition;
}

function normalizeTaskReward(raw: unknown): TaskReward | null {
  if (!isRecord(raw)) return null;
  const type = raw.type;
  if (
    type !== "experience" &&
    type !== "allowance" &&
    type !== "level_up" &&
    type !== "benefit" &&
    type !== "custom" &&
    type !== "none"
  ) {
    return null;
  }
  return {
    id: nonEmptyString(raw.id, `reward-${Date.now()}`),
    type,
    label: nonEmptyString(raw.label, type),
    value:
      raw.value === undefined ? undefined : safeInt(raw.value, 0),
    unit: optionalString(raw.unit),
    benefitName: optionalString(raw.benefitName),
    customName: optionalString(raw.customName),
    customDescription: optionalString(raw.customDescription),
  };
}

function normalizeTaskTemplate(raw: unknown): TaskTemplate | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id);
  if (!id) return null;
  const moduleValue = raw.module;
  const module: TaskModuleId =
    moduleValue === "cleaning" ||
    moduleValue === "laundry" ||
    moduleValue === "cooking" ||
    moduleValue === "shopping" ||
    moduleValue === "movie" ||
    moduleValue === "game" ||
    moduleValue === "photo" ||
    moduleValue === "custom"
      ? moduleValue
      : "custom";
  const now = new Date().toISOString();
  return {
    id,
    name: nonEmptyString(raw.name, "任务模板"),
    title: nonEmptyString(raw.title, "自定义任务"),
    description: nonEmptyString(raw.description, "由后台任务模板生成。"),
    module,
    target: optionalString(raw.target),
    action: optionalString(raw.action),
    standard: optionalString(raw.standard),
    defaultTimeConfig: isRecord(raw.defaultTimeConfig)
      ? (raw.defaultTimeConfig as unknown as TaskTimeConfig)
      : undefined,
    defaultRewards: Array.isArray(raw.defaultRewards)
      ? raw.defaultRewards
          .map(normalizeTaskReward)
          .filter((reward): reward is TaskReward => Boolean(reward))
      : [],
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    enabled: raw.enabled === undefined ? true : raw.enabled !== false,
    createdAt: optionalString(raw.createdAt) ?? now,
    updatedAt: optionalString(raw.updatedAt) ?? now,
  };
}

function normalizeAsset(raw: unknown): AssetReference | null {
  if (!isRecord(raw)) return null;
  const id = nonEmptyString(raw.id);
  const url = nonEmptyString(raw.url);
  if (!id || !url) return null;
  const category =
    raw.category === "role-illustration" ||
    raw.category === "benefit-illustration" ||
    raw.category === "wife-illustration" ||
    raw.category === "bgm" ||
    raw.category === "sfx" ||
    raw.category === "sprite" ||
    raw.category === "background" ||
    raw.category === "ui"
      ? raw.category
      : "ui";
  return {
    id,
    category,
    label: nonEmptyString(raw.label, id),
    url,
    fileName: optionalString(raw.fileName),
    fileType: optionalString(raw.fileType),
    width: raw.width === undefined ? undefined : safeInt(raw.width, 0),
    height: raw.height === undefined ? undefined : safeInt(raw.height, 0),
    sizeBytes:
      raw.sizeBytes === undefined ? undefined : safeInt(raw.sizeBytes, 0),
    version: optionalString(raw.version),
    usedBy: Array.isArray(raw.usedBy)
      ? raw.usedBy.filter((item): item is string => typeof item === "string")
      : [],
    isDefault: raw.isDefault === true,
    createdAt: optionalString(raw.createdAt),
    placementKey: optionalString(raw.placementKey),
    layout: normalizeIllustrationLayout(raw.layout),
  };
}

export function illustrationLayoutFor(
  config: AdminConfigState,
  placementKey: string,
): IllustrationLayout | undefined {
  return config.assets.find((asset) => asset.placementKey === placementKey)
    ?.layout;
}

export function normalizeAdminConfig(raw: unknown): AdminConfigState {
  if (!isRecord(raw)) return emptyAdminConfig;
  const roles = isRecord(raw.roles) ? raw.roles : {};
  const benefits = isRecord(raw.benefits) ? raw.benefits : {};
  return {
    roles: {
      overrides: Array.isArray(roles.overrides)
        ? roles.overrides
            .map(normalizeRoleOverride)
            .filter((role): role is RoleOverride => Boolean(role))
        : [],
      customRoles: Array.isArray(roles.customRoles)
        ? roles.customRoles
            .map(normalizeRoleDefinition)
            .filter((role): role is RoleDefinition => Boolean(role))
            .sort((a, b) => a.level - b.level)
        : [],
      updatedAt: optionalString(roles.updatedAt),
    },
    benefits: {
      overrides: Array.isArray(benefits.overrides)
        ? benefits.overrides
            .map(normalizeBenefitOverride)
            .filter((benefit): benefit is BenefitOverride => Boolean(benefit))
        : [],
      customBenefits: Array.isArray(benefits.customBenefits)
        ? benefits.customBenefits
            .map(normalizeBenefitDefinition)
            .filter((benefit): benefit is BenefitDefinition => Boolean(benefit))
        : [],
      updatedAt: optionalString(benefits.updatedAt),
    },
    taskTemplates: Array.isArray(raw.taskTemplates)
      ? raw.taskTemplates
          .map(normalizeTaskTemplate)
          .filter((template): template is TaskTemplate => Boolean(template))
      : [],
    assets: Array.isArray(raw.assets)
      ? raw.assets
          .map(normalizeAsset)
          .filter((asset): asset is AssetReference => Boolean(asset))
      : [],
    updatedAt: optionalString(raw.updatedAt),
  };
}

export function getDefaultRoleDefinitions() {
  return defaultRoles.map(roleDefinitionFromRole);
}

function roleFromDefinition(
  definition: RoleDefinition,
  source: ConfigSource,
): ResolvedRole {
  return {
    level: definition.level,
    title: definition.title,
    salary: definition.salary,
    expCurrent: 0,
    expRequired: 0,
    biography: definition.story,
    roleImage: definition.illustration,
    benefitImage: definition.benefitIllustration,
    englishTitle: definition.englishTitle,
    description: definition.description,
    story: definition.story,
    illustration: definition.illustration,
    benefitIllustration: definition.benefitIllustration,
    bgm: definition.bgm,
    theme: definition.theme,
    source,
  };
}

export function resolveRoles(config: AdminConfigState = emptyAdminConfig) {
  const roles = getDefaultRoleDefinitions().map((definition) => {
    const override = config.roles.overrides.find(
      (item) => item.level === definition.level,
    );
    return roleFromDefinition(
      override ? { ...definition, ...override } : definition,
      override ? "override" : "default",
    );
  });

  config.roles.customRoles.forEach((definition) => {
    roles[definition.level] = roleFromDefinition(definition, "custom");
  });

  return roles.filter(Boolean).sort((a, b) => a.level - b.level);
}

export function getMaxLevel(roles: Pick<Role, "level">[] = defaultRoles) {
  return roles.reduce((max, role) => Math.max(max, role.level), 0);
}

export function getRoleByLevel<T extends Pick<Role, "level">>(
  roles: T[],
  level: number,
) {
  return roles.find((role) => role.level === level) ?? roles[0];
}

export function getNextRole<T extends Pick<Role, "level">>(
  roles: T[],
  level: number,
) {
  return roles.find((role) => role.level > level);
}

export function getPreviousRole<T extends Pick<Role, "level">>(
  roles: T[],
  level: number,
) {
  return [...roles].reverse().find((role) => role.level < level);
}

export function getDefaultBenefitDefinitions() {
  return defaultBenefits.map(benefitDefinitionFromBenefit);
}

function benefitFromDefinition(
  definition: BenefitDefinition,
  source: ConfigSource,
  runtime?: BenefitRuntimeState,
): ResolvedBenefit {
  const status: BenefitStatus = definition.enabled
    ? runtime?.status ?? "available"
    : "frozen";
  return {
    id: definition.id,
    levelRequired: definition.unlockLevel,
    name: definition.name,
    frequency: definition.frequencyLabel,
    description: definition.description,
    status,
    cooldownText: runtime?.cooldownText,
    lastRequestedAt: runtime?.lastRequestedAt,
    lastApprovedAt: runtime?.lastApprovedAt,
    cooldownUntil: runtime?.cooldownUntil,
    availableBonusCount: runtime?.availableBonusCount,
    pendingRequest: runtime?.pendingRequest,
    icon: definition.icon,
    subtitle: definition.subtitle,
    unlockLevel: definition.unlockLevel,
    frequencyLabel: definition.frequencyLabel,
    cooldown: definition.cooldown,
    illustration: definition.illustration,
    requestButtonText: definition.requestButtonText,
    requestSuccessText: definition.requestSuccessText,
    approveText: definition.approveText,
    rejectText: definition.rejectText,
    enabled: definition.enabled,
    source,
  };
}

export function runtimeStateFromBenefit(benefit: Benefit): BenefitRuntimeState {
  return {
    id: benefit.id,
    status: benefit.status,
    cooldownText: benefit.cooldownText,
    lastRequestedAt: benefit.lastRequestedAt,
    lastApprovedAt: benefit.lastApprovedAt,
    cooldownUntil: benefit.cooldownUntil,
    availableBonusCount: benefit.availableBonusCount,
    pendingRequest: benefit.pendingRequest,
  };
}

export function resolveBenefits(
  config: AdminConfigState = emptyAdminConfig,
  runtimeBenefits: Benefit[] = [],
) {
  const runtimeMap = new Map(
    runtimeBenefits.map((benefit) => [benefit.id, runtimeStateFromBenefit(benefit)]),
  );
  const benefits = getDefaultBenefitDefinitions().map((definition) => {
    const override = config.benefits.overrides.find(
      (item) => item.id === definition.id,
    );
    const resolved = override ? { ...definition, ...override } : definition;
    return benefitFromDefinition(
      resolved,
      override ? "override" : "default",
      runtimeMap.get(definition.id),
    );
  });

  config.benefits.customBenefits.forEach((definition) => {
    benefits.push(
      benefitFromDefinition(definition, "custom", runtimeMap.get(definition.id)),
    );
  });

  return benefits.sort((a, b) => a.levelRequired - b.levelRequired);
}

export function createDefaultTaskTemplates(now = new Date().toISOString()) {
  const template = (
    id: string,
    name: string,
    module: TaskModuleId,
    target: string,
    action: string,
    rewardValue: number,
  ): TaskTemplate => ({
    id,
    name,
    title: name,
    description: `后台模板：${name}`,
    module,
    target,
    action,
    standard: "以老妞大人最终验收为准",
    defaultTimeConfig: { type: "today", label: "今日 23:59 前" },
    defaultRewards: [
      {
        id: `${id}-reward-exp`,
        type: "experience",
        label: `${rewardValue}经验`,
        value: rewardValue,
        unit: "经验",
      },
    ],
    tags: [module],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });

  return [
    template("tpl-cooking", "做饭", "cooking", "晚饭", "按老妞口味来", 15),
    template("tpl-shopping", "买东西", "shopping", "日用品", "买老妞指定的", 8),
    template("tpl-movie", "看电影", "movie", "指定电影", "认真陪看", 10),
    template("tpl-game", "打游戏", "game", "指定游戏", "认真配合", 10),
    template("tpl-photo", "拍照", "photo", "帮老妞拍照", "拍到满意", 15),
    template("tpl-cleaning", "打扫卫生", "cleaning", "客厅", "标准清洁", 15),
  ];
}

export function assetUrlWithVersion(url: string, version?: string) {
  if (!version) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${encodeURIComponent(version)}`;
}
