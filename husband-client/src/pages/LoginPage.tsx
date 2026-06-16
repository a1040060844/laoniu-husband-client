import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./LoginPage.css";
import { ClickSpark } from "../components/effects/ClickSpark";
import { CountUp } from "../components/effects/CountUp";

import bgRoom from "../assets/login/bg-room.png";
import cardHusband from "../assets/login/card-husband.png";
import cardWife from "../assets/login/card-wife.png";
import resetButton from "../assets/login/reset-button.png";
import subtitle from "../assets/login/subtitle.png";
import title from "../assets/login/title.png";
import speechHusbandIdle from "../assets/login/speech/speech-husband-idle.png";
import speechHusbandLogin from "../assets/login/speech/speech-husband-login.png";
import speechHusbandSelect from "../assets/login/speech/speech-husband-select.png";
import speechWifeLogin from "../assets/login/speech/speech-wife-login.png";
import speechWifeResponse from "../assets/login/speech/speech-wife-response.png";
import thoughtWifeFood1 from "../assets/login/speech/thought-wife-food-1.png";
import thoughtWifeFood2 from "../assets/login/speech/thought-wife-food-2.png";
import {
  catBlueWeightedActions,
  catWhiteWeightedActions,
  husbandWeightedActions,
  spriteConfigs,
  type SpriteActionConfig,
  type SpriteId,
  wifeWeightedActions,
} from "./loginSpriteData";

type RoleRoute = "husband" | "wife";
type CharacterTarget = "husband" | "wife";
type FlowState = "idle" | "selectingHusband" | "selectingWife" | "exiting";
type BubbleKind = "speechHusband" | "speechWife" | "thoughtWife";

interface LoginPageProps {
  isEntering?: boolean;
  onEnterRole: (role: RoleRoute) => void;
}

interface Position {
  x: number;
  y: number;
}

interface ActiveBubble {
  kind: BubbleKind;
  target: CharacterTarget;
  imageSrc: string;
  imageAlt: string;
}

interface SpriteSheetProps {
  action: string;
  config: SpriteActionConfig;
  className?: string;
  onComplete?: () => void;
  playbackKey: number;
}

interface SpriteRenderSnapshot {
  action: string;
  config: SpriteActionConfig;
  frameIndex: number;
}

interface DraggableSpriteProps {
  id: SpriteId;
  action: string;
  actions: Record<string, SpriteActionConfig>;
  position: Position;
  stageRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  ariaLabel: string;
  isDragging: boolean;
  onActionComplete: (id: SpriteId, action: string) => void;
  onSpriteClick: (id: SpriteId) => void;
  onPositionChange: (id: SpriteId, position: Position) => void;
  onDragStart: (id: SpriteId) => void;
  onDragEnd: (id: SpriteId) => void;
  playbackKey: number;
}

interface LoginBubbleProps {
  bubble: ActiveBubble;
  config: SpriteActionConfig;
  position: Position;
}

interface WifeThinkingBubble {
  imageAlt: string;
  imageSrc: string;
}

const LOVE_START_UTC = Date.UTC(2024, 8, 14);
const DAY_MS = 24 * 60 * 60 * 1000;
const LOGIN_BG_WIDTH = 941;
const LOGIN_BG_HEIGHT = 1672;
const TREE_PLAQUE_CENTER = { x: 206, y: 1144 };

function getLoveDayCount(now = new Date()) {
  const todayUtc = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const diffDays = Math.floor((todayUtc - LOVE_START_UTC) / DAY_MS);
  const inclusiveDays = diffDays + 1;

  return Math.min(9999, Math.max(1, inclusiveDays));
}

const defaultPositions: Record<SpriteId, Position> = {
  husband: { x: 38, y: 65 },
  wife: { x: 59, y: 65 },
  catBlue: { x: 51, y: 74 },
  catWhite: { x: 63, y: 76 },
};

const defaultActions: Record<SpriteId, string> = {
  catBlue: "idle",
  catWhite: "idle",
  husband: "idle",
  wife: "idle",
};

