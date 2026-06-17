import { Image } from "@tarojs/components";
import type { ImageProps } from "@tarojs/components";
import "./index.scss";

export function RemoteImage(props: ImageProps) {
  return <Image {...props} className={`remote-image ${props.className || ""}`} />;
}
