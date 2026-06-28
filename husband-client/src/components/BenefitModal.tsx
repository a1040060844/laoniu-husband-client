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
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { Benefit, BenefitStatus } from "../types/domain";
import { ClickSpark } from "./effects/ClickSpark";

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

interface BenefitUsageSummary {
  currentStatus: string;
  remainingThisRound: string;
  lastUsedAt: string;
  nextAvailableAt: string;
}

interface BenefitModalProps {
  benefit: Benefit | null;
  computedStatus: BenefitStatus;
  statusText: string;
  usage?: BenefitUsageSummary;
  onClose: () => void;
  onUse: (benefit: Benefit) => void;
}

function getUsageFallback(
  benefit: Benefit,
  computedStatus: BenefitStatus,
  statusText: string,
): BenefitUsageSummary {
  if (computedStatus === "cooldown") {
    return {
      currentStatus: statusText,
      remainingThisRound: "0 次",
      lastUsedAt: "本轮已记录",
      nextAvailableAt: benefit.cooldownText ?? "冷却结束后",
    };
  }

  if (computedStatus === "locked") {
    return {
      currentStatus: statusText || "尚未解锁",
      remainingThisRound: "未开放",
      lastUsedAt: "无记录",
      nextAvailableAt: `Lv.${String(benefit.levelRequired).padStart(2, "0")} 解锁后`,
    };
  }

  if (computedStatus === "pending") {
    return {
      currentStatus: "待审批",
      remainingThisRound: `${benefit.availableBonusCount ?? 0} 次奖励库存`,
      lastUsedAt: benefit.lastRequestedAt ?? "已提交申请",
      nextAvailableAt: "等待老婆审批",
    };
  }

  if (computedStatus === "frozen") {
    return {
      currentStatus: "已冻结",
      remainingThisRound: "不可使用",
      lastUsedAt: "卖身奴隶状态",
      nextAvailableAt: "恢复正常后开放",
    };
  }

  return {
    currentStatus: statusText,
    remainingThisRound: "1 次",
    lastUsedAt: "暂无记录",
    nextAvailableAt: "现在可申请",
  };
}

export function BenefitModal({
  benefit,
  computedStatus,
  statusText,
  usage,
  onClose,
  onUse,
}: BenefitModalProps) {
  if (!benefit) return null;

  const buttonText =
    computedStatus === "available"
      ? "申请恩准"
      : computedStatus === "cooldown"
        ? "未冷却"
        : computedStatus === "pending"
          ? "待审批"
          : computedStatus === "frozen"
            ? "已冻结"
            : "尚未解锁";
  const statusLabel =
    computedStatus === "available"
      ? "可申请"
      : computedStatus === "cooldown"
        ? "未冷却"
        : computedStatus === "pending"
          ? "待审批"
          : computedStatus === "frozen"
            ? "已冻结"
            : "未解锁";
  const Icon = iconMap[benefit.icon as keyof typeof iconMap] ?? Gift;
  const usageSummary =
    usage ?? getUsageFallback(benefit, computedStatus, statusText);

  return createPortal(
    <div
      className={`modal-backdrop benefit-modal-backdrop benefit-modal-backdrop--${computedStatus}`}
      role="presentation"
    >
      <div className="benefit-modal-dust" aria-hidden="true" />
      <section
        className={`sheet-modal benefit-modal benefit-modal--${computedStatus}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="benefit-modal-title"
      >
        <button
          className="icon-close benefit-modal__close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} strokeWidth={1.6} />
        </button>

        <header className="benefit-modal__header">
          <p className="kicker">老妞大人裁定光幕</p>
          <h2 id="benefit-modal-title">{benefit.name}</h2>
          <p>权益已显现，是否恩准仍以老妞大人最终裁定为准。</p>
          <span className="benefit-modal__status">{statusLabel}</span>
        </header>

        <div className="benefit-modal__content">
          <div className="benefit-modal__emblem" aria-hidden="true">
            <Icon size={46} strokeWidth={1.5} />
          </div>

          <div className="benefit-modal__details">
            <p>{benefit.description}</p>
            <dl>
              <div>
                <dt>解锁等级</dt>
                <dd>Lv.{String(benefit.levelRequired).padStart(2, "0")}</dd>
              </div>
              <div>
                <dt>使用频率</dt>
                <dd>{benefit.frequency}</dd>
              </div>
              <div>
                <dt>使用方式</dt>
                <dd>提交申请后，由老妞大人裁定</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="benefit-modal__usage" aria-label="权益使用情况">
          <div>
            <span>当前状态</span>
            <strong>{usageSummary.currentStatus}</strong>
          </div>
          <div>
            <span>本轮剩余次数</span>
            <strong>{usageSummary.remainingThisRound}</strong>
          </div>
          <div>
            <span>上次使用时间</span>
            <strong>{usageSummary.lastUsedAt}</strong>
          </div>
          <div>
            <span>下次可用时间</span>
            <strong>{usageSummary.nextAvailableAt}</strong>
          </div>
        </div>

        <div className="benefit-modal__actions">
          <ClickSpark>
            <button
              className="primary-button benefit-modal__primary"
              type="button"
              disabled={computedStatus !== "available"}
              onClick={() => onUse(benefit)}
            >
              {buttonText}
            </button>
          </ClickSpark>
          <button
            className="benefit-modal__secondary"
            type="button"
            onClick={onClose}
          >
            关闭光幕
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
