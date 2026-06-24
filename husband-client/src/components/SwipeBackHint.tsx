import { ChevronDown } from "lucide-react";
import type { MouseEventHandler } from "react";
import "./SwipeBackHint.css";

type SwipeBackHintProps = {
  href: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
};

export function SwipeBackHint({ href, onClick }: SwipeBackHintProps) {
  return (
    <a
      className="swipe-back-hint"
      href={href}
      onClick={onClick}
      aria-label="下滑回老妞端"
    >
      <span className="swipe-back-icon" aria-hidden="true">
        <span>
          <ChevronDown />
        </span>
        <span>
          <ChevronDown />
        </span>
      </span>
      <span className="swipe-back-text">下滑回老妞端</span>
      <span className="swipe-back-shine" aria-hidden="true" />
    </a>
  );
}
