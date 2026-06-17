import Taro from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { useState } from "react";
import { DesignStage } from "../../components/DesignStage";
import { SpriteActor } from "../../components/SpriteActor";
import { loginAsset } from "../../services/assets";
import { stateService } from "../../services/state";
import "./index.scss";

type RoleRoute = "husband" | "wife";
type BubbleTarget = RoleRoute | "cat";

const LOVE_START_UTC = Date.UTC(2024, 8, 14);
const DAY_MS = 24 * 60 * 60 * 1000;

const bubbleText: Record<BubbleTarget, string> = {
  husband: "老哥准备报到，等老妞验收表现。",
  wife: "老妞上线，今天也要把老哥安排明白。",
  cat: "本地数据都在手机里，重置前记得想清楚。"
};

function getLoveDayCount(now = new Date()) {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.min(9999, Math.max(1, Math.floor((todayUtc - LOVE_START_UTC) / DAY_MS) + 1));
}

function enter(role: RoleRoute) {
  Taro.navigateTo({ url: `/pages/loading/index?target=${role}` });
}

export default function LoginPage() {
  const [bubble, setBubble] = useState<BubbleTarget>("husband");
  const [selecting, setSelecting] = useState<RoleRoute | null>(null);
  const loveDays = getLoveDayCount();

  async function handleEnter(role: RoleRoute) {
    setBubble(role);
    setSelecting(role);
    Taro.showToast({ title: role === "husband" ? "老哥报到" : "老妞上线", icon: "none", duration: 650 });
    setTimeout(() => enter(role), 420);
  }

  async function handleReset() {
    setBubble("cat");
    const result = await Taro.showModal({
      title: "重置本地数据",
      content: "会清空本地进度、任务、权益申请和日志。确定重置吗？",
      confirmText: "重置",
      confirmColor: "#6f3f2c"
    });
    if (!result.confirm) return;
    await stateService.resetState();
    Taro.showToast({ title: "已重置", icon: "success" });
  }

  return (
    <DesignStage className={`login-page ${selecting ? "is-selecting" : ""}`}>
      <Image className="login-page__bg" src={loginAsset("bg-room.png")} mode="aspectFill" />
      <View className="login-page__shade" />
      <View className="login-page__top-mask" />
      <View className="login-page__bottom-mask" />
      <View className="login-page__content">
        <Image className="login-page__title-image pixelated" src={loginAsset("title.png")} mode="aspectFit" />
        <Image className="login-page__subtitle-image pixelated" src={loginAsset("subtitle.png")} mode="aspectFit" />
        <Text className={`login-page__days ${loveDays >= 1000 ? "login-page__days--long" : ""}`}>第 {loveDays} 天</Text>

        <View className={`login-bubble login-bubble--${bubble}`}>
          <Image className="login-bubble__image pixelated" src={loginAsset(bubble === "wife" ? "speech-wife.png" : "speech-husband.png")} mode="aspectFit" />
          <Text className="login-bubble__text">{bubbleText[bubble]}</Text>
        </View>

        <View className="login-page__cards">
          <View className={`login-card panel ${selecting === "husband" ? "is-active" : ""}`} onClick={() => setBubble("husband")}>
            <Image className="login-card__frame pixelated" src={loginAsset("card-husband.png")} mode="aspectFit" />
            <SpriteActor src={loginAsset("husband.png")} onTap={() => setBubble("husband")} />
            <Button className="btn" loading={selecting === "husband"} onClick={() => handleEnter("husband")}>我是老哥</Button>
          </View>
          <View className={`login-card panel ${selecting === "wife" ? "is-active" : ""}`} onClick={() => setBubble("wife")}>
            <Image className="login-card__frame pixelated" src={loginAsset("card-wife.png")} mode="aspectFit" />
            <SpriteActor src={loginAsset("wife.png")} onTap={() => setBubble("wife")} />
            <Button className="btn" loading={selecting === "wife"} onClick={() => handleEnter("wife")}>我是老妞</Button>
          </View>
        </View>

        <Image className="login-page__cat pixelated" src={loginAsset("cat-blue.png")} mode="aspectFit" onClick={() => setBubble("cat")} />
        <Button className="login-page__reset btn btn-secondary" onClick={handleReset}>重置本地数据</Button>
      </View>
    </DesignStage>
  );
}
