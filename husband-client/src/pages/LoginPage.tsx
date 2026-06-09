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

import bgRoom from "../assets/login/bg-room.png";
import cardHusband from "../assets/login/card-husband.png";
import cardWife from "../assets/login/card-wife.png";
import subtitle from "../assets/login/subtitle.png";
import title from "../assets/login/title.png";
import speechHusbandBg from "../assets/login/speech/speech-husband-bg.png";
import speechWifeBg from "../assets/login/speech/speech-wife-bg.png";
import thoughtWifeFood3 from "../assets/login/speech/thought-wife-food-3.png";
import thoughtWifeHotpotBbq from "../assets/login/speech/thought-wife-hotpot-bbq.png";
import thoughtWifeBg from "../assets/login/speech/thought-wife-bg.png";
import thoughtWifeWhatEat from "../assets/login/speech/thought-wife-what-eat.png";
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
  onEnterRole: (role: RoleRoute) => void;
}

interface Position {
  x: number;
  y: number;
}

interface ActiveBubble {
  kind: BubbleKind;
  target: CharacterTarget;
  text?: string;
  imageSrc?: string;
  imageAlt?: string;
}

interface SpriteSheetProps {
  config: SpriteActionConfig;
  className?: string;
  onComplete?: () => void;
}

interface SpriteRenderSnapshot {
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
}

interface LoginBubbleProps {
  bubble: ActiveBubble;
  config: SpriteActionConfig;
  position: Position;
}

type WifeThinkingBubble =
  | {
      imageAlt: string;
      imageSrc: string;
      type: "image";
    }
  | {
      text: string;
      type: "text";
    };

const defaultPositions: Record<SpriteId, Position> = {
  husband: { x: 38, y: 65 },
  wife: { x: 59, y: 65 },
  catBlue: { x: 51, y: 74 },
  catWhite: { x: 63, y: 76 },
};

const wifeThinkingBubbles: WifeThinkingBubble[] = [
  {
    imageAlt: "今天吃什么呢",
    imageSrc: thoughtWifeWhatEat,
    type: "image",
  },
  {
    imageAlt: "火锅还是烤肉呢",
    imageSrc: thoughtWifeHotpotBbq,
    type: "image",
  },
  {
    imageAlt: "还是看看老哥表现吧",
    imageSrc: thoughtWifeFood3,
    type: "image",
  },
];

const bubbleBackgrounds: Record<BubbleKind, string> = {
  speechHusband: speechHusbandBg,
  speechWife: speechWifeBg,
  thoughtWife: thoughtWifeBg,
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
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

function SpriteSheet({ className, config, onComplete }: SpriteSheetProps) {
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
  const currentSnapshot = { config, frameIndex: visibleFrameIndex };
  const visibleGhostSnapshot = ghostSnapshot ?? (isSwitchingSprite ? previousSnapshot : null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    previousSnapshotRef.current = currentSnapshot;
  });

  useEffect(() => {
    if (isSwitchingSprite) {
      setGhostSnapshot(previousSnapshot);
    }

    setFrameIndex(0);
    completedRef.current = false;

    let timeout = 0;
    const ghostTimeout = isSwitchingSprite
      ? window.setTimeout(() => setGhostSnapshot(null), 120)
      : 0;

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
      window.clearTimeout(timeout);
      if (ghostTimeout !== 0) window.clearTimeout(ghostTimeout);
    };
  }, [config]);

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
          className="draggable-sprite__sheet"
          config={config}
          onComplete={() => onActionComplete(id, action)}
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
      className={`login-bubble login-bubble--${bubble.kind}${
        bubble.imageSrc ? " login-bubble--image" : ""
      }`}
      style={
        {
          "--bubble-bg": `url(${bubbleBackgrounds[bubble.kind]})`,
          left: `calc(${position.x}% + ${config.headOffsetX}px)`,
          top: `calc(${position.y}% + ${config.headOffsetY}px)`,
        } as CSSProperties
      }
    >
      {bubble.imageSrc ? (
        <img
          className="login-bubble__image"
          src={bubble.imageSrc}
          alt={bubble.imageAlt ?? ""}
          draggable={false}
        />
      ) : (
        <span>{bubble.text}</span>
      )}
    </div>
  );
}

