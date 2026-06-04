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
import speechHusbandIdle from "../assets/login/speech/speech-husband-idle.png";
import speechHusbandNervous from "../assets/login/speech/speech-husband-nervous.png";
import speechHusbandSelect from "../assets/login/speech/speech-husband-select.png";
import speechWifeResponse from "../assets/login/speech/speech-wife-response.png";
import speechWifeSelect from "../assets/login/speech/speech-wife-select.png";
import thoughtWifeFood1 from "../assets/login/speech/thought-wife-food-1.png";
import thoughtWifeFood2 from "../assets/login/speech/thought-wife-food-2.png";
import thoughtWifeFood3 from "../assets/login/speech/thought-wife-food-3.png";
import wifeDrag from "../assets/login/wife/wife_drag_sheet.png";
import wifeIdle from "../assets/login/wife/wife_idle_thinking_food_sheet.png";
import wifeResponse from "../assets/login/wife/wife_response_sheet.png";
import wifeSelect from "../assets/login/wife/wife_select_sheet.png";

type RoleRoute = "husband" | "wife";
type SpriteId = "husband" | "wife" | "catBlue" | "catWhite";
type CharacterTarget = "husband" | "wife";
type FlowState = "idle" | "selectingHusband" | "selectingWife" | "exiting";

type BubbleId =
  | "speech-husband-idle"
  | "speech-husband-select"
  | "speech-husband-nervous"
  | "speech-wife-response"
  | "speech-wife-select"
  | "thought-wife-food-1"
  | "thought-wife-food-2"
  | "thought-wife-food-3";

interface LoginPageProps {
  onEnterRole: (role: RoleRoute) => void;
}

interface Position {
  x: number;
  y: number;
}

interface SpriteConfig {
  src: string;
  fps: number;
  loop: boolean;
  frames?: number;
}

interface ActiveBubble {
  id: BubbleId;
  target: CharacterTarget;
}

interface SpriteSheetProps {
  src: string;
  frames?: number;
  fps?: number;
  loop?: boolean;
  playing?: boolean;
  className?: string;
  style?: CSSProperties;
  onComplete?: () => void;
}

interface DraggableSpriteProps {
  id: SpriteId;
  action: string;
  framesByAction: Record<string, SpriteConfig>;
  position: Position;
  stageRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  onActionComplete?: (id: SpriteId, action: string) => void;
  onPositionChange: (id: SpriteId, position: Position) => void;
  onDragStart?: (id: SpriteId) => void;
  onDragEnd?: (id: SpriteId) => void;
}

interface LoginBubbleProps {
  bubbleId: BubbleId;
  target: CharacterTarget;
  visible: boolean;
  position: Position;
}

const defaultPositions: Record<SpriteId, Position> = {
  husband: { x: 37, y: 59 },
  wife: { x: 59, y: 59 },
  catBlue: { x: 49, y: 70 },
  catWhite: { x: 62, y: 72 },
};

const spriteConfigs: Record<SpriteId, Record<string, SpriteConfig>> = {
  husband: {
    drag: { fps: 8, loop: true, src: husbandDrag },
    idle: { fps: 6, loop: true, src: husbandIdle },
    nervous: { fps: 8, loop: false, src: husbandNervous },
    select: { fps: 8, loop: false, src: husbandSelect },
  },
  wife: {
    drag: { fps: 8, loop: true, src: wifeDrag },
    idle: { fps: 6, loop: true, src: wifeIdle },
    response: { fps: 8, loop: false, src: wifeResponse },
    select: { fps: 8, loop: false, src: wifeSelect },
  },
  catBlue: {
    annoyed: { fps: 7, loop: false, src: catBlueAnnoyed },
    blink: { fps: 7, loop: false, src: catBlueBlink },
    drag: { fps: 8, loop: true, src: catBlueDrag },
    idle: { fps: 5, loop: true, src: catBlueIdle },
    lick: { fps: 7, loop: false, src: catBlueLick },
    sleep: { fps: 7, loop: false, src: catBlueSleep },
    tail: { fps: 7, loop: false, src: catBlueTail },
  },
  catWhite: {
    blink: { fps: 7, loop: false, src: catWhiteBlink },
    drag: { fps: 8, loop: true, src: catWhiteDrag },
    idle: { fps: 5, loop: true, src: catWhiteIdle },
    jump: { fps: 7, loop: false, src: catWhiteJump },
    lookaround: { fps: 7, loop: false, src: catWhiteLookaround },
    roll: { fps: 7, loop: false, src: catWhiteRoll },
    stretch: { fps: 7, loop: false, src: catWhiteStretch },
  },
};

