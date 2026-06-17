import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { HusbandDecreeNotice } from "../../../../components/HusbandDecreeNotice";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function HusbandWalletPage() {
  const [state, setState] = useState<AppState>();

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  return (
    <View className="page scene-page">
      <Text className="title">钱包 / 流水</Text>
      <Text className="subtitle">当前零花钱：{state.punishment.status === "slave" ? "暂停" : `${state.progress.wallet} 元`}</Text>
      {state.walletLedger.length ? state.walletLedger.map((entry) => (
        <View className="panel section" key={entry.id}>
          <Text className="title">{entry.source}</Text>
          <Text className="subtitle">{entry.amount} {entry.unit} / {entry.createdAt}</Text>
          <Text className="subtitle">{entry.note || ""}</Text>
        </View>
      )) : <View className="empty">暂无流水</View>}
      <HusbandDecreeNotice state={state} onStateChange={setState} />
    </View>
  );
}
