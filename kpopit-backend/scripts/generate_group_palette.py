# Derive the 5-stop Album 1 group palette from a group's declared brand colors.
#
# Contract: every declared color reaches the output UNCHANGED. The first one is
# always `main` (card frames, the corner circle, page titles); the rest of the
# declared colors and the generated tones fill the other four stops so the five
# read as a single value ramp, darkest to lightest:
#
#     deep <= secondary <= main <= accent <= light
#
# That order is not cosmetic: SideWaves (AlbumDecorShapes.tsx) paints the five
# stops onto five nested bands in exactly that sequence, so a non-monotone
# palette turns the gradation into stripes.
#
# Slot layout
#   main            <- the first declared color, verbatim
#   deep, secondary <- declared colors darker than main, darkest outermost
#   light, accent   <- declared colors lighter than main, lightest outermost
#   every slot left over is generated
#
# Generated tones fill the GAPS of the ramp: each empty slot takes a target
# lightness interpolated between its declared neighbours (or stepped past the
# ramp ends), rendered as a tint or a shade of one owner color. Ownership is
# divmod(5, n) with the remainder handed to the earliest colors, so the first
# color owns the largest share and its tones sit closest to `main`:
#
#   1 color -> 5     2 -> 3+2     3 -> 2+2+1     4 -> 2+1+1+1     5 -> 1 each
#
# Lightness is measured in OKLab, not HLS. HLS calls #CCFF00 and #0000FF equally
# light, which makes ramps built on it step unevenly; OKLab also drops the need
# to special-case greys, since a declared neutral simply carries ~zero chroma
# and its tones inherit that.
#
# Colors are never altered to fix contrast: a declared color that reads pale on
# the page is a call for the page, not for this script.
#
# CLI:  python generate_group_palette.py "#81A5F9"
#       python generate_group_palette.py "#C8002E, #F9F6F7, #16080B"
#       python generate_group_palette.py "#C8002E" "#F9F6F7"
import json
import math
import re
import sys
from itertools import permutations

PALETTE_STOPS = ("deep", "secondary", "main", "accent", "light")
MAIN_SLOT = PALETTE_STOPS.index("main")
MAX_SOURCE_COLORS = len(PALETTE_STOPS)

# --- Tunable derivation factors ----------------------------------------------
# Lightness step for tones generated past the declared extremes, so one declared
# color spans four steps. A run compresses evenly when the room left between its
# anchor and black/white is smaller than this.
TONE_STEP = 0.14

# Under this OKLCh chroma a declared color is a deliberate grey: its tones stay
# neutral instead of picking up whatever hue the conversion happens to report.
NEUTRAL_CHROMA = 0.02

# Chroma cannot survive near black or white, so it follows an envelope peaking at
# mid lightness. Tones only ever lose chroma to the envelope, never gain from it.
CHROMA_ENVELOPE_EXPONENT = 1.4

# DESIGN.md section 10: highlights desaturate toward the light source, shadows
# hold their chroma and cool toward the ambient. Both drifts scale with how far
# the tone travels away from its owner.
SHADE_CHROMA_GAIN = 0.35
TINT_CHROMA_LOSS = 0.25
SHADE_HUE_TARGET = 264.0  # blue
TINT_HUE_TARGET = 90.0  # yellow
MAX_HUE_DRIFT = 12.0

# An out-of-gamut OKLCh triple is pulled back by shrinking chroma at fixed
# lightness, so the tone keeps the ramp step it was assigned.
GAMUT_DECAY = 0.94
GAMUT_ATTEMPTS = 32

def _normalize_hex(token: str) -> str:
    """Parse '#RRGGBB', 'RRGGBB', '#RGB' or 'RGB' into canonical '#RRGGBB'."""
    cleaned = token.strip().lstrip("#")

    if len(cleaned) == 3:
        cleaned = "".join(channel * 2 for channel in cleaned)

    if not re.fullmatch(r"[0-9a-fA-F]{6}", cleaned):
        raise ValueError(f"Invalid hex color: {token!r} (expected #RGB or #RRGGBB)")

    return f"#{cleaned.upper()}"


def split_colors(source: str) -> list[str]:
    """Split a group's color cell into 1-5 canonical hex tokens.

    Commas and whitespace both separate, so a hand-written CSV row with a missing
    comma still parses.
    """
    tokens = [token for token in re.split(r"[,\s]+", source.strip()) if token]

    if not tokens:
        raise ValueError("no color given (expected 1-5 hex colors)")

    if len(tokens) > MAX_SOURCE_COLORS:
        raise ValueError(
            f"{len(tokens)} colors given ({', '.join(tokens)}); "
            f"at most {MAX_SOURCE_COLORS} fit the {MAX_SOURCE_COLORS} palette stops"
        )

    return [_normalize_hex(token) for token in tokens]


