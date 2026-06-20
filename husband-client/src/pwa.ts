function updateAppViewport() {
  const visualViewport = window.visualViewport;
  const width =
    visualViewport?.width ??
    window.innerWidth ??
    document.documentElement.clientWidth;
  const height =
    visualViewport?.height ??
    window.innerHeight ??
    document.documentElement.clientHeight;

  document.documentElement.style.setProperty("--app-width", `${width}px`);
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

export function setupViewportHeight() {
  updateAppViewport();
  window.addEventListener("resize", updateAppViewport);
  window.addEventListener("orientationchange", updateAppViewport);
  window.visualViewport?.addEventListener("resize", updateAppViewport);
  window.visualViewport?.addEventListener("scroll", updateAppViewport);
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
