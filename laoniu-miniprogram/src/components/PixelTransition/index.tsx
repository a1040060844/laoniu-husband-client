import { View } from "@tarojs/components";
import "./index.scss";

export function PixelTransition({ active = false }: { active?: boolean }) {
  if (!active) return null;
  return (
    <View className="pixel-transition">
      {Array.from({ length: 180 }).map((_, index) => <View className="pixel-transition__block" key={index} />)}
    </View>
  );
}
