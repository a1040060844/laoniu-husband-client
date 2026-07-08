import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Crown,
  RefreshCw,
  Shield,
  Smartphone,
  UserRound,
} from "lucide-react";
import { adminApi } from "../services/adminApi";
import type { AdminAccount, AdminDashboardData } from "../types/admin";

const roleDescriptions: Record<AdminAccount["role"], string> = {
  admin: "后台配置、素材、模板和用户查看",
  wife: "老妞手机端业务操作",
  husband: "老哥手机端任务、权益和聊天",
};

function formatDateTime(value?: string) {
  if (!value) return "暂无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function roleLabel(role: AdminAccount["role"]) {
  if (role === "admin") return "管理员";
  if (role === "wife") return "老妞";
  return "老哥";
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextAccounts, nextDashboard] = await Promise.all([
        adminApi.getAccounts(),
        adminApi.getDashboard(),
      ]);
      setAccounts(nextAccounts);
      setDashboard(nextDashboard);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取用户信息失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const accountCounts = useMemo(
    () => ({
      active: accounts.filter((account) => account.status === "active").length,
      admin: accounts.filter((account) => account.role === "admin").length,
      wife: accounts.filter((account) => account.role === "wife").length,
      husband: accounts.filter((account) => account.role === "husband").length,
    }),
    [accounts],
  );

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Users</span>
          <h1>用户查看</h1>
          <p>当前后台只查看账号和手机端状态，不提供账号删除、密码修改或权限变更。</p>
        </div>
        <button className="admin-secondary-button" type="button" onClick={() => void load()}>
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

      <div className="admin-metric-grid">
        <article className="admin-metric-card admin-metric-card--burgundy">
          <Shield size={18} />
          <span>管理员账号</span>
          <strong>{accountCounts.admin}</strong>
        </article>
        <article className="admin-metric-card">
          <Crown size={18} />
          <span>老妞账号</span>
          <strong>{accountCounts.wife}</strong>
        </article>
        <article className="admin-metric-card">
          <Smartphone size={18} />
          <span>老哥账号</span>
          <strong>{accountCounts.husband}</strong>
        </article>
        <article className="admin-metric-card admin-metric-card--gold">
          <UserRound size={18} />
          <span>启用账号</span>
          <strong>{accountCounts.active}</strong>
        </article>
      </div>

      <section className="admin-two-column">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>账号列表</h2>
              <p>第一阶段来源为配置状态或默认三账号。</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>账号</th>
                  <th>昵称</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>最近登录</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.username}</strong>
                      <small>{account.id}</small>
                    </td>
                    <td>{account.nickname}</td>
                    <td>
                      <span className={`admin-tag admin-tag--${account.role === "admin" ? "override" : "default"}`}>
                        {roleLabel(account.role)}
                      </span>
                    </td>
                    <td>{account.status === "active" ? "启用" : "停用"}</td>
                    <td>{formatDateTime(account.lastLoginAt)}</td>
                  </tr>
                ))}
                {!accounts.length ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="admin-empty-state">
                        {loading ? "正在读取用户..." : "暂无用户"}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>当前老哥状态</h2>
              <p>只读展示，业务调整仍在手机端完成。</p>
            </div>
          </div>
          {dashboard ? (
            <div className="admin-ledger-list">
              <article className="admin-ledger-item">
                <div>
                  <strong>{dashboard.currentRole.title}</strong>
                  <span>Lv.{dashboard.progress.level} · {dashboard.progress.exp}/{dashboard.currentExpRequired} EXP</span>
                </div>
                <b>¥{dashboard.walletBalance}</b>
                <time>当前钱包</time>
              </article>
              <article className="admin-ledger-item">
                <div>
                  <strong>任务</strong>
                  <span>本月完成 {dashboard.completedTasksThisMonth} 个，待审核 {dashboard.pendingReviewTasks} 个</span>
                </div>
                <time>来自任务系统</time>
              </article>
              <article className="admin-ledger-item">
                <div>
                  <strong>权限说明</strong>
                  <span>
                    {accounts.map((account) => `${roleLabel(account.role)}：${roleDescriptions[account.role]}`).join(" / ")}
                  </span>
                </div>
              </article>
            </div>
          ) : (
            <div className="admin-empty-state">
              {loading ? "正在读取状态..." : "暂无状态数据"}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
