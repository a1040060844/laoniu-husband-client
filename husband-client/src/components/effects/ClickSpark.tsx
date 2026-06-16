import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./ClickSpark.css";

interface ClickSparkProps {
  children: ReactNode;
}

interface SparkBurst {
  id: number;
  x: number;
  y: number;
}

export function ClickSpark({ children }: ClickSparkProps) {
  const [bursts, setBursts] = useState<SparkBurst[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  function handlePointerDown(event: PointerEvent<HTMLSpanElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (button?.disabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = nextId.current++;
    setBursts((current) => [...current, { id, x: event.clientX, y: event.clientY }]);
    timers.current.push(
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
      }, 340),
    );
  }

  return (
    <>
      <span className="click-spark-trigger" onPointerDown={handlePointerDown}>
        {children}
      </span>
      {bursts.length
        ? createPortal(
            <div className="click-spark-layer" aria-hidden="true">
              {bursts.flatMap((burst) =>
                Array.from({ length: 6 }, (_, index) => (
                  <i
                    key={`${burst.id}-${index}`}
                    style={
                      {
                        left: burst.x,
                        top: burst.y,
                        "--spark-angle": `${index * 60}deg`,
                        "--spark-color": index % 2 ? "#f0d9a4" : "#d7b56d",
                      } as CSSProperties
                    }
                  />
                )),
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
