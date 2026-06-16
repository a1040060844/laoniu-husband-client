import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./PixelTransition.css";

interface PixelTransitionProps {
  transitionKey: number;
  onCovered: () => void;
  onComplete?: () => void;
}

const PIXEL_COUNT = 180;
const COVER_MS = 300;
const HOLD_MS = 45;
const REVEAL_MS = 300;
let lastHandledTransitionKey = 0;

export function PixelTransition({
  transitionKey,
  onCovered,
  onComplete,
}: PixelTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  const coveredRef = useRef(onCovered);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    coveredRef.current = onCovered;
    completeRef.current = onComplete;
  }, [onComplete, onCovered]);

  useEffect(() => {
    if (transitionKey <= lastHandledTransitionKey) return;
    lastHandledTransitionKey = transitionKey;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      coveredRef.current();
      completeRef.current?.();
      return;
    }

    setPhase("cover");
    const coverTimer = window.setTimeout(() => {
      coveredRef.current();
      const revealTimer = window.setTimeout(() => {
        setPhase("reveal");
      }, HOLD_MS);
      timers.push(revealTimer);
    }, COVER_MS);
    const completeTimer = window.setTimeout(() => {
      setPhase("idle");
      completeRef.current?.();
    }, COVER_MS + HOLD_MS + REVEAL_MS);
    const timers = [coverTimer, completeTimer];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [transitionKey]);

  if (phase === "idle") return null;

  return (
    <div
      className={`pixel-transition pixel-transition--${phase}`}
      aria-hidden="true"
    >
      {Array.from({ length: PIXEL_COUNT }, (_, index) => {
        const row = Math.floor(index / 10);
        const column = index % 10;
        const distance = row + column;
        return (
          <i
            key={index}
            style={
              {
                "--pixel-color": ["#030303", "#1f1610", "#d7b56d"][
                  (row * 3 + column * 5) % 3
                ],
                "--pixel-delay": `${Math.min(distance * 4, 80)}ms`,
                "--pixel-reveal-delay": `${Math.min((26 - distance) * 3, 80)}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
