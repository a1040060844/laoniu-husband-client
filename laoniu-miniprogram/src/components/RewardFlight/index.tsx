import { Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

function flightEnd(tone: string, index: number) {
  if (tone === "money") return { x: `${72 + index * 2}vw`, y: "26vh" };
  if (tone === "benefit") return { x: `${50 + index * 3}vw`, y: "44vh" };
  if (tone === "level") return { x: `${48 + index * 2}vw`, y: "20vh" };
  return { x: `${48 + index * 2}vw`, y: "30vh" };
}

export function RewardFlight({ entries }: { entries: WalletLedgerEntry[] }) {
  const rewards = useMemo(
    () => entries
      .filter((entry) => rewardTypes.has(entry.type))
      .slice(0, 3),
    [entries],
  );
  const [showFlights, setShowFlights] = useState(false);
  const flightKey = rewards.map((entry) => entry.id).join(":");

  useEffect(() => {
    if (!rewards.length) return undefined;
    setShowFlights(true);
    const timer = setTimeout(() => setShowFlights(false), 1480);
    return () => clearTimeout(timer);
  }, [flightKey, rewards.length]);

  if (!rewards.length) return null;

  return (
    <View className="reward-flight section">
      {showFlights ? (
        <View className="reward-flight-layer">
          {rewards.map((entry, index) => {
            const tone = toneFor(entry);
            const end = flightEnd(tone, index);
            return (
              <View
                className={`reward-flight-chip reward-flight-chip--${tone}`}
                key={entry.id}
                style={{
                  "--flight-delay": `${index * 110}ms`,
                  "--flight-end-x": end.x,
                  "--flight-end-y": end.y,
                  "--flight-start-x": `${34 + index * 5}vw`,
                  "--flight-start-y": `${64 + index * 2}vh`,
                } as CSSProperties}
              >
                <Text>{amountLabel(entry)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
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
