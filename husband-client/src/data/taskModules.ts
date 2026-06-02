import type {
  TaskModuleId,
  TaskReward,
  TaskRewardType,
  TaskTimeConfig,
  TaskTimeType,
} from "../types/domain";

export interface TaskModule {
  id: TaskModuleId;
  label: string;
  targets: string[];
  actions: string[];
}

export const taskModules: TaskModule[] = [
  {
    id: "cleaning",
    label: "打扫卫生",
    targets: [
      "卧室",
      "客厅",
      "厨房",
      "卫生间",
      "阳台",
      "玄关",
      "猫咪活动区",
      "全屋局部",
      "自定义区域",
    ],
    actions: [
      "简单整理",
      "地面清理",
      "桌面清理",
      "垃圾处理",
      "标准清洁",
      "深度清洁",
      "老妞指定标准",
    ],
  },
  {
    id: "laundry",
    label: "洗衣整理",
    targets: [
      "日常衣物",
      "袜子内衣",
      "床单被套",
      "外套",
      "毛巾",
      "老妞指定衣物",
      "自定义衣物",
    ],
    actions: [
      "放入洗衣机",
      "晾衣服",
      "收衣服",
      "叠衣服",
      "分类归位",
      "完整洗晒收流程",
      "老妞指定标准",
    ],
  },
  {
    id: "kitchen",
    label: "厨房事务",
    targets: [
      "碗筷",
      "锅具",
      "厨房台面",
      "灶台",
      "餐桌",
      "冰箱",
      "外卖垃圾",
      "饭后残局",
      "自定义区域",
    ],
    actions: [
      "洗碗",
      "擦台面",
      "清理餐桌",
      "倒厨余垃圾",
      "收拾外卖盒",
      "整理冰箱",
      "饭后完整收拾",
      "厨房深度清洁",
    ],
  },
  {
    id: "cats",
    label: "猫咪照顾",
    targets: [
      "两只猫",
      "英短蓝猫",
      "白英短",
      "猫砂盆",
      "猫碗水碗",
      "猫窝",
      "猫咪活动区",
    ],
    actions: [
      "添粮",
      "换水",
      "添粮换水",
      "铲屎",
      "清理猫砂周边",
      "擦猫碗",
      "梳毛",
      "陪玩",
      "观察猫咪状态",
    ],
  },
  {
    id: "errand",
    label: "跑腿采购",
    targets: [
      "快递",
      "外卖",
      "饮料",
      "零食",
      "日用品",
      "猫咪用品",
      "老妞指定物品",
      "临时跑腿",
    ],
    actions: [
      "拿取",
      "购买",
      "送达",
      "排队处理",
      "沟通处理",
      "对比挑选",
      "老妞指定标准",
    ],
  },
  {
    id: "care",
    label: "老妞照顾",
    targets: [
      "倒水",
      "拿东西",
      "准备水果",
      "准备小零食",
      "按摩",
      "吹头发",
      "帮忙找东西",
      "处理小麻烦",
      "情绪安抚",
    ],
    actions: ["随手照顾", "认真完成", "持续照顾", "老妞指定标准"],
  },
  {
    id: "company",
    label: "陪伴互动",
    targets: ["聊天", "吃饭", "散步", "看剧", "玩游戏", "逛街", "拍照", "约会计划"],
    actions: ["认真陪伴", "不看手机", "主动安排", "全程不敷衍", "老妞满意"],
  },
  {
    id: "report",
    label: "日常报备",
    targets: [
      "早安",
      "晚安",
      "到家",
      "出门",
      "今日安排",
      "吃饭情况",
      "工作进度",
      "情绪状态",
    ],
    actions: ["一句话报备", "认真说明", "主动报备", "连续完成", "老妞指定标准"],
  },
  {
    id: "custom",
    label: "自定义任务",
    targets: [],
    actions: [],
  },
];

export const taskTimeOptions: Array<{ type: TaskTimeType; label: string }> = [
  { type: "immediate", label: "立即完成" },
  { type: "today", label: "今天完成" },
  { type: "tomorrow", label: "明天完成" },
  { type: "within_24h", label: "一天内完成" },
  { type: "within_3d", label: "三天内完成" },
  { type: "within_7d", label: "一周内完成" },
  { type: "this_week", label: "本周内完成" },
  { type: "this_month", label: "本月内完成" },
  { type: "custom", label: "自定义时间" },
  { type: "repeat", label: "重复任务" },
];

