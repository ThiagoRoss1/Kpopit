"""Tests for the layer build and the make_layers CLI, with a fake model extractor
so no weights or GPU are needed."""

import numpy as np
from PIL import Image

import make_layers
from models import Maps


class FakeExtractor:
    """Returns fixed synthetic maps, independent of the photo."""

    def __init__(self, value: float = 0.5):
        self.value = value

    def maps(self, rgb: np.ndarray) -> Maps:
        side = rgb.shape[0]
        const = np.full((side, side), self.value, dtype=np.float32)
        ys = np.linspace(0.0, 1.0, side, dtype=np.float32)
        depth = np.tile(ys[:, None], (1, side))  # vertical gradient so Otsu has two sides
        return Maps(const.copy(), const.copy(), const.copy(), depth)


class ZeroExtractor:
    def maps(self, rgb: np.ndarray) -> Maps:
        side = rgb.shape[0]
        z = np.zeros((side, side), dtype=np.float32)
        return Maps(z.copy(), z.copy(), z.copy(), z.copy())


def _save(path, arr_uint8, mode="RGB"):
    Image.fromarray(arr_uint8, mode=mode).save(path)


def _gradient_photo(side=1000) -> np.ndarray:
    row = np.linspace(0, 255, side, dtype=np.uint8)
    plane = np.tile(row, (side, 1))
    return np.dstack([plane, plane[::-1], plane.T])


def test_outputs_three_files_per_photo(tmp_path):
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    photo = _gradient_photo()
    _save(in_dir / "a.png", photo)
    _save(in_dir / "b.png", photo)

    make_layers.main([str(in_dir), str(out_dir)], extractor=FakeExtractor())

    for stem in ("a", "b"):
        assert (out_dir / f"{stem}.png").exists()
        pencil = Image.open(out_dir / f"{stem}.pencil.png")
        pen = Image.open(out_dir / f"{stem}.pen.png")
        assert pencil.mode == "L" and pencil.size == (1000, 1000)
        assert pen.mode == "L" and pen.size == (1000, 1000)
    photo_out = np.asarray(Image.open(out_dir / "a.png").convert("RGB"))
    assert np.array_equal(photo_out, photo)


def test_white_is_paper(tmp_path):
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    _save(in_dir / "w.png", np.full((1000, 1000, 3), 255, np.uint8))

    make_layers.main([str(in_dir), str(out_dir)], extractor=ZeroExtractor())

    for kind in ("pencil", "pen"):
        layer = np.asarray(Image.open(out_dir / f"w.{kind}.png"))
        assert layer.min() == 255 and layer.max() == 255


def test_non_square_input_is_center_cropped(tmp_path):
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    tall = np.dstack([np.tile(np.linspace(0, 255, 1440, dtype=np.uint8), (1920, 1))] * 3)
    _save(in_dir / "t.png", tall)

    make_layers.main([str(in_dir), str(out_dir)], extractor=FakeExtractor())

    for name in ("t.png", "t.pencil.png", "t.pen.png"):
        assert Image.open(out_dir / name).size == (1000, 1000)
    expected = make_layers.load_square(in_dir / "t.png")
    photo_out = np.asarray(Image.open(out_dir / "t.png").convert("RGB"), dtype=np.float32) / 255.0
    assert np.allclose(photo_out, expected, atol=1 / 255)


def test_skips_existing_unless_force(tmp_path):
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    _save(in_dir / "a.png", _gradient_photo())

    make_layers.main([str(in_dir), str(out_dir)], extractor=FakeExtractor())
    first = (out_dir / "a.pen.png").stat().st_mtime_ns

    make_layers.main([str(in_dir), str(out_dir)], extractor=FakeExtractor())
    assert (out_dir / "a.pen.png").stat().st_mtime_ns == first

    make_layers.main([str(in_dir), str(out_dir), "--force"], extractor=FakeExtractor())
    assert (out_dir / "a.pen.png").stat().st_mtime_ns != first


def test_overrides_scale_darkness(tmp_path):
    in_dir = tmp_path / "in"
    base_out = tmp_path / "base"
    over_out = tmp_path / "over"
    in_dir.mkdir()
    _save(in_dir / "a.png", _gradient_photo())

    make_layers.main([str(in_dir), str(base_out)], extractor=FakeExtractor())
    base_pen = 1.0 - np.asarray(Image.open(base_out / "a.pen.png"), np.float32) / 255.0

    (in_dir / "overrides.json").write_text('{"a": {"pen": 0.5}}', encoding="utf-8")
    make_layers.main([str(in_dir), str(over_out)], extractor=FakeExtractor())
    over_pen = 1.0 - np.asarray(Image.open(over_out / "a.pen.png"), np.float32) / 255.0

    assert abs(over_pen.mean() - 0.5 * base_pen.mean()) <= 0.02 * base_pen.mean()


def test_calibrate_writes_nothing(tmp_path, capsys):
    in_dir = tmp_path / "in"
    out_dir = tmp_path / "out"
    in_dir.mkdir()
    _save(in_dir / "a.png", _gradient_photo())

    # Zero coarse lines (lines_mean below the target, as real sparse lines are) so the
    # calibration converges to a positive density; the constant fake would diverge.
    make_layers.main([str(in_dir), str(out_dir), "--calibrate"], extractor=ZeroExtractor())

    assert not out_dir.exists() or not any(out_dir.iterdir())
    assert "density" in capsys.readouterr().out


def test_refuses_to_write_into_the_input_folder(tmp_path):
    in_dir = tmp_path / "in"
    in_dir.mkdir()
    _save(in_dir / "a.png", _gradient_photo())
    original = (in_dir / "a.png").read_bytes()

    import pytest

    with pytest.raises(SystemExit):
        make_layers.main([str(in_dir), str(in_dir)], extractor=FakeExtractor())
    assert (in_dir / "a.png").read_bytes() == original
    assert not (in_dir / "a.pencil.png").exists()
