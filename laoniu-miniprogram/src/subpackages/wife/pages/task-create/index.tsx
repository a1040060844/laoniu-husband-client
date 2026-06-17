import { useState } from "react";
import Taro from "@tarojs/taro";
import { Button, Input, Text, Textarea, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";

export default function WifeTaskCreatePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardExp, setRewardExp] = useState("10");
  const [rewardMoney, setRewardMoney] = useState("0");
  const [deadline, setDeadline] = useState("今天完成");

  async function submit() {
    await stateService.createTask({
      title: title.trim() || "老婆指定任务",
      description: description.trim() || "按老婆大人要求完成，完成后提交验收。",
      rewardExp: Number(rewardExp) || 0,
      rewardMoney: Number(rewardMoney) || 0,
      deadline
    });
    await Taro.showToast({ title: "任务已发布", icon: "success" });
    await Taro.navigateBack();
  }

  return (
    <View className="page scene-page">
      <Text className="title">发布任务</Text>
      <View className="panel section">
        <View className="field"><Text className="label">任务标题</Text><Input className="input" value={title} onInput={(event) => setTitle(String(event.detail.value))} /></View>
        <View className="field"><Text className="label">任务描述</Text><Textarea className="textarea" value={description} onInput={(event) => setDescription(String(event.detail.value))} /></View>
        <View className="field"><Text className="label">经验奖励</Text><Input className="input" type="number" value={rewardExp} onInput={(event) => setRewardExp(String(event.detail.value))} /></View>
        <View className="field"><Text className="label">零花钱奖励</Text><Input className="input" type="number" value={rewardMoney} onInput={(event) => setRewardMoney(String(event.detail.value))} /></View>
        <View className="field"><Text className="label">截止说明</Text><Input className="input" value={deadline} onInput={(event) => setDeadline(String(event.detail.value))} /></View>
        <Button className="btn section" onClick={submit}>下达任务</Button>
      </View>
    </View>
  );
}
