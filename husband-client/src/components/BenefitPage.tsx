import { useEffect, useRef, useState } from "react";
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
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onOpenBenefit: (benefit: Benefit) => void;
  onCloseBenefit: () => void;
  onUseBenefit: (benefit: Benefit) => void;
  onSelectView: (view: ViewKey) => void;
}

function getStatus(
  role: Role,
  benefit: Benefit,
): { status: BenefitStatus; text: string } {
  if (role.level < benefit.levelRequired) {
    return {
      status: "locked",
      text: `Lv.${String(benefit.levelRequired).padStart(2, "0")}解锁`,
    };
  }
  if (benefit.status === "locked") {
    return { status: "locked", text: "尚未解锁" };
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

export function BenefitPage({
  role,
  previewDirection,
  currentLevel,
  benefits,
  canPrev,
  canNext,
  selectedBenefit,
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
  const visibleBenefits = benefits.filter((benefit) =>
    isVisibleForRole(role, benefit),
  );
  const orbitClassName = `benefit-orbit${visibleBenefits.length > 8 ? " benefit-orbit--dense" : ""}`;
  const visibleSelectedBenefit =
    selectedBenefit &&
    visibleBenefits.some((benefit) => benefit.id === selectedBenefit.id)
      ? selectedBenefit
      : null;
  const selectedStatus = visibleSelectedBenefit
    ? getStatus(role, visibleSelectedBenefit)
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
      }`}
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

      <header
        key={`benefit-title-${role.level}`}
        className="hero-title hero-title--benefit"
      >
        <div className="level-line">
          <span />
          <strong>Lv. {String(role.level).padStart(2, "0")}</strong>
          <span />
        </div>
        <h1>{role.title}</h1>
      </header>

      <div className={orbitClassName} aria-label="权益列表">
        {visibleBenefits.map((benefit, index) => {
          const { status, text } = getStatus(role, benefit);
          return (
            <BenefitBubble
              key={benefit.id}
              benefit={benefit}
              computedStatus={status}
              statusText={text}
              index={index}
              isBursting={burstingBenefitId === benefit.id}
              onOpen={handleOpenBenefit}
            />
          );
        })}
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
