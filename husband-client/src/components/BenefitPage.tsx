import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Coins } from "lucide-react";
import { BenefitBubble } from "./BenefitBubble";
import { BenefitModal } from "./BenefitModal";
import { OrnateSwipeHint } from "./OrnateSwipeHint";
import { RoleNavigator } from "./RoleNavigator";
import type { Benefit, BenefitStatus, Role, ViewKey } from "../types/domain";
import { AnimatedContent } from "./effects/AnimatedContent";
import { benefitForLevel } from "../data/benefits";
import { playSoundEffect } from "../lib/soundEffects";

interface BenefitPageProps {
  role: Role;
  previewDirection: "none" | "next" | "prev";
  currentLevel: number;
  benefits: Benefit[];
  canPrev: boolean;
  canNext: boolean;
  selectedBenefit: Benefit | null;
  forceFrozen?: boolean;
  levelLabel?: string;
  showAllBenefits?: boolean;
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onOpenBenefit: (benefit: Benefit) => void;
  onCloseBenefit: () => void;
  onUseBenefit: (benefit: Benefit) => void;
  onSelectView: (view: ViewKey) => void;
}

function getStatus(
  currentLevel: number,
  benefit: Benefit,
  forceFrozen = false,
): { status: BenefitStatus; text: string } {
  if (forceFrozen) {
    return { status: "frozen", text: "已冻结" };
  }
  if (currentLevel < benefit.levelRequired) {
    return {
      status: "locked",
      text: "未解锁",
    };
  }
  if (benefit.pendingRequest) {
    return { status: "pending", text: "待审批" };
  }
  if (
    benefit.cooldownUntil &&
    Date.parse(benefit.cooldownUntil) > Date.now()
  ) {
    return { status: "cooldown", text: benefit.cooldownText ?? "未冷却" };
  }
  if (benefit.status === "cooldown" && !benefit.cooldownUntil) {
    return { status: "cooldown", text: benefit.cooldownText ?? "未冷却" };
  }
  return {
    status: "available",
    text:
      (benefit.availableBonusCount ?? 0) > 0
        ? `奖励 ${benefit.availableBonusCount} 次`
        : benefit.lastApprovedAt
          ? "已使用"
        : "可申请",
  };
}

function isVisibleForRole(role: Role, benefit: Benefit): boolean {
  if (role.level === 0) {
    return benefit.levelRequired === 0;
  }
  return benefit.levelRequired > 0 && role.level >= benefit.levelRequired;
}

function getBubblePosition(
  index: number,
  total: number,
): { x: number; y: number } {
  if (total <= 5) {
    const sparseLayouts = [
      [{ x: 195, y: 78 }],
      [
        { x: 128, y: 64 },
        { x: 262, y: 122 },
      ],
      [
        { x: 94, y: 118 },
        { x: 195, y: 54 },
        { x: 296, y: 118 },
      ],
      [
        { x: 82, y: 70 },
        { x: 170, y: 128 },
        { x: 258, y: 62 },
        { x: 340, y: 124 },
      ],
      [
        { x: 64, y: 114 },
        { x: 132, y: 56 },
        { x: 204, y: 128 },
        { x: 282, y: 62 },
        { x: 354, y: 118 },
      ],
    ];

    return sparseLayouts[Math.max(total - 1, 0)][index];
  }

  const staggerX = [0, 12, -8, 6, -12][index % 5];
  const rowOffset = Math.floor(index / 5) % 2 === 0 ? 0 : 8;
  const yBase = index % 2 === 0 ? 54 : 118;
  const yDrift = [0, 8, -4, 10, -8][index % 5];

  return {
    x: 60 + index * 82 + staggerX,
    y: Math.min(140, yBase + yDrift + rowOffset),
  };
}

