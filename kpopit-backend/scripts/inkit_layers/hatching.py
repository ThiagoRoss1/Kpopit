"""Pencil form-following hatching (ports of v2.multiply, flow_field, strokes, draw,
form_hatching). Strokes run along the surfaces, denser where the tone is darker, with
cross-hatching only in the darks. Darkness in [0, 1] at OUTPUT_SIDE.
"""

import math
import zlib

import cv2
import numpy as np

import config
from imaging import blur, domain_transform, gray, normalized

SIDE = config.OUTPUT_SIDE


def multiply(*layers: np.ndarray) -> np.ndarray:
    """Darkness of layers drawn on top of each other: 1 - prod(1 - d)."""
    paper = np.ones_like(layers[0])
    for layer in layers:
        paper *= 1.0 - np.clip(layer, 0, 1)
    return 1.0 - paper


def _seed_of(stem: str) -> int:
    return zlib.crc32(stem.encode("utf-8"))


def flow_field(luma: np.ndarray, sigma: float = config.HATCH_FLOW_SIGMA):
    """Edge tangent + coherence from the smoothed structure tensor."""
    gx = cv2.Sobel(luma, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(luma, cv2.CV_32F, 0, 1, ksize=3)
    e, f, g = blur(gx * gx, sigma), blur(gx * gy, sigma), blur(gy * gy, sigma)
    root = np.sqrt((e - g) ** 2 + 4 * f * f)
    lambda1, lambda2 = 0.5 * (e + g + root), 0.5 * (e + g - root)
    tx, ty = normalized(lambda1 - e, -f)
    coherence = ((lambda1 - lambda2) / (lambda1 + lambda2 + 1e-6)) ** 2
    return tx, ty, np.clip(coherence, 0, 1).astype(np.float32)


def strokes(tx, ty, starts, length, step=2.0):
    """Short streamlines through the field, all strokes integrated at once (both directions)."""
    count = len(starts)
    steps = max(2, int(length / step / 2))
    paths = np.zeros((count, 2 * steps + 1, 2), np.float32)
    paths[:, steps] = starts
    for direction in (1, -1):
        position = starts.copy()
        previous = None
        for k in range(1, steps + 1):
            ix = np.clip(position[:, 0].astype(int), 0, SIDE - 1)
            iy = np.clip(position[:, 1].astype(int), 0, SIDE - 1)
            vx, vy = tx[iy, ix], ty[iy, ix]
            if previous is None:
                vx, vy = vx * direction, vy * direction
            else:
                flip = np.where(vx * previous[0] + vy * previous[1] < 0, -1.0, 1.0)
                vx, vy = vx * flip, vy * flip
            previous = (vx, vy)
            position = position + np.stack([vx, vy], 1) * step
            paths[:, steps + direction * k] = position
    return paths


def draw(paths: np.ndarray, alphas: np.ndarray, width: int = 1) -> np.ndarray:
    """Anti-aliased polylines grouped by opacity; groups multiply on paper."""
    darkness = np.zeros((SIDE, SIDE), np.float32)
    for alpha in np.unique(alphas):
        canvas = np.zeros((SIDE, SIDE), np.uint8)
        chosen = [np.round(p).astype(np.int32) for p in paths[alphas == alpha]]
        cv2.polylines(canvas, chosen, False, 255, width, cv2.LINE_AA)
        darkness = multiply(darkness, canvas.astype(np.float32) / 255.0 * float(alpha))
    return darkness


def form_hatching(rgb: np.ndarray, stem: str, density: float = 1.0) -> np.ndarray:
    """Strokes along the surfaces (hair along strands, the background along its edges), a
    default diagonal where the image has no direction, denser where the tone is darker,
    cross-hatching only in the darks."""
    rng = np.random.default_rng(_seed_of(stem) + 1)
    luma = gray(domain_transform(rgb, sigma_s=60, sigma_r=0.3))
    tone = np.clip((0.88 - blur(luma, 3.0)) / 0.78, 0, 1)
    tx, ty, coherence = flow_field(gray(rgb))

    diagonal = (math.cos(-math.pi / 4), math.sin(-math.pi / 4))
    align = np.where(tx * diagonal[0] + ty * diagonal[1] < 0, -1.0, 1.0)
    weight = np.clip(coherence * 2.5, 0, 1)
    hx, hy = normalized(weight * tx * align + (1 - weight) * diagonal[0], weight * ty * align + (1 - weight) * diagonal[1])

    layers = []
    for crossing, (cx, cy) in ((False, (hx, hy)), (True, (-hy, hx))):
        candidates = rng.uniform(0, SIDE, (int(60000 * density), 2)).astype(np.float32)
        # float32 can round a draw up to exactly SIDE: clamp the pixel index.
        t = tone[np.minimum(candidates[:, 1].astype(int), SIDE - 1), np.minimum(candidates[:, 0].astype(int), SIDE - 1)]
        # Capped so a dark scene gets shading, not a solid wall of strokes.
        chance = np.clip((t - 0.62) / 0.38, 0, 1) ** 1.5 * 0.35 if crossing else np.minimum(t ** 1.4, 0.45)
        keep = rng.random(len(candidates)) < chance
        starts = candidates[keep]
        if not len(starts):
            continue
        paths = strokes(cx, cy, starts, length=float(rng.uniform(14, 26)))
        alphas = rng.choice(np.array([0.14, 0.22, 0.32], np.float32), len(starts))
        layers.append(draw(paths, alphas))
    return multiply(*layers) if layers else np.zeros((SIDE, SIDE), np.float32)
