import Taro from "@tarojs/taro";
import { Button, Image, Text, View } from "@tarojs/components";
import { useEffect, useState, type CSSProperties } from "react";
import { DesignStage } from "../../components/DesignStage";
import { SpriteActor } from "../../components/SpriteActor";
import { RemoteSpriteSheetActor } from "../../components/SpriteSheetActor";
import husbandBlinkMeta from "../../assets/login-sprites/husband/blink/index.json";
import wifeBlinkMeta from "../../assets/login-sprites/wife/blink/index.json";
import catBlueBlinkMeta from "../../assets/login-sprites/cat-blue/blink/index.json";
import { isRemoteAssetMode } from "../../config/assets";
import { loginAsset, loginFullSpeechAsset, loginFullSpriteAsset, loginSpriteAsset } from "../../services/assets";
import { stateService } from "../../services/state";
import "./index.scss";

type RoleRoute = "husband" | "wife";
type CatTarget = "cat" | "catWhite";
type BubbleTarget = RoleRoute | "cat";
type DragTarget = RoleRoute | CatTarget;
type FullSpriteActor = "husband" | "wife" | "cat-blue" | "cat-white";
type BubbleIntent = "idle" | "drag" | "select" | "intro";
interface Position {
  x: number;
  y: number;
}

interface DragState {
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  target: DragTarget;
}

const LOVE_START_UTC = Date.UTC(2024, 8, 14);
const DAY_MS = 24 * 60 * 60 * 1000;

const bubbleLines: Record<BubbleTarget, string[]> = {
  husband: [
    "老哥准备报到，等老妞验收表现。",
    "眼镜扶好，今天也要认真升级。",
    "拖我一下试试，别太用力。"
  ],
  wife: [
    "老妞上线，今天也要把老哥安排明白。",
    "本宫看看今天该发什么任务。",
    "表现好就奖励，表现差就裁定。"
  ],
  cat: [
    "本地数据都在手机里，重置前记得想清楚。",
    "喵，数据先存在本机。",
    "我负责看守重置按钮。"
  ]
};

const initialOffsets: Record<DragTarget, Position> = {
  husband: { x: 0, y: 0 },
  wife: { x: 0, y: 0 },
  cat: { x: 0, y: 0 },
  catWhite: { x: 0, y: 0 }
};

const remoteStagePositions: Record<DragTarget, Position> = {
  husband: { x: 38, y: 55 },
  wife: { x: 59, y: 55 },
  cat: { x: 51, y: 66 },
  catWhite: { x: 63, y: 68 }
};

const remoteIdleActions: Record<DragTarget, string[]> = {
  husband: ["blink", "adjust-glasses", "nervous"],
  wife: ["blink", "thinking", "helpless"],
  cat: ["blink", "lick", "tail", "yawn", "lift"],
  catWhite: ["idle", "lookaround", "stretch", "roll", "jump"]
};

const remoteBubbleImages: Record<Exclude<BubbleTarget, "cat">, string[]> = {
  husband: [
    "speech-husband-idle.png",
    "speech-husband-login.png",
    "speech-husband-nervous.png",
    "speech-husband-select.png"
  ],
  wife: [
    "speech-wife-login.png",
    "speech-wife-response.png",
    "speech-wife-select.png",
    "thought-wife-food-1.png",
    "thought-wife-food-2.png",
    "thought-wife-food-3.png",
    "thought-wife-hotpot-bbq.png",
    "thought-wife-what-eat.png"
  ]
};

const wifeThoughtBubbles = [
  "thought-wife-food-1.png",
  "thought-wife-food-2.png",
  "thought-wife-food-3.png",
  "thought-wife-hotpot-bbq.png",
  "thought-wife-what-eat.png"
];

function getLoveDayCount(now = new Date()) {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.min(9999, Math.max(1, Math.floor((todayUtc - LOVE_START_UTC) / DAY_MS) + 1));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouch(event: any) {
  return event.touches?.[0] ?? event.changedTouches?.[0];
}

function pickLine(target: BubbleTarget) {
  const lines = bubbleLines[target];
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0];
}

function pickIdleAction(target: DragTarget) {
  const actions = remoteIdleActions[target];
  return actions[Math.floor(Math.random() * actions.length)] ?? "blink";
}

