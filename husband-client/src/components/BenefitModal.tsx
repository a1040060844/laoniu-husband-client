import type { Benefit, BenefitStatus } from "../types/domain";

interface BenefitModalProps {
  benefit: Benefit | null;
  computedStatus: BenefitStatus;
  statusText: string;
  onClose: () => void;
  onUse: (benefit: Benefit) => void;
}

export function BenefitModal({ benefit, computedStatus, statusText, onClose, onUse }: BenefitModalProps) {
  if (!benefit) return null;

  const buttonText =
    computedStatus === "available" ? "申请使用" : computedStatus === "cooldown" ? "冷却中" : "未解锁";

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="sheet-modal" role="dialog" aria-modal="true">
        <button className="icon-close" type="button" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <p className="kicker">权益详情</p>
        <h2>{benefit.name}</h2>
        <p className="sheet-modal__body">{benefit.description}</p>
        <div className="modal-grid">
          <span>频次</span>
          <strong>{benefit.frequency}</strong>
          <span>当前状态</span>
          <strong>{statusText}</strong>
        </div>
        <button
          className="primary-button"
          type="button"
          disabled={computedStatus !== "available"}
          onClick={() => onUse(benefit)}
        >
          {buttonText}
        </button>
        <small className="modal-note">老婆拥有最终解释权。</small>
      </section>
    </div>
  );
}
