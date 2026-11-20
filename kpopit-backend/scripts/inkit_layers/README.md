# InkIt layer conversion (local only)

Turns the After Effects PNG renders into the three files the game serves:
`<stem>.png` (photo copy), `<stem>.pencil.png` and `<stem>.pen.png`, in the
approved `68_balanceada` look. It ports the lab code from
`C:\Kpopit-images\kpopit-idols-inkit-filtered\_teste-recortes\_scripts`; every
number lives in `config.py`.

**This runs on the owner's machine only.** It is never installed or run on
Railway/production and is not in the backend `requirements.txt`. Model weights
are not committed — they download to the local Hugging Face cache on first run
(`lllyasviel/Annotators`).

## Setup

```bash
py -3.14 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements-inkit.txt
# For GPU, install a CUDA build of torch first, e.g.:
#   .venv/Scripts/python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
```

Tested with Python 3.14 and torch cu128 (RTX 2060). CUDA is used when available, otherwise CPU (much slower).

## Build the layers

```bash
.venv/Scripts/python.exe make_layers.py <input_dir> <output_dir> [--force] [--calibrate]
```

- Writes `<stem>.png`, `<stem>.pencil.png`, `<stem>.pen.png` per photo; skips
  existing outputs unless `--force`.
- `--calibrate` writes nothing and prints the hatching density that brings the
  mean pencil ink to the target in `config.PENCIL_MEAN_TARGET` for that folder.
- An optional `overrides.json` in `<input_dir>`
  (`{"<stem>": {"pencil": 1.1, "pen": 0.9}}`) multiplies layer darkness,
  clipped to 1 — for review only.

Layer files are 8-bit grayscale PNG, **white = paper**
(`value = round(255 * (1 - darkness))`). Convert to WebP next with
`convert_to_webp.py`, then `prepare_upload.py` for the R2 layout.

## Prepare the upload

```bash
.venv/Scripts/python.exe prepare_upload.py <webp_dir> <upload_dir> [--force]
.venv/Scripts/python.exe prepare_upload.py --lookup <stem>
```

- Reads `INKIT_PATH_SECRET` from `kpopit-backend/.env` (or the environment). `seed_db.py` must
  use the same value, and changing it later means a full re-upload and re-seed.
- Copies `<stem>.webp`, `<stem>.pencil.webp` and `<stem>.pen.webp` to their hashed keys in an
  R2-shaped folder. Keep one upload folder: files already there are skipped, and the printed
  `N idols ready` counts only the new ones. Use `--force` for a replaced photo, and bump its
  `image_version` in `data/inkit_idols.csv`.

## Tests

```bash
.venv/Scripts/python.exe -m pytest tests -q
```

The tests inject a fake model extractor, so they need no weights or GPU — only
numpy, opencv, pillow and pytest.