function pickRemoteBubbleImage(target: BubbleTarget, intent: BubbleIntent = "idle", action = "blink") {
  if (!isRemoteAssetMode() || target === "cat") return undefined;

  let image: string | undefined;
  if (target === "husband") {
    if (intent === "intro") image = "speech-husband-login.png";
    else if (intent === "select") image = "speech-husband-select.png";
    else if (intent === "drag" || action === "nervous") image = "speech-husband-nervous.png";
    else image = "speech-husband-idle.png";
  }

  if (target === "wife") {
    if (intent === "intro") image = "speech-wife-login.png";
    else if (intent === "select") image = "speech-wife-select.png";
    else if (intent === "drag" || action === "helpless") image = "speech-wife-response.png";
    else if (action === "thinking") image = wifeThoughtBubbles[Math.floor(Math.random() * wifeThoughtBubbles.length)];
    else image = "speech-wife-login.png";
  }

  const fallbackImages = remoteBubbleImages[target];
  image = image ?? fallbackImages[Math.floor(Math.random() * fallbackImages.length)] ?? fallbackImages[0];
  return loginFullSpeechAsset(image);
}

function dragLimit(target: DragTarget) {
  if (target === "cat" || target === "catWhite") return { x: 54, y: 34 };
  return { x: 30, y: 22 };
}

function dragStyle(position: Position) {
  return {
    "--drag-x": `${position.x}px`,
    "--drag-y": `${position.y}px`
  } as CSSProperties;
}

function stageActorStyle(target: DragTarget, offset: Position) {
  const position = remoteStagePositions[target];
  return {
    "--actor-x": `${position.x}%`,
    "--actor-y": `${position.y}%`,
    "--drag-x": `${offset.x}px`,
    "--drag-y": `${offset.y}px`
  } as CSSProperties;
}

function fullSpritePath(actor: FullSpriteActor, action: string, file: "index.json" | "sprite.png") {
  if (!isRemoteAssetMode()) return undefined;
  return loginFullSpriteAsset(`${actor}/${action}/${file}`);
}

function bubbleTargetForDrag(target: DragTarget): BubbleTarget {
  return target === "catWhite" ? "cat" : target;
}

function enter(role: RoleRoute) {
  Taro.navigateTo({ url: `/pages/loading/index?target=${role}` });
}

