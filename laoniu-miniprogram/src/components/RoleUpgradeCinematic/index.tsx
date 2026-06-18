import { Image, Text, View } from "@tarojs/components";
import { useEffect } from "react";
import type { CSSProperties } from "react";
import { CountUp } from "../CountUp";
import type { Role } from "../../types/domain";
import "./index.scss";

const PARTICLE_COUNT = 24;
const RING_COUNT = 3;

export function RoleUpgradeCinematic({
  fromLevel,
  fromRole,
  onComplete,
  toLevel,
  toRole,
}: {
  fromLevel: number;
  fromRole: Role;
  onComplete: () => void;
  toLevel: number;
  toRole: Role;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2850);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View className="role-upgrade-cinematic">
      <View className="role-upgrade-cinematic__scrim" />
      <View className="role-upgrade-cinematic__burst">
        {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
          <View
            className={`role-upgrade-cinematic__particle role-upgrade-cinematic__particle--${index % 6}`}
            key={index}
            style={{
              "--particle-angle": `${(360 / PARTICLE_COUNT) * index}deg`,
              "--particle-distance": `${72 + (index % 7) * 13}px`,
              "--particle-delay": `${(index % 9) * 24}ms`,
            } as CSSProperties}
          />
        ))}
      </View>
      <View className="role-upgrade-cinematic__rings">
        {Array.from({ length: RING_COUNT }, (_, index) => (
          <View
            className="role-upgrade-cinematic__ring"
            key={index}
            style={{ "--ring-delay": `${index * 170}ms` } as CSSProperties}
          />
        ))}
      </View>

      <View className="role-upgrade-cinematic__panel">
        <View className="role-upgrade-cinematic__old">
          <Image className="pixelated" src={fromRole.roleImage} mode="aspectFit" />
          <Text>Lv. {String(fromLevel).padStart(2, "0")}</Text>
          <Text className="role-upgrade-cinematic__role-name">{fromRole.title}</Text>
        </View>

        <View className="role-upgrade-cinematic__seal">
          <Text>职务晋升</Text>
          <Text className="role-upgrade-cinematic__level">Lv. <CountUp value={toLevel} minimumIntegerDigits={2} /></Text>
          <Text>Lv. {String(fromLevel).padStart(2, "0")} {"->"} Lv. {String(toLevel).padStart(2, "0")}</Text>
        </View>

        <View className="role-upgrade-cinematic__new">
          <Image className="pixelated" src={toRole.roleImage} mode="aspectFit" />
          <Text>新职务</Text>
          <Text className="role-upgrade-cinematic__role-name">{toRole.title}</Text>
        </View>
      </View>
    </View>
  );
}
