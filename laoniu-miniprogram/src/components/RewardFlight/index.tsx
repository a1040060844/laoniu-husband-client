import { Text, View } from "@tarojs/components";
import type { WalletLedgerEntry } from "../../types/domain";
import "./index.scss";

const rewardTypes = new Set(["experience", "allowance", "level_up", "benefit", "custom"]);

function toneFor(entry: WalletLedgerEntry) {
  if (entry.type === "allowance") return "money";
  if (entry.type === "benefit") return "benefit";
  if (entry.type === "level_up") return "level";
  return "exp";
}

function unitLabel(entry: WalletLedgerEntry) {
  if (entry.unit === "CNY") return "元";
  if (entry.unit === "LEVEL") return "级";
  if (entry.unit === "BENEFIT") return "次";
  return entry.unit;
}

function amountLabel(entry: WalletLedgerEntry) {
  if (entry.amount === 0 && entry.note) return "暂停";
  return `+${entry.amount}${unitLabel(entry)}`;
}

export function RewardFlight({ entries }: { entries: WalletLedgerEntry[] }) {
  const rewards = entries
    .filter((entry) => rewardTypes.has(entry.type))
    .slice(0, 3);

  if (!rewards.length) return null;

  return (
    <View className="reward-flight section">
      <View className="reward-flight__header">
        <Text className="reward-flight__eyebrow">奖励到账</Text>
        <Text className="reward-flight__hint">最近 {rewards.length} 条</Text>
      </View>
      <View className="reward-flight__items">
        {rewards.map((entry, index) => (
          <View className={`reward-flight__item reward-flight__item--${toneFor(entry)}`} key={entry.id} style={{ animationDelay: `${index * 90}ms` }}>
            <Text className="reward-flight__amount">{amountLabel(entry)}</Text>
            <Text className="reward-flight__source">{entry.taskTitle || entry.benefitName || entry.source}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
