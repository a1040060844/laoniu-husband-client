import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import {
  setupEdgeSwipeBackGuard,
  registerServiceWorker,
  setupManualZoomLock,
  setupViewportHeight,
} from "./pwa";

setupEdgeSwipeBackGuard();
setupManualZoomLock();
setupViewportHeight();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
