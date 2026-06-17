import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { roles } from "../../../../data/roles";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function WifeDashboardPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  const role = roles[state.progress.level];
  const pendingTasks = state.tasks.filter((task) => task.status === "submitted").length;
  const pendingBenefits = state.benefits.filter((benefit) => benefit.pendingRequest).length;

  return (
    <View className="page scene-page">
      <Text className="title">老婆后台</Text>
      <Text className="subtitle">当前老公职务：{role.title} · Lv.{state.progress.level} · EXP {state.progress.exp}</Text>
      <View className="stats-grid section">
        <View className="panel"><Text className="stat-number">{pendingTasks}</Text><Text className="stat-label">待确认任务</Text></View>
        <View className="panel"><Text className="stat-number">{pendingBenefits}</Text><Text className="stat-label">待审批权益</Text></View>
        <View className="panel"><Text className="stat-number">{state.progress.wallet}</Text><Text className="stat-label">零花钱</Text></View>
      </View>
      <View className="section row-wrap">
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/task-create/index" })}>发布任务</Button>
        <Button className="btn" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/review/index" })}>任务/权益审批</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/decrees/index" })}>圣旨裁定</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.navigateTo({ url: "/subpackages/wife/pages/logs/index" })}>日志</Button>
        <Button className="btn btn-secondary" onClick={() => Taro.reLaunch({ url: "/pages/login/index" })}>返回登录</Button>
      </View>
    </View>
  );
}
