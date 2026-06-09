import catBlueBlinkMeta from "../assets/login-final/cat-blue/blink/index.json";
import catBlueBlinkMetrics from "../assets/login-final/cat-blue/blink/metrics.json";
import catBlueBlink from "../assets/login-final/cat-blue/blink/sprite.png";
import catBlueDragMeta from "../assets/login-final/cat-blue/drag/index.json";
import catBlueDragMetrics from "../assets/login-final/cat-blue/drag/metrics.json";
import catBlueDrag from "../assets/login-final/cat-blue/drag/sprite.png";
import catBlueLickMeta from "../assets/login-final/cat-blue/lick/index.json";
import catBlueLickMetrics from "../assets/login-final/cat-blue/lick/metrics.json";
import catBlueLick from "../assets/login-final/cat-blue/lick/sprite.png";
import catBlueLiftMeta from "../assets/login-final/cat-blue/lift/index.json";
import catBlueLiftMetrics from "../assets/login-final/cat-blue/lift/metrics.json";
import catBlueLift from "../assets/login-final/cat-blue/lift/sprite.png";
import catBlueTailMeta from "../assets/login-final/cat-blue/tail/index.json";
import catBlueTailMetrics from "../assets/login-final/cat-blue/tail/metrics.json";
import catBlueTail from "../assets/login-final/cat-blue/tail/sprite.png";
import catBlueYawnMeta from "../assets/login-final/cat-blue/yawn/index.json";
import catBlueYawnMetrics from "../assets/login-final/cat-blue/yawn/metrics.json";
import catBlueYawn from "../assets/login-final/cat-blue/yawn/sprite.png";
import catWhiteDragMeta from "../assets/login-final/cat-white/drag/index.json";
import catWhiteDragMetrics from "../assets/login-final/cat-white/drag/metrics.json";
import catWhiteDrag from "../assets/login-final/cat-white/drag/sprite.png";
import catWhiteIdleMeta from "../assets/login-final/cat-white/idle/index.json";
import catWhiteIdleMetrics from "../assets/login-final/cat-white/idle/metrics.json";
import catWhiteIdle from "../assets/login-final/cat-white/idle/sprite.png";
import catWhiteJumpMeta from "../assets/login-final/cat-white/jump/index.json";
import catWhiteJumpMetrics from "../assets/login-final/cat-white/jump/metrics.json";
import catWhiteJump from "../assets/login-final/cat-white/jump/sprite.png";
import catWhiteLookaroundMeta from "../assets/login-final/cat-white/lookaround/index.json";
import catWhiteLookaroundMetrics from "../assets/login-final/cat-white/lookaround/metrics.json";
import catWhiteLookaround from "../assets/login-final/cat-white/lookaround/sprite.png";
import catWhiteRollMeta from "../assets/login-final/cat-white/roll/index.json";
import catWhiteRollMetrics from "../assets/login-final/cat-white/roll/metrics.json";
import catWhiteRoll from "../assets/login-final/cat-white/roll/sprite.png";
import catWhiteStretchMeta from "../assets/login-final/cat-white/stretch/index.json";
import catWhiteStretchMetrics from "../assets/login-final/cat-white/stretch/metrics.json";
import catWhiteStretch from "../assets/login-final/cat-white/stretch/sprite.png";
import husbandAdjustGlassesMeta from "../assets/login-final/husband/adjust-glasses/index.json";
import husbandAdjustGlassesMetrics from "../assets/login-final/husband/adjust-glasses/metrics.json";
import husbandAdjustGlasses from "../assets/login-final/husband/adjust-glasses/sprite.png";
import husbandBlinkMeta from "../assets/login-final/husband/blink/index.json";
import husbandBlinkMetrics from "../assets/login-final/husband/blink/metrics.json";
import husbandBlink from "../assets/login-final/husband/blink/sprite.png";
import husbandDragMeta from "../assets/login-final/husband/drag/index.json";
import husbandDragMetrics from "../assets/login-final/husband/drag/metrics.json";
import husbandDrag from "../assets/login-final/husband/drag/sprite.png";
import husbandNervousMeta from "../assets/login-final/husband/nervous/index.json";
import husbandNervousMetrics from "../assets/login-final/husband/nervous/metrics.json";
import husbandNervous from "../assets/login-final/husband/nervous/sprite.png";
import husbandSelectMeta from "../assets/login-final/husband/select/index.json";
import husbandSelectMetrics from "../assets/login-final/husband/select/metrics.json";
import husbandSelect from "../assets/login-final/husband/select/sprite.png";
import wifeDragMeta from "../assets/login-final/wife/drag/index.json";
import wifeDragMetrics from "../assets/login-final/wife/drag/metrics.json";
import wifeDrag from "../assets/login-final/wife/drag/sprite.png";
import wifeHelplessMeta from "../assets/login-final/wife/helpless/index.json";
import wifeHelplessMetrics from "../assets/login-final/wife/helpless/metrics.json";
import wifeHelpless from "../assets/login-final/wife/helpless/sprite.png";
import wifeSelectMeta from "../assets/login-final/wife/select/index.json";
import wifeSelectMetrics from "../assets/login-final/wife/select/metrics.json";
import wifeSelect from "../assets/login-final/wife/select/sprite.png";
import wifeBlinkMeta from "../assets/login-final/wife/blink/index.json";
import wifeBlinkMetrics from "../assets/login-final/wife/blink/metrics.json";
import wifeBlink from "../assets/login-final/wife/blink/sprite.png";
import wifeThinkingMeta from "../assets/login-final/wife/thinking/index.json";
import wifeThinkingMetrics from "../assets/login-final/wife/thinking/metrics.json";
import wifeThinking from "../assets/login-final/wife/thinking/sprite.png";

