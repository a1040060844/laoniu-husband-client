import { Text, View } from "@tarojs/components";
import { useEffect } from "react";
import "./index.scss";

export interface SlaveStateCinematicEvent {
  id: string;
  mode: "enter" | "restore";
  amount?: number;
}

export function SlaveStateCinematic({
  ambient = false,
  event,
  onComplete,
}: {
  ambient?: boolean;
  event?: SlaveStateCinematicEvent | null;
  onComplete?: () => void;
}) {
  useEffect(() => {
    if (!event || !onComplete) return undefined;
    const timer = setTimeout(onComplete, 1850);
    return () => clearTimeout(timer);
  }, [event, onComplete]);

  return (
    <>
      {ambient ? <View className="slave-state-ambient" /> : null}
      {event ? (
        <View className={`slave-state-cinematic slave-state-cinematic--${event.mode}`}>
          <View className="slave-state-cinematic__vignette" />
          <View className="slave-state-cinematic__panel">
            <Text className="slave-state-cinematic__eyebrow">
              {event.mode === "enter" ? "惩罚状态启动" : "惩罚解除"}
            </Text>
            <Text className="slave-state-cinematic__title">
              {event.mode === "enter" ? "卖身奴隶" : "身份恢复"}
            </Text>
            <View className="slave-state-cinematic__lines">
              {event.mode === "enter" ? (
                <>
                  <Text>权益暂停</Text>
                  <Text className="slave-state-cinematic__wallet">零花钱冻结{event.amount ? `：-${event.amount}` : ""}</Text>
                  <Text>等待老妞大人裁定</Text>
                </>
              ) : (
                <>
                  <Text>暗场退去</Text>
                  <Text className="slave-state-cinematic__wallet">零花钱恢复{event.amount ? `：+${event.amount}` : ""}</Text>
                  <Text>身份恢复正常</Text>
                </>
              )}
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}