const wifeThinkingBubbles: WifeThinkingBubble[] = [
  {
    imageAlt: "今天吃什么呢……",
    imageSrc: speechWifeResponse,
  },
  {
    imageAlt: "火锅？烤肉？奶茶？",
    imageSrc: speechHusbandSelect,
  },
  {
    imageAlt: "先看看老哥表现。",
    imageSrc: speechHusbandIdle,
  },
];

const bubbleImageSources = [
  speechHusbandIdle,
  speechHusbandLogin,
  speechHusbandSelect,
  speechWifeLogin,
  speechWifeResponse,
  thoughtWifeFood1,
  thoughtWifeFood2,
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const spriteImageElements = new Map<string, HTMLImageElement>();
const spriteImagePromises = new Map<string, Promise<void>>();

function preloadSpriteImage(src: string) {
  const cached = spriteImagePromises.get(src);
  if (cached) return cached;

  const image = new Image();
  spriteImageElements.set(src, image);
  const promise = new Promise<void>((resolve) => {
    const finish = () => resolve();
    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
    image.src = src;

    if (typeof image.decode === "function") {
      void image.decode().then(finish, finish);
    } else if (image.complete) {
      finish();
    }
  });
  spriteImagePromises.set(src, promise);
  return promise;
}

function pickDifferent(items: string[], current: string) {
  const candidates = items.filter((item) => item !== current);
  return pickRandom(candidates.length > 0 ? candidates : items);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDisplayHeight(config: SpriteActionConfig) {
  return (config.displayWidth * config.meta.frame_size.h) / config.meta.frame_size.w;
}

function getScale(config: SpriteActionConfig) {
  return config.displayWidth / config.meta.frame_size.w;
}

function getFrameDelay(config: SpriteActionConfig, frameIndex: number) {
  const frames = config.meta.frames;
  const fallback = 1000 / config.fps;
  const current = frames[frameIndex];
  const next = frames[frameIndex + 1];

  if (!current || !next) return fallback;

  const delta = next.t - current.t;
  const delay = delta > 0 && delta < 10 ? delta * 1000 : delta;
  if (!Number.isFinite(delay) || delay < 16 || delay > 2500) return fallback;
  return delay / Math.max(config.playbackRate, 0.1);
}

function getSpriteFrameStyle(
  snapshot: SpriteRenderSnapshot,
  alignToConfig?: SpriteActionConfig,
) {
  const { config } = snapshot;
  const scale = getScale(config);
  const alignScale = alignToConfig ? getScale(alignToConfig) : scale;
  const frame =
    config.meta.frames[snapshot.frameIndex] ?? config.meta.frames[0];
  const frameBounds = config.frameBounds[snapshot.frameIndex];
  const bottomOffset =
    config.stabilizeBottom && frameBounds
      ? (config.anchorY - (frameBounds.y + frameBounds.h)) * scale
      : 0;
  const visualOffset = bottomOffset + config.visualOffsetY;
  const alignOffsetX = alignToConfig
    ? alignToConfig.anchorX * alignScale - config.anchorX * scale
    : 0;
  const alignOffsetY = alignToConfig
    ? alignToConfig.anchorY * alignScale - config.anchorY * scale
    : 0;
  const translateX = alignOffsetX;
  const translateY = alignOffsetY + visualOffset;

  return {
    "--sprite-bg": `url(${config.src})`,
    "--sprite-height": `${frame.h * scale}px`,
    "--sprite-width": `${frame.w * scale}px`,
    "--sprite-sheet-height": `${config.meta.sheet_size.h * scale}px`,
    "--sprite-sheet-width": `${config.meta.sheet_size.w * scale}px`,
    backgroundPosition: `${frame.x * scale * -1}px ${
      frame.y * scale * -1
    }px`,
    transform:
      translateX === 0 && translateY === 0
        ? undefined
        : `translate(${translateX}px, ${translateY}px)`,
  } as CSSProperties;
}

function SpriteSheet({
  action,
  className,
  config,
  onComplete,
  playbackKey,
}: SpriteSheetProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [ghostSnapshot, setGhostSnapshot] =
    useState<SpriteRenderSnapshot | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const previousSnapshotRef = useRef<SpriteRenderSnapshot | null>(null);
  const scale = getScale(config);
  const previousSnapshot = previousSnapshotRef.current;
  const isSwitchingSprite =
    previousSnapshot !== null && previousSnapshot.config.src !== config.src;
  const visibleFrameIndex = isSwitchingSprite ? 0 : frameIndex;
  const frame = config.meta.frames[visibleFrameIndex] ?? config.meta.frames[0];
  const currentSnapshot = { action, config, frameIndex: visibleFrameIndex };
  const visibleGhostSnapshot =
    ghostSnapshot ?? (isSwitchingSprite ? previousSnapshot : null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    previousSnapshotRef.current = currentSnapshot;
  });

  useEffect(() => {
    if (isSwitchingSprite) {
      setGhostSnapshot(previousSnapshot);
    } else {
      setGhostSnapshot(null);
    }

    setFrameIndex(0);
    completedRef.current = false;

    let timeout = 0;
    let paintFrame = 0;
    let settleFrame = 0;
    let cancelled = false;

    if (isSwitchingSprite) {
      void preloadSpriteImage(config.src).then(() => {
        if (cancelled) return;
        paintFrame = window.requestAnimationFrame(() => {
          settleFrame = window.requestAnimationFrame(() => {
            if (!cancelled) setGhostSnapshot(null);
          });
        });
      });
    }

    function schedule(current: number) {
      timeout = window.setTimeout(() => {
        const isLastFrame = current >= config.meta.frames.length - 1;

        if (isLastFrame && !config.loop) {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current?.();
          }
          return;
        }

        const next = isLastFrame ? 0 : current + 1;
        setFrameIndex(next);
        schedule(next);
      }, getFrameDelay(config, current));
    }

    schedule(0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (paintFrame !== 0) window.cancelAnimationFrame(paintFrame);
      if (settleFrame !== 0) window.cancelAnimationFrame(settleFrame);
    };
  }, [config, playbackKey]);

  return (
    <span
      className={`sprite-sheet-stack${className ? ` ${className}` : ""}`}
      style={
        {
          "--sprite-stack-height": `${frame.h * scale}px`,
          "--sprite-stack-width": `${frame.w * scale}px`,
        } as CSSProperties
      }
    >
      {visibleGhostSnapshot && (
        <span
          className="sprite-sheet sprite-sheet--ghost"
          style={getSpriteFrameStyle(visibleGhostSnapshot, config)}
        />
      )}
      <span
        className="sprite-sheet"
        style={getSpriteFrameStyle(currentSnapshot)}
      />
    </span>
  );
}

