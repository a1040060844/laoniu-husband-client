import { useMemo, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, Input, Picker, Text, Textarea, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";
import type { DecreeEvent } from "../../../../types/domain";
import "./index.scss";

const toneOptions: Array<{ tone: DecreeEvent["tone"]; label: string; hint: string }> = [
  { tone: "normal", label: "普通裁定", hint: "日常通知、温和提醒" },
  { tone: "upgrade", label: "表扬晋升", hint: "奖励、鼓励、升级" },
  { tone: "down", label: "警告打回", hint: "驳回、扣分、降级提醒" },
  { tone: "punish", label: "惩罚裁定", hint: "奴役、暂停权益、最终裁定" },
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toneLabel(tone: DecreeEvent["tone"]) {
  return toneOptions.find((item) => item.tone === tone)?.label || "普通裁定";
}

export default function WifeDecreesPage() {
  const [state, setState] = useState<AppState>();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [toneIndex, setToneIndex] = useState(0);

  async function reload() {
    setState(await stateService.loadState());
  }

  useDidShow(() => {
    void reload();
  });

  const unreadCount = useMemo(() => state?.decrees.filter((item) => !item.acknowledgedAt).length || 0, [state]);
  const latest = useMemo(() => state?.decrees.slice(0, 20) || [], [state]);

  async function createDecree() {
    if (!title.trim() && !text.trim()) {
      await Taro.showToast({ title: "先写圣旨内容", icon: "none" });
      return;
    }
    const next = await stateService.createDecree({
      title: title.trim() || toneOptions[toneIndex].label,
      text: text.trim() || "老妞大人已作出裁定。",
      tone: toneOptions[toneIndex].tone,
    });
    setState(next);
    setTitle("");
    setText("");
    await Taro.showToast({ title: "已下达", icon: "success" });
  }

  if (!state) {
    return (
      <View className="page decrees-page">
        <Text className="decree-loading">加载裁定台...</Text>
      </View>
    );
  }

  return (
    <View className="page decrees-page">
      <View className="decree-hero">
        <Text className="decree-kicker">老妞端</Text>
        <Text className="decree-heading">圣旨裁定</Text>
        <Text className="decree-sub">赏罚升降，皆由老妞大人裁定。</Text>
        <View className="decree-summary">
          <View>
            <Text>{state.decrees.length}</Text>
            <Text>全部圣旨</Text>
          </View>
          <View>
            <Text>{unreadCount}</Text>
            <Text>待领命</Text>
          </View>
        </View>
      </View>

      <View className="decree-form">
        <Text className="section-title">手动下达</Text>
        <View className="field">
          <Text className="label">标题</Text>
          <Input className="input" value={title} placeholder="例如：今日裁定" onInput={(event) => setTitle(String(event.detail.value))} />
        </View>
        <View className="field">
          <Text className="label">语气</Text>
          <Picker mode="selector" range={toneOptions.map((item) => item.label)} value={toneIndex} onChange={(event) => setToneIndex(Number(event.detail.value))}>
            <View className="picker-line">
              <Text>{toneOptions[toneIndex].label}</Text>
              <Text>{toneOptions[toneIndex].hint}</Text>
            </View>
          </Picker>
        </View>
        <View className="field">
          <Text className="label">内容</Text>
          <Textarea className="textarea" value={text} placeholder="写给老哥看的裁定内容" onInput={(event) => setText(String(event.detail.value))} />
        </View>
        <Button className="decree-submit" onClick={createDecree}>下达圣旨</Button>
      </View>

      <Text className="section-title latest-title">最近圣旨</Text>
      {latest.length ? latest.map((decree) => (
        <View className={`decree-card decree-card--${decree.tone}`} key={decree.id}>
          <View className="decree-card__mark">
            <Text>{decree.tone === "punish" ? "罚" : decree.tone === "upgrade" ? "赏" : decree.tone === "down" ? "诫" : "令"}</Text>
          </View>
          <View className="decree-card__body">
            <View className="decree-card__header">
              <Text className="decree-title">{decree.title}</Text>
              <Text className="decree-tone">{toneLabel(decree.tone)}</Text>
            </View>
            <Text className="decree-text">{decree.text}</Text>
            <View className="decree-card__footer">
              <Text>{formatTime(decree.createdAt)}</Text>
              <Text>{decree.acknowledgedAt ? "老哥已领命" : "等待老哥领命"}</Text>
            </View>
          </View>
        </View>
      )) : <View className="decree-empty">暂无圣旨。</View>}
    </View>
  );
}
