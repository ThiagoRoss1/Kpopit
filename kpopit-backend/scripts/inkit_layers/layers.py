"""Build the pencil and pen darkness maps from the model maps (port of v2.build with the
68_balanceada options fixed: per-photo light on, fused fine lines, photo-light shading
planes, figure-vs-background focus). Both layers are float32 darkness at OUTPUT_SIDE.
"""

import numpy as np

import config
from hatching import form_hatching, multiply
from hierarchy import subject_focus
from light import light_normalized
from models import Maps
from shading import photo_shadow, shading_planes


def line_curve(darkness: np.ndarray) -> np.ndarray:
    """Pencil line tone curve (levels + gamma)."""
    span = config.PENCIL_LINE_HIGH - config.PENCIL_LINE_LOW
    return np.clip((darkness - config.PENCIL_LINE_LOW) / span, 0, 1) ** config.PENCIL_LINE_GAMMA


def pen_curve(darkness: np.ndarray) -> np.ndarray:
    """Pen line tone curve: faint noise to paper, the strongest lines to full ink."""
    span = config.PEN_LINE_HIGH - config.PEN_LINE_LOW
    return np.clip((darkness - config.PEN_LINE_LOW) / span, 0, 1) ** config.PEN_LINE_GAMMA


def pen_lines(maps: Maps) -> np.ndarray:
    """512 keeps big forms (nose, jaw); 1024 adds strands and lashes at a share."""
    base = pen_curve(maps.fine512)
    detail = pen_curve(maps.fine1024)
    return multiply(base, config.PEN_FUSE_DETAIL * detail)


def build_layers(rgb: np.ndarray, maps: Maps, stem: str, overrides: dict | None = None) -> tuple[np.ndarray, np.ndarray]:
    light = light_normalized(rgb)
    pencil = multiply(line_curve(maps.coarse1024), form_hatching(light, stem, config.HATCH_DENSITY))

    lines = pen_lines(maps)
    shade = shading_planes(photo_shadow(rgb))
    line_focus = subject_focus(maps.depth, config.BACKGROUND_LINE_FLOOR)
    shade_focus = subject_focus(maps.depth, config.BACKGROUND_SHADE_FLOOR)
    pen = multiply(lines * line_focus, shade * shade_focus)

    if overrides:
        pencil = np.clip(pencil * overrides.get("pencil", 1.0), 0, 1)
        pen = np.clip(pen * overrides.get("pen", 1.0), 0, 1)
    return pencil.astype(np.float32), pen.astype(np.float32)
