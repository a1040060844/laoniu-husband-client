import { ChevronDown, ChevronUp, Sparkle } from "lucide-react";
import type { MouseEventHandler } from "react";
import "./OrnateSwipeHint.css";

type OrnateSwipeHintBaseProps = {
  className?: string;
  direction: "up" | "down";
  text: string;
};

type OrnateSwipeHintProps =
  | (OrnateSwipeHintBaseProps & {
      href: string;
      onClick: MouseEventHandler<HTMLAnchorElement>;
    })
  | (OrnateSwipeHintBaseProps & {
      onClick: MouseEventHandler<HTMLButtonElement>;
    });

export function OrnateSwipeHint(props: OrnateSwipeHintProps) {
  const Arrow = props.direction === "up" ? ChevronUp : ChevronDown;
  const classes = [
    "ornate-swipe-hint",
    `ornate-swipe-hint--${props.direction}`,
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="ornate-swipe-arrow" aria-hidden="true">
        <Arrow />
        <Arrow />
        <Arrow />
      </span>
      <span className="ornate-swipe-row">
        <span className="ornate-line ornate-line--left" aria-hidden="true">
          <Sparkle />
        </span>
        <span className="ornate-text">{props.text}</span>
        <span className="ornate-line ornate-line--right" aria-hidden="true">
          <Sparkle />
        </span>
      </span>
    </>
  );

  if ("href" in props) {
    return (
      <a
        className={classes}
        href={props.href}
        onClick={props.onClick}
        aria-label={props.text}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      type="button"
      onClick={props.onClick}
      aria-label={props.text}
    >
      {content}
    </button>
  );
}
