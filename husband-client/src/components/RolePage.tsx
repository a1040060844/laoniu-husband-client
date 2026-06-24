import { ProgressBar } from "./ProgressBar";
import { RoleNavigator } from "./RoleNavigator";
import { publicAsset } from "../lib/assets";
import type { Role, ViewKey } from "../types/domain";
import { ChatMessageButton } from "./ChatMessagePanel";
import { OrnateSwipeHint } from "./OrnateSwipeHint";
import { VerticalMagicSwipeHint } from "./VerticalMagicSwipeHint";
import { AnimatedContent } from "./effects/AnimatedContent";
import { ClickSpark } from "./effects/ClickSpark";
import { CountUp } from "./effects/CountUp";

interface RolePageProps {
  role: Role;
  previewRole: Role;
  previewDirection: "none" | "next" | "prev";
  canPrev: boolean;
  canNext: boolean;
  roleCount: number;
  wallet: number;
  chatUnreadCount: number;
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onReturnToLogin: () => void;
  onSelectView: (view: ViewKey) => void;
  onOpenChat: () => void;
}

export function RolePage({
  role,
  previewRole,
  previewDirection,
  canPrev,
  canNext,
  roleCount = 12,
  chatUnreadCount,
  onPreviewPrev,
  onPreviewNext,
  onReturnToLogin,
  onSelectView,
  onOpenChat,
}: RolePageProps) {
  const isPreviewing = previewRole.level !== role.level;
  const isLockedPreview = previewRole.level > role.level;
  const isNearLevelUp =
    previewRole.expRequired > 0 &&
    previewRole.expCurrent / previewRole.expRequired >= 0.8;
  const directionClass = `role-page--dir-${previewDirection}`;

  return (
    <section
      className={`role-page page-screen role-page--level-${String(previewRole.level).padStart(2, "0")} ${directionClass}${isLockedPreview ? " page-screen--locked-role" : ""}`}
    >
      <img
        className="cinema-image"
        src={previewRole.roleImage}
        alt={`${previewRole.title}职务形象`}
      />
      <div className="image-scrim" />
      {isLockedPreview && (
        <div className="locked-character-mask" aria-hidden="true" />
      )}

      <AnimatedContent
        as="header"
        key={`role-title-${previewRole.level}`}
        className="hero-title hero-title--role"
        duration={360}
      >
        <div className="level-line">
          <span />
          <strong>
            Lv. <CountUp value={previewRole.level} minimumIntegerDigits={2} />
          </strong>
          <span />
        </div>
        <div className="role-title-row">
          <ClickSpark>
            <button
              className="role-return-login-button"
              type="button"
              aria-label="返回登录"
              onClick={onReturnToLogin}
            >
              <img
                src={publicAsset("/assets/ui/return-login.png?v=3f13165c")}
                alt=""
              />
            </button>
          </ClickSpark>
          <h1>{previewRole.title}</h1>
        </div>
        <i />
      </AnimatedContent>

      <p
        className="role-wallet-line role-wallet-line--corner"
        data-reward-target="money"
      >
        零花钱 <strong>¥ <CountUp value={previewRole.salary} /></strong>
      </p>

      <ChatMessageButton
        className="role-chat-entry"
        viewer="husband"
        unreadCount={chatUnreadCount}
        onClick={onOpenChat}
      />

      <VerticalMagicSwipeHint
        className="role-benefit-magic-hint"
        onClick={() => onSelectView("benefits")}
      />

      <RoleNavigator
        canPrev={canPrev}
        canNext={canNext}
        locked={isLockedPreview}
        onPrev={onPreviewPrev}
        onNext={onPreviewNext}
      />

      <AnimatedContent
        as="div"
        key={`role-panel-${previewRole.level}`}
        className="bottom-panel bottom-panel--role"
        delay={80}
        duration={380}
      >
        <p
          className="role-wallet-line role-wallet-line--panel"
          data-reward-target="money"
        >
          零花钱<strong>¥ <CountUp value={previewRole.salary} /></strong>
        </p>

        {!isPreviewing && (
          <div
            className={`exp-block exp-block--role role-exp${isNearLevelUp ? " is-near-level-up" : ""}`}
            data-reward-target="exp"
          >
            <strong className="role-exp__value">
              <CountUp
                className="role-exp__current"
                value={previewRole.expCurrent}
              />{" "}
              <span className="role-exp__slash">/</span>{" "}
              <CountUp
                className="role-exp__total"
                value={previewRole.expRequired}
              />
            </strong>
            <ProgressBar
              current={previewRole.expCurrent}
              required={previewRole.expRequired}
            />
          </div>
        )}
        {isPreviewing && (
          <div className="exp-block-placeholder" aria-hidden="true" />
        )}

        <article className="bio-panel bio-panel--role">
          <p className="panel-title">
            <span /> 人物小传 <span />
          </p>
          <p>{previewRole.biography}</p>
        </article>

        <div className="role-dots" aria-hidden="true">
          {Array.from({ length: roleCount }).map((_, index) => (
            <span
              key={index}
              className={index === previewRole.level ? "active" : ""}
            />
          ))}
        </div>

        <OrnateSwipeHint
          className="role-task-ornate-swipe"
          direction="up"
          text="上滑查看任务"
          onClick={() => onSelectView("tasks")}
        />
      </AnimatedContent>
    </section>
  );
}
