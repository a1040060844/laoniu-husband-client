import { Button, Text, View } from "@tarojs/components";

export function StoryModal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <View className="modal-layer">
      <View className="panel">
        <Text className="title">{title}</Text>
        <Text className="subtitle">{text}</Text>
        <Button className="btn section" onClick={onClose}>知道了</Button>
      </View>
    </View>
  );
}
