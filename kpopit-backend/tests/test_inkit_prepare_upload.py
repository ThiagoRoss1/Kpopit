"""InkIt upload preparation: WebP folder -> R2 layout under hashed keys (scripts/inkit_layers/prepare_upload)."""

import pytest

from scripts.inkit_layers import prepare_upload
from utils.inkit_paths import KINDS, opaque_path

SECRET = "test-inkit-path-secret"
SUFFIX = {"photo": ".webp", "pencil": ".pencil.webp", "pen": ".pen.webp"}


def _webps(folder, stem, kinds=KINDS):
    folder.mkdir(exist_ok=True)
    for kind in kinds:
        (folder / f"{stem}{SUFFIX[kind]}").write_bytes(f"{stem}:{kind}".encode())


def _files(folder):
    return sorted(p for p in folder.rglob("*") if p.is_file())


def test_copies_three_files_to_three_hashes(tmp_path):
    webp, upload = tmp_path / "webp", tmp_path / "upload"
    _webps(webp, "seeun_i")

    assert prepare_upload.prepare(webp, upload, SECRET) == ["seeun_i"]

    keys = {kind: opaque_path("seeun_i", kind, SECRET) for kind in KINDS}
    assert len(set(keys.values())) == 3
    for kind, key in keys.items():
        assert (upload / key.lstrip("/")).read_bytes() == f"seeun_i:{kind}".encode()


def test_refuses_when_a_layer_is_missing(tmp_path):
    webp, upload = tmp_path / "webp", tmp_path / "upload"
    _webps(webp, "complete_i")
    _webps(webp, "gaeul_i", kinds=("photo", "pencil"))

    with pytest.raises(SystemExit, match="gaeul_i"):
        prepare_upload.prepare(webp, upload, SECRET)
    assert not upload.exists() or not _files(upload)


def test_upload_dir_never_contains_readable_names(tmp_path):
    webp, upload = tmp_path / "webp", tmp_path / "upload"
    for stem in ("seeun_i", "tzuyu_i"):
        _webps(webp, stem)
    prepare_upload.prepare(webp, upload, SECRET)

    for path in upload.rglob("*"):
        assert "seeun" not in str(path.relative_to(upload)) and "tzuyu" not in str(path.relative_to(upload))


def test_no_manifest_written(tmp_path):
    webp, upload = tmp_path / "webp", tmp_path / "upload"
    for stem in ("seeun_i", "tzuyu_i"):
        _webps(webp, stem)
    prepare_upload.prepare(webp, upload, SECRET)

    files = _files(upload)
    assert len(files) == 3 * 2 and all(p.suffix == ".webp" for p in files)
    assert sorted(p.name for p in webp.iterdir()) == sorted(f"{s}{SUFFIX[k]}" for s in ("seeun_i", "tzuyu_i") for k in KINDS)


def test_lookup_prints_three_keys(monkeypatch, capsys):
    assert prepare_upload.lookup("seeun_i", SECRET) == {kind: opaque_path("seeun_i", kind, SECRET) for kind in KINDS}

    monkeypatch.setenv("INKIT_PATH_SECRET", SECRET)
    assert prepare_upload.main(["--lookup", "seeun_i"]) == 0
    out = capsys.readouterr().out
    for kind in KINDS:
        assert opaque_path("seeun_i", kind, SECRET) in out


def test_cli_prints_version_reminder(tmp_path, monkeypatch, capsys):
    webp, upload = tmp_path / "webp", tmp_path / "upload"
    _webps(webp, "seeun_i")

    monkeypatch.setenv("INKIT_PATH_SECRET", SECRET)
    assert prepare_upload.main([str(webp), str(upload)]) == 0
    out = capsys.readouterr().out
    assert "1 idols ready" in out
    assert "Bump image_version in inkit_idols.csv for every replaced idol" in out

    monkeypatch.setenv("INKIT_PATH_SECRET", "")
    with pytest.raises(SystemExit, match="INKIT_PATH_SECRET"):
        prepare_upload.main([str(webp), str(upload)])
