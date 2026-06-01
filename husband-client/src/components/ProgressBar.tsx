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

  return (
    <div className={compact ? "progress progress--compact" : "progress"}>
      <div className="progress__rail">
        <div className="progress__fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
