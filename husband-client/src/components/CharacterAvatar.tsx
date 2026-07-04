import type { HTMLAttributes } from "react";

type CharacterAvatarKind = "husband" | "wife" | "slave";

interface CharacterAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  imageClassName?: string;
  kind?: CharacterAvatarKind;
  src: string;
}

function avatarSourceClass(src: string) {
  const fileName = src
    .split(/[?#]/)[0]
    .split("/")
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, "");
  if (!fileName) return "";
  return `character-avatar--${fileName.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}`;
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
        avatarSourceClass(src),
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
