"""Tests for the pen shading planes and the pencil form-following hatching."""

import numpy as np

from hatching import form_hatching
from shading import photo_shadow, shading_planes

SIDE = 1000


def _grey(value: float) -> np.ndarray:
    return np.full((SIDE, SIDE, 3), value, dtype=np.float32)


def test_planes_cap():
    assert shading_planes(np.ones((SIDE, SIDE), np.float32)).max() <= 0.85 + 1e-6


def test_planes_paper_on_white():
    white = _grey(1.0)
    assert shading_planes(photo_shadow(white)).max() < 0.01


def test_hatching_is_deterministic():
    rgb = _grey(0.3)
    a = form_hatching(rgb, "gaeul_i", 0.380)
    b = form_hatching(rgb, "gaeul_i", 0.380)
    c = form_hatching(rgb, "tzuyu_i", 0.380)
    assert np.array_equal(a, b)
    assert not np.array_equal(a, c)


def test_hatching_follows_tone():
    dark = form_hatching(_grey(0.2), "seeun_i", 0.380).mean()
    light = form_hatching(_grey(0.8), "seeun_i", 0.380).mean()
    white = form_hatching(_grey(1.0), "seeun_i", 0.380).mean()
    assert dark > light > white
    assert white < 0.01


def test_hatching_never_indexes_out_of_bounds():
    rgb = _grey(0.3)
    for i in range(50):
        form_hatching(rgb, f"stem_{i}", 0.380)
