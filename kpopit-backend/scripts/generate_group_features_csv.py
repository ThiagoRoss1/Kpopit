import argparse
import csv
import json
import os
import sys
from dotenv import load_dotenv
from generate_group_palette import generate_group_palette

load_dotenv()

DATA_FOLDER = os.getenv("DATA_FOLDER") or "data"
DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", DATA_FOLDER))
OUTPUT_FILE = os.path.join(DATA_PATH, "group_features.csv")

# Column order matches seed_db.py's group_features seeding.
CSV_COLUMNS = ("group_id", "image_path", "palette", "image_version")

GROUPS: list[tuple[int, str, str, int]] = [
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
    (15, "/images/groups/nmixx.webp", "#0085FF, #0A0A0A", 1),
    (16, "/images/groups/newjeans.webp", "#2563EB, #FF8FB3", 1),
    (17, "/images/groups/illit.webp", "#C2A3FF, #A7C7E7", 1),
    (18, "/images/groups/meovv.webp", "#D1D5DB, #CCFF00", 1),
    (19, "/images/groups/loona.webp", "#F8FAFC, #0B0F19, #FDE047", 1),
    (20, "", "#000000, #FFFFFF", 1),
    (21, "/images/groups/artms.webp", "#5CCCFF, #8887BA", 1),
    (22, "/images/groups/loossemble.webp", "#A5857E", 1),
    (23, "/images/groups/red_velvet.webp", "#FEA38B", 1),
    (24, "/images/groups/i_o_i.webp", "#FF4F81, #F9FAFB", 1),
    (25, "/images/groups/girls_generation.webp", "#FF4980", 1),
    (26, "/images/groups/mamamoo.webp", "#A3E432", 1),
    (27, "/images/groups/2ne1.webp", "#000000, #FF6984", 1),
    (28, "/images/groups/kep1er.webp", "#C1A7E2, #FFFFFF, #F1E682", 1),
    (29, "/images/groups/clc.webp", "#FFCD00, #840B55, #005F61", 1),
    (30, "", "", 1),
    (31, "/images/groups/madein.webp", "#9CB4D4, #F7F9FC", 1),
    (32, "/images/groups/rescene.webp", "#FF8FAB, #F3F4F6", 1),
    (33, "/images/groups/sistar.webp", "#FF00FF", 1),
    (34, "/images/groups/gfriend.webp", "#F0F1F0, #00B2CA, #5F488B", 1),
    (35, "/images/groups/viviz.webp", "#9B5DE5, #F3F4F6", 1),
]


def _load_rows() -> dict[int, list[str]]:
    """Read the CSV into {group_id: row}, or {} before the first run."""
    if not os.path.exists(OUTPUT_FILE):
        return {}

    with open(OUTPUT_FILE, encoding="utf-8", newline="") as file:
        return {
            int(row["group_id"]): [row[column] for column in CSV_COLUMNS]
            for row in csv.DictReader(file)
        }


def _build_row(group_id: int, image_path: str, colors: str, image_version: int) -> list[str]:
    """Render one CSV row. Raises ValueError when the colors cannot form a ramp."""
    palette = generate_group_palette(colors)

    # An image_version only means something once there is an image to bust the
    # cache for, so a group still waiting on its photo carries neither.
    return [
        str(group_id),
        image_path,
        json.dumps(palette),
        str(image_version) if image_path else "",
    ]


def upsert_group_features_csv(selected: set[int] | None, dry_run: bool) -> bool:
    """Regenerate the selected groups and leave every other row untouched.

    `selected` is None on the default run, which takes the groups that have no
    row yet. Returns False when any group failed to generate.
    """
    rows = _load_rows()
    inserted, updated, colorless, failures = [], [], [], []

    for group_id, image_path, colors, image_version in GROUPS:
        wanted = group_id in selected if selected is not None else group_id not in rows

        if not wanted:
            continue

        if not colors.strip():
            colorless.append(group_id)
            continue

        try:
            row = _build_row(group_id, image_path, colors, image_version)

        except ValueError as exc:
            failures.append(f"group {group_id}: {exc}")
            continue

        # Regenerating a row that already matches is not a change, so say so
        # instead of rewriting the file for nothing.
        if row == rows.get(group_id):
            continue

        (updated if group_id in rows else inserted).append(group_id)
        rows[group_id] = row

    if not inserted and not updated:
        print(f"Nothing to do - {OUTPUT_FILE} already covers every selected group")

    else:
        if not dry_run:
            # Write a sibling temp file and swap it in atomically, so an interrupted
            # run can never leave a half-written group_features.csv behind.
            tmp_path = OUTPUT_FILE + ".tmp"
            with open(tmp_path, "w", encoding="utf-8", newline="") as file:
                writer = csv.writer(file)
                writer.writerow(CSV_COLUMNS)
                writer.writerows(rows[group_id] for group_id in sorted(rows))
            os.replace(tmp_path, OUTPUT_FILE)

        print(f"{'Would write' if dry_run else 'Wrote'} {OUTPUT_FILE}")

    print(f"  inserted  {len(inserted):>2}  {inserted}")
    print(f"  updated   {len(updated):>2}  {updated}")
    print(f"  untouched {len(rows) - len(inserted) - len(updated):>2}")

    if colorless:
        print(f"  no color  {len(colorless):>2}  {colorless}  (skipped - add a color to GROUPS)")

    for failure in failures:
        print(f"  ERROR: {failure}", file=sys.stderr)

    return not failures


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Upsert data/group_features.csv from the GROUPS list, "
        "leaving rows this run does not touch exactly as they are."
    )
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument("--groups", type=int, nargs="+", metavar="ID", help="regenerate only these group ids")
    scope.add_argument("--all", action="store_true", help="regenerate every group in GROUPS")
    parser.add_argument("--dry-run", action="store_true", help="report the changes without writing")
    args = parser.parse_args()

    known = {group_id for group_id, *_ in GROUPS}

    if args.groups and (unknown := sorted(set(args.groups) - known)):
        parser.error(f"group id(s) not in GROUPS: {unknown}")

    selected = known if args.all else set(args.groups) if args.groups else None

    return 0 if upsert_group_features_csv(selected, args.dry_run) else 1


if __name__ == "__main__":
    sys.exit(main())
