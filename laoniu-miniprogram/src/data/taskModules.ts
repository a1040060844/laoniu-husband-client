import type {
  TaskModuleId,
  TaskReward,
  TaskRewardType,
  TaskTimeConfig,
  TaskTimeType,
} from "../types/domain";

export interface TaskModuleOption {
  id: TaskModuleId;
  label: string;
  targets?: string[];
  actions?: string[];
  freeTarget?: boolean;
  freeAction?: boolean;
  targetLabel?: string;
  actionLabel?: string;
  targetPlaceholder?: string;
  actionPlaceholder?: string;
}

export const taskModules: TaskModuleOption[] = [
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
    targetLabel: "选择打扫区域",
    actionLabel: "选择打扫标准",
  },
  {
    id: "laundry",
    label: "洗衣整理",
    freeTarget: true,
    freeAction: true,
    targetLabel: "洗衣内容",
    actionLabel: "具体要求",
    targetPlaceholder: "例如：床单被套、今天的衣服、毛巾",
    actionPlaceholder: "例如：洗完晾好、收衣服并叠好、完整洗晒收",
  },
  {
    id: "cooking",
    label: "做饭",
    freeTarget: true,
    freeAction: true,
    targetLabel: "做饭内容",
    actionLabel: "具体要求",
    targetPlaceholder: "例如：煮面、炒菜、晚饭、准备早餐",
    actionPlaceholder: "例如：不要太油、按老妞口味来、摆盘好看一点",
  },
  {
    id: "shopping",
    label: "买东西",
    freeTarget: true,
    freeAction: true,
    targetLabel: "要买什么",
    actionLabel: "购买要求",
    targetPlaceholder: "例如：饮料、零食、日用品、水果",
    actionPlaceholder: "例如：买指定品牌、买便宜的、买老妞喜欢的、送到家",
  },
  {
    id: "movie",
    label: "看电影",
    freeTarget: true,
    freeAction: true,
    targetLabel: "电影内容",
    actionLabel: "陪看要求",
    targetPlaceholder: "例如：恐怖片、爱情片、老妞指定电影",
    actionPlaceholder: "例如：不许玩手机、认真陪看、看完一起讨论",
  },
  {
    id: "game",
    label: "打游戏",
    freeTarget: true,
    freeAction: true,
    targetLabel: "游戏内容",
    actionLabel: "陪玩要求",
    targetPlaceholder: "例如：双人成行、王者荣耀、老妞指定游戏",
    actionPlaceholder: "例如：不许摆烂、不许嫌弃、认真配合老妞",
  },
  {
    id: "photo",
    label: "拍照",
    freeTarget: true,
    freeAction: true,
    targetLabel: "拍照内容",
    actionLabel: "拍照要求",
    targetPlaceholder: "例如：帮老妞拍照、拍穿搭、拍产品图",
    actionPlaceholder: "例如：拍到老妞满意、帮忙选图、简单修图",
  },
  {
    id: "custom",
    label: "自定义任务",
    freeTarget: true,
    freeAction: true,
    targetLabel: "任务对象，可选",
    actionLabel: "执行要求，可选",
    targetPlaceholder: "请输入任务对象，可留空",
    actionPlaceholder: "请输入执行要求，可留空",
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
  "不要生气券",
  "老哥也爱美",
  "经济补助",
  "规则申诉权",
  "cos 时刻",
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
      label: customDeadlineAt
        ? `${customDeadlineAt.replace("T", " ")} 前`
        : "自定义截止时间",
      deadlineAt: customDeadlineAt || undefined,
    };
  }

  if (type === "repeat") {
    const frequencyLabel: Record<
      NonNullable<TaskTimeConfig["repeatFrequency"]>,
      string
    > = {
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
    within_24h: "24 小时内完成",
    within_3d: "3 天内完成",
    within_7d: "7 天内完成",
  };

  return { type, label: labelMap[type] };
}

export function buildTaskTitle(
  moduleId: TaskModuleId,
  target: string,
  _action: string,
  customTitle?: string,
) {
  const safeTarget = target.trim();
  if (moduleId === "custom") return customTitle?.trim() || "自定义任务";
  if (moduleId === "cleaning") return `打扫${safeTarget || "指定区域"}`;
  if (moduleId === "laundry") {
    return safeTarget ? `整理${safeTarget}` : "洗衣整理";
  }
  if (moduleId === "cooking") {
    if (!safeTarget) return "做饭";
    return /[做煮炒]/.test(safeTarget) ? safeTarget : `做${safeTarget}`;
  }
  if (moduleId === "shopping") {
    return safeTarget ? `买${safeTarget}` : "买东西";
  }
  if (moduleId === "movie") {
    return safeTarget ? `看${safeTarget}` : "看电影";
  }
  if (moduleId === "game") {
    return safeTarget ? `陪老妞打${safeTarget}` : "打游戏";
  }
  if (moduleId === "photo") {
    return safeTarget || "拍照";
  }
  return "老妞指定任务";
}

