import { Image, View } from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import "./index.scss";

export function SpriteActor({
  active = false,
  mood = "normal",
  src,
  onTap,
}: {
  active?: boolean;
  mood?: "normal" | "happy" | "proud";
  src: string;
  onTap?: (event: ITouchEvent) => void;
}) {
  return (
    <View className={`sprite-actor sprite-actor--${mood} ${active ? "is-active" : ""}`} onClick={onTap}>
      <Image className="sprite-actor__image" src={src} mode="aspectFit" />
      <View className="sprite-actor__spark sprite-actor__spark--one" />
      <View className="sprite-actor__spark sprite-actor__spark--two" />
      <View className="sprite-actor__spark sprite-actor__spark--three" />
    </View>
  );
}
