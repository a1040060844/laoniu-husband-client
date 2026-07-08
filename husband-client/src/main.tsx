import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  setupEdgeSwipeBackGuard,
  registerServiceWorker,
  setupManualZoomLock,
  setupViewportHeight,
} from "./pwa";

const isAdminRoute = window.location.pathname.startsWith("/admin");
const root = createRoot(document.getElementById("root")!);

if (!isAdminRoute) {
  setupEdgeSwipeBackGuard();
  setupManualZoomLock();
  setupViewportHeight();
  registerServiceWorker();
}

async function bootstrap() {
  const { default: RootApp } = isAdminRoute
    ? await import("./admin/AdminApp")
    : await import("./App");

  root.render(
    <StrictMode>
      <RootApp />
    </StrictMode>,
  );
}

void bootstrap();
