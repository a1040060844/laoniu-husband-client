const SCROLL_TOP_TOLERANCE = 2;

export function canReturnFromTaskPage(scrollTopAtTouchStart: number | null) {
  return (
    scrollTopAtTouchStart !== null &&
    scrollTopAtTouchStart <= SCROLL_TOP_TOLERANCE
  );
}
