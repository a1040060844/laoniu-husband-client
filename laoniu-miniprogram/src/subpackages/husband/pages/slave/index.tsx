import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import { publicAsset } from "../../../../services/assets";
import type { AppState } from "../../../../services/state";
import "./index.scss";

function formatTime(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export default function HusbandSlavePage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  const slaveMode = state.punishment.status === "slave";

  return (
    <View className="page scene-page">
      <Text className="title">卖身奴隶状态</Text>
      <Image className="slave-image pixelated" src={publicAsset("/assets/slave/slave-page-latest.png")} mode="aspectFit" />
      <View className={`panel section slave-panel ${slaveMode ? "is-slave" : ""}`}>
        <Text className="subtitle">当前状态：{slaveMode ? "卖身奴隶中" : "正常"}</Text>
        {slaveMode ? (
          <>
            <Text className="subtitle">开启时间：{formatTime(state.punishment.startedAt)}</Text>
            <Text className="subtitle">原因：{state.punishment.reason || "老妞裁定"}</Text>
            <Text className="subtitle">恢复要求：{state.punishment.requiredRecoveryExp} EXP 或 {state.punishment.durationDays} 天</Text>
            <Text className="subtitle">权益和零花钱暂停；任务仍可完成并累计经验。</Text>
          </>
        ) : (
          <Text className="subtitle">当前没有惩罚状态，权益和零花钱正常启用。</Text>
        )}
      </View>
    </View>
  );
}
