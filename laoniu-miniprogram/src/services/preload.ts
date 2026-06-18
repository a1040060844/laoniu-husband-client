import Taro from "@tarojs/taro";
import { loginAsset, loadingAsset } from "./assets";

export type AppRoute = "login" | "loading" | "husband" | "wife";

const routeAssets: Record<AppRoute, string[]> = {
  login: [
    loginAsset("bg-room.png"),
    loginAsset("title.png"),
    loginAsset("subtitle.png"),
    loginAsset("card-husband.png"),
    loginAsset("card-wife.png"),
    loginAsset("speech-husband.png"),
    loginAsset("speech-wife.png")
  ],
  loading: [
    loadingAsset("loading-logo.png"),
    loadingAsset("loading-psd-panel.png"),
    loadingAsset("loading-progress-track.png"),
    loadingAsset("loading-progress-block.png")
  ],
  husband: [],
  wife: []
};

export async function preloadRouteAssets(route: AppRoute) {
  const assets = routeAssets[route] || [];
  const results = await Promise.allSettled(
    assets.map((src) =>
      Taro.getImageInfo({ src }).then(() => src)
    )
  );
  return {
    loaded: results.filter((item) => item.status === "fulfilled").length,
    failed: results.filter((item) => item.status === "rejected").length,
    total: assets.length
  };
}
