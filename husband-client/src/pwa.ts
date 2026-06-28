function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

const PHONE_PRO_MAX_PREVIEW_WIDTH = 430;
const PHONE_PRO_MAX_PREVIEW_HEIGHT = 932;

function isDesktopBrowserPreview() {
  if (isStandalonePwa()) return false;

  return (
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true &&
    window.innerWidth >= PHONE_PRO_MAX_PREVIEW_WIDTH
  );
}

function updateAppViewport() {
  if (isDesktopBrowserPreview()) {
    document.documentElement.dataset.previewDevice = "phone-pro-max";
    document.documentElement.style.setProperty(
      "--app-width",
      `${PHONE_PRO_MAX_PREVIEW_WIDTH}px`,
    );
    document.documentElement.style.setProperty(
      "--app-height",
      `${PHONE_PRO_MAX_PREVIEW_HEIGHT}px`,
    );
    return;
  }

  delete document.documentElement.dataset.previewDevice;

  const visualViewport = window.visualViewport;
  const width = Math.round(
    visualViewport?.width ??
      window.innerWidth ??
      document.documentElement.clientWidth,
  );
  const viewportHeight = visualViewport?.height ?? 0;
  const innerHeight = window.innerHeight ?? 0;
  const clientHeight = document.documentElement.clientHeight ?? 0;
  const height = Math.round(
    isStandalonePwa()
      ? Math.max(innerHeight, clientHeight, viewportHeight)
      : viewportHeight || innerHeight || clientHeight,
  );

  document.documentElement.style.setProperty("--app-width", `${width}px`);
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

export function setupViewportHeight() {
  updateAppViewport();
  window.addEventListener("resize", updateAppViewport);
  window.addEventListener("orientationchange", updateAppViewport);
  window.visualViewport?.addEventListener("resize", updateAppViewport);
}

export function setupManualZoomLock() {
  const preventDefault = (event: Event) => {
    event.preventDefault();
  };
  const preventMultiTouchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  };
  const preventShortcutZoom = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };
  const activeListener: AddEventListenerOptions = { passive: false };

  document.addEventListener("touchmove", preventMultiTouchZoom, activeListener);
  document.addEventListener("gesturestart", preventDefault, activeListener);
  document.addEventListener("gesturechange", preventDefault, activeListener);
  document.addEventListener("gestureend", preventDefault, activeListener);
  window.addEventListener("wheel", preventShortcutZoom, activeListener);
}

export function setupEdgeSwipeBackGuard() {
  const edgeWidth = 32;
  const minSwipeX = 8;
  let edgeTouchStart: { x: number; y: number } | null = null;
  let isGuardingEdgeSwipe = false;
  const activeCaptureListener: AddEventListenerOptions = {
    capture: true,
    passive: false,
  };

  const resetEdgeSwipe = () => {
    edgeTouchStart = null;
    isGuardingEdgeSwipe = false;
  };

  const preventEdgeSwipe = (event: TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        resetEdgeSwipe();
        return;
      }

      const touch = event.touches[0];
      edgeTouchStart =
        touch && touch.clientX <= edgeWidth
          ? { x: touch.clientX, y: touch.clientY }
          : null;
      isGuardingEdgeSwipe = false;
    },
    activeCaptureListener,
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (!edgeTouchStart) return;

      const touch = event.touches[0];
      if (!touch) {
        resetEdgeSwipe();
        return;
      }

      const deltaX = touch.clientX - edgeTouchStart.x;
      const deltaY = Math.abs(touch.clientY - edgeTouchStart.y);
      if (isGuardingEdgeSwipe || (deltaX > minSwipeX && deltaX > deltaY)) {
        isGuardingEdgeSwipe = true;
        preventEdgeSwipe(event);
      }
    },
    activeCaptureListener,
  );

  document.addEventListener("touchend", resetEdgeSwipe, activeCaptureListener);
  document.addEventListener("touchcancel", resetEdgeSwipe, activeCaptureListener);
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let isRefreshing = false;

    if (hadController) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (isRefreshing) return;
        isRefreshing = true;
        window.location.reload();
      });
    }

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch(() => undefined);
  });
}
