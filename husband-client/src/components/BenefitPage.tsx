import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Coins } from "lucide-react";
import { BenefitBubble } from "./BenefitBubble";
import { BenefitModal } from "./BenefitModal";
import { RoleNavigator } from "./RoleNavigator";
import type { Benefit, BenefitStatus, Role, ViewKey } from "../types/domain";

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
): { status: BenefitStatus; text: string } {
  if (currentLevel < benefit.levelRequired) {
    return {
      status: "locked",
      text: "未解锁",
    };
  }
  if (benefit.status === "cooldown") {
    return { status: "cooldown", text: benefit.cooldownText ?? "冷却中" };
  }
  return { status: "available", text: "可使用" };
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
    ? benefits
    : benefits.filter((benefit) => isVisibleForRole(role, benefit));
  const cloudWidth =
    visibleBenefits.length <= 5
      ? 390
      : Math.max(520, visibleBenefits.length * 86 + 120);
  const cloudViewportClassName = "benefit-cloud-viewport";
  const visibleSelectedBenefit =
    !forceFrozen &&
    selectedBenefit &&
    visibleBenefits.some((benefit) => benefit.id === selectedBenefit.id)
      ? selectedBenefit
      : null;
  const selectedStatus = visibleSelectedBenefit
    ? getStatus(currentLevel, visibleSelectedBenefit)
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

  return (
    <section
      className={`benefit-page page-screen ${directionClass}${isLockedPreview ? " page-screen--locked-role" : ""}${
        isLightCurtainActive ? " benefit-page--light-curtain" : ""
      }${forceFrozen ? " benefit-page--frozen" : ""}`}
    >
      <img
        className="cinema-image"
        src={role.roleImage}
        alt={`${role.title}权益背景`}
      />
      <div className="image-scrim image-scrim--benefit" />
      {isLockedPreview && (
        <div className="locked-character-mask" aria-hidden="true" />
      )}

      <header
        key={`benefit-title-${role.level}`}
        className="hero-title hero-title--benefit"
      >
        <div className="level-line">
          <span />
          <strong>{levelLabel ?? `Lv. ${String(role.level).padStart(2, "0")}`}</strong>
          <span />
        </div>
        <h1>{role.title}</h1>
      </header>

      <div className={cloudViewportClassName} aria-label="权益列表">
        <div
          className="benefit-cloud-track"
          style={{ "--cloud-width": `${cloudWidth}px` } as CSSProperties}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
        >
          {visibleBenefits.map((benefit, index) => {
            const computed = forceFrozen
              ? { status: "locked" as BenefitStatus, text: "已冻结" }
              : getStatus(currentLevel, benefit);
            const { x, y } = getBubblePosition(index, visibleBenefits.length);
            return (
              <BenefitBubble
                key={benefit.id}
                benefit={benefit}
                computedStatus={computed.status}
                statusText={computed.text}
                index={index}
                isBursting={burstingBenefitId === benefit.id}
                disabled={forceFrozen}
                style={
                  {
                    "--bubble-x": `${x}px`,
                    "--bubble-y": `${y}px`,
                    "--bubble-delay": `${index * 0.18}s`,
                  } as CSSProperties
                }
                onOpen={handleOpenBenefit}
              />
            );
          })}
        </div>
      </div>

      <RoleNavigator
        canPrev={canPrev}
        canNext={canNext}
        locked={isLockedPreview}
        onPrev={onPreviewPrev}
        onNext={onPreviewNext}
      />

      <footer className="benefit-commission" aria-label="每月佣金">
        <span>
          <Coins size={16} />
          每月佣金
        </span>
        <strong>¥ {role.salary}</strong>
      </footer>

      <button
        className="swipe-hint swipe-hint--benefit"
        type="button"
        onClick={() => onSelectView("role")}
      >
        <span>⌃</span>
        上滑进入主页
      </button>

      <BenefitModal
        benefit={visibleSelectedBenefit}
        computedStatus={selectedStatus.status}
        statusText={selectedStatus.text}
        onClose={onCloseBenefit}
        onUse={onUseBenefit}
      />
    </section>
  );
}
