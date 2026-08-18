import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
  type WheelEvent,
} from "react";
import { playSoundEffect } from "../lib/soundEffects";
import { canReturnFromTaskPage } from "../lib/pagerGesture";

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
  minPage?: number;
  maxPage?: number;
  initialPage?: number;
  children: ReactNode[];
}

const MIN_PAGE = HUSBAND_PAGES.BENEFIT;
const MAX_PAGE = HUSBAND_PAGES.TASK;
const SWIPE_THRESHOLD = 60;
const WHEEL_THRESHOLD = 42;

interface TouchPoint {
  x: number;
  y: number;
}

function clampPage(page: number, minPage: number, maxPage: number) {
  return Math.max(minPage, Math.min(maxPage, page));
}

export function HusbandVerticalPager({
  activePage,
  onPageChange,
  onSwipeLeft,
  onSwipeRight,
  minPage = MIN_PAGE,
  maxPage = MAX_PAGE,
  initialPage = HUSBAND_PAGES.ROLE,
  children,
}: HusbandVerticalPagerProps) {
  const [internalPage, setInternalPage] = useState<number>(initialPage);
  const touchStart = useRef<TouchPoint | null>(null);
  const taskScrollTopAtTouchStart = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  const currentPage = clampPage(activePage ?? internalPage, minPage, maxPage);
  const trackStyle = {
    "--pager-page-count": children.length,
    transform: `translateY(calc(-${currentPage} * var(--app-height)))`,
  } as CSSProperties;

  function setPage(page: number) {
    const next = clampPage(page, minPage, maxPage);
    if (next === currentPage) return;
    playSoundEffect("ui-swipe-up");
    if (onPageChange) {
      onPageChange(next);
      return;
    }
    setInternalPage(next);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    const taskScroller = (event.target as HTMLElement | null)?.closest(
      ".task-page",
    );
    taskScrollTopAtTouchStart.current =
      currentPage === HUSBAND_PAGES.TASK && taskScroller instanceof HTMLElement
        ? taskScroller.scrollTop
        : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX =
      (touch?.clientX ?? touchStart.current.x) - touchStart.current.x;
    const deltaY =
      (touch?.clientY ?? touchStart.current.y) - touchStart.current.y;
    touchStart.current = null;
    const taskScrollTop = taskScrollTopAtTouchStart.current;
    taskScrollTopAtTouchStart.current = null;

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

    if (
      deltaY > SWIPE_THRESHOLD &&
      currentPage === HUSBAND_PAGES.TASK &&
      !canReturnFromTaskPage(taskScrollTop)
    ) {
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
        style={trackStyle}
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
