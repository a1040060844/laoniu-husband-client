import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function WifeDecreesPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  return (
    <View className="page scene-page">
      <Text className="title">圣旨 / 裁定</Text>
      {state.decrees.length ? state.decrees.map((decree) => (
        <View className="panel section" key={decree.id}>
          <Text className="title">{decree.title}</Text>
          <Text className="subtitle">{decree.text}</Text>
          <Text className="subtitle">{decree.createdAt}</Text>
        </View>
      )) : <View className="empty">暂无圣旨</View>}
    </View>
  );
}
