import { X } from "lucide-react";
import type { StoryEvent } from "../types/domain";

interface StoryModalProps {
  story: StoryEvent | null;
  onClose: () => void;
  onSkip?: () => void;
  confirmLabel?: string;
}

export function StoryModal({
  story,
  onClose,
  onSkip,
  confirmLabel = "领命",
}: StoryModalProps) {
  if (!story) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`story-modal story-modal--${story.tone ?? "normal"}`}
        role="dialog"
        aria-modal="true"
      >
        {onSkip ? (
          <button
            className="story-modal__close"
            type="button"
            aria-label="略过"
            onClick={onSkip}
          >
            <X size={20} />
          </button>
        ) : null}
        <p className="kicker">剧情事件</p>
        <h2>{story.title}</h2>
        <p>{story.text}</p>
        <button className="primary-button" type="button" onClick={onClose}>
          {confirmLabel}
        </button>
      </section>
    </div>
  );
}
