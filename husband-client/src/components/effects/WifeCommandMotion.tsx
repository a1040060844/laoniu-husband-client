import {
  createElement,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import "./WifeCommandMotion.css";

type WifeCommandMotionTag = "div" | "nav" | "section";

interface WifeCommandMotionProps extends HTMLAttributes<HTMLElement> {
  as?: WifeCommandMotionTag;
  children: ReactNode;
  activeDuration?: number;
}

export function WifeCommandMotion({
  as = "div",
  children,
  className,
  activeDuration = 900,
  onClickCapture,
  ...props
}: WifeCommandMotionProps) {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const commands = Array.from(
      wrapper.querySelectorAll<HTMLElement>("[data-wife-command]"),
    );

    commands.forEach((command) => {
      const isActive = activeCommand === command.dataset.wifeCommand;
      command.classList.toggle("wife-command-motion__item--active", isActive);
      command.classList.toggle(
        "wife-command-motion__item--dimmed",
        Boolean(activeCommand) && !isActive,
      );
    });

    return () => {
      commands.forEach((command) => {
        command.classList.remove("wife-command-motion__item--active");
        command.classList.remove("wife-command-motion__item--dimmed");
      });
    };
  }, [activeCommand]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function handleClickCapture(event: ReactMouseEvent<HTMLElement>) {
    onClickCapture?.(event);
    const wrapper = wrapperRef.current;
    const target = event.target as HTMLElement | null;
    const command = target?.closest<HTMLElement>("[data-wife-command]");
    if (!wrapper || !command || !wrapper.contains(command)) return;

    setActiveCommand(command.dataset.wifeCommand ?? null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setActiveCommand(null);
      timerRef.current = null;
    }, activeDuration);
  }

  return createElement(
    as,
    {
      ...props,
      ref: wrapperRef,
      className: `wife-command-motion${className ? ` ${className}` : ""}`,
      "data-active-command": activeCommand ?? undefined,
      onClickCapture: handleClickCapture,
    },
    children,
  );
}
