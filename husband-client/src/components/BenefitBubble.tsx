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

interface BenefitBubbleProps {
  benefit: Benefit;
  computedStatus: BenefitStatus;
  statusText: string;
  index: number;
  isBursting?: boolean;
  onOpen: (benefit: Benefit) => void;
}

export function BenefitBubble({ benefit, computedStatus, statusText, index, isBursting = false, onOpen }: BenefitBubbleProps) {
  const Icon = iconMap[benefit.icon as keyof typeof iconMap] ?? Gift;

  return (
    <button
      className={`benefit-bubble benefit-bubble--${computedStatus}${isBursting ? " benefit-bubble--bursting" : ""}`}
      style={{ "--bubble-step": index } as React.CSSProperties}
      type="button"
      onClick={() => onOpen(benefit)}
    >
      <span className="benefit-bubble__icon">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <strong>{benefit.name}</strong>
      <small>{statusText}</small>
    </button>
  );
}