def _hex_to_oklch(hex_color: str) -> tuple[float, float, float]:
    """Convert '#RRGGBB' to OKLCh (lightness 0-1, chroma, hue in degrees)."""
    cleaned = _normalize_hex(hex_color).lstrip("#")
    red, green, blue = (
        _srgb_to_linear(int(cleaned[index:index + 2], 16) / 255) for index in (0, 2, 4)
    )

    long = math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
    medium = math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
    short = math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

    lightness = 0.2104542553 * long + 0.7936177850 * medium - 0.0040720468 * short
    green_red = 1.9779984951 * long - 2.4285922050 * medium + 0.4505937099 * short
    blue_yellow = 0.0259040371 * long + 0.7827717662 * medium - 0.8086757660 * short

    return (
        lightness,
        math.hypot(green_red, blue_yellow),
        math.degrees(math.atan2(blue_yellow, green_red)) % 360,
    )


def _oklch_to_hex(lightness: float, chroma: float, hue: float) -> str:
    """Convert OKLCh back to '#RRGGBB', shrinking chroma until it fits sRGB."""
    radians = math.radians(hue)

    for _ in range(GAMUT_ATTEMPTS):
        channels = _oklab_to_linear_rgb(
            lightness, chroma * math.cos(radians), chroma * math.sin(radians)
        )

        if all(-1e-6 <= channel <= 1 + 1e-6 for channel in channels):
            break

        chroma *= GAMUT_DECAY

    return "#{:02X}{:02X}{:02X}".format(
        *(round(255 * _linear_to_srgb(min(1.0, max(0.0, channel)))) for channel in channels)
    )


def _oklab_to_linear_rgb(lightness: float, green_red: float, blue_yellow: float) -> tuple[float, float, float]:
    long = (lightness + 0.3963377774 * green_red + 0.2158037573 * blue_yellow) ** 3
    medium = (lightness - 0.1055613458 * green_red - 0.0638541728 * blue_yellow) ** 3
    short = (lightness - 0.0894841775 * green_red - 1.2914855480 * blue_yellow) ** 3

    return (
        4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
        -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
        -0.0041960863 * long - 0.7034186147 * medium + 1.7076147010 * short,
    )


