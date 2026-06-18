import { Image, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import "./index.scss";

export interface SpriteSheetFrame {
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
  frames: SpriteSheetFrame[];
}

const remoteMetaCache = new Map<string, SpriteSheetMeta>();

function isSpriteSheetMeta(value: unknown): value is SpriteSheetMeta {
  const meta = value as SpriteSheetMeta;
  return Boolean(
    meta &&
      meta.frame_size &&
      typeof meta.frame_size.w === "number" &&
      typeof meta.frame_size.h === "number" &&
      meta.sheet_size &&
      typeof meta.sheet_size.w === "number" &&
      typeof meta.sheet_size.h === "number" &&
      Array.isArray(meta.frames) &&
      meta.frames.length > 0,
  );
}

function frameDelay(meta: SpriteSheetMeta, frameIndex: number, fps: number, playbackRate: number) {
  const fallback = 1000 / fps;
  const current = meta.frames[frameIndex];
  const next = meta.frames[frameIndex + 1];
  if (!current || !next) return fallback;
  const raw = next.t - current.t;
  const delay = raw > 0 && raw < 10 ? raw * 1000 : raw;
  if (!Number.isFinite(delay) || delay < 16 || delay > 2500) return fallback;
  return delay / Math.max(playbackRate, 0.1);
}

export function RemoteSpriteSheetActor({
  className = "",
  displayWidth,
  fallbackMeta,
  fallbackSrc,
  fps = 5,
  hideUntilRemote = false,
  metaUrl,
  playbackRate = 1,
  src,
}: {
  className?: string;
  displayWidth: number;
  fallbackMeta: SpriteSheetMeta;
  fallbackSrc: string;
  fps?: number;
  hideUntilRemote?: boolean;
  metaUrl?: string;
  playbackRate?: number;
  src?: string;
}) {
  const [remoteMeta, setRemoteMeta] = useState<SpriteSheetMeta | null>(() => {
    if (!metaUrl) return null;
    return remoteMetaCache.get(metaUrl) ?? null;
  });

  useEffect(() => {
    if (!metaUrl || !src) {
      setRemoteMeta(null);
      return undefined;
    }

    const cached = remoteMetaCache.get(metaUrl);
    if (cached) {
      setRemoteMeta(cached);
      return undefined;
    }

    setRemoteMeta(null);
    let cancelled = false;
    Taro.request({ url: metaUrl })
      .then((response) => {
        if (cancelled) return;
        if (isSpriteSheetMeta(response.data)) {
          remoteMetaCache.set(metaUrl, response.data);
          setRemoteMeta(response.data);
        } else {
          setRemoteMeta(null);
        }
      })
      .catch((error) => {
        console.warn("remote sprite meta load failed", metaUrl, error);
        if (!cancelled) setRemoteMeta(null);
      });

    return () => {
      cancelled = true;
    };
  }, [metaUrl, src]);

  if (hideUntilRemote && !remoteMeta) {
    const displayHeight = (fallbackMeta.frame_size.h * displayWidth) / fallbackMeta.frame_size.w;
    return <View className={`sprite-sheet-actor ${className}`} style={{ height: `${displayHeight}px`, width: `${displayWidth}px` }} />;
  }

  return (
    <SpriteSheetActor
      className={className}
      displayWidth={displayWidth}
      fps={fps}
      meta={remoteMeta ?? fallbackMeta}
      playbackRate={playbackRate}
      src={remoteMeta && src ? src : fallbackSrc}
    />
  );
}

export function SpriteSheetActor({
  className = "",
  displayWidth,
  fps = 5,
  meta,
  playbackRate = 1,
  src,
}: {
  className?: string;
  displayWidth: number;
  fps?: number;
  meta: SpriteSheetMeta;
  playbackRate?: number;
  src: string;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frame = meta.frames[frameIndex] ?? meta.frames[0];
  const scale = displayWidth / meta.frame_size.w;
  const displayHeight = meta.frame_size.h * scale;
  const sheetWidth = meta.sheet_size.w * scale;
  const sheetHeight = meta.sheet_size.h * scale;

  useEffect(() => {
    if (meta.frames.length < 2) return undefined;
    const timer = setTimeout(() => {
      setFrameIndex((current) => (current + 1) % meta.frames.length);
    }, frameDelay(meta, frameIndex, fps, playbackRate));
    return () => clearTimeout(timer);
  }, [fps, frameIndex, meta, playbackRate]);

  const imageStyle = useMemo(() => ({
    height: `${sheetHeight}px`,
    transform: `translate(${-frame.x * scale}px, ${-frame.y * scale}px)`,
    width: `${sheetWidth}px`,
  }), [frame.x, frame.y, scale, sheetHeight, sheetWidth]);

  return (
    <View className={`sprite-sheet-actor ${className}`} style={{ height: `${displayHeight}px`, width: `${displayWidth}px` }}>
      <Image className="sprite-sheet-actor__sheet pixelated" src={src} mode="scaleToFill" style={imageStyle} />
    </View>
  );
}
