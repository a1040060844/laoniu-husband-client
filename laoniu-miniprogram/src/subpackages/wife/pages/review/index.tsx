import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function WifeReviewPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  async function approveTask(id: string) {
    setState(await stateService.approveTask(id));
    await Taro.showToast({ title: "已确认", icon: "success" });
  }

  async function rejectTask(id: string) {
    setState(await stateService.rejectTask(id, { reason: "老婆驳回，需要重做。" }));
    await Taro.showToast({ title: "已驳回", icon: "none" });
  }

  async function approveBenefit(id: string) {
    setState(await stateService.approveBenefit(id));
    await Taro.showToast({ title: "已批准", icon: "success" });
  }

  async function rejectBenefit(id: string) {
    setState(await stateService.rejectBenefit(id, { reason: "老婆暂缓批准。" }));
    await Taro.showToast({ title: "已驳回", icon: "none" });
  }

  const submitted = state.tasks.filter((task) => task.status === "submitted");
  const requests = state.benefits.filter((benefit) => benefit.pendingRequest);

  return (
    <View className="page scene-page">
      <Text className="title">审批</Text>
      <Text className="section-title">待确认任务</Text>
      {submitted.length ? submitted.map((task) => (
        <View className="panel section" key={task.id}>
          <Text className="title">{task.title}</Text>
          <Text className="subtitle">{task.submitNote || task.description}</Text>
          <View className="row-wrap section">
            <Button className="btn" onClick={() => approveTask(task.id)}>确认完成</Button>
            <Button className="btn btn-secondary" onClick={() => rejectTask(task.id)}>驳回</Button>
          </View>
        </View>
      )) : <View className="empty">暂无待确认任务</View>}
      <Text className="section-title">待审批权益</Text>
      {requests.length ? requests.map((benefit) => (
        <View className="panel section" key={benefit.id}>
          <Text className="title">{benefit.name}</Text>
          <Text className="subtitle">{benefit.pendingRequest?.reason}</Text>
          <View className="row-wrap section">
            <Button className="btn" onClick={() => approveBenefit(benefit.id)}>批准</Button>
            <Button className="btn btn-secondary" onClick={() => rejectBenefit(benefit.id)}>驳回</Button>
          </View>
        </View>
      )) : <View className="empty">暂无权益申请</View>}
    </View>
  );
}
