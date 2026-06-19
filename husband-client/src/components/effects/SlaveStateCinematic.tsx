import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./SlaveStateCinematic.css";

export interface SlaveStateCinematicEvent {
  id: string;
  mode: "enter" | "restore";
  amount?: number;
}

interface SlaveStateCinematicProps {
  event?: SlaveStateCinematicEvent | null;
  ambient?: boolean;
  onComplete?: () => void;
}

export function SlaveStateCinematic({
  event,
  ambient = false,
  onComplete,
}: SlaveStateCinematicProps) {
  useEffect(() => {
    if (!event || !onComplete) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(onComplete, reducedMotion ? 1050 : 1850);
    return () => window.clearTimeout(timer);
  }, [event, onComplete]);

  const overlay = event
    ? createPortal(
        <section
          className={`slave-state-cinematic slave-state-cinematic--${event.mode}`}
          aria-live="assertive"
        >
          <div className="slave-state-cinematic__vignette" aria-hidden="true" />
          <div className="slave-state-cinematic__panel">
            <p>{event.mode === "enter" ? "惩罚状态启动" : "惩罚解除"}</p>
            <h2>{event.mode === "enter" ? "卖身奴隶" : "身份恢复"}</h2>
            <div>
              {event.mode === "enter" ? (
                <>
                  <span>权益暂停</span>
                  <span className="slave-state-cinematic__wallet">
                    零花钱冻结{event.amount ? `：-${event.amount}` : ""}
                  </span>
                  <span>等待老妞大人裁定</span>
                </>
              ) : (
                <>
                  <span>暗场退去</span>
                  <span className="slave-state-cinematic__wallet">
                    零花钱恢复{event.amount ? `：+${event.amount}` : ""}
                  </span>
                  <span>身份恢复正常</span>
                </>
              )}
            </div>
          </div>
        </section>,
        document.body,
      )
    : null;

  return (
    <>
      {ambient ? <div className="slave-state-ambient" aria-hidden="true" /> : null}
      {overlay}
    </>
  );
}
