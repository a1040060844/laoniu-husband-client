import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import { HusbandDecreeNotice } from "../../../../components/HusbandDecreeNotice";
import { SlaveStateCinematic } from "../../../../components/SlaveStateCinematic";
import { roles } from "../../../../data/roles";
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

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  const slaveMode = state.punishment.status === "slave";
  const displayRole = slaveMode ? { title: "卖身奴隶", biography: "表现太糟糕了，权益和零花钱暂时冻结，靠完成任务重新攒回老妞大人的信任。" } : roles[state.progress.level];
  const requiredRecoveryExp = Math.max(1, state.punishment.requiredRecoveryExp || 100);
  const recoveryPercent = Math.min(100, Math.round((state.punishment.recoveryExp / requiredRecoveryExp) * 100));
  const remainingDays = Math.max(0, state.punishment.durationDays || 0);

  return (
    <View className={`page scene-page slave-page ${slaveMode ? "slave-page--active" : ""}`}>
      <SlaveStateCinematic ambient={slaveMode} />
      <View className="slave-hero">
        <Image className="slave-image pixelated" src={publicAsset("/assets/slave/slave-page-latest.png")} mode="aspectFill" />
        <View className="slave-scrim" />
        <View className="slave-title">
          <Text className="slave-title__level">{slaveMode ? "FINAL" : `Lv. ${String(state.progress.level).padStart(2, "0")}`}</Text>
          <Text className="slave-title__name">{displayRole.title}</Text>
          <Text className="slave-title__status">{slaveMode ? "权益与零花钱冻结中" : "当前状态正常"}</Text>
        </View>
      </View>

      <View className={`slave-bottom-panel ${slaveMode ? "is-slave" : ""}`}>
        <View className="slave-bio">
          <Text className="panel-title">人物小传</Text>
          <Text className="subtitle">{displayRole.biography}</Text>
        </View>

        <View className="slave-progress-card">
          <View className="slave-progress-card__head">
            <Text>恢复进度</Text>
            <Text>{slaveMode ? `${state.punishment.recoveryExp}/${requiredRecoveryExp} EXP` : "未冻结"}</Text>
          </View>
          <View className="slave-progress">
            <View className="slave-progress__fill" style={{ width: `${slaveMode ? recoveryPercent : 100}%` }} />
          </View>
          <Text className="slave-progress-card__note">
            {slaveMode ? `惩罚剩余 ${remainingDays} 天 / 开启 ${formatTime(state.punishment.startedAt)}` : "权益、零花钱和任务奖励正常启用。"}
          </Text>
        </View>

        {slaveMode ? (
          <View className="slave-freeze-grid">
            <View className="slave-freeze-grid__item">
              <Text className="slave-freeze-grid__value">暂停</Text>
              <Text className="slave-freeze-grid__label">权益申请</Text>
            </View>
            <View className="slave-freeze-grid__item">
              <Text className="slave-freeze-grid__value">暂停</Text>
              <Text className="slave-freeze-grid__label">零花钱</Text>
            </View>
            <View className="slave-freeze-grid__item">
              <Text className="slave-freeze-grid__value">继续</Text>
              <Text className="slave-freeze-grid__label">任务经验</Text>
            </View>
          </View>
        ) : null}

        <View className={`panel section slave-panel ${slaveMode ? "is-slave" : ""}`}>
          <Text className="subtitle">当前状态：{slaveMode ? "卖身奴隶中" : "正常"}</Text>
          {slaveMode ? (
            <>
              <Text className="subtitle">原因：{state.punishment.reason || "老妞裁定"}</Text>
              <Text className="subtitle">恢复要求：{requiredRecoveryExp} EXP 或 {state.punishment.durationDays} 天</Text>
              <Text className="subtitle">权益和零花钱暂停；任务仍可完成并累计经验。</Text>
            </>
          ) : (
            <Text className="subtitle">当前没有惩罚状态，权益和零花钱正常启用。</Text>
          )}
        </View>
      </View>
      <HusbandDecreeNotice state={state} onStateChange={setState} />
    </View>
  );
}