export function LoginPage({ onEnterRole }: LoginPageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const flowRef = useRef<FlowState>("idle");
  const draggingRef = useRef<SpriteId | null>(null);
  const wifeThinkingIndexRef = useRef(0);
  const actionsRef = useRef<Record<SpriteId, string>>({
    catBlue: "idle",
    catWhite: "idle",
    husband: "idle",
    wife: "idle",
  });
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
  const isBusy = flow !== "idle";

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

  const hideBubble = useCallback((target: CharacterTarget) => {
    setActiveBubbles((current) =>
      current.filter((bubble) => bubble.target !== target),
    );
  }, []);

  const hideAllBubbles = useCallback(() => {
    setActiveBubbles([]);
  }, []);

  const showBubble = useCallback(
    (target: CharacterTarget, kind: BubbleKind, text: string) => {
      setActiveBubbles((current) => [
        ...current.filter((bubble) => bubble.target !== target),
        { kind, target, text },
      ]);
    },
    [],
  );

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

  const setSpriteAction = useCallback((id: SpriteId, action: string) => {
    setActions((current) => {
      if (current[id] === action) return current;
      return { ...current, [id]: action };
    });
  }, []);

  useEffect(() => {
    const sources = new Set(
      Object.values(spriteConfigs).flatMap((actionsById) =>
        Object.values(actionsById).map((config) => config.src),
      ),
    );
    const images = Array.from(sources, (src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    return () => {
      images.forEach((image) => {
        image.src = "";
      });
    };
  }, []);

  useEffect(() => {
    addTimeout(
      () => showBubble("husband", "speechHusband", "我今天一定好好表现！"),
      300,
    );
    addTimeout(
      () => showBubble("wife", "speechWife", "先看看老哥表现。"),
      600,
    );
    addTimeout(hideAllBubbles, 4200);

    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id));
      timeoutRefs.current = [];
    };
  }, [addTimeout, hideAllBubbles, showBubble]);

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
            if (nextBubble.type === "image") {
              showImageBubble(
                "wife",
                "thoughtWife",
                nextBubble.imageSrc,
                nextBubble.imageAlt,
              );
            } else {
              showBubble("wife", "thoughtWife", nextBubble.text);
            }
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
  }, [setSpriteAction, showBubble, showImageBubble]);

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

      setSpriteAction(id, "idle");

      if (id === "wife" && action === "thinking") {
        hideBubble("wife");
      }

      if (id === "husband" || id === "wife") {
        const selection = selectionRef.current;
        if (selection && id === selection.target && action === "select") {
          completeSelection();
        }
      }
    },
    [completeSelection, hideBubble, setSpriteAction],
  );

  function beginSelect(role: RoleRoute) {
    if (flowRef.current !== "idle") return;
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
        () => showBubble("wife", "speechWife", "本宫上线，先查老哥表现。"),
        100,
      );
      addTimeout(
        () => showBubble("husband", "speechHusband", "收到，我立刻站好。"),
        450,
      );
    } else {
      addTimeout(
        () => showBubble("husband", "speechHusband", "老妞大人，我上线待命。"),
        100,
      );
      addTimeout(
        () =>
          showBubble("wife", "speechWife", "准了，进去把今天的事做好。"),
        450,
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
        <div className="login-stage__top-mask" aria-hidden="true" />
        <div className="login-stage__bottom-mask" aria-hidden="true" />

        <img className="login-layer login-title" src={title} alt="今天谁来上线？" />
        <img
          className="login-layer login-subtitle"
          src={subtitle}
          alt="点击角色进入对应主页"
        />

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

        <button
          className="login-card-button login-card-button--husband"
          type="button"
          disabled={isBusy}
          aria-label="点击老哥本人按钮进入老公端"
          onClick={() => beginSelect("husband")}
        >
          <img src={cardHusband} alt="老哥本人" draggable={false} />
        </button>
        <button
          className="login-card-button login-card-button--wife"
          type="button"
          disabled={isBusy}
          aria-label="点击老妞大人按钮进入老婆端"
          onClick={() => beginSelect("wife")}
        >
          <img src={cardWife} alt="老妞大人" draggable={false} />
        </button>

        <div className="login-page__fade" aria-hidden="true" />
      </div>
    </section>
  );
}
