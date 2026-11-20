"""Every number for the InkIt layer conversion, like the frontend's config.ts.

The values are exactly those of the approved `68_balanceada` look
(C:\\Kpopit-images\\kpopit-idols-inkit-filtered\\_teste-recortes). Change a
layer by changing a number here, never by editing the ports.
"""

# ---------------------------------------------------------------- resolution
OUTPUT_SIDE = 1000  # the side every layer is written at
DEPTH_INPUT = 768  # MiDaS runs on the photo resized to this, then up to OUTPUT_SIDE

# ---------------------------------------------------------------- per-photo light (CLAHE on L of LAB)
CLAHE_CLIP = 2.0
CLAHE_TILES = 8

# ---------------------------------------------------------------- pencil line tone curve
PENCIL_LINE_LOW = 0.04
PENCIL_LINE_HIGH = 0.60
PENCIL_LINE_GAMMA = 0.6

# ---------------------------------------------------------------- pen line tone curve
PEN_LINE_LOW = 0.06
PEN_LINE_HIGH = 0.65
PEN_LINE_GAMMA = 0.75

# ---------------------------------------------------------------- pen line fusion (512 base + share of 1024 detail)
PEN_FUSE_DETAIL = 0.6

# ---------------------------------------------------------------- shading planes (soft-edged "esfuminho")
SHADE_THRESHOLDS = (0.22, 0.45, 0.72)  # low / mid / high cuts on the shadow source
SHADE_VALUES = (0.20, 0.40, 0.62)  # darkness assigned at each plane
SHADE_BLUR = 5.0  # soft edges between planes
SHADE_CAP = 0.85  # never past this, so paint still has something to reveal

# ---------------------------------------------------------------- figure vs background (Otsu on depth)
FOCUS_DEPTH_BLUR = 6.0  # sigma for the depth smoothing before Otsu
FOCUS_LOW_OFFSET = 0.10  # smoothstep starts at cut - this
FOCUS_HIGH_OFFSET = 0.04  # smoothstep ends at cut + this
BACKGROUND_LINE_FLOOR = 0.60  # background lines kept at this fraction
BACKGROUND_SHADE_FLOOR = 0.50  # background shading kept at this fraction

# ---------------------------------------------------------------- pencil hatching
HATCH_DENSITY = 0.380  # calibrated on the crops to a mean pencil ink of ~0.173
HATCH_FLOW_SIGMA = 6.0  # structure-tensor smoothing for the flow field

# ---------------------------------------------------------------- calibration target (--calibrate)
PENCIL_MEAN_TARGET = 0.173  # the current game pencil's mean darkness
