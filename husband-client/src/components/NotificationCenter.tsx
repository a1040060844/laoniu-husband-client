import { Bell, Music2, VolumeX, X } from "lucide-react";
import type { ChatSender } from "../types/domain";
import type { NotificationQueueItem } from "../lib/notifications";
import { ClickSpark } from "./effects/ClickSpark";

interface NotificationButtonProps {
  className?: string;
  viewer: ChatSender;
  hasUnread: boolean;
  compact?: boolean;
  onClick: () => void;
}

interface MusicToggleButtonProps {
  className?: string;
  enabled: boolean;
  onToggle: () => void;
}

interface NotificationReplayModalProps {
  item: NotificationQueueItem | null;
  saving?: boolean;
  error?: string;
  onAcknowledge: () => void;
  onSkip: () => void;
}

const notificationActionLabel: Record<ChatSender, string> = {
  husband: "查看通知",
  wife: "查看通知",
};

export function NotificationButton({
  className,
  viewer,
  hasUnread,
  compact = false,
  onClick,
}: NotificationButtonProps) {
  const classes = [
    "notification-button",
    "memorial-icon-button",
    compact ? "notification-button--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const button = (
    <button
      className={classes}
      type="button"
      aria-label={notificationActionLabel[viewer]}
      onClick={onClick}
    >
      <span>通知</span>
      <Bell className="notification-button__icon" aria-hidden="true" size={38} />
      {hasUnread ? <b aria-label="有未查看通知" /> : null}
    </button>
  );

  return viewer === "husband" ? button : <ClickSpark>{button}</ClickSpark>;
}

export function MusicToggleButton({
  className,
  enabled,
  onToggle,
}: MusicToggleButtonProps) {
  const classes = [
    "notification-button",
    "notification-button--compact",
    "music-toggle-button",
    enabled ? "is-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ClickSpark>
      <button
        className={classes}
        type="button"
        aria-label={enabled ? "Background music on" : "Background music off"}
        aria-pressed={enabled}
        onClick={onToggle}
      >
        <span>{enabled ? "\u97f3\u4e50" : "\u9759\u97f3"}</span>
        {enabled ? (
          <Music2 className="notification-button__icon" aria-hidden="true" size={27} />
        ) : (
          <VolumeX className="notification-button__icon" aria-hidden="true" size={27} />
        )}
      </button>
    </ClickSpark>
  );
}

export function NotificationReplayModal({
  item,
  saving = false,
  error,
  onAcknowledge,
  onSkip,
}: NotificationReplayModalProps) {
  if (!item) return null;

  return (
    <div className="decree-backdrop notification-replay-backdrop" role="presentation">
      <section
        className={`decree-modal notification-replay-modal decree-modal--${item.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-replay-title"
      >
        <button
          className="notification-replay-modal__close"
          type="button"
          aria-label="略过通知"
          onClick={onSkip}
        >
          <X size={20} />
        </button>
        <header className="decree-modal__header">
          <p>通知</p>
          <span>{item.target === "husband" ? "老哥端" : "老妞端"}</span>
        </header>
        <div className="decree-modal__rule" aria-hidden="true" />
        <h2 id="notification-replay-title">{item.title}</h2>
        <p className="decree-modal__text">{item.text}</p>
        {item.remainingCount > 0 ? (
          <p className="decree-modal__remaining">
            还有 {item.remainingCount} 条通知待查看
          </p>
        ) : null}
        {error ? <p className="decree-modal__error">{error}</p> : null}
        <ClickSpark>
          <button
            className="decree-modal__action"
            type="button"
            disabled={saving}
            onClick={onAcknowledge}
          >
            {saving ? "正在保存..." : "知道了"}
          </button>
        </ClickSpark>
      </section>
    </div>
  );
}
