import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import { LoadingStage } from "../../components/LoadingStage";
import { preloadRouteAssets } from "../../services/preload";

export default function LoadingPage() {
  const [percent, setPercent] = useState(1);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const target = (Taro.getCurrentInstance().router?.params.target || "husband") as "husband" | "wife";

  function run() {
    setPhase("loading");
    setPercent(1);
    let current = 1;
    const timer = setInterval(() => {
      current = Math.min(99, current + 7);
      setPercent(current);
    }, 120);
    preloadRouteAssets(target)
      .then(() => {
        clearInterval(timer);
        setPercent(100);
        setPhase("ready");
      })
      .catch(() => {
        clearInterval(timer);
        setPhase("error");
      });
  }

  useEffect(run, [target]);

  function goNext() {
    const url = target === "wife" ? "/subpackages/wife/pages/dashboard/index" : "/subpackages/husband/pages/role/index";
    Taro.redirectTo({ url });
  }

  return (
    <View className="page scene-page">
      <LoadingStage percent={percent} phase={phase} target={target} onContinue={goNext} onRetry={run} />
    </View>
  );
}
