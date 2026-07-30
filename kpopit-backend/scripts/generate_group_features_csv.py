# Write data/group_features.csv from a list of (group_id, image_path, primary_hex).
#
# For each group it derives a same-hue tonal palette via generate_group_palette() and
# writes the row through Python's csv module, which quotes the JSON-in-CSV palette cell
# correctly (no hand-escaping). The output columns match seed_db.py's group_features
# seeding: group_id, image_path, palette.
#
# Fill GROUPS with real data below, then run:  python generate_group_features_csv.py
# Afterwards seed it with:  python seed_db.py
import csv
import json
import os
from dotenv import load_dotenv
from generate_group_palette import generate_group_palette

load_dotenv()

DATA_FOLDER = os.getenv("DATA_FOLDER") or "data"
DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", DATA_FOLDER))
OUTPUT_FILE = os.path.join(DATA_PATH, "group_features.csv")

GROUPS: list[tuple[int, str, str]] = [
    (1, "/images/groups/lesserafim.webp", "#69B3E7", 1),
    (2, "/images/groups/iz_one.webp", "#EF539D", 1),
    (3, "/images/groups/aespa.webp", "#C98BDB, #5BC2E7", 1),
    (4, "/images/groups/got_the_beat.webp", "#C0C0C0, #0B0C10", 1),
    (5, "/images/groups/twice.webp", "#FCC898, #FF5FA2", 1),
    (6, "/images/groups/misamo.webp", "#FF5FA2, #FCC898", 1),
    (7, "/images/groups/ive.webp", "#C8002E, #F9F6F7, #16080B", 1),
    (8, "/images/groups/blackpink.webp", "#F0B3C6, #000000", 1),
    (9, "/images/groups/babymonster.webp", "#CF0101, #000000", 1),
    (10, "/images/groups/kiss_of_life.webp", "#A42732, #000000", 1),
    (11, "/images/groups/young_posse.webp", "#CCFF00", 1),
    (12, "/images/groups/itzy.webp", "#FF10F0", 1),
    (13, "/images/groups/stayc.webp", "#FF4EA4, #1352A2", 1),
    (14, "/images/groups/i-dle.webp", "#E4002B, #5C068C", 1),
    (15, "/images/groups/nmixx.webp", "#0085FF #0A0A0A", 1),
    (16, "/images/groups/newjeans.webp", "#2563EB, #FF8FB3", 1),
    (17, "/images/groups/illit.webp", "#C2A3FF, #A7C7E7", 1),
    (18, "/images/groups/meovv.webp", "#D1D5DB, #CCFF00", 1),
    (19, "/images/groups/loona.webp", "#F8FAFC, #0B0F19, #FDE047", 1),
    (20, "", "#000000, #FFFFFF",),
    (21, "/images/groups/artms.webp", "#5CCCFF, #8887BA", 1),
    (22, "/images/groups/loossemble.webp", "#A5857E", 1),
    (23, "/images/groups/red_velvet.webp", "#FEA38B", 1),
    (24, "",),
    (25, "/images/groups/girls_generation", "#FF4980", 1),
    (26, "/images/groups/mamamoo.webp", "#A3E432", 1),
    (27, "/images/groups/2ne1.webp", "#000000, #FF6984", 1),
    (28, "/images/groups/kep1er.webp", "#C1A7E2, #FFFFFF, #F1E682", 1),
    (29, "/images/groups/clc.webp", "#FFCD00, #840B55, #005F61", 1),
    (30, "",),
    (31, "/images/groups/madein.webp", "#9CB4D4, #F7F9FC", 1),
    (32, "/images/groups/rescene.webp", "#FF8FAB, #F3F4F6", 1),
    (33, "/images/groups/sistar.webp", "#FF00FF", 1),
    (34, "/images/groups/gfriend.webp", "#F0F1F0, #00B2CA, #5F488B", 1),
    (35, "/images/groups/viviz.webp", "#9B5DE5, #F3F4F6", 1),
]


def build_group_features_csv() -> None:
    with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["group_id", "image_path", "palette", "image_version"])
        for group_id, image_path, primary_hex, image_version in GROUPS:
            palette = generate_group_palette(primary_hex)
            writer.writerow([group_id, image_path, json.dumps(palette), image_version])

    print(f"Wrote {len(GROUPS)} row(s) to {OUTPUT_FILE}")


if __name__ == "__main__":
    build_group_features_csv()
