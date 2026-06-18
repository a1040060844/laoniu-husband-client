import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { HusbandDecreeNotice } from "../../../../components/HusbandDecreeNotice";
import { RewardFlight } from "../../../../components/RewardFlight";
import { roles } from "../../../../data/roles";
import { salaryForLevel } from "../../../../game/progression";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { WalletLedgerEntry } from "../../../../types/domain";
import "./index.scss";

function formatLedgerAmount(entry: WalletLedgerEntry) {
  const sign = entry.amount > 0 ? "+" : "";
  if (entry.unit === "CNY") return `${sign}${entry.amount} 元`;
  if (entry.unit === "EXP") return `${sign}${entry.amount} EXP`;
  if (entry.unit === "LEVEL") return `${sign}${entry.amount} 级`;
  if (entry.unit === "BENEFIT") return `${sign}${entry.amount} 次`;
  return `${sign}${entry.amount}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ledgerTone(entry: WalletLedgerEntry) {
  if (entry.type === "allowance" || entry.type === "salary") return "money";
  if (entry.type === "experience") return "exp";
  if (entry.type === "level_up") return "level";
  if (entry.type === "punishment") return "punish";
  return "normal";
}

export default function HusbandWalletPage() {
  const [state, setState] = useState<AppState>();

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  const isSlave = state.punishment.status === "slave";
  const currentRole = roles[state.progress.level];
  const monthlySalary = salaryForLevel(state.progress.level);
  const moneyTotal = state.walletLedger
    .filter((entry) => entry.unit === "CNY")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expTotal = state.walletLedger
    .filter((entry) => entry.unit === "EXP")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const recentLedger = state.walletLedger.slice(0, 20);

  return (
    <View className={`page scene-page wallet-page ${isSlave ? "wallet-page--frozen" : ""}`}>
      <View className="wallet-stage">
        <View className="wallet-stage__shine" />
        <Text className="wallet-stage__kicker">老哥账本</Text>
        <Text className="wallet-stage__title">{isSlave ? "零花钱暂停" : `${state.progress.wallet} 元`}</Text>
        <Text className="wallet-stage__subtitle">
          {currentRole.title} / 月标准 {monthlySalary} 元 / 总经验 {state.progress.totalExp}
        </Text>
      </View>

      <View className="wallet-stats">
        <View className="wallet-stat">
          <Text className="wallet-stat__value">{isSlave ? "暂停" : state.progress.wallet}</Text>
          <Text className="wallet-stat__label">当前零花钱</Text>
        </View>
        <View className="wallet-stat">
          <Text className="wallet-stat__value">{monthlySalary}</Text>
          <Text className="wallet-stat__label">月标准</Text>
        </View>
        <View className="wallet-stat">
          <Text className="wallet-stat__value">{moneyTotal}</Text>
          <Text className="wallet-stat__label">流水合计</Text>
        </View>
        <View className="wallet-stat">
          <Text className="wallet-stat__value">{expTotal}</Text>
          <Text className="wallet-stat__label">经验入账</Text>
        </View>
      </View>

      <RewardFlight entries={state.walletLedger} />

      <View className="panel section wallet-ledger-panel">
        <Text className="section-title">最近流水</Text>
        {recentLedger.length ? recentLedger.map((entry) => (
          <View className={`wallet-ledger wallet-ledger--${ledgerTone(entry)}`} key={entry.id}>
            <View className="wallet-ledger__dot" />
            <View className="wallet-ledger__body">
              <View className="wallet-ledger__head">
                <Text className="wallet-ledger__source">{entry.source}</Text>
                <Text className="wallet-ledger__amount">{formatLedgerAmount(entry)}</Text>
              </View>
              <Text className="wallet-ledger__meta">
                {[formatTime(entry.createdAt), entry.taskTitle ? `任务：${entry.taskTitle}` : "", entry.benefitName ? `权益：${entry.benefitName}` : ""]
                  .filter(Boolean)
                  .join(" / ")}
              </Text>
              {entry.note ? <Text className="wallet-ledger__note">{entry.note}</Text> : null}
            </View>
          </View>
        )) : (
          <Text className="subtitle">暂无流水</Text>
        )}
      </View>

      {isSlave ? (
        <View className="panel section wallet-freeze">
          <Text className="section-title">卖身奴隶状态</Text>
          <Text className="subtitle">权益与零花钱暂停，任务经验仍可继续积累。</Text>
        </View>
      ) : null}
      <HusbandDecreeNotice state={state} onStateChange={setState} />
    </View>
  );
}