export function BenefitPage({
  role,
  previewDirection,
  currentLevel,
  benefits,
  canPrev,
  canNext,
  selectedBenefit,
  forceFrozen = false,
  levelLabel,
  showAllBenefits = false,
  onPreviewPrev,
  onPreviewNext,
  onOpenBenefit,
  onCloseBenefit,
  onUseBenefit,
  onSelectView,
}: BenefitPageProps) {
  const [burstingBenefitId, setBurstingBenefitId] = useState<string | null>(
    null,
  );
  const openTimerRef = useRef<number | null>(null);
  const isLockedPreview = role.level > currentLevel;
  const directionClass = `benefit-page--dir-${previewDirection}`;
  const visibleBenefits = showAllBenefits
    ? benefits.map((benefit) => benefitForLevel(benefit, role.level))
    : benefits
        .filter((benefit) => isVisibleForRole(role, benefit))
        .map((benefit) => benefitForLevel(benefit, role.level));
  const cloudWidth =
    visibleBenefits.length <= 5
      ? 390
      : Math.max(520, visibleBenefits.length * 86 + 120);
  const shouldLoopBubbles = visibleBenefits.length > 5;
  const marqueeDuration = Math.max(18, visibleBenefits.length * 3.8);
  const cloudViewportClassName = "benefit-cloud-viewport";
  const visibleSelectedBenefit =
    !forceFrozen && selectedBenefit
      ? visibleBenefits.find((benefit) => benefit.id === selectedBenefit.id) ?? null
      : null;
  const selectedStatus = visibleSelectedBenefit
    ? getStatus(currentLevel, visibleSelectedBenefit, forceFrozen)
    : { status: "locked" as BenefitStatus, text: "" };
  const isLightCurtainActive = Boolean(visibleSelectedBenefit);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  function handleOpenBenefit(benefit: Benefit) {
    playSoundEffect("benefit-bubble-open");
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
    }
    setBurstingBenefitId(benefit.id);
    openTimerRef.current = window.setTimeout(() => {
      onOpenBenefit(benefit);
      setBurstingBenefitId(null);
      openTimerRef.current = null;
    }, 260);
  }

  function renderBenefitBubbles(loopIndex = 0) {
    return visibleBenefits.map((benefit, index) => {
      const computed = forceFrozen
        ? { status: "frozen" as BenefitStatus, text: "已冻结" }
        : getStatus(currentLevel, benefit);
      const { x, y } = getBubblePosition(index, visibleBenefits.length);

      return (
        <BenefitBubble
          key={`${benefit.id}-${loopIndex}`}
          benefit={benefit}
          computedStatus={computed.status}
          statusText={computed.text}
          index={index}
          isBursting={burstingBenefitId === benefit.id}
          disabled={forceFrozen || computed.status !== "available"}
          style={
            {
              "--bubble-x": `${x + loopIndex * cloudWidth}px`,
              "--bubble-y": `${y}px`,
              "--bubble-delay": `${index * 0.18}s`,
            } as CSSProperties
          }
          onOpen={handleOpenBenefit}
        />
      );
    });
  }

  return (
    <section
      className={`benefit-page page-screen benefit-page--level-${String(role.level).padStart(2, "0")} ${directionClass}${isLockedPreview ? " page-screen--locked-role" : ""}${
        isLightCurtainActive ? " benefit-page--light-curtain" : ""
      }${forceFrozen ? " benefit-page--frozen" : ""}`}
    >
      <img
        className="cinema-image"
        src={role.benefitImage}
        alt={`${role.title}权益背景`}
      />
      <div className="image-scrim image-scrim--benefit" />
      {isLockedPreview && (
        <div className="locked-character-mask" aria-hidden="true" />
      )}

      <AnimatedContent
        as="header"
        key={`benefit-title-${role.level}`}
        className="hero-title hero-title--benefit"
        duration={360}
      >
        <div className="level-line">
          <span />
          <strong>{levelLabel ?? `Lv. ${String(role.level).padStart(2, "0")}`}</strong>
          <span />
        </div>
        <h1>{role.title}</h1>
      </AnimatedContent>

      <div
        className={cloudViewportClassName}
        aria-label="权益列表"
      >
        <div
          className={`benefit-cloud-track${
            shouldLoopBubbles
              ? " benefit-cloud-track--marquee"
              : " benefit-cloud-track--drift"
          }`}
          style={
            {
              "--cloud-width": `${cloudWidth}px`,
              "--marquee-distance": `${cloudWidth}px`,
              "--marquee-duration": `${marqueeDuration}s`,
            } as CSSProperties
          }
          onTouchStart={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          {shouldLoopBubbles ? (
            <>
              {renderBenefitBubbles(0)}
              {renderBenefitBubbles(1)}
            </>
          ) : (
            renderBenefitBubbles(0)
          )}
        </div>
      </div>

      <RoleNavigator
        canPrev={canPrev}
        canNext={canNext}
        locked={isLockedPreview}
        onPrev={onPreviewPrev}
        onNext={onPreviewNext}
      />

      <AnimatedContent
        as="footer"
        className="benefit-commission"
        aria-label="每月佣金"
        delay={80}
        duration={360}
      >
        <span>
          <Coins size={16} />
          每月佣金
        </span>
        <strong>¥ {role.salary}</strong>
      </AnimatedContent>

      <OrnateSwipeHint
        className="benefit-ornate-swipe"
        direction="up"
        text="上滑进入主页"
        onClick={() => onSelectView("role")}
      />

      <BenefitModal
        benefit={visibleSelectedBenefit}
        computedStatus={selectedStatus.status}
        statusText={selectedStatus.text}
        usage={
          visibleSelectedBenefit
            ? {
                currentStatus: selectedStatus.text,
                remainingThisRound: `${visibleSelectedBenefit.availableBonusCount ?? 0} 次奖励库存`,
                lastUsedAt: visibleSelectedBenefit.lastApprovedAt
                  ? new Date(
                      visibleSelectedBenefit.lastApprovedAt,
                    ).toLocaleString("zh-CN", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    })
                  : "暂无记录",
                nextAvailableAt: visibleSelectedBenefit.cooldownUntil
                  ? new Date(
                      visibleSelectedBenefit.cooldownUntil,
                    ).toLocaleString("zh-CN", {
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "2-digit",
                    })
                  : visibleSelectedBenefit.pendingRequest
                    ? "等待老婆审批"
                    : "现在可申请",
              }
            : undefined
        }
        onClose={onCloseBenefit}
        onUse={onUseBenefit}
      />
    </section>
  );
}
