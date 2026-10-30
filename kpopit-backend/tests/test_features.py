import services.calendar_service as calendar_service
import services.xp_service as xp_service


def test_features_lists_every_flag_as_a_boolean(client):
    res = client.get("/api/features")
    assert res.status_code == 200
    assert res.get_json() == {"calendar": True, "idol_xp": True, "public_profile": True, "collection": True}
    assert res.headers["Cache-Control"] == "public, max-age=60"


def test_features_follow_the_backend_flags(client, monkeypatch):
    monkeypatch.setattr(calendar_service, "CALENDAR_ENABLED", False)
    monkeypatch.setattr(xp_service, "IDOL_XP_ENABLED", False)
    body = client.get("/api/features").get_json()
    assert body["calendar"] is False and body["idol_xp"] is False
    assert body["public_profile"] is True


def test_features_carry_no_other_keys(client):
    assert set(client.get("/api/features").get_json()) == {"calendar", "idol_xp", "public_profile", "collection"}
