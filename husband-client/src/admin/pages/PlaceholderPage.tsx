import type { AdminRouteId } from "../types/admin";

const pageCopy: Record<AdminRouteId, { eyebrow: string; title: string; body: string }> = {
  dashboard: {
    eyebrow: "Dashboard",
    title: "首页总览",
    body: "当前页面已实现。",
  },
  roles: {
    eyebrow: "Roles",
    title: "人物与等级",
    body: "下一阶段会接入 Lv.0 到 Lv.11 的 default config + server override 编辑器。",
  },
  benefits: {
    eyebrow: "Benefits",
    title: "权益管理",
    body: "下一阶段会复用现有 Benefit 类型和状态系统，补齐权益编辑与状态预览。",
  },
  tasks: {
    eyebrow: "Tasks",
    title: "任务中心",
    body: "下一阶段会接入任务列表、筛选、详情面板和审核动作。",
  },
  wallet: {
    eyebrow: "Wallet",
    title: "零花钱与奖励",
    body: "下一阶段会基于 walletLedger 与 monthlyAllowances 建立所有金额和经验调整入口。",
  },
  assets: {
    eyebrow: "Assets",
    title: "素材中心",
    body: "下一阶段会读取素材目录、显示缩略图、引用路径和 Sprite Sheet 元信息。",
  },
  accounts: {
    eyebrow: "Accounts",
    title: "账号管理",
    body: "下一阶段会建立 admin、wife、husband 三类账号的权限 UI 和服务端校验预留。",
  },
  system: {
    eyebrow: "System",
    title: "系统与数据",
    body: "下一阶段会接入备份、导出、恢复和危险操作二次确认。",
  },
};

interface PlaceholderPageProps {
  route: AdminRouteId;
}

export function PlaceholderPage({ route }: PlaceholderPageProps) {
  const copy = pageCopy[route];

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
      </header>
      <div className="admin-placeholder">
        <span aria-hidden="true" />
        <strong>{copy.title}将在下一阶段实现</strong>
        <p>当前只保留正式路由、布局位置和数据访问层入口，避免提前改动业务规则。</p>
      </div>
    </section>
  );
}