export default function LoginPage() {
  const [bubble, setBubble] = useState<BubbleTarget>("husband");
  const [bubbleLine, setBubbleLine] = useState(pickLine("husband"));
  const [bubbleImage, setBubbleImage] = useState(() => pickRemoteBubbleImage("husband", "intro"));
  const [activeTarget, setActiveTarget] = useState<BubbleTarget>("husband");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [offsets, setOffsets] = useState<Record<DragTarget, Position>>(initialOffsets);
  const [idleActions, setIdleActions] = useState<Record<DragTarget, string>>({
    husband: "blink",
    wife: "blink",
    cat: "blink",
    catWhite: "idle"
  });
  const [selecting, setSelecting] = useState<RoleRoute | null>(null);
  const loveDays = getLoveDayCount();

  function nudge(target: BubbleTarget, intent: BubbleIntent = "idle") {
    const nextAction = pickIdleAction(target);
    const nextCatWhiteAction = target === "cat" ? pickIdleAction("catWhite") : undefined;
    setBubble(target);
    setBubbleLine(pickLine(target));
    setBubbleImage(pickRemoteBubbleImage(target, intent, nextAction));
    setActiveTarget(target);
    setIdleActions((current) => ({
      ...current,
      [target]: nextAction,
      ...(nextCatWhiteAction ? { catWhite: nextCatWhiteAction } : {})
    }));
  }

  useEffect(() => {
    if (selecting || dragState) return undefined;
    const timer = setInterval(() => {
      const targets: BubbleTarget[] = ["husband", "wife", "cat"];
      const target = targets[Math.floor(Math.random() * targets.length)] ?? "husband";
      nudge(target);
    }, 5600);
    return () => clearInterval(timer);
  }, [dragState, selecting]);

  function beginDrag(target: DragTarget, event: any) {
    const touch = getTouch(event);
    if (!touch || selecting) return;
    event.stopPropagation?.();
    nudge(bubbleTargetForDrag(target), "drag");
    setDragState({
      originX: offsets[target].x,
      originY: offsets[target].y,
      startX: touch.clientX,
      startY: touch.clientY,
      target
    });
  }

  function moveDrag(event: any) {
    if (!dragState) return;
    const touch = getTouch(event);
    if (!touch) return;
    event.stopPropagation?.();
    const limit = dragLimit(dragState.target);
    const next = {
      x: clamp(dragState.originX + touch.clientX - dragState.startX, -limit.x, limit.x),
      y: clamp(dragState.originY + touch.clientY - dragState.startY, -limit.y, limit.y)
    };
    setOffsets((current) => ({ ...current, [dragState.target]: next }));
  }

  function endDrag(event: any) {
    if (!dragState) return;
    event.stopPropagation?.();
    setDragState(null);
  }

  async function handleEnter(role: RoleRoute) {
    nudge(role, "select");
    setSelecting(role);
    Taro.showToast({ title: role === "husband" ? "老哥报到" : "老妞上线", icon: "none", duration: 650 });
    setTimeout(() => enter(role), 420);
  }

  async function handleReset() {
    nudge("cat");
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

  const husbandAction = selecting === "husband" ? "select" : dragState?.target === "husband" ? "drag" : activeTarget === "husband" ? idleActions.husband : "blink";
  const wifeAction = selecting === "wife" ? "select" : dragState?.target === "wife" ? "drag" : activeTarget === "wife" ? idleActions.wife : "blink";
  const catAction = dragState?.target === "cat" ? "drag" : activeTarget === "cat" ? idleActions.cat : "blink";
  const catWhiteAction = dragState?.target === "catWhite" ? "drag" : idleActions.catWhite;
  const useRemoteStage = isRemoteAssetMode();

  return (
    <DesignStage className={`login-page ${useRemoteStage ? "login-page--remote-stage" : ""} ${selecting ? "is-selecting" : ""}`}>
      <Image className="login-page__bg" src={loginAsset("bg-room.png")} mode="aspectFill" />
      <View className="login-page__shade" />
      <View className="login-page__top-mask" />
      <View className="login-page__bottom-mask" />
      <View className="login-page__content">
        <Image className="login-page__title-image pixelated" src={loginAsset("title.png")} mode="aspectFit" />
        <Image className="login-page__subtitle-image pixelated" src={loginAsset("subtitle.png")} mode="aspectFit" />
        <Text className={`login-page__days ${loveDays >= 1000 ? "login-page__days--long" : ""}`}>第 {loveDays} 天</Text>

        <View className={`login-bubble login-bubble--${bubble}`}>
          {bubbleImage ? (
            <Image className="login-bubble__remote-image" src={bubbleImage} mode="aspectFit" />
          ) : (
            <>
              <Image className="login-bubble__image pixelated" src={loginAsset(bubble === "wife" ? "speech-wife.png" : "speech-husband.png")} mode="aspectFit" />
              <Text className="login-bubble__text">{bubbleLine}</Text>
            </>
          )}
        </View>

        {useRemoteStage ? (
          <View className="login-remote-stage">
            <View
              className={`login-remote-actor login-remote-actor--husband ${activeTarget === "husband" ? "is-active" : ""} ${dragState?.target === "husband" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("husband", event)}
              style={stageActorStyle("husband", offsets.husband)}
            >
              <SpriteActor mood="happy" active={activeTarget === "husband"} dragging={dragState?.target === "husband"} onTap={() => nudge("husband")}>
                <RemoteSpriteSheetActor
                  displayWidth={160}
                  fallbackMeta={husbandBlinkMeta}
                  fallbackSrc={loginSpriteAsset("husband/blink/sprite.png")}
                  metaUrl={fullSpritePath("husband", husbandAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("husband", husbandAction, "sprite.png")}
                />
              </SpriteActor>
            </View>
            <View
              className={`login-remote-actor login-remote-actor--wife ${activeTarget === "wife" ? "is-active" : ""} ${dragState?.target === "wife" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("wife", event)}
              style={stageActorStyle("wife", offsets.wife)}
            >
              <SpriteActor mood="proud" active={activeTarget === "wife"} dragging={dragState?.target === "wife"} onTap={() => nudge("wife")}>
                <RemoteSpriteSheetActor
                  displayWidth={160}
                  fallbackMeta={wifeBlinkMeta}
                  fallbackSrc={loginSpriteAsset("wife/blink/sprite.png")}
                  metaUrl={fullSpritePath("wife", wifeAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("wife", wifeAction, "sprite.png")}
                />
              </SpriteActor>
            </View>
            <View
              className={`login-remote-actor login-remote-actor--cat ${activeTarget === "cat" ? "is-active" : ""} ${dragState?.target === "cat" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("cat", event)}
              style={stageActorStyle("cat", offsets.cat)}
            >
              <View className="login-remote-actor__cat-wrap" onClick={() => nudge("cat")}>
                <RemoteSpriteSheetActor
                  className="login-page__cat"
                  displayWidth={104}
                  fallbackMeta={catBlueBlinkMeta}
                  fallbackSrc={loginSpriteAsset("cat-blue/blink/sprite.png")}
                  metaUrl={fullSpritePath("cat-blue", catAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("cat-blue", catAction, "sprite.png")}
                />
              </View>
            </View>
            <View
              className={`login-remote-actor login-remote-actor--cat-white ${activeTarget === "cat" ? "is-active" : ""} ${dragState?.target === "catWhite" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("catWhite", event)}
              style={stageActorStyle("catWhite", offsets.catWhite)}
            >
              <View className="login-remote-actor__cat-wrap" onClick={() => nudge("cat")}>
                <RemoteSpriteSheetActor
                  className="login-page__cat-white"
                  displayWidth={92}
                  fallbackMeta={catBlueBlinkMeta}
                  fallbackSrc={loginSpriteAsset("cat-blue/blink/sprite.png")}
                  hideUntilRemote
                  metaUrl={fullSpritePath("cat-white", catWhiteAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("cat-white", catWhiteAction, "sprite.png")}
                />
              </View>
            </View>
            <Button className="login-remote-card-button login-remote-card-button--husband" loading={selecting === "husband"} onClick={() => handleEnter("husband")}>
              <Image className="login-remote-card-button__image pixelated" src={loginAsset("card-husband.png")} mode="aspectFit" />
            </Button>
            <Button className="login-remote-card-button login-remote-card-button--wife" loading={selecting === "wife"} onClick={() => handleEnter("wife")}>
              <Image className="login-remote-card-button__image pixelated" src={loginAsset("card-wife.png")} mode="aspectFit" />
            </Button>
          </View>
        ) : (
          <>
          <View className="login-page__cards">
          <View className={`login-card panel ${activeTarget === "husband" ? "is-active" : ""} ${selecting === "husband" ? "is-entering" : ""}`} onClick={() => nudge("husband")}>
            <Image className="login-card__frame pixelated" src={loginAsset("card-husband.png")} mode="aspectFit" />
            <View
              className={`login-card__actor-drag ${dragState?.target === "husband" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("husband", event)}
              style={dragStyle(offsets.husband)}
            >
              <SpriteActor mood="happy" active={activeTarget === "husband"} dragging={dragState?.target === "husband"} onTap={() => nudge("husband")}>
                <RemoteSpriteSheetActor
                  displayWidth={160}
                  fallbackMeta={husbandBlinkMeta}
                  fallbackSrc={loginSpriteAsset("husband/blink/sprite.png")}
                  metaUrl={fullSpritePath("husband", husbandAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("husband", husbandAction, "sprite.png")}
                />
              </SpriteActor>
            </View>
            <Button className="btn" loading={selecting === "husband"} onClick={() => handleEnter("husband")}>我是老哥</Button>
          </View>
          <View className={`login-card panel ${activeTarget === "wife" ? "is-active" : ""} ${selecting === "wife" ? "is-entering" : ""}`} onClick={() => nudge("wife")}>
            <Image className="login-card__frame pixelated" src={loginAsset("card-wife.png")} mode="aspectFit" />
            <View
              className={`login-card__actor-drag ${dragState?.target === "wife" ? "is-dragging" : ""}`}
              onTouchEnd={endDrag}
              onTouchMove={moveDrag}
              onTouchStart={(event) => beginDrag("wife", event)}
              style={dragStyle(offsets.wife)}
            >
              <SpriteActor mood="proud" active={activeTarget === "wife"} dragging={dragState?.target === "wife"} onTap={() => nudge("wife")}>
                <RemoteSpriteSheetActor
                  displayWidth={160}
                  fallbackMeta={wifeBlinkMeta}
                  fallbackSrc={loginSpriteAsset("wife/blink/sprite.png")}
                  metaUrl={fullSpritePath("wife", wifeAction, "index.json")}
                  playbackRate={2}
                  src={fullSpritePath("wife", wifeAction, "sprite.png")}
                />
              </SpriteActor>
            </View>
            <Button className="btn" loading={selecting === "wife"} onClick={() => handleEnter("wife")}>我是老妞</Button>
          </View>
        </View>

        <View
          className={`login-page__cat-drag ${dragState?.target === "cat" ? "is-dragging" : ""}`}
          onTouchEnd={endDrag}
          onTouchMove={moveDrag}
          onTouchStart={(event) => beginDrag("cat", event)}
          style={dragStyle(offsets.cat)}
        >
          <View className={`login-page__cat-wrap ${activeTarget === "cat" ? "is-active" : ""}`} onClick={() => nudge("cat")}>
            <RemoteSpriteSheetActor
              className="login-page__cat"
              displayWidth={104}
              fallbackMeta={catBlueBlinkMeta}
              fallbackSrc={loginSpriteAsset("cat-blue/blink/sprite.png")}
              metaUrl={fullSpritePath("cat-blue", catAction, "index.json")}
              playbackRate={2}
              src={fullSpritePath("cat-blue", catAction, "sprite.png")}
            />
            <View className="login-page__cat-spark" />
          </View>
        </View>
          </>
        )}
        <Button className="login-page__reset btn btn-secondary" onClick={handleReset}>重置本地数据</Button>
      </View>
    </DesignStage>
  );
}
