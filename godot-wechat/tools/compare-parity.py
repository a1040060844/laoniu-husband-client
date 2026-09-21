"""Create a 50% overlay, a thresholded heatmap, and compact pixel metrics."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance


def parse_mask(value: str) -> tuple[int, int, int, int]:
    parts = [int(part) for part in value.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("mask must be x,y,width,height")
    return tuple(parts)  # type: ignore[return-value]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--web", required=True, type=Path)
    parser.add_argument("--godot", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--threshold", type=int, default=18)
    parser.add_argument("--mask", action="append", type=parse_mask, default=[])
    args = parser.parse_args()

    web = Image.open(args.web).convert("RGBA")
    godot = Image.open(args.godot).convert("RGBA")
    if web.size != godot.size:
        raise SystemExit(f"image size mismatch: web={web.size} godot={godot.size}")

    args.out.mkdir(parents=True, exist_ok=True)
    overlay = Image.blend(web, godot, 0.5)
    overlay.save(args.out / "overlay.png")

    diff = ImageChops.difference(web, godot).convert("RGB")
    enhanced = ImageEnhance.Contrast(diff).enhance(4.0)
    enhanced.save(args.out / "heatmap.png")

    pixels = list(diff.getdata())
    mask = Image.new("1", web.size, 1)
    mask_draw = mask.load()
    for x, y, width, height in args.mask:
        for py in range(max(0, y), min(web.height, y + height)):
            for px in range(max(0, x), min(web.width, x + width)):
                mask_draw[px, py] = 0

    included = 0
    mismatched = 0
    total_delta = 0
    for index, (red, green, blue) in enumerate(pixels):
        x = index % web.width
        y = index // web.width
        if not mask.getpixel((x, y)):
            continue
        included += 1
        delta = max(red, green, blue)
        total_delta += delta
        if delta > args.threshold:
            mismatched += 1

    metrics = {
        "web": str(args.web),
        "godot": str(args.godot),
        "size": {"width": web.width, "height": web.height},
        "threshold": args.threshold,
        "includedPixels": included,
        "mismatchedPixels": mismatched,
        "mismatchRatio": mismatched / included if included else 0.0,
        "meanChannelDelta": total_delta / included if included else 0.0,
        "masks": [list(item) for item in args.mask],
    }
    (args.out / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
