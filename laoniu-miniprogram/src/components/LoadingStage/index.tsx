import { Button, Image, Text, View } from "@tarojs/components";
import { loadingAsset } from "../../services/assets";
import "./index.scss";

export function LoadingStage({ percent, phase, onContinue, onRetry }: { percent: number; phase: "loading" | "ready" | "error"; onContinue: () => void; onRetry: () => void }) {
  return (
    <View className="loading-stage panel">
      <Image className="loading-stage__logo" src={loadingAsset("loading-logo.png")} mode="aspectFit" />
      <Text className="title">{phase === "error" ? "加载失败" : "老妞正在下旨"}</Text>
      <Text className="subtitle">{phase === "ready" ? "准备好了，继续进入。" : "正在整理角色、任务、权益和圣旨。"}</Text>
      <View className="loading-stage__bar"><View className="loading-stage__fill" style={{ width: `${percent}%` }} /></View>
      {phase === "ready" ? <Button className="btn section" onClick={onContinue}>继续</Button> : null}
      {phase === "error" ? <Button className="btn section" onClick={onRetry}>重试</Button> : null}
    </View>
  );
}