export type SpriteId = "husband" | "wife" | "catBlue" | "catWhite";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteFrameMeta {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
}

export interface SpriteSheetMeta {
  frame_size: { w: number; h: number };
  sheet_size: { w: number; h: number };
  frames: SpriteFrameMeta[];
}

interface SpriteMetrics {
  visibleBounds: { x: number; y: number; w: number; h: number };
  anchor: { x: number; y: number };
  frameBounds: Array<{ i: number; x: number; y: number; w: number; h: number }>;
}

export interface SpriteActionConfig {
  src: string;
  meta: SpriteSheetMeta;
  frameBounds: SpriteMetrics["frameBounds"];
  fps: number;
  loop: boolean;
  playbackRate: number;
  stabilizeBottom: boolean;
  displayWidth: number;
  visualOffsetY: number;
  anchorX: number;
  anchorY: number;
  headOffsetX: number;
  headOffsetY: number;
  hitbox: Rect;
  liftY: number;
}

interface ActionOptions {
  displayWidth?: number;
  targetVisualHeight?: number;
  fps?: number;
  playbackRate?: number;
  stabilizeBottom?: boolean;
  visualOffsetY?: number;
  anchorX?: number;
  anchorY?: number;
  loop: boolean;
  headOffsetX: number;
  headOffsetY: number;
  liftY?: number;
}

const personVisualHeight = 188;
const wifeDragVisualHeight = 179;
const husbandHeadOffsetX = -48;
const husbandDragHeadOffsetX = -46;
const wifeHeadOffsetX = 48;
const personHeadOffsetY = -188;
const husbandNervousHeadOffsetY = -164;
const blueCatWidth = 82;
const whiteCatWidth = 72;

function asMeta(meta: SpriteSheetMeta) {
  return meta;
}

function asMetrics(metrics: SpriteMetrics) {
  return metrics;
}

function makeAction(
  src: string,
  metaInput: SpriteSheetMeta,
  metricsInput: SpriteMetrics,
  options: ActionOptions,
): SpriteActionConfig {
  const meta = asMeta(metaInput);
  const metrics = asMetrics(metricsInput);
  const displayWidth =
    options.displayWidth ??
    (meta.frame_size.w * (options.targetVisualHeight ?? metrics.visibleBounds.h)) /
      metrics.visibleBounds.h;

  return {
    anchorX: options.anchorX ?? metrics.anchor.x,
    anchorY: options.anchorY ?? metrics.anchor.y,
    displayWidth,
    fps: options.fps ?? 5,
    frameBounds: metrics.frameBounds,
    headOffsetX: options.headOffsetX,
    headOffsetY: options.headOffsetY,
    hitbox: {
      height: metrics.visibleBounds.h,
      width: metrics.visibleBounds.w,
      x: metrics.visibleBounds.x,
      y: metrics.visibleBounds.y,
    },
    liftY: options.liftY ?? 12,
    loop: options.loop,
    meta,
    playbackRate: options.playbackRate ?? 1,
    stabilizeBottom: options.stabilizeBottom ?? false,
    src,
    visualOffsetY: options.visualOffsetY ?? 0,
  };
}

export const spriteConfigs: Record<
  SpriteId,
  Record<string, SpriteActionConfig>
