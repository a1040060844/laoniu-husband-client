import { Button, Text, View } from "@tarojs/components";
import type { DecreeEvent } from "../../types/domain";

export function DecreeModal({
  decree,
  onAcknowledge,
}: {
  decree?: DecreeEvent | null;
  onAcknowledge: () => void;
}) {
  if (!decree) return null;

  return (
    <View className="modal-layer">
      <View className="panel">
        <Text className="title">{decree.title}</Text>
        <Text className="subtitle">{decree.text}</Text>
        <Button className="btn section" onClick={onAcknowledge}>
          领命
        </Button>
      </View>
    </View>
  );
}
