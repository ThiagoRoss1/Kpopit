"""Shared image primitives ported from the lab's classical.py / common.py.

These are the building blocks the layer ports lean on (blur, luma, smoothstep,
vector normalisation, edge-preserving smoothing). They are the lab functions
verbatim, not a redesign; the algorithms live in the modules that use them.
"""

import cv2
import numpy as np


def blur(image: np.ndarray, sigma: float) -> np.ndarray:
    return cv2.GaussianBlur(image, (0, 0), sigma, borderType=cv2.BORDER_REFLECT)


def gray(rgb: np.ndarray) -> np.ndarray:
    """Rec.601 luma, the weights the game's layers.ts uses."""
    return (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]).astype(np.float32)


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def normalized(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    length = np.sqrt(x * x + y * y)
    safe = length > 1e-8
    nx = np.where(safe, x / np.where(safe, length, 1), 1.0).astype(np.float32)
    ny = np.where(safe, y / np.where(safe, length, 1), 0.0).astype(np.float32)
    return nx, ny


def _to_bgr8(rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor((np.clip(rgb, 0, 1) * 255).round().astype(np.uint8), cv2.COLOR_RGB2BGR)


def _from_bgr8(bgr: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def domain_transform(rgb: np.ndarray, sigma_s: float = 40, sigma_r: float = 0.25) -> np.ndarray:
    """OpenCV edgePreservingFilter (recursive domain transform, Gastal & Oliveira)."""
    return _from_bgr8(cv2.edgePreservingFilter(_to_bgr8(rgb), flags=cv2.RECURS_FILTER, sigma_s=sigma_s, sigma_r=sigma_r))
