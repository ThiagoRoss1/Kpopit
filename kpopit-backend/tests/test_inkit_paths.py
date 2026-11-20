"""Per-file opaque InkIt path hashing (utils/inkit_paths)."""

import re
import unicodedata

import pytest

from utils.inkit_paths import KINDS, opaque_path

SECRET = "test-inkit-path-secret"


def _hash(path: str) -> str:
    match = re.search(r"([0-9a-f]{32})\.webp$", path)
    assert match
    return match.group(1)


def test_opaque_path_shapes():
    assert re.fullmatch(r"/images/inkit/[0-9a-f]{32}\.webp", opaque_path("seeun_i", "photo", SECRET))
    assert re.fullmatch(r"/images/inkit/pencil/[0-9a-f]{32}\.webp", opaque_path("seeun_i", "pencil", SECRET))
    assert re.fullmatch(r"/images/inkit/pen/[0-9a-f]{32}\.webp", opaque_path("seeun_i", "pen", SECRET))


def test_kinds_have_unrelated_hashes():
    hashes = [_hash(opaque_path("seeun_i", kind, SECRET)) for kind in KINDS]
    assert len(set(hashes)) == 3
    for a in hashes:
        for b in hashes:
            if a is not b:
                assert a != b and a not in b and b not in a


def test_same_stem_same_paths():
    assert opaque_path("seeun_i", "pen", SECRET) == opaque_path("seeun_i", "pen", SECRET)


def test_case_and_accent_insensitive():
    nfd = unicodedata.normalize("NFD", "rosé_i")
    for stem in ("Rosé_i", nfd, "ROSÉ_I"):
        for kind in KINDS:
            assert opaque_path(stem, kind, SECRET) == opaque_path("rosé_i", kind, SECRET)


def test_secret_changes_every_path():
    for kind in KINDS:
        assert opaque_path("seeun_i", kind, SECRET) != opaque_path("seeun_i", kind, "another-secret")


def test_empty_secret_refuses():
    with pytest.raises(ValueError):
        opaque_path("seeun_i", "pen", "")


def test_unknown_kind_refuses():
    with pytest.raises(ValueError):
        opaque_path("seeun_i", "sketch", SECRET)
