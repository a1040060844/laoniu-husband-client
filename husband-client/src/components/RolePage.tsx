import { ProgressBar } from "./ProgressBar";
import { RoleNavigator } from "./RoleNavigator";
import { publicAsset } from "../lib/assets";
import type { Role, ViewKey } from "../types/domain";
import { ChatMessageButton } from "./ChatMessagePanel";
import { MusicToggleButton, NotificationButton } from "./NotificationCenter";
import { OrnateSwipeHint } from "./OrnateSwipeHint";
import { VerticalMagicSwipeHint } from "./VerticalMagicSwipeHint";
import { AnimatedContent } from "./effects/AnimatedContent";
import { ClickSpark } from "./effects/ClickSpark";
import { CountUp } from "./effects/CountUp";
import { useState } from "react";

interface RolePageProps {
  role: Role;
  previewRole: Role;
  previewDirection: "none" | "next" | "prev";
  canPrev: boolean;
  canNext: boolean;
  roleCount: number;
  wallet: number;
  nextAllowanceAmount: number;
  nextAllowanceMonth: string;
  chatUnreadCount: number;
  hasNotificationUnread: boolean;
  onPreviewPrev: () => void;
  onPreviewNext: () => void;
  onOpenAllowanceDetail: () => void;
  onReturnToLogin: () => void;
  onSelectView: (view: ViewKey) => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
}

export function RolePage({
  role,
  previewRole,
  previewDirection,
  canPrev,
  canNext,
  roleCount = 12,
  nextAllowanceAmount,
  nextAllowanceMonth,
  chatUnreadCount,
  hasNotificationUnread,
  onPreviewPrev,
  onPreviewNext,
  onOpenAllowanceDetail,
  onReturnToLogin,
  onSelectView,
  onOpenChat,
  onOpenNotifications,
}: RolePageProps) {
  const isPreviewing = previewRole.level !== role.level;
  const isLockedPreview = previewRole.level > role.level;
  const isNearLevelUp =
    previewRole.expRequired > 0 &&
    previewRole.expCurrent / previewRole.expRequired >= 0.8;
  const directionClass = `role-page--dir-${previewDirection}`;
  const [isBackgroundMusicEnabled, setIsBackgroundMusicEnabled] = useState(false);

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
          <div className="role-login-controls" aria-label="husband quick controls">
            <NotificationButton
              className="role-login-notification-entry"
              viewer="husband"
              hasUnread={hasNotificationUnread}
              compact
              onClick={onOpenNotifications}
            />
            <MusicToggleButton
              className="role-login-music-entry"
              enabled={isBackgroundMusicEnabled}
              onToggle={() =>
                setIsBackgroundMusicEnabled((current) => !current)
              }
            />
          </div>
          <h1>{previewRole.title}</h1>
        </div>
        <i />
      </AnimatedContent>

      <button
        className="role-wallet-line role-wallet-line--corner"
        data-reward-target="money"
        type="button"
        onClick={onOpenAllowanceDetail}
      >
        {"\u4E0B\u6708\u96F6\u82B1\u94B1"}
        <strong>{"\u00A5"} <CountUp value={nextAllowanceAmount} /></strong>
        <em>{nextAllowanceMonth}</em>
      </button>

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
        <button
          className="role-wallet-line role-wallet-line--panel"
          data-reward-target="money"
          type="button"
          onClick={onOpenAllowanceDetail}
        >
          {"\u4E0B\u6708\u96F6\u82B1\u94B1"}
          <strong>{"\u00A5"} <CountUp value={nextAllowanceAmount} /></strong>
          <em>{nextAllowanceMonth}</em>
        </button>

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
