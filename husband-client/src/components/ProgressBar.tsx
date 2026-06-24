interface ProgressBarProps {
  current: number;
  required: number;
  compact?: boolean;
}

export function ProgressBar({
  current,
  required,
  compact = false,
}: ProgressBarProps) {
  const value =
    required <= 0 ? 0 : Math.min(100, Math.round((current / required) * 100));
  const stateClass = [
    value >= 80 ? "progress--near-level-up" : "",
    value === 0 ? "progress--empty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`${compact ? "progress progress--compact" : "progress"}${stateClass ? ` ${stateClass}` : ""}`}
      aria-label={`经验进度 ${value}%`}
    >
      <div className="progress__rail">
        <div className="progress__fill" style={{ width: `${value}%` }}>
          <span className="progress__fill-surface" aria-hidden="true">
            <span className="progress__shine" />
          </span>
          <span className="progress__spark" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
