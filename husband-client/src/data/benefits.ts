import type { Benefit, BenefitStatus } from "../types/domain";

export function benefitStatusForLevel(
  benefit: Benefit,
  level: number,
  now = Date.now(),
): BenefitStatus {
  if (level < benefit.levelRequired) return "locked";
  if (benefit.pendingRequest) return "pending";
  if (
    benefit.cooldownUntil &&
    Date.parse(benefit.cooldownUntil) > now
  ) {
    return "cooldown";
  }
  if (benefit.status === "cooldown" && !benefit.cooldownUntil) {
    return "cooldown";
  }
  return "available";
}

function hasBenefitUsageHistory(benefit: Benefit) {
  return Boolean(
    benefit.lastApprovedAt ||
      benefit.lastRequestedAt ||
      benefit.pendingRequest,
  );
}

export function clearSyntheticBenefitCooldown(benefit: Benefit): Benefit {
  if (!benefit.cooldownUntil || hasBenefitUsageHistory(benefit)) return benefit;

  return {
    ...benefit,
    status: "available",
    cooldownText: undefined,
    cooldownUntil: undefined,
  };
}

export function makeNewlyUnlockedBenefitsAvailable(
  benefits: Benefit[],
  fromLevel: number,
  toLevel: number,
) {
  if (toLevel <= fromLevel) return benefits;

  return benefits.map((benefit) => {
    const newlyUnlocked =
      benefit.levelRequired > fromLevel && benefit.levelRequired <= toLevel;
    if (!newlyUnlocked || hasBenefitUsageHistory(benefit)) return benefit;

    return {
      ...benefit,
      status: "available" as const,
      cooldownText: undefined,
      cooldownUntil: undefined,
      pendingRequest: undefined,
    };
  });
}

export function benefitForLevel(benefit: Benefit, level: number): Benefit {
  const variants = benefit.displayVariants ?? [];
  const display = variants
    .filter((variant) => level >= variant.minLevel)
    .sort((a, b) => b.minLevel - a.minLevel)[0];

  if (!display) return benefit;

  return {
    ...benefit,
    name: display.name ?? benefit.name,
    frequency: display.frequency ?? benefit.frequency,
    description: display.description ?? benefit.description,
  };
}

export const benefits: Benefit[] = [
  {
    id: "relief",
    levelRequired: 0,
    name: "申请救济",
    frequency: "周1次",
    description: "向老妞大人低头求助，争取一线生机。",
    status: "available",
    icon: "hand-heart",
  },
  {
    id: "takeout",
    levelRequired: 1,
    name: "外卖申请权",
    frequency: "2周1次",
    description: "向老妞大人祈求，可以换取一次选择外卖的机会。",
    displayVariants: [
      {
        minLevel: 10,
        frequency: "周1次",
      },
    ],
    status: "available",
    icon: "shopping-bag",
  },
  {
    id: "milk-tea",
    levelRequired: 2,
    name: "奶茶申请权",
    frequency: "2周1次",
    description: "这是一位人民保安应得的奖励。",
    displayVariants: [
      {
        minLevel: 3,
        description: "这是一位仆人应得的奖励。",
      },
      {
        minLevel: 10,
        frequency: "周1次",
        description: "这是一位仆人应得的奖励。",
      },
    ],
    status: "cooldown",
    cooldownText: "剩余2天",
    icon: "coffee",
  },
  {
    id: "feast",
    levelRequired: 3,
    name: "大餐一顿",
    frequency: "月1次",
    description: "到了这个等级，终于可以决定今天吃什么。",
    displayVariants: [
      {
        minLevel: 4,
        frequency: "2周1次",
      },
      {
        minLevel: 10,
        frequency: "周1次",
      },
    ],
    status: "available",
    icon: "utensils",
  },
  {
    id: "free-time",
    levelRequired: 4,
    name: "自由娱乐时间",
    frequency: "周1次",
    description: "属于自己的放松时刻，不被打扰。",
    status: "available",
    icon: "gamepad-2",
  },
  {
    id: "no-anger",
    levelRequired: 5,
    name: "不要生气了",
    frequency: "月1次",
    description:
      "已经成为老妞大人的得力助手了，虔诚的道歉后，你有权让老妞无条件不生气一次（老妞有该权益的最终解释权）。",
    status: "cooldown",
    cooldownText: "本月已使用",
    icon: "heart",
  },
  {
    id: "beauty",
    levelRequired: 6,
    name: "老哥也爱美",
    frequency: "月1次",
    description:
      "老妞大人的贴身女婢怎么能灰头土脸呢，奖励老妞给老哥化妆一次。",
    status: "available",
    icon: "sparkles",
  },
  {
    id: "subsidy",
    levelRequired: 7,
    name: "经济补助",
    frequency: "3月1次",
    description: "作为老妞的管事助理，口袋空空怎么行，老妞大人给予50元借款额度。",
    displayVariants: [
      {
        minLevel: 10,
        frequency: "2月1次",
      },
    ],
    status: "available",
    icon: "coins",
  },
  {
    id: "appeal",
    levelRequired: 8,
    name: "规则申诉权",
    frequency: "月1次",
    description: "对规则提出质疑，争取更公平的待遇。",
    status: "available",
    icon: "scale",
  },
  {
    id: "cos",
    levelRequired: 8,
    name: "cos一下",
    frequency: "周1次",
    description: "老妞穿什么，可以由老哥做主哦。",
    displayVariants: [
      {
        minLevel: 9,
        name: "cos时刻",
      },
    ],
    status: "available",
    icon: "mask",
  },
  {
    id: "love",
    levelRequired: 9,
    name: "恩爱奖励",
    frequency: "月1次",
    description: "可申请一次专属亲密互动时刻。",
    status: "available",
    icon: "gift",
  },
  {
    id: "love-plus",
    levelRequired: 10,
    name: "恩爱奖励（升级）",
    frequency: "月1次",
    description:
      "亲密时刻更加自由，不再拘束，可以和cos时刻同时使用哦，不能和恩爱奖励叠加使用。",
    displayVariants: [
      {
        minLevel: 11,
        description:
          "亲密时刻更加自由，不再拘束，可以和cos时刻同时使用哦，在这个阶段可以和恩爱奖励叠加使用了哦。",
      },
    ],
    status: "available",
    icon: "badge-plus",
  },
  {
    id: "reverse-task",
    levelRequired: 11,
    name: "反向任务权",
    frequency: "周1次",
    description: "可以向老妞大人发起一次小任务。",
    status: "available",
    icon: "clipboard-check",
  },
  {
    id: "custom",
    levelRequired: 11,
    name: "自定义权益",
    frequency: "月1次",
    description: "可以创造一个属于自己的新规则。",
    status: "available",
    icon: "settings",
  },
];
