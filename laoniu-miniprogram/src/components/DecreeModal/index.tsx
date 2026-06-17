import { Button, Text, View } from "@tarojs/components";
import type { DecreeEvent } from "../../types/domain";
import "./index.scss";

const toneMeta: Record<DecreeEvent["tone"], { badge: string; action: string }> = {
  down: { badge: "驳回", action: "我去重做" },
  normal: { badge: "裁定", action: "领命" },
  punish: { badge: "惩罚", action: "接受裁定" },
  upgrade: { badge: "晋升", action: "谢老妞大人" },
};

export function DecreeModal({
  decree,
  onAcknowledge,
}: {
  decree?: DecreeEvent | null;
  onAcknowledge: () => void;
}) {
  if (!decree) return null;

  const meta = toneMeta[decree.tone];

  return (
    <View className={`decree-modal decree-modal--${decree.tone}`}>
      <View className="decree-modal__scrim" />
      <View className="decree-modal__aura">
        {Array.from({ length: 10 }).map((_, index) => (
          <View className={`decree-modal__spark decree-modal__spark--${index % 5}`} key={index} />
        ))}
      </View>
      <View className="decree-modal__panel">
        <Text className="decree-modal__badge">{meta.badge}</Text>
        <Text className="decree-modal__title">{decree.title}</Text>
        <Text className="decree-modal__text">{decree.text}</Text>
        <Button className="decree-modal__button" onClick={onAcknowledge}>
          {meta.action}
        </Button>
      </View>
    </View>
  );
}
