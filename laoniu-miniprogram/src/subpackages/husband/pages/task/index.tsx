import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { taskRewardText } from "../../../../domain/taskRewards";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function HusbandTaskPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  async function submit(id: string) {
    setState(await stateService.submitTask(id, { note: "已完成，请老妞验收" }));
    await Taro.showToast({ title: "已提交", icon: "success" });
  }

  return (
    <View className="page scene-page">
      <Text className="title">任务</Text>
      <Text className="subtitle">todo / doing / submitted / confirmed / failed 等状态按 H5 语义保留。</Text>
      {state.tasks.length ? state.tasks.map((task) => (
        <View className="panel section" key={task.id}>
          <Text className="title">{task.title}</Text>
          <Text className="subtitle">{task.description}</Text>
          <Text className="subtitle">奖励：{taskRewardText(task)}</Text>
          <Text className="subtitle">状态：{task.status} · 截止：{task.deadline}</Text>
          {["todo", "doing"].includes(task.status) ? <Button className="btn section" onClick={() => submit(task.id)}>提交完成</Button> : null}
        </View>
      )) : <View className="empty">暂无任务</View>}
    </View>
  );
}
