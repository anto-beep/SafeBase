"""
Resend email helper — used for transactional email (password reset, etc.)

Sync Resend SDK wrapped in asyncio.to_thread so FastAPI handlers stay
non-blocking. If RESEND_API_KEY is not configured, send_email() returns
{"sent": False, "reason": "no_api_key"} and logs the message — supporting
dev-mode usage without Resend.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


async def send_email(*, to: str, subject: str, html: str, from_addr: Optional[str] = None) -> dict:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = from_addr or os.environ.get("SENDER_EMAIL") or "onboarding@resend.dev"

    if not api_key:
        logger.warning("[email] RESEND_API_KEY missing — skipping send to %s (%s)", to, subject)
        return {"sent": False, "reason": "no_api_key"}

    try:
        import resend
        resend.api_key = api_key
        params = {"from": sender, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info("[email] sent to=%s subject=%r id=%s", to, subject, email_id)
        return {"sent": True, "id": email_id}
    except Exception as exc:  # noqa: BLE001
        logger.exception("[email] send failed to=%s: %s", to, exc)
        return {"sent": False, "reason": "send_failed", "error": str(exc)}


def password_reset_html(*, reset_url: str, name: Optional[str] = None) -> str:
    greeting = f"Hi {name}," if name else "Hi there,"
    return f"""\
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 32px;background:#0A0A0A;color:#FFFFFF;">
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#FFCC00;">SafeBase</div>
          <div style="font-size:22px;font-weight:900;margin-top:6px;">Reset your password</div>
        </td></tr>
        <tr><td style="padding:32px;color:#111827;font-size:15px;line-height:1.55;">
          <p style="margin:0 0 16px 0;">{greeting}</p>
          <p style="margin:0 0 16px 0;">We received a request to reset the password for your SafeBase account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="{reset_url}" style="display:inline-block;background:#0A0A0A;color:#FFFFFF;text-decoration:none;padding:14px 28px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-size:13px;">Reset password</a>
          </p>
          <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;">If the button doesn't work, paste this link into your browser:</p>
          <p style="margin:0 0 24px 0;font-size:13px;color:#0A0A0A;word-break:break-all;"><a href="{reset_url}" style="color:#0A0A0A;">{reset_url}</a></p>
          <p style="margin:0;font-size:13px;color:#6b7280;">If you didn't request this, you can ignore this email — your password won't change.</p>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
          SafeBase · Australian WHS compliance platform · This is an automated message.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
"""
