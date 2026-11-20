"""Pen shading: the photo's own light as soft-edged planes (ports of v2.photo_shadow
and v2.shading_planes). Darkness in [0, 1] at OUTPUT_SIDE; 0 = lit, 1 = deepest shadow.
"""

import numpy as np

import config
from imaging import blur, domain_transform, gray


def photo_shadow(rgb: np.ndarray) -> np.ndarray:
    """The photo's own light. Mostly local: a spot darker than its surroundings (the
    side of a nose, under the chin) is a shadow plane; flat dark albedo (black hair)
    only adds a little mass."""
    luma = gray(domain_transform(rgb, sigma_s=60, sigma_r=0.3))
    small = blur(luma, 4.0)  # wide enough that single hair strands don't read as shadow planes
    large = blur(luma, 35.0)
    relative = np.clip(-(np.log(small + 0.04) - np.log(large + 0.04)) / 0.30, 0, 1)
    mass = np.clip((0.70 - small) / 0.65, 0, 1)
    return np.clip(0.9 * relative + 0.12 * mass, 0, 1)


def shading_planes(shadow: np.ndarray) -> np.ndarray:
    """2-3 values with blended edges (the 'esfuminho'): light, mid, shadow; never past the cap."""
    t0, t1, t2 = config.SHADE_THRESHOLDS
    v0, v1, v2 = config.SHADE_VALUES
    planes = np.where(shadow > t2, v2, np.where(shadow > t1, v1, np.where(shadow > t0, v0, 0.0)))
    return np.minimum(blur(planes.astype(np.float32), config.SHADE_BLUR), config.SHADE_CAP)
