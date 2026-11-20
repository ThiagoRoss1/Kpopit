"""Tests for the per-photo light normalisation and the figure/background focus."""

import numpy as np

from hierarchy import subject_focus
from light import light_normalized


def _gradient(side: int = 1000) -> np.ndarray:
    row = np.linspace(0.0, 1.0, side, dtype=np.float32)
    plane = np.tile(row, (side, 1))
    return np.dstack([plane, plane[::-1], plane.T])


def test_light_normalized_keeps_shape_and_range():
    rgb = _gradient()
    out = light_normalized(rgb)
    assert out.shape == rgb.shape
    assert out.dtype == np.float32
    assert float(out.min()) >= 0.0
    assert float(out.max()) <= 1.0


def test_light_normalized_raises_local_contrast():
    """A soft, low-contrast but textured region (a nose under flat light): CLAHE
    equalises the local histogram so its faint detail reads stronger. A perfectly
    flat patch has no histogram to equalise, which is why CLAHE leaves it alone."""
    rng = np.random.default_rng(0)
    base = np.full((1000, 1000, 3), 0.5, dtype=np.float32)
    rgb = np.clip(base + rng.normal(0, 0.05, (1000, 1000, 3)).astype(np.float32), 0, 1)
    rgb[450:550, 450:550] = np.clip(rgb[450:550, 450:550] + 0.04, 0, 1)
    out = light_normalized(rgb)

    def local_contrast(img: np.ndarray) -> float:
        luma = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
        square = luma[460:540, 460:540].mean()
        ring = luma.copy()
        ring[440:560, 440:560] = np.nan
        surround = np.nanmean(ring)
        return abs(float(square) - float(surround))

    assert local_contrast(out) > local_contrast(rgb)


def _subject_depth(side: int = 1000) -> np.ndarray:
    depth = np.full((side, side), 0.1, dtype=np.float32)
    ys, xs = np.mgrid[0:side, 0:side]
    figure = (xs - side / 2) ** 2 + (ys - side / 2) ** 2 <= 250**2
    depth[figure] = 0.7
    camera = (xs - side / 2) ** 2 + (ys - side / 2) ** 2 <= 50**2
    depth[camera] = 0.95
    return depth


def test_subject_focus_whole_figure():
    """Seeun case: a bright camera blob inside the figure must not steal the focus."""
    depth = _subject_depth()
    out = subject_focus(depth, 0.5)
    assert out[500, 500] >= 0.99  # the camera blob
    assert out[500, 650] >= 0.99  # the figure body around it
    assert abs(float(out[40, 40]) - 0.5) <= 0.01  # far background


def test_subject_focus_floor():
    depth = _subject_depth()
    out = subject_focus(depth, 0.5)
    assert float(out.min()) >= 0.5 - 1e-6
