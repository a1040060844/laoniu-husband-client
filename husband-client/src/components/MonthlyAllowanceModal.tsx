import type { MonthlyAllowanceRecord } from "../types/domain";
import { ClickSpark } from "./effects/ClickSpark";

export type MonthlyAllowanceModalMode =
  | "wife-pending"
  | "wife-paused"
  | "wife-confirm"
  | "wife-dispute"
  | "husband-paid"
  | "husband-rebuked"
  | "husband-cancelled"
  | "missing-config";

interface MonthlyAllowanceModalProps {
  mode: MonthlyAllowanceModalMode;
  record: MonthlyAllowanceRecord;
  onPrimary: () => void;
  onSecondary?: () => void;
  onTertiary?: () => void;
  onDismiss?: () => void;
  onSkip?: () => void;
}

function detailRows(record: MonthlyAllowanceRecord) {
  return [
    ["职务", record.roleTitle],
    ["基础赏钱", `¥${record.baseSalary}`],
    ["完成任务", `${record.completedTaskCount} 个`],
    ["任务赏钱", `¥${record.taskBonus}`],
    ["老妞裁定", `${record.wifeAdjustmentAmount >= 0 ? "+" : ""}${record.wifeAdjustmentAmount}`],
    ["本月合计", `¥${record.totalAmount}`],
  ];
}

function modalCopy(mode: MonthlyAllowanceModalMode, record: MonthlyAllowanceRecord) {
  if (mode === "wife-paused") {
    return {
      actions: ["知道了"],
      kicker: "赏赐暂停",
      text: "卖身奴隶状态下，本月赏赐暂停，不跳转支付宝。",
      title: "本月赏赐暂停",
      tone: "punish",
    } as const;
  }
  if (mode === "wife-confirm") {
    return {
      actions: ["赏赐成功", "重试"],
      kicker: "赏赐确认",
      text: "老妞大人是否已经完成本月赏赐？",
      title: "确认本月赏赐",
      tone: "upgrade",
    } as const;
  }
  if (mode === "wife-dispute") {
    return {
      actions: ["再试一次", "眼睛瞎吗", "这个月取消"],
      kicker: "赏赐异议",
      text: "你的仆人好像没有收到赏赐，去看看吧。",
      title: "仆人说没收到",
      tone: "down",
    } as const;
  }
  if (mode === "husband-paid") {
    return {
      actions: ["谢主荣恩", "没收到呀"],
      kicker: "老妞赏赐",
      text: "这是老妞大人这个月给你的赏钱。表现不错，继续侍奉老妞大人。",
      title: "本月赏钱已赐",
      tone: "upgrade",
    } as const;
  }
  if (mode === "husband-rebuked") {
    return {
      actions: ["谢主荣恩"],
      kicker: "老妞裁定",
      text: "老妞大人裁定：眼睛不好就好好反省。赏赐已经发了，不许再闹。",
      title: "不许再闹",
      tone: "punish",
    } as const;
  }
  if (mode === "husband-cancelled") {
    return {
      actions: ["跪下认错"],
      kicker: "老妞裁定",
      text: "老妞大人裁定：本月赏赐取消。原因：仆人扰乱赏赐秩序，暂不发放。",
      title: "本月赏赐取消",
      tone: "punish",
    } as const;
  }
  if (mode === "missing-config") {
    return {
      actions: ["知道了"],
      kicker: "收款配置",
      text: "尚未配置支付宝收款链接，请在环境变量 VITE_ALIPAY_RECEIVE_URL 中填写后再去赏赐。",
      title: "无法跳转支付宝",
      tone: "down",
    } as const;
  }
  return {
    actions: ["去赏赐", "先退下"],
    kicker: "每月赏赐",
    text: `又过了一个月了。你的老哥仆人 · ${record.roleTitle} 正向老妞大人讨要本月零花钱。`,
    title: "本月零花钱裁定",
    tone: "upgrade",
  } as const;
}

export function MonthlyAllowanceModal({
  mode,
  record,
  onDismiss,
  onSkip,
  onPrimary,
  onSecondary,
  onTertiary,
}: MonthlyAllowanceModalProps) {
  const copy = modalCopy(mode, record);
  const closeHandler = onSkip ?? onDismiss;

  return (
    <div className="decree-backdrop monthly-allowance-backdrop" role="presentation">
      <section
        className={`decree-modal monthly-allowance-modal decree-modal--${copy.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-allowance-title"
      >
        {closeHandler ? (
          <button
            className="monthly-allowance-modal__close"
            type="button"
            aria-label="关闭"
            onClick={closeHandler}
          >
            ×
          </button>
        ) : null}
        <header className="decree-modal__header">
          <p>{copy.kicker}</p>
          <span>{record.month} · 结算 {record.settlementMonth}</span>
        </header>
        <div className="decree-modal__rule" aria-hidden="true" />
        <h2 id="monthly-allowance-title">{copy.title}</h2>
        <p className="decree-modal__text">{copy.text}</p>
        <dl className="monthly-allowance-modal__details">
          {detailRows(record).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="monthly-allowance-modal__actions">
          <ClickSpark>
            <button
              className="decree-modal__action"
              type="button"
              onClick={onPrimary}
            >
              {copy.actions[0]}
            </button>
          </ClickSpark>
          {copy.actions[1] ? (
            <button
              className="monthly-allowance-modal__secondary"
              type="button"
              onClick={onSecondary}
            >
              {copy.actions[1]}
            </button>
          ) : null}
          {copy.actions[2] ? (
            <button
              className="monthly-allowance-modal__secondary monthly-allowance-modal__secondary--danger"
              type="button"
              onClick={onTertiary}
            >
              {copy.actions[2]}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
