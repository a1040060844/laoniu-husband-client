import { View } from "@tarojs/components";
import type { ReactNode } from "react";

export function OverlayRoot({ children }: { children?: ReactNode }) {
  return <View className="overlay-layer">{children}</View>;
}
