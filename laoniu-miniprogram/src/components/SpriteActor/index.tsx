import { Image, View } from "@tarojs/components";
import type { ITouchEvent } from "@tarojs/components";
import "./index.scss";

export function SpriteActor({ src, onTap }: { src: string; onTap?: (event: ITouchEvent) => void }) {
  return (
    <View className="sprite-actor" onClick={onTap}>
      <Image className="sprite-actor__image" src={src} mode="aspectFit" />
    </View>
  );
}
