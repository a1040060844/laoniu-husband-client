import { useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { DecreeEvent } from "../../../../types/domain";
import "./index.scss";

const toneOptions: Array<{ tone: DecreeEvent["tone"]; label: string }> = [
  { tone: "normal", label: "普通裁定" },
  { tone: "upgrade", label: "表扬晋升" },
  { tone: "down", label: "警告驳回" },
  { tone: "punish", label: "惩罚裁定" }
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function WifeDecreesPage() {
  const [state, setState] = useState<AppState>();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [toneIndex, setToneIndex] = useState(0);

  async function reload() {
    setState(await stateService.loadState());
  }

  useDidShow(() => { void reload(); });

  async function createDecree() {
    if (!title.trim() && !text.trim()) {
      await Taro.showToast({ title: "先写圣旨内容", icon: "none" });
      return;
    }
    const next = await stateService.createDecree({
      title: title.trim() || toneOptions[toneIndex].label,
      text: text.trim() || "老妞大人已作出裁定。",
      tone: toneOptions[toneIndex].tone
    });
    setState(next);
    setTitle("");
    setText("");
    await Taro.showToast({ title: "已下达", icon: "success" });
  }

  if (!state) return <View className="page"><Text>加载中...</Text></View>;

  return (
    <View className="page scene-page decrees-page">
      <Text className="title">圣旨 / 裁定</Text>

      <View className="panel section decree-form">
        <Text className="section-title">手动下达</Text>
        <View className="field"><Text className="label">标题</Text><Input className="input" value={title} placeholder="例如：今日裁定" onInput={(event) => setTitle(String(event.detail.value))} /></View>
        <View className="field">
          <Text className="label">语气</Text>
          <Picker mode="selector" range={toneOptions.map((item) => item.label)} value={toneIndex} onChange={(event) => setToneIndex(Number(event.detail.value))}>
            <View className="picker-line">{toneOptions[toneIndex].label}</View>
          </Picker>
        </View>
        <View className="field"><Text className="label">内容</Text><Textarea className="textarea" value={text} placeholder="写给老哥看的裁定内容" onInput={(event) => setText(String(event.detail.value))} /></View>
        <Button className="btn section" onClick={createDecree}>下达圣旨</Button>
      </View>

      <Text className="section-title">最近圣旨</Text>
      {state.decrees.length ? state.decrees.map((decree) => (
        <View className={`panel section decree-card decree-card--${decree.tone}`} key={decree.id}>
          <View className="decree-card__header">
            <Text className="decree-title">{decree.title}</Text>
            <Text className="decree-time">{formatTime(decree.createdAt)}</Text>
          </View>
          <Text className="subtitle">{decree.text}</Text>
        </View>
      )) : <View className="empty">暂无圣旨</View>}
    </View>
  );
}
