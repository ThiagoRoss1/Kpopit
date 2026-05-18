import os
import resend
import logging

resend.api_key = os.getenv("RESEND_API_KEY")

SENDER_EMAIL = os.getenv("RESEND_EMAIL_FROM")

logger = logging.getLogger(__name__)

class EmailService:
        
    @staticmethod
    def send_email_verification(to_email: str, username: str, verification_link: str) -> bool:
        """Send an email verification link to the specified email address."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Verify your email for KpopIt",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
                                        
                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    Welcome, {username}! 👋
                                                </h1>
                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    Thanks for joining KpopIt. Click the button below to verify your email address and start playing.
                                                </p>

                                                <!-- Button -->
                                                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                                    <tr>
                                                        <td style="background:#FF3399;border-radius:8px;border-bottom:3px solid #000000;border-right:3px solid #000000;">
                                                            <a href="{verification_link}"
                                                            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                                                                Verify Email →
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                                                    Or copy and paste this link in your browser:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:12px;color:#FF3399;word-break:break-all;">
                                                    {verification_link}
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    If you didn't create a KpopIt account, you can safely ignore this email.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """

            })
            return True
        except Exception:
            logger.exception("Error sending email verification")
            return False
        
    @staticmethod
    def send_password_reset(to_email: str, username: str, reset_link: str) -> bool:
        """Send a password reset link to the specified email address."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "KpopIt Password Reset",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    Hi, {username}! 🔒
                                                </h1>
                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    We received a request to reset your password. Click the button below to choose a new one.
                                                </p>

                                                <!-- Button -->
                                                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                                    <tr>
                                                        <td style="background:#FF3399;border-radius:8px;border-bottom:3px solid #000000;border-right:3px solid #000000;">
                                                            <a href="{reset_link}"
                                                            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                                                                Reset Password →
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                                                    Or copy and paste this link in your browser:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:12px;color:#FF3399;word-break:break-all;">
                                                    {reset_link}
                                                </p>

                                                <p style="margin:0 0 24px;font-size:13px;color:#444444;line-height:1.6;background:#fff5fa;border-left:3px solid #FF3399;padding:12px 16px;border-radius:4px;">
                                                    ⏱️ This link will expire in <strong>1 hour</strong>.
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    If you didn't request a password reset, you can safely ignore this email. Your password won't change.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """
            })
            return True
        except Exception:
            logger.exception("Error sending password reset email")
            return False
        
    @staticmethod
    def send_email_change_link(to_email: str, username: str, email_change_link: str) -> bool:
        """Send an email change link to the user."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Confirm your new KpopIt email",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    Hi, {username}! ✉️
                                                </h1>
                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    You requested an email change for your KpopIt account. Click the button below to confirm your new email address.
                                                </p>

                                                <!-- Button -->
                                                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                                    <tr>
                                                        <td style="background:#FF3399;border-radius:8px;border-bottom:3px solid #000000;border-right:3px solid #000000;">
                                                            <a href="{email_change_link}"
                                                            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                                                                Confirm New Email →
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                                                    Or copy and paste this link in your browser:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:12px;color:#FF3399;word-break:break-all;">
                                                    {email_change_link}
                                                </p>

                                                <p style="margin:0 0 24px;font-size:13px;color:#444444;line-height:1.6;background:#fff5fa;border-left:3px solid #FF3399;padding:12px 16px;border-radius:4px;">
                                                    ⏱️ This link will expire in <strong>24 hours</strong>.
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    If you didn't request this change, you can safely ignore this email — your account email won't be updated.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """
            })
            return True

        except Exception:
            logger.exception("Error sending email change verification")
            return False
        
    @staticmethod
    def send_email_change_confirmation(to_email: str, new_email: str, username: str, revert_link: str) -> bool:
        """Send an email confirming the email change, with a revert link in case it wasn't the user who made the change."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Your KpopIt email was changed",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    Hi, {username} ⚠️
                                                </h1>
                                                <p style="margin:0 0 12px;font-size:15px;color:#444444;line-height:1.6;">
                                                    The email on your KpopIt account was just changed to:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:15px;color:#111111;font-weight:900;word-break:break-all;">
                                                    {new_email}
                                                </p>

                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    If this was you, no further action is needed. If you didn't make this change, click below to restore your original email immediately.
                                                </p>

                                                <!-- Button -->
                                                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                                    <tr>
                                                        <td style="background:#FF3399;border-radius:8px;border-bottom:3px solid #000000;border-right:3px solid #000000;">
                                                            <a href="{revert_link}"
                                                            style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                                                                Revert This Change →
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                                                    Or copy and paste this link in your browser:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:12px;color:#FF3399;word-break:break-all;">
                                                    {revert_link}
                                                </p>

                                                <p style="margin:0 0 24px;font-size:13px;color:#444444;line-height:1.6;background:#fff5fa;border-left:3px solid #FF3399;padding:12px 16px;border-radius:4px;">
                                                    ⏱️ The revert link is valid for <strong>14 days</strong>.
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    For your security, we recommend changing your password if you didn't authorize this change.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """

            })
            return True

        except Exception:
            logger.exception("Error sending email change confirmation")
            return False
        
    @staticmethod
    def send_email_added_confirmation(to_email: str, new_email: str, username: str) -> bool:
        """Send an email confirming that the new email was added to the account (Previously without an email)."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Your KpopIt email has been set",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    All set, {username}! ✔
                                                </h1>
                                                <p style="margin:0 0 12px;font-size:15px;color:#444444;line-height:1.6;">
                                                    This address is now linked to your KpopIt account:
                                                </p>
                                                <p style="margin:0 0 24px;font-size:15px;color:#111111;font-weight:900;word-break:break-all;">
                                                    {new_email}
                                                </p>

                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    You'll start receiving account notifications, password reset links, and important updates at this address.
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    If you didn't make this change, please contact support immediately.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """
            })
            return True

        except Exception:
            logger.exception("Error sending email added confirmation")
            return False
        
    @staticmethod
    def send_email_revert_confirmation(to_email: str, username: str) -> bool:
        """Send an email confirming that the email change was reverted."""
        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Your KpopIt email was restored",
                "html": f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

                                        <!-- Header -->
                                        <tr>
                                            <td style="background:#000000;padding:32px;text-align:center;border-bottom:3px solid #FF3399;">
                                                <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="text-decoration:none;">
                                                    <span style="font-size:28px;font-weight:900;color:#FF3399;text-shadow:2px 2px 0px rgba(0,0,0,0.5),0px 0px 8px #FF3399;letter-spacing:2px;">
                                                        KpopIt
                                                    </span>
                                                </a>
                                            </td>
                                        </tr>

                                        <!-- Body -->
                                        <tr>
                                            <td style="padding:40px 48px;">
                                                <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#111111;text-shadow:2px 2px 0px rgba(0,0,0,0.15);">
                                                    Hi, {username}! 🔄
                                                </h1>
                                                <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                                                    The recent email change on your KpopIt account has been reverted. Your account email is now set back to this address.
                                                </p>

                                                <p style="margin:0 0 24px;font-size:13px;color:#444444;line-height:1.6;background:#fff5fa;border-left:3px solid #FF3399;padding:12px 16px;border-radius:4px;">
                                                    🔒 For your security, we recommend changing your password if you didn't authorize the original change.
                                                </p>

                                                <p style="margin:0;font-size:13px;color:#aaaaaa;border-top:1px solid #eeeeee;padding-top:24px;">
                                                    If you have any concerns about your account, please contact support.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">KpopIt</a> · All rights reserved
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                """
            })
            return True

        except Exception:
            logger.exception("Error sending email change revert confirmation")
            return False