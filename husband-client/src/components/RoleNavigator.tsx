import { ChevronLeft, ChevronRight } from "lucide-react";

interface RoleNavigatorProps {
  canPrev: boolean;
  canNext: boolean;
  locked?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function RoleNavigator({
  canPrev,
  canNext,
  locked = false,
  onPrev,
  onNext,
}: RoleNavigatorProps) {
  return (
    <div
      className={`role-navigator${locked ? " role-navigator--locked" : ""}`}
      aria-label="切换职务"
    >
      <button
        className="role-navigator__button role-navigator__button--prev"
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="上一职务"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        className="role-navigator__button role-navigator__button--next"
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="下一职务"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