> = {
  husband: {
    adjustGlasses: makeAction(
      husbandAdjustGlasses,
      husbandAdjustGlassesMeta,
      husbandAdjustGlassesMetrics,
      {
        headOffsetX: husbandHeadOffsetX,
        headOffsetY: personHeadOffsetY,
        loop: false,
        targetVisualHeight: personVisualHeight,
      },
    ),
    drag: makeAction(husbandDrag, husbandDragMeta, husbandDragMetrics, {
      headOffsetX: husbandDragHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: true,
      targetVisualHeight: personVisualHeight,
    }),
    idle: makeAction(husbandBlink, husbandBlinkMeta, husbandBlinkMetrics, {
      headOffsetX: husbandHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: true,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
    nervous: makeAction(husbandNervous, husbandNervousMeta, husbandNervousMetrics, {
      headOffsetX: husbandHeadOffsetX,
      headOffsetY: husbandNervousHeadOffsetY,
      loop: false,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
    select: makeAction(husbandSelect, husbandSelectMeta, husbandSelectMetrics, {
      headOffsetX: husbandDragHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: false,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
  },
  wife: {
    drag: makeAction(wifeDrag, wifeDragMeta, wifeDragMetrics, {
      headOffsetX: wifeHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: true,
      targetVisualHeight: wifeDragVisualHeight,
    }),
    idle: makeAction(wifeBlink, wifeBlinkMeta, wifeBlinkMetrics, {
      headOffsetX: wifeHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: true,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
    response: makeAction(wifeHelpless, wifeHelplessMeta, wifeHelplessMetrics, {
      headOffsetX: wifeHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: false,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
    select: makeAction(wifeSelect, wifeSelectMeta, wifeSelectMetrics, {
      headOffsetX: wifeHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: false,
      playbackRate: 2,
      targetVisualHeight: personVisualHeight,
    }),
    thinking: makeAction(wifeThinking, wifeThinkingMeta, wifeThinkingMetrics, {
      headOffsetX: wifeHeadOffsetX,
      headOffsetY: personHeadOffsetY,
      loop: false,
      targetVisualHeight: personVisualHeight,
    }),
  },
  catBlue: {
    blink: makeAction(catBlueBlink, catBlueBlinkMeta, catBlueBlinkMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: false,
      playbackRate: 2,
    }),
    drag: makeAction(catBlueDrag, catBlueDragMeta, catBlueDragMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -116,
      loop: true,
    }),
    idle: makeAction(catBlueBlink, catBlueBlinkMeta, catBlueBlinkMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: true,
      playbackRate: 2,
    }),
    lick: makeAction(catBlueLick, catBlueLickMeta, catBlueLickMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: false,
      stabilizeBottom: true,
    }),
    lift: makeAction(catBlueLift, catBlueLiftMeta, catBlueLiftMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: false,
    }),
    tail: makeAction(catBlueTail, catBlueTailMeta, catBlueTailMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: false,
    }),
    yawn: makeAction(catBlueYawn, catBlueYawnMeta, catBlueYawnMetrics, {
      displayWidth: blueCatWidth,
      headOffsetX: 0,
      headOffsetY: -96,
      loop: false,
      stabilizeBottom: true,
    }),
  },
  catWhite: {
    drag: makeAction(catWhiteDrag, catWhiteDragMeta, catWhiteDragMetrics, {
      displayWidth: whiteCatWidth,
      headOffsetX: 0,
      headOffsetY: -116,
      loop: true,
    }),
    idle: makeAction(catWhiteIdle, catWhiteIdleMeta, catWhiteIdleMetrics, {
      displayWidth: whiteCatWidth,
      headOffsetX: 0,
      headOffsetY: -100,
      loop: true,
    }),
    jump: makeAction(catWhiteJump, catWhiteJumpMeta, catWhiteJumpMetrics, {
      displayWidth: 74,
      headOffsetX: 0,
      headOffsetY: -120,
      loop: false,
    }),
    lookaround: makeAction(
      catWhiteLookaround,
      catWhiteLookaroundMeta,
      catWhiteLookaroundMetrics,
      {
        displayWidth: whiteCatWidth,
        headOffsetX: 0,
        headOffsetY: -102,
        loop: false,
      },
    ),
    roll: makeAction(catWhiteRoll, catWhiteRollMeta, catWhiteRollMetrics, {
      displayWidth: 74,
      headOffsetX: 0,
      headOffsetY: -88,
      loop: false,
    }),
    stretch: makeAction(catWhiteStretch, catWhiteStretchMeta, catWhiteStretchMetrics, {
      displayWidth: 75,
      headOffsetX: 0,
      headOffsetY: -94,
      loop: false,
    }),
  },
};

export const catBlueWeightedActions = [
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
  "yawn",
  "yawn",
  "yawn",
];

export const husbandWeightedActions = ["adjustGlasses"];

export const wifeWeightedActions = ["thinking"];

export const catWhiteWeightedActions = [
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
