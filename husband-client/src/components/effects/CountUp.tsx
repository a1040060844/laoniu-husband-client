import { useEffect, useRef, useState } from "react";
import "./CountUp.css";

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  minimumIntegerDigits?: number;
  className?: string;
}

export function CountUp({
  value,
  duration = 420,
  prefix = "",
  suffix = "",
  minimumIntegerDigits = 1,
  className,
}: CountUpProps) {
  const currentValue = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = currentValue.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (startValue === value || reducedMotion) {
      currentValue.current = value;
      setDisplayValue(value);
      return;
    }

    const startedAt = window.performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (value - startValue) * eased);
      currentValue.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  const formatted = Math.abs(displayValue)
    .toLocaleString("zh-CN", { minimumIntegerDigits })
    .replace(/,/g, "");
  const signedValue = displayValue < 0 ? `-${formatted}` : formatted;

  return (
    <span className={`count-up${className ? ` ${className}` : ""}`}>
      {prefix}
      {signedValue}
      {suffix}
    </span>
  );
}
