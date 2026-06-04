import {
  useCallback,
  useEffect,
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
import catBlueAnnoyed from "../assets/login/cat-blue/cat_blue_annoyed_sheet.png";
import catBlueBlink from "../assets/login/cat-blue/cat_blue_blink_sheet.png";
import catBlueDrag from "../assets/login/cat-blue/cat_blue_drag_sheet.png";
import catBlueIdle from "../assets/login/cat-blue/cat_blue_idle_sheet.png";
import catBlueLick from "../assets/login/cat-blue/cat_blue_lick_sheet.png";
import catBlueSleep from "../assets/login/cat-blue/cat_blue_sleep_sheet.png";
import catBlueTail from "../assets/login/cat-blue/cat_blue_tail_sheet.png";
import catWhiteBlink from "../assets/login/cat-white/cat_white_blink_sheet.png";
import catWhiteDrag from "../assets/login/cat-white/cat_white_drag_sheet.png";
import catWhiteIdle from "../assets/login/cat-white/cat_white_idle_sheet.png";
import catWhiteJump from "../assets/login/cat-white/cat_white_jump_sheet.png";
import catWhiteLookaround from "../assets/login/cat-white/cat_white_lookaround_sheet.png";
import catWhiteRoll from "../assets/login/cat-white/cat_white_roll_sheet.png";
import catWhiteStretch from "../assets/login/cat-white/cat_white_stretch_sheet.png";
import husbandDrag from "../assets/login/husband/husband_drag_sheet.png";
import husbandIdle from "../assets/login/husband/husband_idle_adjust_glasses_sheet.png";
import husbandNervous from "../assets/login/husband/husband_nervous_sheet.png";
import husbandSelect from "../assets/login/husband/husband_select_sheet.png";
import speechHusbandBg from "../assets/login/speech/speech-husband-bg.png";
import speechWifeBg from "../assets/login/speech/speech-wife-bg.png";
import thoughtWifeBg from "../assets/login/speech/thought-wife-bg.png";
import wifeDrag from "../assets/login/wife/wife_drag_sheet.png";
import wifeIdle from "../assets/login/wife/wife_idle_thinking_food_sheet.png";
import wifeResponse from "../assets/login/wife/wife_response_sheet.png";
import wifeSelect from "../assets/login/wife/wife_select_sheet.png";

type RoleRoute = "husband" | "wife";
type SpriteId = "husband" | "wife" | "catBlue" | "catWhite";
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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpriteActionConfig {
  src: string;
  frames: number;
  fps: number;
  loop: boolean;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  anchorX: number;
  anchorY: number;
  headOffsetX: number;
  headOffsetY: number;
  hitbox: Rect;
  liftY: number;
}

interface ActiveBubble {
  kind: BubbleKind;
  target: CharacterTarget;
  text: string;
}

interface SpriteSheetProps {
  config: SpriteActionConfig;
  className?: string;
  onComplete?: () => void;
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
  onPositionChange: (id: SpriteId, position: Position) => void;
  onDragStart: (id: SpriteId) => void;
  onDragEnd: (id: SpriteId) => void;
}

interface LoginBubbleProps {
  bubble: ActiveBubble;
  config: SpriteActionConfig;
  position: Position;
}

const characterFrame = {
  anchorX: 135.75,
  anchorY: 690,
  displayWidth: 84,
  frameHeight: 724,
  frameWidth: 271.5,
  hitbox: { height: 610, width: 132, x: 70, y: 92 },
  liftY: 14,
};

const catFrame = {
  anchorX: 135.75,
  frameHeight: 724,
  frameWidth: 271.5,
  liftY: 12,
};

const defaultPositions: Record<SpriteId, Position> = {
  husband: { x: 38, y: 65 },
  wife: { x: 59, y: 65 },
  catBlue: { x: 51, y: 74 },
  catWhite: { x: 63, y: 76 },
};

const spriteConfigs: Record<SpriteId, Record<string, SpriteActionConfig>> = {
  husband: {
    drag: {
      ...characterFrame,
      fps: 5,
      frames: 8,
      headOffsetX: -46,
      headOffsetY: -186,
      loop: true,
      src: husbandDrag,
    },
    idle: {
      ...characterFrame,
      fps: 4,
      frames: 8,
      headOffsetX: -48,
      headOffsetY: -188,
      loop: true,
      src: husbandIdle,
    },
    nervous: {
      anchorX: 156.75,
      anchorY: 610,
      displayWidth: 96,
      fps: 5,
      frameHeight: 627,
      frameWidth: 313.5,
      frames: 8,
      headOffsetX: -48,
      headOffsetY: -164,
      hitbox: { height: 530, width: 146, x: 84, y: 82 },
      liftY: 14,
      loop: false,
      src: husbandNervous,
    },
    select: {
      ...characterFrame,
      fps: 5,
      frames: 8,
      headOffsetX: -46,
      headOffsetY: -188,
      loop: false,
      src: husbandSelect,
    },
  },
  wife: {
    drag: {
      ...characterFrame,
      displayWidth: 86,
      fps: 5,
      frames: 8,
      headOffsetX: 48,
      headOffsetY: -188,
      loop: true,
      src: wifeDrag,
    },
    idle: {
      ...characterFrame,
      displayWidth: 86,
      fps: 4,
      frames: 8,
      headOffsetX: 48,
      headOffsetY: -188,
      loop: true,
      src: wifeIdle,
    },
    response: {
      ...characterFrame,
      displayWidth: 86,
      fps: 5,
      frames: 8,
      headOffsetX: 48,
      headOffsetY: -188,
      loop: false,
      src: wifeResponse,
    },
    select: {
      ...characterFrame,
      displayWidth: 86,
      fps: 5,
      frames: 8,
      headOffsetX: 48,
      headOffsetY: -188,
      loop: false,
      src: wifeSelect,
    },
  },
  catBlue: {
    annoyed: {
      ...catFrame,
      anchorY: 486,
      displayWidth: 112,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -96,
      hitbox: { height: 231, width: 252, x: 19, y: 255 },
      loop: false,
      src: catBlueAnnoyed,
    },
    blink: {
      ...catFrame,
      anchorY: 493,
      displayWidth: 112,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -98,
      hitbox: { height: 232, width: 255, x: 14, y: 261 },
      loop: false,
      src: catBlueBlink,
    },
    drag: {
      ...catFrame,
      anchorY: 566,
      displayWidth: 112,
      fps: 5,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -126,
      hitbox: { height: 439, width: 258, x: 10, y: 127 },
      loop: true,
      src: catBlueDrag,
    },
    idle: {
      ...catFrame,
      anchorY: 453,
      displayWidth: 112,
      fps: 3,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -96,
      hitbox: { height: 229, width: 256, x: 12, y: 224 },
      loop: true,
      src: catBlueIdle,
    },
    lick: {
      ...catFrame,
      anchorY: 469,
      displayWidth: 112,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -96,
      hitbox: { height: 228, width: 245, x: 20, y: 241 },
      loop: false,
      src: catBlueLick,
    },
    sleep: {
      ...catFrame,
      anchorY: 478,
      displayWidth: 116,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -96,
      hitbox: { height: 217, width: 271, x: 0, y: 261 },
      loop: false,
      src: catBlueSleep,
    },
    tail: {
      ...catFrame,
      anchorY: 496,
      displayWidth: 112,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -96,
      hitbox: { height: 227, width: 271, x: 0, y: 269 },
      loop: false,
      src: catBlueTail,
    },
  },
  catWhite: {
    blink: {
      ...catFrame,
      anchorY: 489,
      displayWidth: 98,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -98,
      hitbox: { height: 254, width: 271, x: 0, y: 235 },
      loop: false,
      src: catWhiteBlink,
    },
    drag: {
      ...catFrame,
      anchorY: 541,
      displayWidth: 98,
      fps: 5,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -116,
      hitbox: { height: 357, width: 271, x: 0, y: 184 },
      loop: true,
      src: catWhiteDrag,
    },
    idle: {
      ...catFrame,
      anchorY: 499,
      displayWidth: 98,
      fps: 3,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -100,
      hitbox: { height: 254, width: 271, x: 0, y: 245 },
      loop: true,
      src: catWhiteIdle,
    },
    jump: {
      ...catFrame,
      anchorY: 518,
      displayWidth: 100,
      fps: 5,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -120,
      hitbox: { height: 296, width: 271, x: 0, y: 222 },
      loop: false,
      src: catWhiteJump,
    },
    lookaround: {
      ...catFrame,
      anchorY: 500,
      displayWidth: 98,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -102,
      hitbox: { height: 258, width: 271, x: 0, y: 242 },
      loop: false,
      src: catWhiteLookaround,
    },
    roll: {
      ...catFrame,
      anchorY: 467,
      displayWidth: 100,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -88,
      hitbox: { height: 242, width: 271, x: 0, y: 225 },
      loop: false,
      src: catWhiteRoll,
    },
    stretch: {
      ...catFrame,
      anchorY: 497,
      displayWidth: 102,
      fps: 4,
      frames: 8,
      headOffsetX: 0,
      headOffsetY: -94,
      hitbox: { height: 185, width: 271, x: 0, y: 312 },
      loop: false,
      src: catWhiteStretch,
    },
  },
};

const catBlueWeightedActions = [
  "blink",
  "blink",
  "blink",
  "blink",
  "lick",
  "lick",
  "lick",
  "lick",
  "lick",
  "tail",
  "tail",
  "tail",
  "tail",
  "sleep",
  "sleep",
  "sleep",
  "annoyed",
];

const catWhiteWeightedActions = [
  "blink",
  "blink",
  "blink",
  "lookaround",
  "lookaround",
  "lookaround",
  "lookaround",
  "lookaround",
  "stretch",
  "stretch",
  "stretch",
  "stretch",
  "roll",
  "roll",
  "roll",
  "jump",
  "jump",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDisplayHeight(config: SpriteActionConfig) {
  return (config.displayWidth * config.frameHeight) / config.frameWidth;
}

function getScale(config: SpriteActionConfig) {
  return config.displayWidth / config.frameWidth;
}

function SpriteSheet({ className, config, onComplete }: SpriteSheetProps) {
  const [frame, setFrame] = useState(0);
  const completedRef = useRef(false);
  const displayHeight = getDisplayHeight(config);

  useEffect(() => {
    setFrame(0);
    completedRef.current = false;

    const interval = window.setInterval(() => {
      setFrame((current) => {
        if (config.loop) return (current + 1) % config.frames;
        if (current >= config.frames - 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            window.setTimeout(() => onComplete?.(), 0);
          }
          return current;
        }
        return current + 1;
      });
    }, 1000 / config.fps);

    return () => window.clearInterval(interval);
  }, [config, onComplete]);

  return (
    <span
      className={`sprite-sheet${className ? ` ${className}` : ""}`}
      style={
        {
          "--sprite-bg": `url(${config.src})`,
          "--sprite-height": `${displayHeight}px`,
          "--sprite-width": `${config.displayWidth}px`,
          "--sprite-sheet-width": `${config.displayWidth * config.frames}px`,
          backgroundPosition: `${frame * config.displayWidth * -1}px 0`,
        } as CSSProperties
      }
    />
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
  onPositionChange,
  position,
  stageRef,
}: DraggableSpriteProps) {
  const spriteRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
  });
  const config = actions[action] ?? actions.idle;
  const displayHeight = getDisplayHeight(config);
  const scale = getScale(config);
  const anchorXPct = (config.anchorX / config.frameWidth) * 100;
  const anchorYPct = (config.anchorY / config.frameHeight) * 100;

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
      active: true,
      offsetX: event.clientX - anchorScreenX,
      offsetY: event.clientY - anchorScreenY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart(id);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    updateFromPointer(event);
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onDragEnd(id);
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
          zIndex: isDragging ? 80 : Math.round(10 + position.y),
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
      className={`login-bubble login-bubble--${bubble.kind}`}
      style={
        {
          "--bubble-bg": `url(${bubbleBackgrounds[bubble.kind]})`,
          left: `calc(${position.x}% + ${config.headOffsetX}px)`,
          top: `calc(${position.y}% + ${config.headOffsetY}px)`,
        } as CSSProperties
      }
    >
      <span>{bubble.text}</span>
    </div>
  );
}

