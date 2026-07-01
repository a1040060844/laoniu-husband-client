import type { HTMLAttributes } from "react";

type CharacterAvatarKind = "husband" | "wife" | "slave";

interface CharacterAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  imageClassName?: string;
  kind?: CharacterAvatarKind;
  src: string;
}

export function CharacterAvatar({
  alt = "",
  className,
  imageClassName,
  kind = "husband",
  src,
  ...props
}: CharacterAvatarProps) {
  return (
    <span
      className={[
        "character-avatar",
        `character-avatar--${kind}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <img
        className={["character-avatar__image", imageClassName]
          .filter(Boolean)
          .join(" ")}
        src={src}
        alt={alt}
        draggable={false}
      />
    </span>
  );
}
