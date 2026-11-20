"""Per-photo light reading (port of v2.light_normalized).

CLAHE on the L channel of LAB: local contrast is equalised so soft or blown
regions still carry edges for the Lineart extractors and the hatching tone.
The photo itself is never changed; only the copy fed to those steps is.
"""

import cv2
import numpy as np

import config


def light_normalized(rgb: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor((np.clip(rgb, 0, 1) * 255).round().astype(np.uint8), cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=config.CLAHE_CLIP, tileGridSize=(config.CLAHE_TILES, config.CLAHE_TILES))
    lab[..., 0] = clahe.apply(lab[..., 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) / 255.0
