import { Image, View } from "@tarojs/components";
import type { CSSProperties } from "react";
import "./index.scss";

export function SpriteActor({
  active = false,
  dragging = false,
  mood = "normal",
  src,
  onTap,
  onTouchEnd,
  onTouchMove,
  onTouchStart,
  style,
}: {
  active?: boolean;
  dragging?: boolean;
  mood?: "normal" | "happy" | "proud";
  src: string;
  onTap?: (event: any) => void;
  onTouchEnd?: (event: any) => void;
  onTouchMove?: (event: any) => void;
  onTouchStart?: (event: any) => void;
  style?: CSSProperties;
}) {
  return (
    <View
      className={`sprite-actor sprite-actor--${mood} ${active ? "is-active" : ""} ${dragging ? "is-dragging" : ""}`}
      onClick={onTap}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
      style={style}
    >
      <Image className="sprite-actor__image" src={src} mode="aspectFit" />
      <View className="sprite-actor__spark sprite-actor__spark--one" />
      <View className="sprite-actor__spark sprite-actor__spark--two" />
      <View className="sprite-actor__spark sprite-actor__spark--three" />
    </View>
  );
}
