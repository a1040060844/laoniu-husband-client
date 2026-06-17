import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import { publicAsset } from "../../../../services/assets";
import type { AppState } from "../../../../services/state";

export default function HusbandSlavePage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  return (
    <View className="page scene-page">
      <Text className="title">卖身奴隶状态</Text>
      <Image className="slave-image pixelated" src={publicAsset("/assets/slave/slave-page-latest.png")} mode="aspectFit" />
      <View className="panel section">
        <Text className="subtitle">当前状态：{state.punishment.status}</Text>
        <Text className="subtitle">权益与零花钱在奴役状态下暂停；任务仍可完成并累计恢复经验。</Text>
        <Text className="subtitle">恢复要求：{state.punishment.requiredRecoveryExp} EXP 或 {state.punishment.durationDays} 天。</Text>
      </View>
    </View>
  );
}