def _srgb_to_linear(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(channel: float) -> float:
    return channel * 12.92 if channel <= 0.0031308 else 1.055 * channel ** (1 / 2.4) - 0.055


def _placement_options(lightness: list[float]) -> list[list[int | None]]:
    """Every monotone way to seat the declared colors, `main` pinned in the middle.

    Slots are listed darkest first, so colors darker than `main` can only take
    `deep`/`secondary` and lighter ones only `light`/`accent`. Two colors on a
    side fill both of its slots; a lone one can sit at the ramp end or one slot
    in, and picking between those is what `_plan_ramp` decides.
    """
    others = range(1, len(lightness))
    darker = sorted((index for index in others if lightness[index] < lightness[0]), key=lambda index: lightness[index])
    lighter = sorted((index for index in others if lightness[index] >= lightness[0]), key=lambda index: lightness[index], reverse=True)

    room_below, room_above = MAIN_SLOT, len(PALETTE_STOPS) - MAIN_SLOT - 1

    if len(darker) > room_below or len(lighter) > room_above:
        raise ValueError(
            f"{len(darker)} color(s) darker and {len(lighter)} lighter than the first one; "
            f"the ramp only holds {room_below} below `main` and {room_above} above it. "
            "Lead with a color closer to the middle of the lightness range, or declare fewer"
        )

    below_slots = [[0], [1]] if len(darker) == 1 else [[0, 1][:len(darker)]]
    above_slots = [[4], [3]] if len(lighter) == 1 else [[4, 3][:len(lighter)]]
    options = []

    for below in below_slots:
        for above in above_slots:
            placed: list[int | None] = [None] * len(PALETTE_STOPS)
            placed[MAIN_SLOT] = 0

            for slot, index in zip(below, darker):
                placed[slot] = index

            for slot, index in zip(above, lighter):
                placed[slot] = index

            options.append(placed)

    return options


def _tone_targets(placed: list[int | None], lightness: list[float]) -> list[float]:
    """Lightness of every slot: the declared anchors, plus a target per empty one.

    A gap between two declared colors is spread evenly between them. A gap past
    the ends steps outward by TONE_STEP, shrinking the step when black or white
    is closer than that - which is what makes an extreme `main` collapse its
    outer stops instead of inverting the ramp.
    """
    anchors = [None if index is None else lightness[index] for index in placed]
    targets = list(anchors)
    slot = 0

    while slot < len(targets):
        if anchors[slot] is not None:
            slot += 1
            continue

        end = slot
        while end < len(anchors) and anchors[end] is None:
            end += 1

        run = range(slot, end)
        below = anchors[slot - 1] if slot > 0 else None
        above = anchors[end] if end < len(anchors) else None

        if below is not None and above is not None:
            span = above - below
            for position, index in enumerate(run, start=1):
                targets[index] = below + span * position / (len(run) + 1)

        elif above is not None:
            step = min(TONE_STEP, above / len(run))
            for position, index in enumerate(reversed(run), start=1):
                targets[index] = max(0.0, above - step * position)

        else:
            step = min(TONE_STEP, (1.0 - below) / len(run))
            for position, index in enumerate(run, start=1):
                targets[index] = min(1.0, below + step * position)

        slot = end

    return targets


def _plan_ramp(lightness: list[float]) -> tuple[list[int | None], list[float]]:
    """Choose the placement whose ramp steps are the most even.

    Scored on the steps sorted ascending, then on total spread - so the tightest
    step is widened first, then the next, and a lone declared color moves to the
    ramp end only when that buys a smoother gradation than tucking it beside
    `main` would.
    """
    best = None

    for placed in _placement_options(lightness):
        targets = _tone_targets(placed, lightness)
        steps = sorted(targets[slot + 1] - targets[slot] for slot in range(len(targets) - 1))
        score = (steps, targets[-1] - targets[0])

        if best is None or score > best[0]:
            best = (score, placed, targets)

    return best[1], best[2]


def _assign_owners(placed: list[int | None], targets: list[float], lightness: list[float]) -> dict[int, int]:
    """Pick which declared color each generated slot is a tint or shade of.

    Every color owns a share of the five stops - divmod(5, n) with the remainder
    handed to the earliest colors - and spends one of them on itself. The share
    that is left is matched to the empty slots so that the total lightness travel
    is the smallest possible, which keeps each tone a short step from its owner
    instead of a washed-out stretch of it. Ties go to the earliest color.
    """
    color_count = sum(1 for index in placed if index is not None)
    base, extra = divmod(len(PALETTE_STOPS), color_count)
    pool = [
        index
        for index in range(color_count)
        for _ in range(base + (1 if index < extra else 0) - 1)
    ]
    empty = [slot for slot, index in enumerate(placed) if index is None]
    best = min(
        set(permutations(pool)),
        key=lambda order: (
            sum(abs(targets[slot] - lightness[owner]) for slot, owner in zip(empty, order)),
            order,
        ),
    )

    return dict(zip(empty, best))


def _chroma_envelope(lightness: float) -> float:
    """Share of its chroma a color keeps at this lightness: full at mid, gone at the ends."""
    return max(1e-3, 1 - abs(2 * lightness - 1) ** CHROMA_ENVELOPE_EXPONENT)


def _derive_tone(owner: str, target_lightness: float) -> str:
    """Render one owner color at a different lightness, keeping it recognizable."""
    lightness, chroma, hue = _hex_to_oklch(owner)

    if chroma <= NEUTRAL_CHROMA:
        return _oklch_to_hex(target_lightness, 0.0, hue)

    travel = target_lightness - lightness
    envelope = min(1.0, _chroma_envelope(target_lightness) / _chroma_envelope(lightness))

    if travel > 0:
        chroma *= envelope * (1 - TINT_CHROMA_LOSS * travel)
        hue_target = TINT_HUE_TARGET

    else:
        chroma *= envelope * (1 + SHADE_CHROMA_GAIN * abs(travel))
        hue_target = SHADE_HUE_TARGET

    drift = MAX_HUE_DRIFT * abs(travel)
    toward = ((hue_target - hue + 180) % 360) - 180

    return _oklch_to_hex(target_lightness, chroma, hue + max(-drift, min(drift, toward)))


def generate_group_palette(source: str) -> dict[str, str]:
    """Return {deep, secondary, main, accent, light} for 1-5 declared colors.

    Every declared color comes back as itself; `main` is always the first one.
    The remaining stops are tints and shades that keep the five monotone in
    lightness. Values are uppercase '#RRGGBB'.
    """
    colors = split_colors(source)
    lightness = [_hex_to_oklch(color)[0] for color in colors]

    placed, targets = _plan_ramp(lightness)
    owners = _assign_owners(placed, targets, lightness)

    return {
        stop: colors[placed[slot]] if placed[slot] is not None else _derive_tone(colors[owners[slot]], targets[slot])
        for slot, stop in enumerate(PALETTE_STOPS)
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python generate_group_palette.py "#RRGGBB[, #RRGGBB ...]"', file=sys.stderr)
        sys.exit(1)

    try:
        print(json.dumps(generate_group_palette(", ".join(sys.argv[1:])), indent=2))

    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
