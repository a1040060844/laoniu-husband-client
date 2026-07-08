import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { AdminPhonePreview } from "./components/AdminPhonePreview";
import { AccountsPage } from "./pages/AccountsPage";
import { AssetsPage } from "./pages/AssetsPage";
import { BenefitsPage } from "./pages/BenefitsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RolesPage } from "./pages/RolesPage";
import { TasksPage } from "./pages/TasksPage";
import { WalletPage } from "./pages/WalletPage";
import type { AdminRouteId } from "./types/admin";
import "./adminStyles.css";

const routeIds: AdminRouteId[] = [
  "dashboard",
  "roles",
  "benefits",
  "tasks",
  "wallet",
  "assets",
  "accounts",
  "system",
];

function routeFromPath(pathname: string): AdminRouteId {
  const segment = pathname.split("/").filter(Boolean)[1];
  return routeIds.includes(segment as AdminRouteId)
    ? (segment as AdminRouteId)
    : "dashboard";
}

function pathForRoute(route: AdminRouteId) {
  return `/admin/${route}`;
}

export default function AdminApp() {
  const [route, setRoute] = useState<AdminRouteId>(() =>
    routeFromPath(window.location.pathname),
  );

  useEffect(() => {
    if (window.location.pathname === "/admin" || window.location.pathname === "/admin/") {
      window.history.replaceState(null, "", pathForRoute("dashboard"));
    }

    const handlePopState = () => {
      setRoute(routeFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextRoute: AdminRouteId) {
    setRoute(nextRoute);
    const nextPath = pathForRoute(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }

  const content = (() => {
    switch (route) {
      case "dashboard":
        return <DashboardPage onNavigate={navigate} />;
      case "roles":
        return <RolesPage />;
      case "benefits":
        return <BenefitsPage />;
      case "tasks":
        return <TasksPage />;
      case "wallet":
        return <WalletPage />;
      case "assets":
        return <AssetsPage />;
      case "accounts":
        return <AccountsPage />;
      default:
        return <PlaceholderPage route={route} />;
    }
  })();

  return (
    <AdminLayout
      currentRoute={route}
      onNavigate={navigate}
      preview={<AdminPhonePreview />}
    >
      {content}
    </AdminLayout>
  );
}
