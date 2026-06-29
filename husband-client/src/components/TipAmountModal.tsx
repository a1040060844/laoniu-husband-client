import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ClickSpark } from "./effects/ClickSpark";

interface TipAmountModalProps {
  open: boolean;
  onConfirm: (amount: number) => void;
  onDismiss: () => void;
}

export function TipAmountModal({
  open,
  onConfirm,
  onDismiss,
}: TipAmountModalProps) {
  const [amount, setAmount] = useState("");
  const parsedAmount = Math.max(0, Math.trunc(Number(amount)));
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    if (open) setAmount("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="decree-backdrop tip-amount-backdrop" role="presentation">
      <section
        className="decree-modal tip-amount-modal decree-modal--upgrade"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tip-amount-title"
      >
        <button
          className="tip-amount-modal__close"
          type="button"
          aria-label="暂不记录打赏"
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
        <header className="decree-modal__header">
          <p>打赏想</p>
          <span>支付宝回执</span>
        </header>
        <div className="decree-modal__rule" aria-hidden="true" />
        <h2 id="tip-amount-title">刚才打赏了多少钱？</h2>
        <p className="decree-modal__text">
          填写金额后，老哥端会收到打赏弹窗，并同步记入钱包流水。
        </p>
        <label className="tip-amount-modal__field">
          <span>打赏金额</span>
          <input
            autoFocus
            inputMode="numeric"
            min="1"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.currentTarget.value)}
            placeholder="例如 52"
          />
        </label>
        <ClickSpark>
          <button
            className="decree-modal__action"
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(parsedAmount)}
          >
            记录打赏
          </button>
        </ClickSpark>
      </section>
    </div>
  );
}
