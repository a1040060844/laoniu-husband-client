import { Text, View } from "@tarojs/components";

export function SwipeHint({ text = "上下滑动切换" }: { text?: string }) {
  return <View className="swipe-hint"><Text>{text}</Text></View>;
}