const bubbleAssets: Record<BubbleId, string> = {
  "speech-husband-idle": speechHusbandIdle,
  "speech-husband-nervous": speechHusbandNervous,
  "speech-husband-select": speechHusbandSelect,
  "speech-wife-response": speechWifeResponse,
  "speech-wife-select": speechWifeSelect,
  "thought-wife-food-1": thoughtWifeFood1,
  "thought-wife-food-2": thoughtWifeFood2,
  "thought-wife-food-3": thoughtWifeFood3,
};

const catBlueWeightedActions = [
  "blink",
  "blink",
  "blink",
  "blink",
  "blink",
  "lick",
  "lick",
  "lick",
  "lick",
  "lick",
  "sleep",
  "sleep",
  "sleep",
  "tail",
  "tail",
  "tail",
  "tail",
  "tail",
  "annoyed",
  "annoyed",
];

const catWhiteWeightedActions = [
  "blink",
  "blink",
  "blink",
  "blink",
  "jump",
  "jump",
  "jump",
  "jump",
  "stretch",
  "stretch",
  "stretch",
  "stretch",
  "roll",
  "roll",
  "roll",
  "lookaround",
  "lookaround",
  "lookaround",
  "lookaround",
  "lookaround",
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function SpriteSheet({
  className,
  fps = 8,
  frames = 8,
  loop = true,
  onComplete,
  playing = true,
  src,
  style,
}: SpriteSheetProps) {
  const [frame, setFrame] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setFrame(0);
    completedRef.current = false;
    if (!playing) return undefined;

    const interval = window.setInterval(() => {
      setFrame((current) => {
        if (loop) return (current + 1) % frames;
        if (current >= frames - 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            window.setTimeout(() => onComplete?.(), 0);
          }
          return current;
        }
        return current + 1;
      });
    }, 1000 / fps);

    return () => window.clearInterval(interval);
  }, [fps, frames, loop, onComplete, playing, src]);

  const framePosition = frames <= 1 ? 0 : (frame / (frames - 1)) * 100;

  return (
    <span
      className={`sprite-sheet${className ? ` ${className}` : ""}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundPosition: `${framePosition}% 0`,
        backgroundSize: `${frames * 100}% 100%`,
        ...style,
      }}
    />
  );
}

function DraggableSprite({
  action,
  ariaLabel,
  className,
  disabled = false,
  framesByAction,
  id,
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
  const config = framesByAction[action] ?? framesByAction.idle;

  const updateFromPointer = useCallback(
    (event: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const sprite = spriteRef.current;
      if (!stage || !sprite) return;

      const stageRect = stage.getBoundingClientRect();
      const spriteRect = sprite.getBoundingClientRect();
      const halfX = (spriteRect.width / stageRect.width) * 50;
      const halfY = (spriteRect.height / stageRect.height) * 50;
      const x =
        ((event.clientX - stageRect.left - dragRef.current.offsetX) /
          stageRect.width) *
        100;
      const y =
        ((event.clientY - stageRect.top - dragRef.current.offsetY) /
          stageRect.height) *
        100;

      onPositionChange(id, {
        x: clamp(x, halfX, 100 - halfX),
        y: clamp(y, halfY, 100 - halfY),
      });
    },
    [id, onPositionChange, stageRef],
  );

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    const sprite = spriteRef.current;
    if (!sprite) return;

    const spriteRect = sprite.getBoundingClientRect();
    dragRef.current = {
      active: true,
      offsetX: event.clientX - (spriteRect.left + spriteRect.width / 2),
      offsetY: event.clientY - (spriteRect.top + spriteRect.height / 2),
    };
    sprite.setPointerCapture(event.pointerId);
    onDragStart?.(id);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || disabled) return;
    event.preventDefault();
    updateFromPointer(event);
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onDragEnd?.(id);
  }

  return (
    <div
      ref={spriteRef}
      aria-label={ariaLabel}
      className={`draggable-sprite draggable-sprite--${id}${
        className ? ` ${className}` : ""
      }`}
      role="img"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      onPointerCancel={finishDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
    >
      <SpriteSheet
        className="draggable-sprite__sheet"
        fps={config.fps}
        frames={config.frames}
        loop={config.loop}
        src={config.src}
        onComplete={() => onActionComplete?.(id, action)}
      />
    </div>
  );
}

function LoginBubble({ bubbleId, position, target, visible }: LoginBubbleProps) {
  return (
    <img
      className={`login-bubble login-bubble--${target}${
        visible ? " login-bubble--visible" : ""
      }`}
      src={bubbleAssets[bubbleId]}
      alt=""
      draggable={false}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    />
  );
}

export function LoginPage({ onEnterRole }: LoginPageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const flowRef = useRef<FlowState>("idle");
  const draggingRef = useRef<SpriteId | null>(null);
  const [positions, setPositions] =
    useState<Record<SpriteId, Position>>(defaultPositions);
  const [actions, setActions] = useState<Record<SpriteId, string>>({
    catBlue: "idle",
    catWhite: "idle",
    husband: "idle",
    wife: "idle",
  });
  const [draggingId, setDraggingId] = useState<SpriteId | null>(null);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [activeBubbles, setActiveBubbles] = useState<ActiveBubble[]>([]);

  const isBusy = flow !== "idle";
  const cardDisabled = isBusy;

  useEffect(() => {
    flowRef.current = flow;
  }, [flow]);

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

  const showBubble = useCallback((target: CharacterTarget, id: BubbleId) => {
    setActiveBubbles((current) => [
      ...current.filter((bubble) => bubble.target !== target),
      { id, target },
    ]);
  }, []);

  useEffect(() => {
    addTimeout(() => showBubble("husband", "speech-husband-idle"), 300);
    addTimeout(() => showBubble("wife", "thought-wife-food-1"), 600);
    addTimeout(hideAllBubbles, 4000);

    return () => {
      timeoutRefs.current.forEach((id) => window.clearTimeout(id));
      timeoutRefs.current = [];
    };
  }, [addTimeout, hideAllBubbles, showBubble]);

  useEffect(() => {
    let cancelled = false;

    function scheduleHusbandBubble() {
      window.setTimeout(() => {
        if (cancelled) return;
        if (flowRef.current === "idle" && !draggingRef.current) {
          showBubble("husband", "speech-husband-idle");
          window.setTimeout(() => {
            if (!cancelled) hideBubble("husband");
          }, 2500);
        }
        scheduleHusbandBubble();
      }, randomBetween(14000, 22000));
    }

    function scheduleWifeBubble() {
      window.setTimeout(() => {
        if (cancelled) return;
        if (flowRef.current === "idle" && !draggingRef.current) {
          showBubble(
            "wife",
            pickRandom([
              "thought-wife-food-1",
              "thought-wife-food-2",
              "thought-wife-food-3",
            ]),
          );
          window.setTimeout(() => {
            if (!cancelled) hideBubble("wife");
          }, 2800);
        }
        scheduleWifeBubble();
      }, randomBetween(8000, 15000));
    }

    scheduleHusbandBubble();
    scheduleWifeBubble();

    return () => {
      cancelled = true;
    };
  }, [hideBubble, showBubble]);

  useEffect(() => {
    let cancelled = false;

    function scheduleCatAction() {
      window.setTimeout(() => {
        if (cancelled) return;
        if (flowRef.current === "idle" && !draggingRef.current) {
          const catId: SpriteId = Math.random() > 0.5 ? "catBlue" : "catWhite";
          const action =
            catId === "catBlue"
              ? pickRandom(catBlueWeightedActions)
              : pickRandom(catWhiteWeightedActions);
          setActions((current) =>
            current[catId] === "idle"
              ? {
                  ...current,
                  [catId]: action,
                }
              : current,
          );
        }
        scheduleCatAction();
      }, randomBetween(4000, 9000));
    }

    scheduleCatAction();

    return () => {
      cancelled = true;
    };
  }, []);

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
      setActions((current) => ({
        ...current,
        [id]: "drag",
      }));
      if (id === "husband") hideBubble("husband");
      if (id === "wife") hideBubble("wife");
    },
    [hideBubble],
  );

  const handleDragEnd = useCallback((id: SpriteId) => {
    setDraggingId(null);
    setActions((current) => ({
      ...current,
      [id]: "idle",
    }));
  }, []);

  const handleActionComplete = useCallback(
    (id: SpriteId, action: string) => {
      if (id === "catBlue" || id === "catWhite") {
        if (action !== "idle" && action !== "drag") {
          setActions((current) => ({
            ...current,
            [id]: "idle",
          }));
        }
      }
    },
    [],
  );

  function beginSelect(role: RoleRoute) {
    if (flowRef.current !== "idle") return;
    const selectingWife = role === "wife";
    setFlow(selectingWife ? "selectingWife" : "selectingHusband");
    hideAllBubbles();
    setActions((current) => ({
      ...current,
      catBlue: "idle",
      catWhite: "idle",
      husband: selectingWife ? "nervous" : "select",
      wife: selectingWife ? "select" : "response",
    }));

    if (selectingWife) {
      addTimeout(() => showBubble("wife", "speech-wife-select"), 100);
      addTimeout(() => showBubble("husband", "speech-husband-nervous"), 450);
    } else {
      addTimeout(() => showBubble("husband", "speech-husband-select"), 100);
      addTimeout(() => showBubble("wife", "speech-wife-response"), 500);
    }

    addTimeout(() => setFlow("exiting"), 1200);
    addTimeout(() => onEnterRole(role), 1650);
  }

  const bubbleByTarget = useMemo(
    () => ({
      husband: activeBubbles.find((bubble) => bubble.target === "husband"),
      wife: activeBubbles.find((bubble) => bubble.target === "wife"),
    }),
    [activeBubbles],
  );

  return (
    <section
      className={`login-page login-page--${flow}`}
      aria-label="角色登录"
    >
      <div className="login-stage" ref={stageRef}>
        <img className="login-layer login-bg" src={bgRoom} alt="" />
        <div className="login-stage__top-mask" aria-hidden="true" />
        <div className="login-stage__bottom-mask" aria-hidden="true" />

        <img
          className="login-layer login-title"
          src={title}
          alt="今天谁来上线？"
        />
        <img
          className="login-layer login-subtitle"
          src={subtitle}
          alt="点击角色进入对应主页"
        />

        <DraggableSprite
          action={actions.husband}
          ariaLabel="老哥本人，可拖拽"
          disabled={isBusy}
          framesByAction={spriteConfigs.husband}
          id="husband"
          position={positions.husband}
          stageRef={stageRef}
          onActionComplete={handleActionComplete}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onPositionChange={handlePositionChange}
        />
        <DraggableSprite
          action={actions.wife}
          ariaLabel="老妞大人，可拖拽"
          disabled={isBusy}
          framesByAction={spriteConfigs.wife}
          id="wife"
          position={positions.wife}
          stageRef={stageRef}
          onActionComplete={handleActionComplete}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onPositionChange={handlePositionChange}
        />
        <DraggableSprite
          action={actions.catBlue}
          ariaLabel="蓝猫，可拖拽"
          disabled={isBusy}
          framesByAction={spriteConfigs.catBlue}
          id="catBlue"
          position={positions.catBlue}
          stageRef={stageRef}
          onActionComplete={handleActionComplete}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onPositionChange={handlePositionChange}
        />
        <DraggableSprite
          action={actions.catWhite}
          ariaLabel="白猫，可拖拽"
          disabled={isBusy}
          framesByAction={spriteConfigs.catWhite}
          id="catWhite"
          position={positions.catWhite}
          stageRef={stageRef}
          onActionComplete={handleActionComplete}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onPositionChange={handlePositionChange}
        />

        {bubbleByTarget.husband && draggingId !== "husband" && (
          <LoginBubble
            bubbleId={bubbleByTarget.husband.id}
            position={positions.husband}
            target="husband"
            visible
          />
        )}
        {bubbleByTarget.wife && draggingId !== "wife" && (
          <LoginBubble
            bubbleId={bubbleByTarget.wife.id}
            position={positions.wife}
            target="wife"
            visible
          />
        )}

        <button
          className="login-card-button login-card-button--husband"
          type="button"
          disabled={cardDisabled}
          aria-label="点击老哥本人按钮进入老公端"
          onClick={() => beginSelect("husband")}
        >
          <img src={cardHusband} alt="老哥本人" draggable={false} />
        </button>
        <button
          className="login-card-button login-card-button--wife"
          type="button"
          disabled={cardDisabled}
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
