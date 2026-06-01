function updateAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

export function setupViewportHeight() {
  updateAppHeight();
  window.addEventListener("resize", updateAppHeight);
  window.visualViewport?.addEventListener("resize", updateAppHeight);
  window.visualViewport?.addEventListener("scroll", updateAppHeight);
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined);
  });
}