export function LoginPage({ onEnterRole }: LoginPageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const flowRef = useRef<FlowState>("idle");
  const draggingRef = useRef<SpriteId | null>(null);
  const actionsRef = useRef<Record<SpriteId, string>>({
    catBlue: "idle",
    catWhite: "idle",
    husband: "idle",
    wife: "idle",
  });
  const selectionRef = useRef<{
    role: RoleRoute;
    complete: Set<CharacterTarget>;
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

  const setSpriteAction = useCallback((id: SpriteId, action: string) => {
    setActions((current) => {
      if (current[id] === action) return current;
      return { ...current, [id]: action };
    });
  }, []);

  useEffect(() => {
    addTimeout(
      () => showBubble("husband", "speechHusband", "先看看老哥表现。"),
      300,
    );
    addTimeout(
      () => showBubble("wife", "speechWife", "我今天一定好好表现！"),
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

  const completeSelectionIfReady = useCallback(() => {
    const selection = selectionRef.current;
    if (!selection) return;
    if (!selection.complete.has("husband") || !selection.complete.has("wife")) {
      return;
    }

    const { role } = selection;
    selectionRef.current = null;
    setFlow("exiting");
    addTimeout(() => onEnterRole(role), 360);
  }, [addTimeout, onEnterRole]);

  const handleActionComplete = useCallback(
    (id: SpriteId, action: string) => {
      const config = spriteConfigs[id][action];
      if (!config || config.loop || action === "idle" || action === "drag") {
        return;
      }

      setSpriteAction(id, "idle");

      if (id === "husband" || id === "wife") {
        const selection = selectionRef.current;
        if (selection) {
          selection.complete.add(id);
          completeSelectionIfReady();
        }
      }
    },
    [completeSelectionIfReady, setSpriteAction],
  );

  function beginSelect(role: RoleRoute) {
    if (flowRef.current !== "idle") return;
    const selectingWife = role === "wife";
    selectionRef.current = { complete: new Set(), role };
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
