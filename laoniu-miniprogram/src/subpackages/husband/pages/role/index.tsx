import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { ReturnButton } from "../../../../components/ReturnButton";
import { SwipeHint } from "../../../../components/SwipeHint";
import { roles } from "../../../../data/roles";
import { expRequiredForLevel, roleWithProgress } from "../../../../game/progression";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import "./index.scss";

export default function HusbandRolePage() {
  const [state, setState] = useState<AppState>();

  useDidShow(() => {
    stateService.loadState().then(setState);
  });

  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  const role = roleWithProgress(roles[state.progress.level], state.progress);
  const expPercent = Math.round((state.progress.exp / expRequiredForLevel(state.progress.level)) * 100);

  return (
    <View className="page scene-page">
      <Text className="title">{role.title}</Text>
      <Text className="subtitle">Lv.{state.progress.level} · EXP {state.progress.exp}/{role.expRequired}</Text>
      <View className="section panel role-card">
        <Image className="role-card__image pixelated" src={role.roleImage} mode="aspectFit" />
        <Text className="subtitle">{role.biography}</Text>
        <View className="role-card__bar"><View className="role-card__fill" style={{ width: `${expPercent}%` }} /></View>
        <Text className="subtitle">零花钱：{state.punishment.status === "slave" ? "暂停" : `${state.progress.wallet} 元`} · 月标准 {role.salary} 元</Text>
      </View>
      <View className="section row-wrap">
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/benefit/index" })}>权益</Button>
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/task/index" })}>任务</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/wallet/index" })}>流水</Button>
        {state.punishment.status === "slave" ? <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/slave/index" })}>奴役状态</Button> : null}
        <ReturnButton />
      </View>
      <SwipeHint text="参考 H5：角色页保留职务、插画、经验条、权益/任务入口" />
    </View>
  );
}
