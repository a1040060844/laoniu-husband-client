import { publicAsset } from "./assets";
import bgRoom from "../assets/login/bg-room.png";
import cardHusband from "../assets/login/card-husband.png";
import cardWife from "../assets/login/card-wife.png";
import resetButton from "../assets/login/reset-button.png";
import speechHusbandIdle from "../assets/login/speech/speech-husband-idle.png";
import speechHusbandLogin from "../assets/login/speech/speech-husband-login.png";
import speechHusbandSelect from "../assets/login/speech/speech-husband-select.png";
import speechWifeLogin from "../assets/login/speech/speech-wife-login.png";
import speechWifeResponse from "../assets/login/speech/speech-wife-response.png";
import thoughtWifeFood1 from "../assets/login/speech/thought-wife-food-1.png";
import thoughtWifeFood2 from "../assets/login/speech/thought-wife-food-2.png";
import subtitle from "../assets/login/subtitle.png";
import title from "../assets/login/title.png";
import {
  wifeLevelIllustrations,
  wifeTaskCompleteIllustration,
} from "../data/wifeIllustrations";
import { spriteConfigs } from "../pages/loginSpriteData";

export type AppRoute = "login" | "husband" | "wife";

type ProgressCallback = (loaded: number, total: number) => void;

const imageCache = new Map<string, Promise<void>>();
const ROUTE_TIMEOUT_MS = 8_000;

const loadingAssets = [
  "loading-logo.png",
  "loading-psd-panel.png",
  "loading-psd-husband.png",
  "loading-psd-wife.png",
  "loading-status-husband.png",
  "loading-task-husband.png",
  "loading-progress-track.png",
  "loading-progress-block.png",
  "loading-tip.png",
  "loading-alert.png",
  "loading-continue-button.png",
  "loading-retry-button.png",
].map((name) => publicAsset(`/assets/loading/${name}`));

const loginSpriteAssets = Object.values(spriteConfigs).flatMap((actions) =>
  Object.values(actions).map((config) => config.src),
);
const loginAssets = [
  ...loadingAssets,
  bgRoom,
  cardHusband,
  cardWife,
  resetButton,
  speechHusbandIdle,
  speechHusbandLogin,
  speechHusbandSelect,
  speechWifeLogin,
  speechWifeResponse,
  thoughtWifeFood1,
  thoughtWifeFood2,
  subtitle,
  title,
  ...loginSpriteAssets,
];
const roleAssets = Array.from({ length: 12 }, (_, index) =>
  publicAsset(`/assets/roles/role-${String(index).padStart(2, "0")}.png`),
);
const benefitAssets = Array.from({ length: 12 }, (_, index) =>
  publicAsset(`/assets/benefits/benefit-${String(index).padStart(2, "0")}.png`),
);
const wifeLevelAssets = wifeLevelIllustrations.flatMap((illustration) =>
  [
    illustration.growthPath,
    illustration.homePath,
    illustration.todayPath,
  ].flatMap((path) => (path ? [publicAsset(path)] : [])),
);
const wifeTaskCompleteAssets = [
  wifeTaskCompleteIllustration.growthPath,
  wifeTaskCompleteIllustration.homePath,
  wifeTaskCompleteIllustration.todayPath,
].map((path) => publicAsset(path));

const sharedRoleAssets = [
  ...loadingAssets,
  ...roleAssets,
  ...benefitAssets,
  publicAsset("/assets/tasks/task-lv01.png"),
  publicAsset("/assets/slave/slave-page-latest.png"),
  publicAsset("/assets/ui/return-login.png?v=3f13165c"),
  publicAsset("/assets/ui/swipe-up.png"),
  publicAsset("/assets/ui/swipe-down.png?v=2a55bb1a"),
  publicAsset("/assets/ui/swipe-return.png?v=b94ee0a3"),
  publicAsset("/assets/ui/swipe-down-return.png?v=7e938cd4"),
];

// Keep route-specific lists centralized so future screens can add assets here.
const routeAssets: Record<AppRoute, string[]> = {
  login: loginAssets,
  husband: sharedRoleAssets,
  wife: [
    ...sharedRoleAssets,
    publicAsset("/assets/wife/wife-main.jpeg"),
    publicAsset("/assets/wife/wife-home-throne.png"),
    publicAsset("/assets/wife/wife-growth-library.png"),
    publicAsset("/assets/wife/wife-today-bg.png"),
    ...wifeLevelAssets,
    ...wifeTaskCompleteAssets,
  ],
};

function uniqueSources(srcList: string[]) {
  return [...new Set(srcList.filter(Boolean))];
}

export function preloadImage(src: string): Promise<void> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  let request: Promise<void>;
  request = new Promise<void>((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };

    image.onerror = () => finish(new Error(`图片加载失败：${src}`));

    if (typeof image.decode === "function") {
      image.src = src;
      image
        .decode()
        .then(() => finish())
        .catch((error) => {
          if (image.complete && image.naturalWidth > 0) finish();
          else finish(error);
        });
      return;
    }

    image.onload = () => finish();
    image.src = src;
  }).catch((error) => {
    if (imageCache.get(src) === request) imageCache.delete(src);
    throw error;
  });

  imageCache.set(src, request);
  return request;
}

async function preloadBatch(
  srcList: string[],
  onProgress?: ProgressCallback,
  timeoutMs?: number,
): Promise<{ failed: string[] }> {
  const sources = uniqueSources(srcList);
  const total = sources.length;
  const pending = new Set(sources);
  const failed = new Set<string>();
  let loaded = 0;
  let acceptingProgress = true;
  let timeoutId: number | undefined;

  onProgress?.(0, total);
  if (total === 0) return { failed: [] };

  const tasks = sources.map((src) =>
    preloadImage(src)
      .catch(() => {
        failed.add(src);
      })
      .finally(() => {
        pending.delete(src);
        loaded += 1;
        if (acceptingProgress) onProgress?.(loaded, total);
      }),
  );

  const allSettled = Promise.allSettled(tasks).then(() => "settled" as const);
  const outcome = timeoutMs
    ? await Promise.race([
        allSettled,
        new Promise<"timeout">((resolve) => {
          timeoutId = window.setTimeout(() => resolve("timeout"), timeoutMs);
        }),
      ])
    : await allSettled;

  if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  acceptingProgress = false;

  if (outcome === "timeout") {
    pending.forEach((src) => {
      failed.add(src);
      imageCache.delete(src);
    });
  }

  return { failed: [...failed] };
}

export function preloadImages(
  srcList: string[],
  onProgress?: ProgressCallback,
): Promise<{ failed: string[] }> {
  return preloadBatch(srcList, onProgress);
}

export function preloadRouteAssets(
  route: AppRoute,
  onProgress?: (percent: number) => void,
): Promise<{ failed: string[] }> {
  return preloadBatch(
    routeAssets[route],
    (loaded, total) => {
      onProgress?.(total === 0 ? 100 : Math.round((loaded / total) * 100));
    },
    ROUTE_TIMEOUT_MS,
  );
}
