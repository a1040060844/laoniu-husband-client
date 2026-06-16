import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import "./AnimatedContent.css";

type AnimatedTag = "article" | "div" | "footer" | "header" | "section";

interface AnimatedContentProps extends HTMLAttributes<HTMLElement> {
  as?: AnimatedTag;
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export function AnimatedContent({
  as = "div",
  children,
  className,
  delay = 0,
  duration = 340,
  style,
  ...props
}: AnimatedContentProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ...props,
      ref: elementRef,
      className: `animated-content${visible ? " animated-content--visible" : ""}${className ? ` ${className}` : ""}`,
      style: {
        ...style,
        "--animated-content-delay": `${delay}ms`,
        "--animated-content-duration": `${duration}ms`,
      } as CSSProperties,
    },
    children,
  );
}
