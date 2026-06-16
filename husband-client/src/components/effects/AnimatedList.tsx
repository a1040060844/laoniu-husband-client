import { Children, type CSSProperties, type ReactNode } from "react";
import "./AnimatedList.css";

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  interval?: number;
  playKey: string;
}

export function AnimatedList({
  children,
  className,
  interval = 55,
  playKey,
}: AnimatedListProps) {
  return (
    <div key={playKey} className={`animated-list${className ? ` ${className}` : ""}`}>
      {Children.map(children, (child, index) => (
        <div
          className="animated-list__item"
          style={{ "--animated-list-delay": `${index * interval}ms` } as CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
