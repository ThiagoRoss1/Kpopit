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
                "subject": "Verify your email for Kpopit",
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
                                                    Thanks for joining Kpopit. Click the button below to verify your email address and start playing.
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
                                                    If you didn't create a Kpopit account, you can safely ignore this email.
                                                </p>
                                            </td>
                                        </tr>

                                        <!-- Footer -->
                                        <tr>
                                            <td style="background:#f9f9f9;padding:20px 48px;text-align:center;border-top:1px solid #eeeeee;">
                                                <p style="margin:0;font-size:12px;color:#aaaaaa;">
                                                    © 2026 <a href="{os.getenv('EMAIL_FRONTEND_URL')}" style="color:#FF3399;text-decoration:underline;">Kpopit</a> · All rights reserved
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
            logger.exception(f"Error sending email verification")
            return False
        
    @staticmethod
    def send_password_reset(to_email: str, username: str, reset_link: str) -> bool:
        """Send a password reset link to the specified email address."""

        try:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": to_email,
                "subject": "Kpopit Password Reset",
                "html": f"""
                    <h2>Password Reset Request for Kpopit</h2>
                    <p>Hi {username},</p>
                    <p>We received a request to reset your password.
                    <p>Click the link below to reset your password:</p>
                    <a href="{reset_link}"
                        style="background:#FF3399;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                            Reset Password
                    </a>
                    <p>This link will expire in <strong>1 hour</strong>.</p>
                    <p>If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>

                    <p style="color:#888;font-size:12px;">
                        If the button doesn't work, copy and paste this link:<br>
                        {reset_link}
                    </p>                        
                """   
            })
            return True
        except Exception:
            logger.exception(f"Error sending password reset email")
            return False