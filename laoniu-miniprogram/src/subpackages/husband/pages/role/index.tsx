import { useEffect, useState } from "react";
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
  const [previewLevel, setPreviewLevel] = useState(0);

  useDidShow(() => {
    stateService.loadState().then((next) => {
      setState(next);
      setPreviewLevel(next.progress.level);
    });
  });

  useEffect(() => {
    if (!state) return;
    setPreviewLevel((level) => Math.min(Math.max(level, 0), roles.length - 1));
  }, [state]);

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  const currentRole = roleWithProgress(roles[state.progress.level], state.progress);
  const previewRole = roles[previewLevel] || currentRole;
  const lockedPreview = previewLevel > state.progress.level;
  const expPercent = Math.round((state.progress.exp / expRequiredForLevel(state.progress.level)) * 100);
  const slaveMode = state.punishment.status === "slave";

  function movePreview(offset: number) {
    setPreviewLevel((level) => Math.min(roles.length - 1, Math.max(0, level + offset)));
  }

  return (
    <View className={`page scene-page role-page role-page--level-${String(previewLevel).padStart(2, "0")}`}>
      <View className="role-hero">
        <Image className={`role-hero__image pixelated ${lockedPreview ? "is-locked" : ""}`} src={previewRole.roleImage} mode="aspectFit" />
        {lockedPreview ? <View className="role-hero__lock"><Text>Lv.{previewLevel} 解锁</Text></View> : null}
      </View>

      <View className="role-header">
        <Button className="role-nav" disabled={previewLevel <= 0} onClick={() => movePreview(-1)}>‹</Button>
        <View className="role-header__text">
          <Text className="level-line">Lv. {String(previewLevel).padStart(2, "0")}</Text>
          <Text className="title">{previewRole.title}</Text>
        </View>
        <Button className="role-nav" disabled={previewLevel >= roles.length - 1} onClick={() => movePreview(1)}>›</Button>
      </View>

      <View className="section panel role-card">
        <Text className="panel-title">人物小传</Text>
        <Text className="subtitle">{previewRole.biography}</Text>

        {!lockedPreview ? (
          <>
            <View className="role-card__bar"><View className="role-card__fill" style={{ width: `${expPercent}%` }} /></View>
            <Text className="subtitle">EXP {state.progress.exp}/{currentRole.expRequired}</Text>
            <Text className="subtitle">零花钱：{slaveMode ? "暂停" : `${state.progress.wallet} 元`} · 月标准 {currentRole.salary} 元</Text>
          </>
        ) : (
          <Text className="subtitle">这个职务还没解锁，继续完成任务升级。</Text>
        )}

        <View className="role-dots">
          {roles.map((item) => (
            <Text key={item.level} className={`role-dot ${item.level === previewLevel ? "is-active" : ""} ${item.level > state.progress.level ? "is-locked" : ""}`} />
          ))}
        </View>
      </View>

      <View className="section row-wrap">
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/benefit/index" })}>权益</Button>
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/task/index" })}>任务</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/wallet/index" })}>流水</Button>
        {slaveMode ? <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/husband/pages/slave/index" })}>奴役状态</Button> : null}
        <ReturnButton />
      </View>
      <SwipeHint text="左右切换预览职务；继续完成任务解锁更高等级。" />
    </View>
  );
}