function DraggableSprite({
  action,
  actions,
  ariaLabel,
  disabled = false,
  id,
  isDragging,
  onActionComplete,
  onDragEnd,
  onDragStart,
  onSpriteClick,
  onPositionChange,
  playbackKey,
  position,
  stageRef,
}: DraggableSpriteProps) {
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    capturing: false,
    dragging: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });
  const config = actions[action] ?? actions.idle;
  const displayHeight = getDisplayHeight(config);
  const scale = getScale(config);
  const anchorXPct = (config.anchorX / config.meta.frame_size.w) * 100;
  const anchorYPct = (config.anchorY / config.meta.frame_size.h) * 100;

  const updateFromPointer = useCallback(
    (event: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const sprite = spriteRef.current;
      if (!stage || !sprite) return;

      const stageRect = stage.getBoundingClientRect();
      const hitbox = config.hitbox;
      const hitboxLeftFromAnchor = (hitbox.x - config.anchorX) * scale;
      const hitboxRightFromAnchor =
        (hitbox.x + hitbox.width - config.anchorX) * scale;
      const hitboxTopFromAnchor = (hitbox.y - config.anchorY) * scale;
      const hitboxBottomFromAnchor =
        (hitbox.y + hitbox.height - config.anchorY) * scale;
      const anchorX = event.clientX - dragRef.current.offsetX;
      const anchorY = event.clientY - dragRef.current.offsetY;

      const minX = stageRect.left - hitboxLeftFromAnchor;
      const maxX = stageRect.right - hitboxRightFromAnchor;
      const minY = stageRect.top - hitboxTopFromAnchor;
      const maxY = stageRect.bottom - hitboxBottomFromAnchor;
      const clampedX = clamp(anchorX, minX, maxX);
      const clampedY = clamp(anchorY, minY, maxY);

      onPositionChange(id, {
        x: ((clampedX - stageRect.left) / stageRect.width) * 100,
        y: ((clampedY - stageRect.top) / stageRect.height) * 100,
      });
    },
    [config, id, onPositionChange, scale, stageRef],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();

    const sprite = spriteRef.current;
    if (!sprite) return;

    const spriteRect = sprite.getBoundingClientRect();
    const anchorScreenX = spriteRect.left + config.anchorX * scale;
    const anchorScreenY = spriteRect.top + config.anchorY * scale;
    dragRef.current = {
      capturing: true,
      dragging: false,
      offsetX: event.clientX - anchorScreenX,
      offsetY: event.clientY - anchorScreenY,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.capturing || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const shouldStartDrag = Math.hypot(deltaX, deltaY) >= 6;

    if (!dragRef.current.dragging) {
      if (!shouldStartDrag) return;
      dragRef.current.dragging = true;
      onDragStart(id);
    }

    updateFromPointer(event);
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.capturing) return;
    event.preventDefault();
    event.stopPropagation();
    const wasDragging = dragRef.current.dragging;
    dragRef.current.capturing = false;
    dragRef.current.dragging = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (wasDragging) {
      onDragEnd(id);
      return;
    }
    onSpriteClick(id);
  }

  return (
    <div
      ref={spriteRef}
      aria-label={ariaLabel}
      className={`draggable-sprite draggable-sprite--${id}${
        isDragging ? " is-dragging" : ""
      }`}
      role="img"
      style={
        {
          "--anchor-x": `${anchorXPct}%`,
          "--anchor-y": `${anchorYPct}%`,
          "--display-height": `${displayHeight}px`,
          "--display-width": `${config.displayWidth}px`,
          "--hitbox-height": `${config.hitbox.height * scale}px`,
          "--hitbox-left": `${config.hitbox.x * scale}px`,
          "--hitbox-top": `${config.hitbox.y * scale}px`,
          "--hitbox-width": `${config.hitbox.width * scale}px`,
          "--lift-y": `${config.liftY}px`,
          left: `${position.x}%`,
          top: `${position.y}%`,
          zIndex: isDragging ? 95 : Math.round(10 + position.y),
        } as CSSProperties
      }
    >
      <div className="draggable-sprite__visual">
        <SpriteSheet
          action={action}
          className="draggable-sprite__sheet"
          config={config}
          onComplete={() => onActionComplete(id, action)}
          playbackKey={playbackKey}
        />
      </div>
      <div
        className="draggable-sprite__hitbox"
        onPointerCancel={finishDrag}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
      />
    </div>
  );
}