export function buildTaskDescription(
  moduleId: TaskModuleId,
  target: string,
  action: string,
  _standard?: string,
  customDescription?: string,
) {
  const safeTarget = target.trim();
  const safeAction = action.trim();

  if (moduleId === "custom") {
    return (
      customDescription?.trim() ||
      "由老妞大人亲自发布，验收标准以老妞大人最终裁定为准。"
    );
  }

  if (moduleId === "cleaning") {
    if (safeTarget === "客厅" && safeAction === "标准清洁") {
      return "请完成客厅标准清洁，包括明显杂物归位、地面清理和桌面简单擦拭。完成后提交给老妞大人确认。";
    }
    if (safeTarget === "卫生间" && safeAction === "深度清洁") {
      return "请完成卫生间深度清洁，包括地面、台面、明显污渍和死角清理。完成后提交给老妞大人确认。";
    }
    return `请完成“${safeTarget || "指定区域"}”的“${safeAction || "老妞指定标准"}”，验收标准以老妞大人最终裁定为准。`;
  }

  if (moduleId === "laundry") {
    if (!safeTarget) return "请按老妞大人的要求完成洗衣整理任务。完成后提交确认。";
    return safeAction
      ? `请完成洗衣整理任务，内容为“${safeTarget}”。具体要求：“${safeAction}”。完成后提交给老妞大人确认。`
      : `请完成洗衣整理任务，内容为“${safeTarget}”。完成后提交给老妞大人确认。`;
  }

  if (moduleId === "cooking") {
    if (!safeTarget) return "请按老妞大人的要求完成做饭任务。完成后提交确认。";
    const extra = safeAction ? `具体要求：“${safeAction}”。` : "";
    return `请按老妞大人的要求完成做饭任务，具体内容为“${safeTarget}”。${extra}完成后提交给老妞大人确认。`;
  }

  if (moduleId === "shopping") {
    if (!safeTarget) return "请按老妞大人的要求完成买东西任务。完成后提交确认。";
    const extra = safeAction ? `购买要求：“${safeAction}”。` : "";
    return `请按老妞大人的要求完成购买任务，购买内容为“${safeTarget}”。${extra}完成后提交给老妞大人确认。`;
  }

  if (moduleId === "movie") {
    if (!safeTarget) return "请陪老妞大人完成看电影任务，期间不许敷衍。";
    const extra = safeAction ? `陪看要求：“${safeAction}”。` : "";
    return `请陪老妞大人完成看电影任务，电影内容为“${safeTarget}”。期间按老妞要求执行，不许敷衍。${extra}`;
  }

  if (moduleId === "game") {
    if (!safeTarget) return "请陪老妞大人完成打游戏任务，过程里要认真配合。";
    const extra = safeAction ? `陪玩要求：“${safeAction}”。` : "";
    return `请陪老妞大人完成打游戏任务，游戏内容为“${safeTarget}”。过程里要认真配合，不许敷衍。${extra}`;
  }

  if (moduleId === "photo") {
    if (!safeTarget) return "请按老妞大人的要求完成拍照任务，以老妞大人满意为准。";
    const extra = safeAction ? `拍照要求：“${safeAction}”。` : "";
    return `请按老妞大人的要求完成拍照任务，拍照内容为“${safeTarget}”。以老妞大人满意为准。${extra}`;
  }

  return "由老妞大人亲自发布，验收标准以老妞大人最终裁定为准。";
}

export function createRewardLabel(reward: TaskReward) {
  if (reward.type === "experience") {
    return `${Math.min(30, Math.max(0, Math.trunc(reward.value ?? 0)))} 经验`;
  }
  if (reward.type === "allowance") {
    return `${Math.max(0, Math.trunc(reward.value ?? 0))} 元`;
  }
  if (reward.type === "level_up") {
    return `直接升级 ${Math.min(1, Math.max(1, Math.trunc(reward.value ?? 1)))} 级`;
  }
  if (reward.type === "benefit") {
    return `${reward.benefitName || "权益"} ${Math.max(1, Math.trunc(reward.value ?? 1))} 次`;
  }
  if (reward.type === "custom") return reward.customName || "自定义奖励";
  return "无奖励";
}
