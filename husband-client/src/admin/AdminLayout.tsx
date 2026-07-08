import type { ReactNode } from "react";
import {
  ClipboardList,
  Database,
  Gift,
  Image,
  LayoutDashboard,
  LogOut,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useAdminSystemStatus } from "./hooks/useAdminSystemStatus";
import type { AdminRouteConfig, AdminRouteId } from "./types/admin";

const navigationItems: Array<
  AdminRouteConfig & { Icon: typeof LayoutDashboard }
> = [
  { id: "dashboard", label: "首页总览", path: "/admin/dashboard", Icon: LayoutDashboard },
  { id: "roles", label: "人物与等级", path: "/admin/roles", Icon: Users },
  { id: "benefits", label: "权益内容", path: "/admin/benefits", Icon: Gift },
  { id: "tasks", label: "任务模板", path: "/admin/tasks", Icon: ClipboardList },
  { id: "assets", label: "素材中心", path: "/admin/assets", Icon: Image },
  { id: "accounts", label: "用户查看", path: "/admin/accounts", Icon: Shield },
];

interface AdminLayoutProps {
  children: ReactNode;
  currentRoute: AdminRouteId;
  onNavigate: (route: AdminRouteId) => void;
  preview: ReactNode;
}

function formatTime(value?: string) {
  if (!value) return "尚未保存";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status?: string) {
  if (!status) return "检测中";
  if (status === "online" || status === "synced") return "正常";
  if (status === "degraded" || status === "pending") return "待同步";
  return "离线";
}

export function AdminLayout({
  children,
  currentRoute,
  onNavigate,
  preview,
}: AdminLayoutProps) {
  const { loading, status } = useAdminSystemStatus();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__mark" aria-hidden="true">
            LN
          </div>
          <div>
            <strong>老妞大人控制台</strong>
            <span>LAONIU CONTROL CENTER</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="后台导航">
          {navigationItems.map(({ id, label, path, Icon }) => (
            <a
              className={`admin-nav__item${currentRoute === id ? " admin-nav__item--active" : ""}`}
              href={path}
              key={id}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(id);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-status-card">
            <div className="admin-status-row">
              <Server size={15} />
              <span>服务器状态</span>
              <strong>{loading ? "检测中" : statusLabel(status?.apiStatus)}</strong>
            </div>
            <div className="admin-status-row">
              <Database size={15} />
              <span>数据同步</span>
              <strong>{loading ? "检测中" : statusLabel(status?.dataSyncStatus)}</strong>
            </div>
            <div className="admin-status-row">
              <Sparkles size={15} />
              <span>最后保存</span>
              <strong>{formatTime(status?.lastSavedAt)}</strong>
            </div>
            <div className="admin-status-row">
              <Smartphone size={15} />
              <span>手机端地址</span>
              <strong>{status?.mobileUrl ?? window.location.origin}</strong>
            </div>
          </div>

          <a className="admin-logout" href="/" title="退出后台">
            <LogOut size={17} />
            <span>退出后台</span>
          </a>
        </div>
      </aside>

      <main className="admin-workspace">{children}</main>
      {preview}
    </div>
  );
}
