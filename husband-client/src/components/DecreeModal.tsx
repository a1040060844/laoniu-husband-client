import { X } from "lucide-react";
import type { DecreeEvent } from "../types/domain";
import { ClickSpark } from "./effects/ClickSpark";
import "./DecreeModal.css";

interface DecreeModalProps {
  decree: DecreeEvent | null;
  remainingCount: number;
  saving: boolean;
  error?: string;
  onAcknowledge: () => void;
  onSkip?: () => void;
}

function decreeButtonLabel(decree: DecreeEvent) {
  if (decree.type === "punishment_slave") return "领旨卖身";
  if (decree.type === "experience_granted") return "领旨谢恩";
  if (decree.type === "experience_penalty") return "领旨反省";
  if (decree.type === "level_changed") {
    const fromLevel = Number(decree.payload.fromLevel);
    const toLevel = Number(decree.payload.toLevel);
    return toLevel >= fromLevel ? "领旨上任" : "领旨认罚";
  }
  return "领旨";
}

export function DecreeModal({
  decree,
  remainingCount,
  saving,
  error,
  onAcknowledge,
  onSkip,
}: DecreeModalProps) {
  if (!decree) return null;

  return (
    <div className="decree-backdrop" role="presentation">
      <section
        className={`decree-modal decree-modal--${decree.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decree-modal-title"
      >
        {onSkip ? (
          <button
            className="decree-modal__close"
            type="button"
            aria-label="略过"
            onClick={onSkip}
          >
            <X size={20} />
          </button>
        ) : null}
        <header className="decree-modal__header">
          <p>圣旨到</p>
          <span>老妞大人裁定</span>
        </header>
        <div className="decree-modal__rule" aria-hidden="true" />
        <h2 id="decree-modal-title">{decree.title}</h2>
        <p className="decree-modal__text">{decree.text}</p>
        {remainingCount > 0 ? (
          <p className="decree-modal__remaining">还有 {remainingCount} 道旨意待领</p>
        ) : null}
        {error ? <p className="decree-modal__error">{error}</p> : null}
        <ClickSpark>
          <button
            className="decree-modal__action"
            type="button"
            disabled={saving}
            onClick={onAcknowledge}
          >
            {saving ? "正在领旨…" : decreeButtonLabel(decree)}
          </button>
        </ClickSpark>
      </section>
    </div>
  );
}
