import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { roles } from "../../../../data/roles";
import { SlaveStateCinematic, type SlaveStateCinematicEvent } from "../../../../components/SlaveStateCinematic";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import "./index.scss";

export default function WifeDashboardPage() {
  const [state, setState] = useState<AppState>();
  const [slaveEvent, setSlaveEvent] = useState<SlaveStateCinematicEvent | null>(null);

  async function reload() {
    setState(await stateService.loadState());
  }

  useDidShow(() => {
    void reload();
  });

  async function startSlaveMode() {
    const result = await Taro.showModal({
      title: "开启卖身奴隶状态",
      content: "开启后权益和零花钱暂停；任务仍可完成并获得经验。",
      confirmText: "开启",
      confirmColor: "#6f3f2c",
    });
    if (!result.confirm) return;
    const next = await stateService.startSlaveMode({
      reason: "老妞后台手动裁定",
      durationDays: 7,
      requiredRecoveryExp: 100,
    });
    setState(next);
    setSlaveEvent({ id: `slave-enter-${Date.now()}`, mode: "enter", amount: state?.progress.wallet });
    await Taro.showToast({ title: "已开启", icon: "success" });
  }

  async function restoreNormalMode() {
    const result = await Taro.showModal({
      title: "恢复正常状态",
      content: "恢复后权益和零花钱重新启用。",
      confirmText: "恢复",
      confirmColor: "#6f3f2c",
    });
    if (!result.confirm) return;
    const next = await stateService.restoreNormalMode({ reason: "老妞后台手动恢复" });
    setState(next);
    setSlaveEvent({ id: `slave-restore-${Date.now()}`, mode: "restore", amount: next.progress.wallet });
    await Taro.showToast({ title: "已恢复", icon: "success" });
  }

  async function resetLocalData() {
    const result = await Taro.showModal({
      title: "重置全部本地数据",
      content: "会清空当前进度、任务、权益申请、流水和日志，恢复到初始数据。",
      confirmText: "重置",
      confirmColor: "#b4472f",
    });
    if (!result.confirm) return;
    const next = await stateService.resetState();
    setState(next);
    await Taro.showToast({ title: "已重置", icon: "success" });
  }

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  const role = roles[state.progress.level];
  const pendingTasks = state.tasks.filter((task) => task.status === "submitted").length;
  const pendingBenefits = state.benefits.filter((benefit) => benefit.pendingRequest).length;
  const confirmedTasks = state.tasks.filter((task) => task.status === "confirmed").length;
  const slaveMode = state.punishment.status === "slave";

  return (
    <View className="page scene-page wife-dashboard">
      <Text className="title">老妞后台</Text>
      <Text className="subtitle">当前老哥职务：{role.title} / Lv.{state.progress.level} / EXP {state.progress.exp}</Text>

      <View className="stats-grid section">
        <View className="panel"><Text className="stat-number">{pendingTasks}</Text><Text className="stat-label">待确认任务</Text></View>
        <View className="panel"><Text className="stat-number">{pendingBenefits}</Text><Text className="stat-label">待审批权益</Text></View>
        <View className="panel"><Text className="stat-number">{confirmedTasks}</Text><Text className="stat-label">已完成任务</Text></View>
        <View className="panel"><Text className="stat-number">{state.progress.wallet}</Text><Text className="stat-label">零花钱余额</Text></View>
      </View>

      <View className={`panel section punishment-panel ${slaveMode ? "is-slave" : ""}`}>
        <Text className="panel-title">状态裁定</Text>
        <Text className="subtitle">当前状态：{slaveMode ? "卖身奴隶中" : "正常"}</Text>
        {slaveMode ? (
          <>
            <Text className="small-text">原因：{state.punishment.reason || "老妞裁定"}</Text>
            <Text className="small-text">恢复要求：{state.punishment.requiredRecoveryExp} EXP 或 {state.punishment.durationDays} 天</Text>
          </>
        ) : null}
        <View className="row-wrap">
          <Button className="btn btn-secondary" disabled={slaveMode} onClick={startSlaveMode}>开启卖身状态</Button>
          <Button className="btn" disabled={!slaveMode} onClick={restoreNormalMode}>恢复正常</Button>
        </View>
      </View>

      <View className="section row-wrap">
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/task-create/index" })}>发布任务</Button>
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/review/index" })}>任务/权益审批</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/decrees/index" })}>圣旨裁定</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/logs/index" })}>日志</Button>
        <Button className="btn btn-secondary" onClick={resetLocalData}>重置数据</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.reLaunch({ url: "/pages/login/index" })}>返回登录</Button>
      </View>
      <SlaveStateCinematic ambient={slaveMode} event={slaveEvent} onComplete={() => setSlaveEvent(null)} />
    </View>
  );
}
