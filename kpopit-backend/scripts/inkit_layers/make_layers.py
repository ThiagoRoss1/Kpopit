"""CLI: turn a folder of square photo renders into the three InkIt files per photo.

    python make_layers.py <input_dir> <output_dir> [--force] [--calibrate]

Writes `<stem>.png` (photo copy), `<stem>.pencil.png` and `<stem>.pen.png` (8-bit
grayscale, white = paper). Skips existing outputs unless --force. --calibrate writes
nothing and prints the hatching density. An optional overrides.json in <input_dir>
multiplies layer darkness for review. The model extractor is injectable for tests.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import config
from hatching import form_hatching, multiply
from layers import build_layers, line_curve
from light import light_normalized

PHOTO_EXTS = {".png", ".jpg", ".jpeg"}


def load_square(path: Path, side: int = config.OUTPUT_SIDE) -> np.ndarray:
    """Centred square crop, Lanczos-resized to `side`: RGB float32 in [0, 1]."""
    image = Image.open(path).convert("RGB")
    width, height = image.size
    crop = min(width, height)
    left, top = (width - crop) // 2, (height - crop) // 2
    image = image.crop((left, top, left + crop, top + crop)).resize((side, side), Image.Resampling.LANCZOS)
    return np.asarray(image, dtype=np.float32) / 255.0


def _layer_png(darkness: np.ndarray) -> Image.Image:
    value = (255.0 * (1.0 - np.clip(darkness, 0, 1))).round().astype(np.uint8)
    return Image.fromarray(value, mode="L")


def _photo_png(rgb: np.ndarray) -> Image.Image:
    return Image.fromarray((np.clip(rgb, 0, 1) * 255).round().astype(np.uint8))


def _photos(input_dir: Path) -> list[Path]:
    return sorted(p for p in input_dir.iterdir() if p.suffix.lower() in PHOTO_EXTS)


def _calibrate(items: list[tuple[Path, np.ndarray]], extractor) -> float:
    """The hatching density that brings mean pencil ink to the config target on this folder."""
    target = config.PENCIL_MEAN_TARGET
    cache = [(photo.stem, light_normalized(rgb), line_curve(extractor.maps(rgb).coarse1024)) for photo, rgb in items]
    lines_mean = float(np.mean([lines.mean() for _, _, lines in cache]))

    def mean_at(density: float) -> float:
        return float(np.mean([multiply(lines, form_hatching(light, stem, density)).mean() for stem, light, lines in cache]))

    density, measured = 0.674, mean_at(0.674)
    for _ in range(2):
        density *= (target - lines_mean) / max(measured - lines_mean, 1e-6)
        measured = mean_at(density)
    print(f"hatch density {density:.3f}: pencil mean {measured:.3f} (lines alone {lines_mean:.3f})", flush=True)
    return density


def main(argv: list[str], extractor=None) -> int:
    parser = argparse.ArgumentParser(description="Build InkIt pencil/pen layers from square photos.")
    parser.add_argument("input_dir")
    parser.add_argument("output_dir")
    parser.add_argument("--force", action="store_true", help="rewrite outputs that already exist")
    parser.add_argument("--calibrate", action="store_true", help="print the hatching density and write nothing")
    args = parser.parse_args(argv)

    input_dir = Path(args.input_dir)
    photos = _photos(input_dir)
    if extractor is None:
        from models import Extractor

        extractor = Extractor()

    if args.calibrate:
        _calibrate([(photo, load_square(photo)) for photo in photos], extractor)
        return 0

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    overrides_path = input_dir / "overrides.json"
    overrides = json.loads(overrides_path.read_text(encoding="utf-8")) if overrides_path.exists() else {}

    for photo in photos:
        stem = photo.stem
        targets = (output_dir / f"{stem}.png", output_dir / f"{stem}.pencil.png", output_dir / f"{stem}.pen.png")
        if not args.force and all(target.exists() for target in targets):
            continue
        rgb = load_square(photo)
        maps = extractor.maps(rgb)
        pencil, pen = build_layers(rgb, maps, stem, overrides.get(stem))
        _photo_png(rgb).save(targets[0])
        _layer_png(pencil).save(targets[1])
        _layer_png(pen).save(targets[2])
        print(stem, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
