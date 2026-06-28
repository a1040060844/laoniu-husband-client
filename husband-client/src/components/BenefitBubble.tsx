import {
  BadgePlus,
  ClipboardCheck,
  Coffee,
  Coins,
  Gamepad2,
  Gift,
  HandHeart,
  Heart,
  Drama,
  Scale,
  Settings,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Benefit, BenefitStatus } from "../types/domain";

const iconMap = {
  "hand-heart": HandHeart,
  "shopping-bag": ShoppingBag,
  coffee: Coffee,
  utensils: Utensils,
  "gamepad-2": Gamepad2,
  heart: Heart,
  sparkles: Sparkles,
  coins: Coins,
  scale: Scale,
  mask: Drama,
  gift: Gift,
  "badge-plus": BadgePlus,
  "clipboard-check": ClipboardCheck,
  settings: Settings,
};

const statusTextFallback: Record<BenefitStatus, string> = {
  available: "可申请",
  cooldown: "未冷却",
  pending: "待审批",
  frozen: "已冻结",
  locked: "未解锁",
};

function getDisplayStatusText(status: BenefitStatus, text: string) {
  const normalized = text.trim();

  if (
    !normalized ||
    normalized.includes("?") ||
    normalized.includes("？") ||
    normalized.includes("\uFFFD")
  ) {
    return statusTextFallback[status];
  }

  return normalized;
}

interface BenefitBubbleProps {
  benefit: Benefit;
  computedStatus: BenefitStatus;
  statusText: string;
  index: number;
  isBursting?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  onOpen: (benefit: Benefit) => void;
}

export function BenefitBubble({
  benefit,
  computedStatus,
  statusText,
  index,
  isBursting = false,
  disabled = false,
  style,
  onOpen,
}: BenefitBubbleProps) {
  const Icon = iconMap[benefit.icon as keyof typeof iconMap] ?? Gift;
  const displayStatusText = getDisplayStatusText(computedStatus, statusText);

  return (
    <button
      className={`benefit-bubble benefit-bubble--${computedStatus}${isBursting ? " benefit-bubble--bursting" : ""}`}
      style={{ "--bubble-step": index, ...style } as CSSProperties}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onOpen(benefit);
      }}
    >
      <span className="benefit-bubble__icon">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <strong>{benefit.name}</strong>
      <small>{displayStatusText}</small>
    </button>
  );
}
