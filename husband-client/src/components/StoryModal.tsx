import type { StoryEvent } from "../types/domain";

interface StoryModalProps {
  story: StoryEvent | null;
  onClose: () => void;
}

export function StoryModal({ story, onClose }: StoryModalProps) {
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
          领命
        </button>
      </section>
    </div>
  );
}
