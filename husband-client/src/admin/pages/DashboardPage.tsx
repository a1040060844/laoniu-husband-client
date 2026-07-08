import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  Coins,
  Crown,
  Gift,
  Image as ImageIcon,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type {
  AdminActivityItem,
  AdminDashboardData,
  AdminRouteId,
} from "../types/admin";

interface DashboardPageProps {
  onNavigate: (route: AdminRouteId) => void;
}

const quickActions: Array<{
  label: string;
  route: AdminRouteId;
  Icon: typeof ClipboardPlus;
}> = [
  { label: "修改职务名称", route: "roles", Icon: Crown },
  { label: "替换职务插画", route: "roles", Icon: ImageIcon },
  { label: "编辑权益内容", route: "benefits", Icon: Gift },
  { label: "维护任务模板", route: "tasks", Icon: ClipboardPlus },
  { label: "管理素材引用", route: "assets", Icon: ImageIcon },
  { label: "查看用户状态", route: "accounts", Icon: Users },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function activityMeta(activity: AdminActivityItem) {
  if (activity.type.includes("wallet") || activity.unit === "CNY") {
    return { label: "钱包", className: "admin-activity__type--wallet" };
  }
  if (activity.type.includes("task")) {
    return { label: "任务", className: "admin-activity__type--task" };
  }
  if (activity.type.includes("benefit")) {
    return { label: "权益", className: "admin-activity__type--benefit" };
  }
  if (activity.type.includes("level") || activity.unit === "EXP") {
    return { label: "等级", className: "admin-activity__type--level" };
  }
  return { label: "通知", className: "admin-activity__type--notice" };
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.getDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取后台数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const expPercent = useMemo(() => {
    if (!data || data.currentExpRequired <= 0) return 0;
    return Math.min(
      100,
      Math.round((data.progress.exp / data.currentExpRequired) * 100),
    );
  }, [data]);

  if (loading && !data) {
    return (
      <section className="admin-page">
        <div className="admin-page__loading">
          <RefreshCw size={22} />
          <span>正在读取控制台状态...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Dashboard</span>
          <h1>首页总览</h1>
          <p>从现有任务系统、钱包流水、通知和旨意中汇总当前状态。</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={load}>
          <RefreshCw size={17} />
          刷新
        </button>
      </header>

      {error ? (
        <div className="admin-alert admin-alert--danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="admin-dashboard-hero">
            <div className="admin-current-role">
              <div className="admin-current-role__image">
                <img src={data.currentRole.roleImage} alt={data.currentRole.title} />
              </div>
              <div className="admin-current-role__content">
                <span className="admin-eyebrow">当前老哥状态</span>
                <h2>{data.currentRole.title}</h2>
                <div className="admin-level-line">
                  <strong>Lv.{String(data.progress.level).padStart(2, "0")}</strong>
                  <span>
                    {data.progress.exp}/{data.currentExpRequired} EXP
                  </span>
                </div>
                <div className="admin-exp-track" aria-label={`经验进度 ${expPercent}%`}>
                  <span style={{ width: `${expPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="admin-status-summary">
              <div>
                <Coins size={18} />
                <span>当前钱包</span>
                <strong>¥{data.walletBalance}</strong>
              </div>
              <div>
                <ShieldAlert size={18} />
                <span>惩罚状态</span>
                <strong>
                  {data.state.punishment.status === "slave" ? "卖身奴隶" : "正常"}
                </strong>
              </div>
              <div>
                <CheckCircle2 size={18} />
                <span>本月完成任务</span>
                <strong>{data.completedTasksThisMonth}</strong>
              </div>
              <div>
                <Gift size={18} />
                <span>待处理权益</span>
                <strong>{data.pendingBenefits}</strong>
              </div>
            </div>
          </div>

          <div className="admin-metric-grid">
            {data.metrics.map((metric) => (
              <article
                className={`admin-metric-card admin-metric-card--${metric.tone ?? "default"}`}
                key={metric.label}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>

          <section className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <h2>快捷操作</h2>
                <p>这里只进入移动端展示配置和用户查看，不提供后台发奖或惩罚操作。</p>
              </div>
            </div>
            <div className="admin-action-grid">
              {quickActions.map(({ label, route, Icon }) => (
                <button
                  className="admin-action-button"
                  key={label}
                  type="button"
                  onClick={() => onNavigate(route)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-two-column">
            <div className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <h2>待处理事项</h2>
                  <p>真正会影响手机端体验的待办项。</p>
                </div>
              </div>
              <div className="admin-todo-list">
                {data.todos.map((todo) => (
                  <button
                    className="admin-todo-item"
                    key={todo.id}
                    type="button"
                    onClick={() => onNavigate(todo.route)}
                  >
                    <Clock size={18} />
                    <span>
                      <strong>{todo.title}</strong>
                      <small>{todo.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <h2>最近动态</h2>
                  <p>组合 logs、walletLedger、decrees、notifications。</p>
                </div>
              </div>
              <div className="admin-activity-list">
                {data.recentActivity.length ? (
                  data.recentActivity.map((activity) => {
                    const meta = activityMeta(activity);
                    return (
                      <article className="admin-activity" key={activity.id}>
                        <time>{formatDateTime(activity.at)}</time>
                        <span className={`admin-activity__type ${meta.className}`}>
                          {meta.label}
                        </span>
                        <div>
                          <strong>{activity.title}</strong>
                          {activity.description ? <p>{activity.description}</p> : null}
                        </div>
                        {activity.amount !== undefined ? (
                          <b>
                            {activity.amount > 0 ? "+" : ""}
                            {activity.amount} {activity.unit ?? ""}
                          </b>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <div className="admin-empty-state">暂无动态记录</div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
