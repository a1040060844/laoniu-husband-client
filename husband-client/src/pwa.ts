function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function updateAppViewport() {
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

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
