import {
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
  type WheelEvent,
} from "react";

export const HUSBAND_PAGES = {
  BENEFIT: 0,
  ROLE: 1,
  TASK: 2,
} as const;

interface HusbandVerticalPagerProps {
  activePage?: number;
  onPageChange?: (page: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: [ReactNode, ReactNode, ReactNode];
}

const MIN_PAGE = HUSBAND_PAGES.BENEFIT;
const MAX_PAGE = HUSBAND_PAGES.TASK;
const SWIPE_THRESHOLD = 60;
const WHEEL_THRESHOLD = 42;

interface TouchPoint {
  x: number;
  y: number;
}

function clampPage(page: number) {
  return Math.max(MIN_PAGE, Math.min(MAX_PAGE, page));
}

export function HusbandVerticalPager({
  activePage,
  onPageChange,
  onSwipeLeft,
  onSwipeRight,
  children,
}: HusbandVerticalPagerProps) {
  const [internalPage, setInternalPage] = useState<number>(HUSBAND_PAGES.ROLE);
  const touchStart = useRef<TouchPoint | null>(null);
  const wheelLocked = useRef(false);
  const currentPage = activePage ?? internalPage;

  function setPage(page: number) {
    const next = clampPage(page);
    if (next === currentPage) return;
    if (onPageChange) {
      onPageChange(next);
      return;
    }
    setInternalPage(next);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX =
      (touch?.clientX ?? touchStart.current.x) - touchStart.current.x;
    const deltaY =
      (touch?.clientY ?? touchStart.current.y) - touchStart.current.y;
    touchStart.current = null;

    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > SWIPE_THRESHOLD
    ) {
      if (deltaX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      return;
    }

    if (deltaY > SWIPE_THRESHOLD) {
      setPage(currentPage - 1);
    } else if (deltaY < -SWIPE_THRESHOLD) {
      setPage(currentPage + 1);
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (wheelLocked.current || Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
    const scroller = (event.target as HTMLElement | null)?.closest(
      ".task-page",
    );
    if (scroller instanceof HTMLElement && currentPage === HUSBAND_PAGES.TASK) {
      const canScrollDown =
        scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 2;
      const canScrollUp = scroller.scrollTop > 2;
      if (
        (event.deltaY > 0 && canScrollDown) ||
        (event.deltaY < 0 && canScrollUp)
      )
        return;
    }

    wheelLocked.current = true;
    setPage(currentPage + (event.deltaY > 0 ? 1 : -1));
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 620);
  }

  return (
    <div
      className="husband-pager"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div
        className="husband-pager__track"
        style={{ transform: `translateY(-${currentPage * 100}dvh)` }}
      >
        {children.map((child, index) => (
          <section
            className={`husband-pager__screen${index === currentPage ? " husband-pager__screen--active" : ""}`}
            key={index}
          >
            {child}
          </section>
        ))}
      </div>
    </div>
  );
}
