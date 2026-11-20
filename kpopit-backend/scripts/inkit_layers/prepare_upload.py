"""Copy converted InkIt WebPs into the R2 layout, one hashed key per file (local only).

    python prepare_upload.py <webp_dir> <upload_dir> [--force]   # files already there are skipped
    python prepare_upload.py --lookup <stem>                     # print the three keys
INKIT_PATH_SECRET comes from the environment or kpopit-backend/.env.
"""

import argparse
import os
import shutil
import sys
from pathlib import Path

# Longest suffix first, so "x.pencil.webp" isn't read as the photo of "x.pencil".
SUFFIXES = (("pencil", ".pencil.webp"), ("pen", ".pen.webp"), ("photo", ".webp"))


def _opaque_path(stem: str, kind: str, secret: str) -> str:
    # Imported here: the CLI entry puts the backend root on sys.path first.
    from utils.inkit_paths import opaque_path

    return opaque_path(stem, kind, secret)


def _split(name: str) -> tuple[str, str] | None:
    for kind, suffix in SUFFIXES:
        if name.endswith(suffix) and len(name) > len(suffix):
            return name[: -len(suffix)], kind
    return None


def lookup(stem: str, secret: str) -> dict[str, str]:
    """Kind -> the stored path (= R2 key with a leading slash) of each of a stem's files."""
    return {kind: _opaque_path(stem, kind, secret) for kind in ("photo", "pencil", "pen")}


def prepare(webp_dir: Path, upload_dir: Path, secret: str, force: bool = False) -> list[str]:
    """Copy each stem's three files to their hashed keys under upload_dir; returns the stems that got
    a new file. Keys already there are skipped unless `force` (a replaced photo). Refuses before
    copying anything if a stem lacks one of its three files."""
    found: dict[str, dict[str, Path]] = {}
    for path in sorted(Path(webp_dir).iterdir()):
        parts = _split(path.name) if path.is_file() else None
        if parts:
            found.setdefault(parts[0], {})[parts[1]] = path

    incomplete = sorted(stem for stem, files in found.items() if len(files) != 3)
    if incomplete:
        raise SystemExit(f"Missing photo, pencil or pen file for: {', '.join(incomplete)}")

    copied = []
    for stem, files in sorted(found.items()):
        wrote = False
        for kind, key in lookup(stem, secret).items():
            target = Path(upload_dir) / key.lstrip("/")
            if target.exists() and not force:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(files[kind], target)
            wrote = True
        if wrote:
            copied.append(stem)
    return copied


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Prepare InkIt WebPs for upload under hashed keys.")
    parser.add_argument("paths", nargs="*", metavar="<webp_dir> <upload_dir>")
    parser.add_argument("--lookup", metavar="STEM", help="print the three keys of one stem")
    parser.add_argument("--force", action="store_true", help="rewrite files already in the upload folder")
    args = parser.parse_args(argv)

    # The same loader as seed_db.py: the secret can live in kpopit-backend/.env (tests disable it).
    from utils import env

    env.load_local_env()
    secret = os.getenv("INKIT_PATH_SECRET", "")
    if not secret:
        raise SystemExit("Set INKIT_PATH_SECRET in kpopit-backend/.env or the environment first")

    if args.lookup:
        for kind, key in lookup(args.lookup, secret).items():
            print(f"{kind}: {key}")
        return 0

    if len(args.paths) != 2:
        parser.error("expected <webp_dir> <upload_dir>")
    stems = prepare(Path(args.paths[0]), Path(args.paths[1]), secret, force=args.force)
    print(f"{len(stems)} idols ready")
    print("Bump image_version in inkit_idols.csv for every replaced idol")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    raise SystemExit(main(sys.argv[1:]))
