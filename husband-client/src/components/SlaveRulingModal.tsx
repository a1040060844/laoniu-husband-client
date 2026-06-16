import { ClickSpark } from "./effects/ClickSpark";

interface SlaveRulingModalProps {
  open: boolean;
  onRestore: () => void;
  onContinueLabor: () => void;
}

export function SlaveRulingModal({
  open,
  onRestore,
  onContinueLabor,
}: SlaveRulingModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop slave-ruling-backdrop" role="presentation">
      <section
        className="story-modal slave-ruling-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slave-ruling-title"
      >
        <p className="kicker">老妞大人裁定</p>
        <h2 id="slave-ruling-title">奴隶周期已满</h2>
        <p>服役期限或恢复经验已经达标，请决定骆老哥接下来的命运。</p>
        <div className="slave-ruling-actions">
          <button type="button" onClick={onContinueLabor}>
            继续劳作
          </button>
          <ClickSpark>
            <button className="primary-button" type="button" onClick={onRestore}>
              官复原职
            </button>
          </ClickSpark>
        </div>
      </section>
    </div>
  );
}
