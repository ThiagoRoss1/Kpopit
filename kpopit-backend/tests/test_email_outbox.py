"""EmailService outbox mode: every email function writes its recipient and action link."""

import logging

import pytest
import resend

from services import email_service
from services.email_service import EmailService

LINK = "http://localhost:5173/{path}?token=abc123"


@pytest.mark.parametrize(
    ("send", "path"),
    [
        (lambda to, link: EmailService.send_email_verification(to, "user", link), "verify-email"),
        (lambda to, link: EmailService.send_password_reset(to, "user", link), "reset-password"),
        (lambda to, link: EmailService.send_email_change_link(to, "user", link), "confirm-email-change"),
        (lambda to, link: EmailService.send_email_change_confirmation(to, "new@example.com", "user", link), "revert-email-change"),
    ],
)
def test_link_emails_write_recipient_and_link(email_outbox, send, path):
    link = LINK.format(path=path)
    assert send("someone@example.com", link) is True

    [mail] = email_outbox.all()
    assert mail["to"] == "someone@example.com"
    assert mail["link"] == link
    assert mail["subject"]
    assert link in mail["html"]


@pytest.mark.parametrize(
    "send",
    [
        lambda to: EmailService.send_email_added_confirmation(to, "new@example.com", "user"),
        lambda to: EmailService.send_email_revert_confirmation(to, "user"),
    ],
)
def test_notice_emails_have_no_action_link(email_outbox, send):
    assert send("someone@example.com") is True
    [mail] = email_outbox.all()
    assert mail["to"] == "someone@example.com"
    assert mail["link"] is None


def test_latest_to_returns_newest_email_for_address(email_outbox):
    EmailService.send_password_reset("a@example.com", "a", LINK.format(path="reset-password") + "1")
    EmailService.send_password_reset("b@example.com", "b", LINK.format(path="reset-password") + "2")
    EmailService.send_password_reset("a@example.com", "a", LINK.format(path="reset-password") + "3")
    assert email_outbox.latest_to("a@example.com")["link"].endswith("abc1233")


def test_outbox_ignored_outside_development(email_outbox, monkeypatch, caplog):
    sent = []
    monkeypatch.setenv("FLASK_ENV", "production")
    monkeypatch.setattr(email_service, "_warned_outbox_ignored", False)
    monkeypatch.setattr(resend.Emails, "send", lambda payload: sent.append(payload))

    with caplog.at_level(logging.WARNING):
        assert EmailService.send_email_revert_confirmation("p@example.com", "user") is True
    assert [p["to"] for p in sent] == ["p@example.com"]
    assert email_outbox.all() == []
    assert "EMAIL_DELIVERY=outbox ignored" in caplog.text


def test_resend_used_when_outbox_off(email_outbox, monkeypatch):
    sent = []
    monkeypatch.delenv("EMAIL_DELIVERY")
    monkeypatch.setattr(resend.Emails, "send", lambda payload: sent.append(payload))
    assert EmailService.send_email_verification("r@example.com", "user", LINK.format(path="verify-email")) is True
    assert sent and sent[0]["to"] == "r@example.com"
    assert email_outbox.all() == []