function LoginBubble({ bubble, config, position }: LoginBubbleProps) {
  return (
    <div
      className={`login-bubble login-bubble--${bubble.kind} login-bubble--image`}
      style={
        {
          left: `calc(${position.x}% + ${config.headOffsetX}px)`,
          top: `calc(${position.y}% + ${config.headOffsetY}px)`,
        } as CSSProperties
      }
    >
      <img
        className="login-bubble__image"
        src={bubble.imageSrc}
        alt={bubble.imageAlt}
        draggable={false}
      />
    </div>
  );
}

export function LoginPage({ isEntering = false, onEnterRole }: LoginPageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const flowRef = useRef<FlowState>("idle");
  const draggingRef = useRef<SpriteId | null>(null);
  const wifeThinkingIndexRef = useRef(0);
  const actionsRef = useRef<Record<SpriteId, string>>(defaultActions);
  const selectionRef = useRef<{
    role: RoleRoute;
    target: CharacterTarget;
  } | null>(null);
  const [positions, setPositions] =
    useState<Record<SpriteId, Position>>(defaultPositions);
  const [actions, setActions] = useState<Record<SpriteId, string>>(
    actionsRef.current,
  );
  const [draggingId, setDraggingId] = useState<SpriteId | null>(null);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [activeBubbles, setActiveBubbles] = useState<ActiveBubble[]>([]);
  const [playbackKey, setPlaybackKey] = useState(0);
  const [loveDayCount, setLoveDayCount] = useState(() => getLoveDayCount());
  const [lovePlaquePosition, setLovePlaquePosition] =
    useState<Position | null>(null);
  const isBusy = flow !== "idle" || isEntering;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateLovePlaquePosition = () => {
      const scale = Math.max(
        stage.clientWidth / LOGIN_BG_WIDTH,
        stage.clientHeight / LOGIN_BG_HEIGHT,
      );
      const renderedWidth = LOGIN_BG_WIDTH * scale;
      const horizontalCrop = (renderedWidth - stage.clientWidth) / 2;

      setLovePlaquePosition({
        x: TREE_PLAQUE_CENTER.x * scale - horizontalCrop,
        y: TREE_PLAQUE_CENTER.y * scale,
      });
    };

    updateLovePlaquePosition();
    const resizeObserver = new ResizeObserver(updateLovePlaquePosition);
    resizeObserver.observe(stage);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoveDayCount(getLoveDayCount());
    }, 60 * 60 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    draggingRef.current = draggingId;
  }, [draggingId]);

  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  const clearLoginTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  }, []);

  const hideBubble = useCallback((target: CharacterTarget) => {
    setActiveBubbles((current) =>
      current.filter((bubble) => bubble.target !== target),
    );
  }, []);

  const hideAllBubbles = useCallback(() => {
    setActiveBubbles([]);
  }, []);

  const showImageBubble = useCallback(
    (
      target: CharacterTarget,
      kind: BubbleKind,
      imageSrc: string,
      imageAlt: string,
    ) => {
      setActiveBubbles((current) => [
        ...current.filter((bubble) => bubble.target !== target),
        { imageAlt, imageSrc, kind, target },
      ]);
    },
    [],
  );

  const playLoginIntro = useCallback(() => {
    clearLoginTimeouts();
    hideAllBubbles();
    addTimeout(
      () =>
        showImageBubble(
          "wife",
          "speechWife",
          speechWifeLogin,
          "老妞驾到~~~",
        ),
      300,
    );
    addTimeout(
      () =>
        showImageBubble(
          "husband",
          "speechHusband",
          speechHusbandLogin,
          "老妞万岁！万岁！万万岁！",
        ),
      600,
    );
    addTimeout(hideAllBubbles, 4200);
  }, [addTimeout, clearLoginTimeouts, hideAllBubbles, showImageBubble]);

  const setSpriteAction = useCallback((id: SpriteId, action: string) => {
    setActions((current) => {
      if (current[id] === action) return current;
      return { ...current, [id]: action };
    });
  }, []);

  useEffect(() => {
    const sources = new Set([
      ...Object.values(spriteConfigs).flatMap((actionsById) =>
        Object.values(actionsById).map((config) => config.src),
      ),
      ...bubbleImageSources,
    ]);
    sources.forEach((src) => void preloadSpriteImage(src));
  }, []);

  useEffect(() => {
    playLoginIntro();

    return clearLoginTimeouts;
  }, [clearLoginTimeouts, playLoginIntro]);

  useEffect(() => {
    let cancelled = false;

    function scheduleCat(catId: "catBlue" | "catWhite") {
      window.setTimeout(() => {
        if (cancelled) return;
        if (
          flowRef.current === "idle" &&
          draggingRef.current !== catId &&
          actionsRef.current[catId] === "idle"
        ) {
          setSpriteAction(
            catId,
            pickRandom(
              catId === "catBlue"
                ? catBlueWeightedActions
                : catWhiteWeightedActions,
            ),
          );
        }
        scheduleCat(catId);
      }, randomBetween(7000, 14000));
    }

    scheduleCat("catBlue");
    scheduleCat("catWhite");

    return () => {
      cancelled = true;
    };
  }, [setSpriteAction]);

  useEffect(() => {
    let cancelled = false;

    function scheduleCharacter(characterId: "husband" | "wife") {
      window.setTimeout(() => {
        if (cancelled) return;
        if (
          flowRef.current === "idle" &&
          draggingRef.current !== characterId &&
          actionsRef.current[characterId] === "idle"
        ) {
          const nextAction = pickRandom(
            characterId === "husband"
              ? husbandWeightedActions
              : wifeWeightedActions,
          );
          setSpriteAction(characterId, nextAction);

          if (characterId === "wife" && nextAction === "thinking") {
            const nextBubble =
              wifeThinkingBubbles[
                wifeThinkingIndexRef.current % wifeThinkingBubbles.length
              ];
            wifeThinkingIndexRef.current += 1;
            showImageBubble(
              "wife",
              "thoughtWife",
              nextBubble.imageSrc,
              nextBubble.imageAlt,
            );
          }
        }
        scheduleCharacter(characterId);
      }, randomBetween(9000, 17000));
    }

    scheduleCharacter("husband");
    scheduleCharacter("wife");

    return () => {
      cancelled = true;
    };
  }, [setSpriteAction, showImageBubble]);

  const handlePositionChange = useCallback(
    (id: SpriteId, nextPosition: Position) => {
      setPositions((current) => ({
        ...current,
        [id]: nextPosition,
      }));
    },
    [],
  );

  const handleDragStart = useCallback(
    (id: SpriteId) => {
      if (flowRef.current !== "idle") return;
      setDraggingId(id);
      setSpriteAction(id, "drag");
      if (id === "husband") hideBubble("husband");
      if (id === "wife") hideBubble("wife");
    },
    [hideBubble, setSpriteAction],
  );

  const handleDragEnd = useCallback(
    (id: SpriteId) => {
      setDraggingId(null);
      setSpriteAction(id, "idle");
    },
    [setSpriteAction],
  );

  const handleSpriteClick = useCallback(
    (id: SpriteId) => {
      if (flowRef.current !== "idle") return;
      if (id === "catBlue") {
        setSpriteAction(
          id,
          pickDifferent(catBlueWeightedActions, actionsRef.current[id]),
        );
      }
      if (id === "catWhite") {
        setSpriteAction(
          id,
          pickDifferent(catWhiteWeightedActions, actionsRef.current[id]),
        );
      }
    },
    [setSpriteAction],
  );

  const handleReset = useCallback(() => {
    if (isEntering) return;
    clearLoginTimeouts();
    selectionRef.current = null;
    flowRef.current = "idle";
    draggingRef.current = null;
    actionsRef.current = defaultActions;
    wifeThinkingIndexRef.current = 0;
    setFlow("idle");
    setDraggingId(null);
    setPositions(defaultPositions);
    setActions(defaultActions);
    setPlaybackKey((current) => current + 1);
    playLoginIntro();
  }, [clearLoginTimeouts, isEntering, playLoginIntro]);

  const completeSelection = useCallback(() => {
    const selection = selectionRef.current;
    if (!selection) return;

    const { role } = selection;
    selectionRef.current = null;
    setFlow("exiting");
    onEnterRole(role);
  }, [onEnterRole]);

  const handleActionComplete = useCallback(
    (id: SpriteId, action: string) => {
      const config = spriteConfigs[id][action];
      if (!config || config.loop || action === "idle" || action === "drag") {
        return;
      }

      const selection = selectionRef.current;
      const shouldHoldWifeSelectionFrame =
        id === "wife" && selection?.target === "wife" && action === "select";

      if (!shouldHoldWifeSelectionFrame) {
        setSpriteAction(id, "idle");
      }

      if (id === "wife" && action === "thinking") {
        addTimeout(() => hideBubble("wife"), 500);
      }

      if (id === "husband" || id === "wife") {
        if (selection && id === selection.target && action === "select") {
          addTimeout(() => {
            hideAllBubbles();
            completeSelection();
          }, 500);
        }
      }
    },
    [addTimeout, completeSelection, hideAllBubbles, hideBubble, setSpriteAction],
  );

  function beginSelect(role: RoleRoute) {
    if (flowRef.current !== "idle" || isEntering) return;
    clearLoginTimeouts();
    const selectingWife = role === "wife";
    selectionRef.current = { role, target: selectingWife ? "wife" : "husband" };
    setFlow(selectingWife ? "selectingWife" : "selectingHusband");
    setDraggingId(null);
    hideAllBubbles();
    setActions((current) => ({
      ...current,
      catBlue: "idle",
      catWhite: "idle",
      husband: selectingWife ? "nervous" : "select",
      wife: selectingWife ? "select" : "response",
    }));

    if (selectingWife) {
      addTimeout(
        () =>
          showImageBubble(
            "wife",
            "speechWife",
            thoughtWifeFood2,
            "今天的规矩，我说了算。",
          ),
        100,
      );
    } else {
      addTimeout(
        () =>
          showImageBubble(
            "husband",
            "speechHusband",
            thoughtWifeFood1,
            "我今天一定好好表现！",
          ),
        100,
      );
    }
  }

  const bubbleByTarget = useMemo(
    () => ({
      husband: activeBubbles.find((bubble) => bubble.target === "husband"),
      wife: activeBubbles.find((bubble) => bubble.target === "wife"),
    }),
    [activeBubbles],
  );

  return (
    <section className={`login-page login-page--${flow}`} aria-label="角色登录">
      <div className="login-stage" ref={stageRef}>
        <img className="login-layer login-bg" src={bgRoom} alt="" />
        <div
          className={`login-tree-plaque-days login-tree-plaque-days--digits-${String(loveDayCount).length}`}
          aria-label={`从2024年9月14日至今第${loveDayCount}天`}
          style={
            lovePlaquePosition
              ? {
                  left: `${lovePlaquePosition.x}px`,
                  top: `${lovePlaquePosition.y - 2}px`,
                }
              : { visibility: "hidden" }
          }
        >
          <CountUp value={loveDayCount} duration={520} />
        </div>
        <div className="login-stage__top-mask" aria-hidden="true" />
        <div className="login-stage__bottom-mask" aria-hidden="true" />

        <img className="login-layer login-title" src={title} alt="今天谁来上线？" />
        <img
          className="login-layer login-subtitle"
          src={subtitle}
          alt="点击角色进入对应主页"
        />

        <button
          className="login-reset-button"
          type="button"
          disabled={isBusy}
          aria-label="复位所有角色并重播登录动画"
          onClick={handleReset}
        >
          <img src={resetButton} alt="复位" draggable={false} />
        </button>

        {(["husband", "wife", "catBlue", "catWhite"] as const).map((id) => (
          <DraggableSprite
            key={id}
            action={actions[id]}
            actions={spriteConfigs[id]}
            ariaLabel={`${id} 可拖拽`}
            disabled={isBusy}
            id={id}
            isDragging={draggingId === id}
            position={positions[id]}
            stageRef={stageRef}
            onActionComplete={handleActionComplete}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onPositionChange={handlePositionChange}
            onSpriteClick={handleSpriteClick}
            playbackKey={playbackKey}
          />
        ))}

        {bubbleByTarget.husband && draggingId !== "husband" && (
          <LoginBubble
            bubble={bubbleByTarget.husband}
            config={spriteConfigs.husband[actions.husband]}
            position={positions.husband}
          />
        )}
        {bubbleByTarget.wife && draggingId !== "wife" && (
          <LoginBubble
            bubble={bubbleByTarget.wife}
            config={spriteConfigs.wife[actions.wife]}
            position={positions.wife}
          />
        )}

        <ClickSpark>
          <button
            className="login-card-button login-card-button--husband"
            type="button"
            disabled={isBusy}
            aria-label="点击老哥本人按钮进入老公端"
            onClick={() => beginSelect("husband")}
          >
            <img src={cardHusband} alt="老哥本人" draggable={false} />
          </button>
        </ClickSpark>
        <ClickSpark>
          <button
            className="login-card-button login-card-button--wife"
            type="button"
            disabled={isBusy}
            aria-label="点击老妞大人按钮进入老婆端"
            onClick={() => beginSelect("wife")}
          >
            <img src={cardWife} alt="老妞大人" draggable={false} />
          </button>
        </ClickSpark>

        <div className="login-page__fade" aria-hidden="true" />
      </div>
    </section>
  );
}
