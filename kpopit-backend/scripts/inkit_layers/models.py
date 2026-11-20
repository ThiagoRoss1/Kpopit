"""Model maps for one square photo (port of maps_crops.py): Lineart fine 512 / 1024,
coarse 1024 (darkness, OUTPUT_SIDE) and MiDaS depth (run at DEPTH_INPUT, resized to
OUTPUT_SIDE). torch and controlnet_aux are imported lazily, so the layer tests that
inject a fake extractor need no weights.
"""

from dataclasses import dataclass

import cv2
import numpy as np

import config
from light import light_normalized


@dataclass
class Maps:
    fine512: np.ndarray
    fine1024: np.ndarray
    coarse1024: np.ndarray
    depth: np.ndarray


def _to_output(channel: np.ndarray) -> np.ndarray:
    resized = cv2.resize(channel.astype(np.float32), (config.OUTPUT_SIDE, config.OUTPUT_SIDE), interpolation=cv2.INTER_AREA)
    return resized / 255.0


class Extractor:
    """Lineart (fine/coarse) + MiDaS depth from `lllyasviel/Annotators`, CUDA when available."""

    def __init__(self):
        import torch
        from controlnet_aux import LineartDetector, MidasDetector

        self._torch = torch
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self._lineart = LineartDetector.from_pretrained("lllyasviel/Annotators").to(self._device)
        self._midas = MidasDetector.from_pretrained("lllyasviel/Annotators").model.to(self._device).eval()

    def _lineart_map(self, image, coarse: bool, resolution: int) -> np.ndarray:
        raw = self._lineart(image, coarse=coarse, detect_resolution=resolution, image_resolution=resolution, output_type="np")
        channel = raw[..., 0] if raw.ndim == 3 else raw
        return _to_output(channel)

    def maps(self, rgb: np.ndarray) -> Maps:
        from PIL import Image

        torch = self._torch
        # The line extractors read the per-photo light-normalised copy; the photo itself is unchanged.
        image = Image.fromarray((np.clip(light_normalized(rgb), 0, 1) * 255).round().astype(np.uint8))
        fine512 = self._lineart_map(image, False, 512)
        fine1024 = self._lineart_map(image, False, 1024)
        coarse1024 = self._lineart_map(image, True, 1024)

        feed_rgb = cv2.resize(rgb, (config.DEPTH_INPUT, config.DEPTH_INPUT), interpolation=cv2.INTER_AREA)
        feed = torch.from_numpy(feed_rgb * 2.0 - 1.0).permute(2, 0, 1)[None].float().to(self._device)
        with torch.no_grad():
            depth = self._midas(feed)[0].float().cpu().numpy()
        depth = (depth - depth.min()) / max(float(depth.max() - depth.min()), 1e-6)
        depth = cv2.resize(depth.astype(np.float32), (config.OUTPUT_SIDE, config.OUTPUT_SIDE), interpolation=cv2.INTER_CUBIC)
        return Maps(fine512, fine1024, coarse1024, depth)