export const taskRewardOptions: Array<{ type: TaskRewardType; label: string }> =
  [
    { type: "experience", label: "加经验" },
    { type: "allowance", label: "加零花钱" },
    { type: "level_up", label: "直接升级" },
    { type: "benefit", label: "发放权益" },
    { type: "custom", label: "自定义奖励" },
    { type: "none", label: "无奖励" },
  ];

export const benefitRewardNames = [
  "外卖",
  "奶茶",
  "大餐",
  "自由娱乐",
  "不要生气了",
  "老哥也爱美",
  "经济补助",
  "规则申诉权",
  "cos时刻",
  "恩爱奖励",
  "自定义权益",
];

export function findTaskModule(moduleId: TaskModuleId) {
  return taskModules.find((module) => module.id === moduleId) ?? taskModules[0];
}

export function createTaskTimeConfig(
  type: TaskTimeType,
  customDeadlineAt = "",
  repeatFrequency: TaskTimeConfig["repeatFrequency"] = "daily",
  repeatCount = 1,
): TaskTimeConfig {
  if (type === "custom") {
    return {
      type,
      label: customDeadlineAt ? `${customDeadlineAt.replace("T", " ")} 前` : "自定义截止时间",
      deadlineAt: customDeadlineAt || undefined,
    };
  }

  if (type === "repeat") {
    const frequencyLabel: Record<NonNullable<TaskTimeConfig["repeatFrequency"]>, string> =
      {
        custom: "自定义",
        daily: "每天",
        monthly: "每月",
        weekly: "每周",
      };
    return {
      type,
      label: `${frequencyLabel[repeatFrequency]} ${Math.max(1, Math.trunc(repeatCount))} 次`,
      repeatFrequency,
      repeatCount: Math.max(1, Math.trunc(repeatCount)),
      completedCount: 0,
    };
  }

  const labelMap: Record<Exclude<TaskTimeType, "custom" | "repeat">, string> = {
    immediate: "立即完成",
    this_month: "本月结束前",
    this_week: "本周日 23:59 前",
    today: "今日 23:59 前",
    tomorrow: "明日 23:59 前",
    within_24h: "24小时内完成",
    within_3d: "3天内完成",
    within_7d: "7天内完成",
  };

  return { type, label: labelMap[type] };
}

export function buildTaskTitle(
  moduleId: TaskModuleId,
  target: string,
  action: string,
  customTitle?: string,
) {
  if (customTitle?.trim()) return customTitle.trim();
  if (moduleId === "cleaning") return `打扫${target || "指定区域"}`;
  if (moduleId === "care" && target === "按摩") return action ? `${target} ${action}` : "按摩";
  if (moduleId === "report") return `${target || "日常"}报备`;
  return [target, action].filter(Boolean).join(" · ") || "老妞指定任务";
}

export function buildTaskDescription(
  moduleLabel: string,
  target: string,
  action: string,
  standard?: string,
  customDescription?: string,
) {
  if (customDescription?.trim()) return customDescription.trim();
  if (moduleLabel === "打扫卫生" && target === "客厅" && action === "标准清洁") {
    return "请完成客厅标准清洁，包括明显杂物归位、地面清理和桌面简单擦拭。完成后提交给老妞大人确认。";
  }
  const extra = standard?.trim() ? `额外标准：${standard.trim()}。` : "";
  return `请完成${moduleLabel}任务：${target || "老妞指定对象"}${action ? `，要求${action}` : ""}。${extra}完成后提交给老妞大人确认。`;
}

export function createRewardLabel(reward: TaskReward) {
  if (reward.type === "experience") return `${Math.max(0, Math.trunc(reward.value ?? 0))}经验`;
  if (reward.type === "allowance") return `${Math.max(0, Math.trunc(reward.value ?? 0))}元`;
  if (reward.type === "level_up") return `直接升级${Math.max(1, Math.trunc(reward.value ?? 1))}级`;
  if (reward.type === "benefit") {
    return `${reward.benefitName || "权益"} ${Math.max(1, Math.trunc(reward.value ?? 1))}次`;
  }
  if (reward.type === "custom") return reward.customName || "自定义奖励";
  return "无奖励";
}
