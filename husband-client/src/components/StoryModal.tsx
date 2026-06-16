import type { StoryEvent } from "../types/domain";

interface StoryModalProps {
  story: StoryEvent | null;
  onClose: () => void;
  confirmLabel?: string;
}

export function StoryModal({
  story,
  onClose,
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
