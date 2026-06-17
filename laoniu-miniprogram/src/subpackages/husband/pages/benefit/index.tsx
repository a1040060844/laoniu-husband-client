import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { roles } from "../../../../data/roles";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

function benefitStateLabel(state: AppState, levelRequired: number, status: string) {
  if (state.punishment.status === "slave") return "卖身奴隶状态：权益暂停";
  if (state.progress.level < levelRequired) return `Lv.${levelRequired} 解锁`;
  if (status === "pending") return "待老妞审批";
  if (status === "cooldown") return "冷却中";
  return "可申请";
}

export default function HusbandBenefitPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  const role = roles[state.progress.level];

  async function request(id: string) {
    try {
      setState(await stateService.requestBenefit(id, { reason: "老公申请使用权益" }));
      await Taro.showToast({ title: "已申请", icon: "success" });
    } catch (error) {
      await Taro.showToast({ title: error instanceof Error ? error.message : "申请失败", icon: "none" });
    }
  }

  return (
    <View className="page scene-page">
      <Text className="title">权益</Text>
      <Text className="subtitle">当前职务：{role.title}</Text>
      {state.benefits.map((benefit) => (
        <View className="panel section" key={benefit.id}>
          <Image className="benefit-image pixelated" src={role.benefitImage} mode="aspectFit" />
          <Text className="title">{benefit.name}</Text>
          <Text className="subtitle">{benefit.description}</Text>
          <Text className="subtitle">{benefitStateLabel(state, benefit.levelRequired, benefit.status)}</Text>
          {state.progress.level >= benefit.levelRequired && benefit.status === "available" && state.punishment.status !== "slave" ? (
            <Button className="btn section" onClick={() => request(benefit.id)}>申请使用</Button>
          ) : null}
        </View>
      ))}
    </View>
  );
}
