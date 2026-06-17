import { useState } from "react";
import { useDidShow } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { stateService } from "../../../../services/state";
import type { AppState } from "../../../../services/state";

export default function WifeLogsPage() {
  const [state, setState] = useState<AppState>();
  useDidShow(() => { stateService.loadState().then(setState); });
  if (!state) return <View className="page"><Text>加载中...</Text></View>;
  return (
    <View className="page scene-page">
      <Text className="title">日志</Text>
      {state.logs.length ? state.logs.map((log) => (
        <View className="panel section" key={log.id}>
          <Text className="title">{log.title}</Text>
          <Text className="subtitle">{log.type} · {log.createdAt}</Text>
          <Text className="subtitle">{log.description || ""}</Text>
        </View>
      )) : <View className="empty">暂无日志</View>}
    </View>
  );
}
