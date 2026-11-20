"""Figure vs background focus (port of v2.hierarchy_subject).

Otsu splits the (blurred) depth histogram into figure and background, so a hand,
camera or arm in front of the face can't steal the focus the way "nearest to the
camera" did. Everything on the figure's side gets 1; the background is attenuated
to `floor`, never removed.
"""

import cv2
import numpy as np

import config
from imaging import blur, smoothstep


def subject_focus(depth: np.ndarray, floor: float) -> np.ndarray:
    near = blur(depth, config.FOCUS_DEPTH_BLUR)
    threshold, _ = cv2.threshold((near * 255).astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cut = threshold / 255.0
    ramp = smoothstep(cut - config.FOCUS_LOW_OFFSET, cut + config.FOCUS_HIGH_OFFSET, near)
    return (floor + (1.0 - floor) * ramp).astype(np.float32)
