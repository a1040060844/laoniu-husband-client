import { ChevronDown, Flame, Sparkles } from "lucide-react";
import type { MouseEventHandler } from "react";
import "./VerticalMagicSwipeHint.css";

type VerticalMagicSwipeHintBaseProps = {
  className?: string;
  text?: string;
};

type VerticalMagicSwipeHintProps =
  | (VerticalMagicSwipeHintBaseProps & {
      href: string;
      onClick: MouseEventHandler<HTMLAnchorElement>;
    })
  | (VerticalMagicSwipeHintBaseProps & {
      onClick: MouseEventHandler<HTMLButtonElement>;
    });

export function VerticalMagicSwipeHint(props: VerticalMagicSwipeHintProps) {
  const text = props.text ?? "下滑查看权益";
  const classes = ["vertical-magic-hint", props.className]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="vertical-magic-badge" aria-hidden="true">
        <span className="vertical-magic-ring">
          <span className="vertical-magic-ring__inner">
            <Flame className="vertical-magic-flame" />
          </span>
        </span>
        <span className="vertical-magic-ornament">
          <span />
          <Sparkles />
          <span />
        </span>
      </span>

      <span className="vertical-magic-text" aria-hidden="true">
        {Array.from(text).map((character, index) => (
          <span key={`${character}-${index}`}>{character}</span>
        ))}
      </span>

      <span className="vertical-magic-line" aria-hidden="true">
        <span className="vertical-magic-line__cap" />
        <span className="vertical-magic-line__core" />
        <span className="vertical-magic-line__flow" />
        <span className="vertical-magic-particle vertical-magic-particle--one" />
        <span className="vertical-magic-particle vertical-magic-particle--two" />
      </span>

      <span className="vertical-magic-arrow" aria-hidden="true">
        <ChevronDown />
        <ChevronDown />
      </span>
    </>
  );

  if ("href" in props) {
    return (
      <a
        className={classes}
        href={props.href}
        aria-label={text}
        onClick={props.onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type="button"
      aria-label={text}
      onClick={props.onClick}
    >
      {content}
    </button>
  );
}
