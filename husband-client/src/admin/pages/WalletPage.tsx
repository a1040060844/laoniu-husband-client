import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Coins,
  Gift,
  RefreshCw,
  Star,
  TrendingUp,
} from "lucide-react";
import { adminApi } from "../services/adminApi";

type WalletData = Awaited<ReturnType<typeof adminApi.getWallet>>;

const ledgerFilters = [
  { value: "all", label: "全部" },
  { value: "allowance", label: "月度赏赐" },
  { value: "custom", label: "人工调整" },
  { value: "experience", label: "经验" },
  { value: "benefit", label: "权益" },
  { value: "punishment", label: "惩罚相关" },
] as const;

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [ledgerFilter, setLedgerFilter] =
    useState<(typeof ledgerFilters)[number]["value"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredLedger = useMemo(() => {
    if (!data) return [];
    if (ledgerFilter === "all") return data.walletLedger;
    return data.walletLedger.filter((entry) => entry.type === ledgerFilter);
  }, [data, ledgerFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.getWallet());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取钱包数据失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summaryCards = data
    ? [
        {
          label: "当前钱包余额",
          value: `¥${data.progress.wallet}`,
          Icon: Coins,
          tone: "gold",
        },
        {
          label: "本月基础工资",
          value: `¥${data.baseSalary}`,
          Icon: BadgeDollarSign,
          tone: "burgundy",
        },
        {
          label: "任务奖励",
          value: `¥${data.taskBonus}`,
          Icon: Star,
          tone: "default",
        },
        {
          label: "预计本月总额",
          value: `¥${data.expectedTotal}`,
          Icon: TrendingUp,
          tone: "gold",
        },
      ]
    : [];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Read Only</span>
          <h1>用户状态查看</h1>
          <p>这里只展示老哥当前状态、钱包流水和月度赏赐，不提供后台改钱、改经验或改等级。</p>
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

      <div className="admin-wallet-grid">
        {summaryCards.map(({ label, value, Icon, tone }) => (
          <article className={`admin-metric-card admin-metric-card--${tone}`} key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
        {!data && loading ? <div className="admin-empty-state">正在读取状态...</div> : null}
      </div>

      <section className="admin-two-column">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>钱包流水</h2>
              <p>只读查看任务奖励、月度赏赐和历史记录。</p>
            </div>
            <select
              className="admin-input admin-input--compact"
              value={ledgerFilter}
              onChange={(event) =>
                setLedgerFilter(event.target.value as (typeof ledgerFilters)[number]["value"])
              }
            >
              {ledgerFilters.map((filterItem) => (
                <option key={filterItem.value} value={filterItem.value}>
                  {filterItem.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-ledger-list">
            {filteredLedger.map((entry) => (
              <article className="admin-ledger-item" key={entry.id}>
                <div>
                  <strong>{entry.source}</strong>
                  <span>{entry.note ?? entry.taskTitle ?? entry.benefitName ?? entry.type}</span>
                </div>
                <b>
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount} {entry.unit}
                </b>
                <time>{formatDateTime(entry.createdAt)}</time>
              </article>
            ))}
            {data && !filteredLedger.length ? (
              <div className="admin-empty-state">暂无流水</div>
            ) : null}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <h2>月度赏赐</h2>
              <p>历史记录按当时快照展示，不因后续职务配置变化而重算。</p>
            </div>
            <Gift size={18} />
          </div>
          <div className="admin-ledger-list">
            {data?.monthlyAllowances.map((record) => (
              <article className="admin-ledger-item" key={record.id}>
                <div>
                  <strong>
                    {record.month} · {record.roleTitle}
                  </strong>
                  <span>
                    基础 ¥{record.baseSalary} / 任务 ¥{record.taskBonus} / 调整 ¥
                    {record.wifeAdjustmentAmount}
                  </span>
                </div>
                <b>¥{record.totalAmount}</b>
                <time>{record.status}</time>
              </article>
            ))}
            {data && !data.monthlyAllowances.length ? (
              <div className="admin-empty-state">暂无月度赏赐记录</div>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
}
