# Derive a 5-stop tonal group palette from a single primary hex color.
#
# Album 1-specific presentation helper: given one brand/primary color for a group,
# produce the same 5-stop analogous ramp the frontend defines in
# kpopit-frontend/src/components/Albums/albumPalette.ts (generateAlbumPalette) —
# ~30 degrees of hue travel and ~24 points of lightness between the darkest and
# lightest stops, anchored on the source hue, with the anchor lightness normalized
# into a readable band so very light brand colors still produce legible accents.
#
# Named stops (deepest → lightest): deep, secondary, main, accent, light.
# `main` is the group's main color (card borders, circle decor, titles);
# `deep` is the dark text/gradient end; `light` is the light decor stop
# (slab, lightest wave layer, gradient light ends).
# The output is a STARTING POINT for visual tuning, not a fixed formula.
#
# CLI:  python generate_group_palette.py "#81A5F9"   -> prints the palette as JSON
import colorsys
import json
import sys

# --- Tunable derivation factors (mirror albumPalette.ts) ---------------------
# Anchor normalization band: the source lightness/saturation are clamped here
# before walking the ramp, so extreme brand colors stay legible on paper.
BASE_LIGHTNESS_MIN, BASE_LIGHTNESS_MAX = 0.45, 0.60
BASE_SATURATION_MIN, BASE_SATURATION_MAX = 0.55, 0.95

# Per-stop walk: offsets [-2..2] from the anchor (deep → text).
HUE_STEP_DEGREES = 7.5
SATURATION_STEP = 0.05
SATURATION_MIN, SATURATION_MAX = 0.35, 1.0
LIGHTNESS_STEP = 0.06
LIGHTNESS_MIN, LIGHTNESS_MAX = 0.30, 0.74
# ----------------------------------------------------------------------------

PALETTE_STOPS = ("deep", "secondary", "main", "accent", "light")


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Parse '#RRGGBB', 'RRGGBB', '#RGB' or 'RGB' (case-insensitive) into 0-255 ints."""
    cleaned = hex_str.strip().lstrip("#")

    if len(cleaned) == 3:
        cleaned = "".join(ch * 2 for ch in cleaned)

    if len(cleaned) != 6:
        raise ValueError(f"Invalid hex color: {hex_str!r} (expected #RGB or #RRGGBB)")
    
    try:
        return tuple(int(cleaned[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
    
    except ValueError as exc:
        raise ValueError(f"Invalid hex color: {hex_str!r}") from exc


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    """Format 0-255 ints as an uppercase '#RRGGBB' string."""
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def _hls_to_hex(h: float, l: float, s: float) -> str:
    r, g, b = colorsys.hls_to_rgb(h % 1.0, _clamp(l), _clamp(s))
    return rgb_to_hex((round(r * 255), round(g * 255), round(b * 255)))


def generate_group_palette(primary_hex: str) -> dict[str, str]:
    """Return {deep, secondary, main, accent, light} — a 5-stop analogous ramp.

    All five keys map to uppercase '#RRGGBB' strings, deepest → lightest, with
    `main` anchored on the (normalized) source hue. Matches the frontend's
    generateAlbumPalette so DB-seeded and client-generated palettes agree.
    """
    r, g, b = hex_to_rgb(primary_hex)
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)

    base_l = _clamp(l, BASE_LIGHTNESS_MIN, BASE_LIGHTNESS_MAX)
    base_s = _clamp(s, BASE_SATURATION_MIN, BASE_SATURATION_MAX)

    palette: dict[str, str] = {}
    for offset, stop in zip(range(-2, 3), PALETTE_STOPS):
        palette[stop] = _hls_to_hex(
            h + (offset * HUE_STEP_DEGREES) / 360,
            _clamp(base_l + offset * LIGHTNESS_STEP, LIGHTNESS_MIN, LIGHTNESS_MAX),
            _clamp(base_s + offset * SATURATION_STEP, SATURATION_MIN, SATURATION_MAX),
        )
    return palette


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print('Usage: python generate_group_palette.py "#RRGGBB"', file=sys.stderr)
        sys.exit(1)
    try:
        print(json.dumps(generate_group_palette(sys.argv[1]), indent=2))
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
