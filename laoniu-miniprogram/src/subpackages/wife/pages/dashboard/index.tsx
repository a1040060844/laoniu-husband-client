import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { roles } from "../../../../data/roles";
import { expRequiredForLevel, salaryForLevel } from "../../../../game/progression";
import { SlaveStateCinematic, type SlaveStateCinematicEvent } from "../../../../components/SlaveStateCinematic";
import { WifeCommandMotion } from "../../../../components/WifeCommandMotion";
import { publicAsset } from "../../../../services/assets";
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
  const requiredExp = expRequiredForLevel(state.progress.level);
  const statusCurrent = slaveMode ? state.punishment.recoveryExp : state.progress.exp;
  const statusRequired = slaveMode ? Math.max(1, state.punishment.requiredRecoveryExp || 100) : requiredExp;
  const expPercent = Math.min(100, Math.round((statusCurrent / statusRequired) * 100));
  const salary = salaryForLevel(state.progress.level);
  const nextRole = roles[Math.min(roles.length - 1, state.progress.level + 1)];
  const expToNext = Math.max(0, requiredExp - state.progress.exp);
  const wifeImage = publicAsset("/assets/loading/loading-psd-wife.png");

  return (
    <View className="page scene-page wife-dashboard">
      <View className="wife-hero">
        <Image className="wife-portrait pixelated" src={wifeImage} mode="aspectFill" />
        <View className="wife-hero__shade" />
        <Button className="wife-return" onClick={() => Taro.reLaunch({ url: "/pages/login/index" })}>返回</Button>

        <View className="wife-title">
          <Text className="wife-title__kicker">老妞端</Text>
          <Text className="wife-title__name">老妞宝座</Text>
          <Text className="wife-title__subtitle">赏罚升降，皆由老妞大人裁定</Text>
        </View>

        <View className="wife-status-card">
          <Text className="wife-panel-title">老哥当前状态</Text>
          <View className="wife-status-card__title">
            <Text className="wife-status-card__level">{slaveMode ? "FINAL" : `Lv. ${String(state.progress.level).padStart(2, "0")}`}</Text>
            <Text className="wife-status-card__role">{slaveMode ? "卖身奴隶" : role.title}</Text>
          </View>
          <View className="wife-exp-line">
            <Text>{slaveMode ? "恢复进度" : "当前经验"}</Text>
            <Text>{statusCurrent} / {statusRequired}</Text>
          </View>
          <View className="wife-progress"><View className="wife-progress__fill" style={{ width: `${expPercent}%` }} /></View>
          <View className="wife-salary-line">
            <Text>月薪</Text>
            <Text className="wife-salary-line__value">{slaveMode ? "冻结" : salary}</Text>
            <Text className={slaveMode ? "wife-salary-status wife-salary-status--slave" : "wife-salary-status"}>{slaveMode ? "卖身奴隶状态" : "正常服役中"}</Text>
          </View>
          <Text className="wife-next-line">
            {slaveMode ? "奴隶服役中，周期结束后由老妞大人重新裁定" : state.progress.level >= roles.length - 1 ? "已抵达最高职务，赏罚仍由老妞大人裁定" : `距 ${nextRole.title} 还差 ${expToNext} 经验`}
          </Text>
        </View>

        <View className="wife-dashboard-stats">
          <View className="wife-dashboard-stat"><Text className="wife-dashboard-stat__value">{pendingTasks}</Text><Text className="wife-dashboard-stat__label">待确认</Text></View>
          <View className="wife-dashboard-stat"><Text className="wife-dashboard-stat__value">{pendingBenefits}</Text><Text className="wife-dashboard-stat__label">待审批</Text></View>
          <View className="wife-dashboard-stat"><Text className="wife-dashboard-stat__value">{confirmedTasks}</Text><Text className="wife-dashboard-stat__label">已完成</Text></View>
          <View className="wife-dashboard-stat"><Text className="wife-dashboard-stat__value">{state.progress.wallet}</Text><Text className="wife-dashboard-stat__label">零花钱</Text></View>
        </View>
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
        <WifeCommandMotion className="section">
          {({ command }) => (
            <>
              {command(
                { armed: !slaveMode, commandKey: "start-slave", danger: true, onClick: startSlaveMode },
                <Button className="btn btn-secondary" disabled={slaveMode}>开启卖身状态</Button>,
              )}
              {command(
                { commandKey: "restore-normal", onClick: restoreNormalMode, pending: slaveMode },
                <Button className="btn" disabled={!slaveMode}>恢复正常</Button>,
              )}
            </>
          )}
        </WifeCommandMotion>
      </View>

      <WifeCommandMotion className="section">
        {({ command }) => (
          <>
            {command(
              { className: "wife-action wife-action--primary", commandKey: "create-task", onClick: () => Taro.navigateTo({ url: "/subpackages/wife/pages/task-create/index" }) },
              <Button className="wife-action__button">发布任务</Button>,
            )}
            {command(
              { className: "wife-action", commandKey: "review", onClick: () => Taro.navigateTo({ url: "/subpackages/wife/pages/review/index" }), pending: pendingTasks + pendingBenefits > 0 },
              <Button className="wife-action__button">任务/权益审批{pendingTasks + pendingBenefits > 0 ? ` ${pendingTasks + pendingBenefits}` : ""}</Button>,
            )}
            {command(
              { className: "wife-action", commandKey: "decrees", onClick: () => Taro.navigateTo({ url: "/subpackages/wife/pages/decrees/index" }) },
              <Button className="wife-action__button">圣旨裁定</Button>,
            )}
            {command(
              { className: "wife-action", commandKey: "logs", onClick: () => Taro.navigateTo({ url: "/subpackages/wife/pages/logs/index" }) },
              <Button className="wife-action__button">日志</Button>,
            )}
            {command(
              { armed: true, className: "wife-action", commandKey: "reset-data", danger: true, onClick: resetLocalData },
              <Button className="wife-action__button">重置数据</Button>,
            )}
            {command(
              { className: "wife-action", commandKey: "back-login", onClick: () => Taro.reLaunch({ url: "/pages/login/index" }) },
              <Button className="wife-action__button">返回登录</Button>,
            )}
          </>
        )}
      </WifeCommandMotion>
      <SlaveStateCinematic ambient={slaveMode} event={slaveEvent} onComplete={() => setSlaveEvent(null)} />
    </View>
  );
}
