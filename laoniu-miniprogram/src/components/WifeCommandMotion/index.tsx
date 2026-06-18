import { View } from "@tarojs/components";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./index.scss";

export interface WifeCommandMotionOptions {
  armed?: boolean;
  className?: string;
  commandKey: string;
  danger?: boolean;
  onClick?: () => void;
  pending?: boolean;
}

interface WifeCommandMotionApi {
  command: (options: WifeCommandMotionOptions, children: ReactNode) => ReactNode;
}

export function WifeCommandMotion({
  activeDuration = 900,
  children,
  className = "",
}: {
  activeDuration?: number;
  children: (api: WifeCommandMotionApi) => ReactNode;
  className?: string;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function activate(commandKey: string, onClick?: () => void) {
    setActiveCommand(commandKey);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveCommand(null);
      timerRef.current = null;
    }, activeDuration);
    onClick?.();
  }

  const api: WifeCommandMotionApi = {
    command: ({ armed = false, className: itemClassName = "", commandKey, danger = false, onClick, pending = false }, childrenNode) => {
      const active = activeCommand === commandKey;
      const dimmed = Boolean(activeCommand) && !active;
      return (
        <View
          className={[
            "wife-command-motion__item",
            active ? "wife-command-motion__item--active" : "",
            dimmed ? "wife-command-motion__item--dimmed" : "",
            pending ? "wife-command-motion__item--pending" : "",
            danger ? "wife-command-motion__item--danger" : "",
            armed ? "wife-command-motion__item--armed" : "",
            itemClassName,
          ].filter(Boolean).join(" ")}
          key={commandKey}
          onClick={() => activate(commandKey, onClick)}
        >
          {childrenNode}
        </View>
      );
    },
  };

  return (
    <View className={`wife-command-motion ${className}`}>
      {children(api)}
    </View>
  );
}
