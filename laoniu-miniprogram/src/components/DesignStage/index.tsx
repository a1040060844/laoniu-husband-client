import { View } from "@tarojs/components";
import type { ReactNode } from "react";
import "./index.scss";

export function DesignStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`design-stage ${className}`}>{children}</View>;
}
