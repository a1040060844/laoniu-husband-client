import { Image, View } from "@tarojs/components";
import type { CSSProperties, ReactNode } from "react";
import "./index.scss";

export function SpriteActor({
  active = false,
  children,
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
  children?: ReactNode;
  dragging?: boolean;
  mood?: "normal" | "happy" | "proud";
  src?: string;
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
      {children || (src ? <Image className="sprite-actor__image" src={src} mode="aspectFit" /> : null)}
      <View className="sprite-actor__spark sprite-actor__spark--one" />
      <View className="sprite-actor__spark sprite-actor__spark--two" />
      <View className="sprite-actor__spark sprite-actor__spark--three" />
    </View>
  );
}
