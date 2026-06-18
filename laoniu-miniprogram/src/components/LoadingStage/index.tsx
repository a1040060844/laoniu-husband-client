import { Button, Image, Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";
import { loadingAsset } from "../../services/assets";
import "./index.scss";

type LoadingTarget = "husband" | "wife";
type LoadingPhase = "loading" | "ready" | "error";

const loadingCopy: Record<LoadingTarget, string[]> = {
  husband: ["正在检查今日任务", "正在清点零花钱", "正在换上职务制服", "正在等待老妞裁定"],
  wife: ["正在调取老哥表现", "正在整理今日待处理", "正在加载赏罚权限", "正在准备裁定页面"]
};

export function LoadingStage({
  onContinue,
  onRetry,
  percent,
  phase,
  target
}: {
  onContinue: () => void;
  onRetry: () => void;
  percent: number;
  phase: LoadingPhase;
  target: LoadingTarget;
}) {
  const [copyIndex, setCopyIndex] = useState(0);
  const displayPercent = phase === "ready" ? 100 : Math.max(0, Math.min(99, Math.round(percent)));
  const filledSegments = displayPercent <= 0
    ? 0
    : displayPercent >= 100
      ? 13
      : Math.max(1, Math.round((displayPercent / 100) * 13));
  const statusText = phase === "error"
    ? "部分素材加载失败"
    : phase === "ready"
      ? target === "wife" ? "老妞端准备完成" : "老哥档案整理完成"
      : target === "wife" ? "正在打开老妞控制台" : "正在整理老哥档案";
  const taskText = phase === "error"
    ? "请检查本地资源后重试"
    : phase === "ready"
      ? "准备完成，请点击继续进入"
      : loadingCopy[target][copyIndex];

  useEffect(() => {
    setCopyIndex(0);
    if (phase !== "loading") return undefined;
    const timer = setInterval(() => {
      setCopyIndex((current) => (current + 1) % loadingCopy[target].length);
    }, 1450);
    return () => clearInterval(timer);
  }, [phase, target]);

  return (
    <View className={`loading-stage loading-stage--${phase}`}>
      <Image className="loading-stage__logo pixelated" src={loadingAsset("loading-logo.png")} mode="aspectFit" />
      <Image className="loading-stage__panel pixelated" src={loadingAsset("loading-psd-panel.png")} mode="aspectFit" />

      {phase === "error" ? (
        <Image className="loading-stage__alert pixelated" src={loadingAsset("loading-alert.png")} mode="aspectFit" />
      ) : (
        <>
          <Image className="loading-stage__husband pixelated" src={loadingAsset("loading-psd-husband.png")} mode="aspectFit" />
          <Image className="loading-stage__wife pixelated" src={loadingAsset("loading-psd-wife.png")} mode="aspectFit" />
        </>
      )}

      <View className={`loading-stage__status ${phase === "loading" && target === "husband" ? "loading-stage__status--image" : ""}`}>
        {phase === "loading" && target === "husband" ? (
          <Image src={loadingAsset("loading-status-husband.png")} mode="aspectFit" />
        ) : (
          <Text>{statusText}</Text>
        )}
      </View>

      <View className="loading-stage__task">
        {phase === "loading" && target === "husband" && copyIndex === 0 ? (
          <Image src={loadingAsset("loading-task-husband.png")} mode="aspectFit" />
        ) : (
          <Text>{taskText}</Text>
        )}
      </View>

      <View className="loading-stage__progress">
        <Image className="loading-stage__progress-track pixelated" src={loadingAsset("loading-progress-track.png")} mode="scaleToFill" />
        <View className="loading-stage__segments">
          {Array.from({ length: 13 }, (_, index) => (
            <Image
              className={index < filledSegments ? "is-filled" : ""}
              key={index}
              src={loadingAsset("loading-progress-block.png")}
              mode="scaleToFill"
            />
          ))}
        </View>
        <Text className="loading-stage__percent">{displayPercent}%</Text>
      </View>

      <Image className="loading-stage__tip pixelated" src={loadingAsset("loading-tip.png")} mode="aspectFit" />

      {phase === "ready" ? (
        <Button className="loading-stage__action" onClick={onContinue}>
          <Image src={loadingAsset("loading-continue-button.png")} mode="aspectFit" />
        </Button>
      ) : null}
      {phase === "error" ? (
        <Button className="loading-stage__action" onClick={onRetry}>
          <Image src={loadingAsset("loading-retry-button.png")} mode="aspectFit" />
        </Button>
      ) : null}
    </View>
  );
}
