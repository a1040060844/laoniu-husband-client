import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import "./TaskRewardFlight.css";

export interface TaskRewardFlightTask {
  taskId: string;
  title: string;
  exp: number;
  money: number;
  benefit: boolean;
}

export interface TaskRewardFlightEvent {
  id: string;
  tasks: TaskRewardFlightTask[];
}

interface TaskRewardFlightProps {
  event: TaskRewardFlightEvent | null;
  onComplete: () => void;
}

interface FlightItem {
  id: string;
  label: string;
  tone: "exp" | "money" | "benefit";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
}

function rectCenter(rect: DOMRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function isVisible(rect: DOMRect) {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function findVisibleElement(selector: string) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    elements.find((element) => isVisible(element.getBoundingClientRect())) ??
    elements[0] ??
    null
  );
}

function fallbackStart(index: number) {
  return {
    x: window.innerWidth / 2 + (index % 2 ? 18 : -18),
    y: window.innerHeight * 0.58 + index * 3,
  };
}

function fallbackEnd(tone: FlightItem["tone"], index: number) {
  const top = tone === "benefit" ? 0.44 : tone === "money" ? 0.32 : 0.22;
  return {
    x: window.innerWidth * (tone === "money" ? 0.76 : 0.5) + index * 2,
    y: window.innerHeight * top,
  };
}

export function TaskRewardFlight({ event, onComplete }: TaskRewardFlightProps) {
  const [items, setItems] = useState<FlightItem[]>([]);

  useEffect(() => {
    if (!event) return;

    const nextItems: FlightItem[] = [];
    const bumpedTargets = new Set<HTMLElement>();

    event.tasks.forEach((task, taskIndex) => {
      const sourceElement = findVisibleElement(
        `[data-task-card-id="${CSS.escape(task.taskId)}"]`,
      );
      const sourceCenter = sourceElement
        ? rectCenter(sourceElement.getBoundingClientRect())
        : fallbackStart(taskIndex);

      const addItem = (
        tone: FlightItem["tone"],
        label: string,
        rewardIndex: number,
      ) => {
        const targetElement =
          tone === "benefit"
            ? null
            : findVisibleElement(`[data-reward-target="${tone}"]`);
        const targetCenter = targetElement
          ? rectCenter(targetElement.getBoundingClientRect())
          : fallbackEnd(tone, taskIndex + rewardIndex);
        if (targetElement) {
          targetElement.classList.add("task-reward-flight-target--bump");
          bumpedTargets.add(targetElement);
        }

        nextItems.push({
          id: `${event.id}-${task.taskId}-${tone}-${rewardIndex}`,
          label,
          tone,
          startX: sourceCenter.x,
          startY: sourceCenter.y,
          endX: targetCenter.x,
          endY: targetCenter.y,
          delay: taskIndex * 120 + rewardIndex * 90,
        });
      };

      let rewardIndex = 0;
      if (task.exp > 0) {
        addItem("exp", `经验 +${task.exp}`, rewardIndex++);
      }
      if (task.money > 0) {
        addItem("money", `零花钱 +${task.money}`, rewardIndex++);
      }
      if (task.benefit) {
        addItem("benefit", "权益奖励已记录", rewardIndex);
      }
    });

    if (!nextItems.length) {
      onComplete();
      return;
    }

    setItems(nextItems);
    const timer = window.setTimeout(() => {
      setItems([]);
      bumpedTargets.forEach((target) =>
        target.classList.remove("task-reward-flight-target--bump"),
      );
      onComplete();
    }, 1480);

    return () => {
      window.clearTimeout(timer);
      bumpedTargets.forEach((target) =>
        target.classList.remove("task-reward-flight-target--bump"),
      );
    };
  }, [event, onComplete]);

  if (!items.length) return null;

  return createPortal(
    <div className="task-reward-flight-layer" aria-live="polite">
      {items.map((item) => (
        <span
          key={item.id}
          className={`task-reward-flight task-reward-flight--${item.tone}`}
          style={
            {
              "--flight-start-x": `${item.startX}px`,
              "--flight-start-y": `${item.startY}px`,
              "--flight-end-x": `${item.endX}px`,
              "--flight-end-y": `${item.endY}px`,
              "--flight-delay": `${item.delay}ms`,
            } as CSSProperties
          }
        >
          {item.label}
        </span>
      ))}
    </div>,
    document.body,
  );
}
