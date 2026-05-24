"""SafeBase — per-industry notification template variants (Iter54).

A small registry that converts a *neutral* notification key (e.g.
`credential_expiring_soon`) into industry-specific copy variants. The same
domain event ("a tracked credential is about to expire") reads as:

  • Trades       → "SWMS / White Card / Trade licence expires in {n} days"
  • Hospitality  → "Food Safety Supervisor / RSA expires in {n} days"
  • Transport    → "Driver licence / Heavy-vehicle medical expires in {n} days"
  • Healthcare   → "AHPRA registration / NDIS Worker Screening expires in {n} days"
  • Retail       → "Casual induction / RSA expires in {n} days"

Each variant returns a dict with `title`, `body`, `cta_label`, `cta_path`,
`email_subject`, `email_html_intro`. The caller is responsible for filling the
{n}/{name} placeholders — we render with Python `.format(**ctx)` so the
calling code stays one-liner-simple.
"""
from __future__ import annotations

from typing import Optional


# Reasonable defaults the caller can rely on if a specific industry hasn't
# customised a particular template key.
DEFAULT_VARIANT = "trades"


# All copy is plain English, Australian-spelt, free of LLM hedging.
TEMPLATES: dict[str, dict[str, dict[str, str]]] = {
    # ───────────────────────── A tracked credential is about to expire ─────
    "credential_expiring_soon": {
        "trades": {
            "title": "{credential_label} expires in {days} days",
            "body":  "{worker_name}'s {credential_label} expires on {expires_on}. Update it before the next site visit — WorkSafe inspectors check this first.",
            "cta_label": "Open credential register",
            "cta_path":  "/dashboard/team",
            "email_subject":   "[SafeBase] {credential_label} expiring soon — {worker_name}",
            "email_html_intro":"<p><strong>{worker_name}</strong>'s {credential_label} expires on <strong>{expires_on}</strong> (in {days} days).</p><p>Tradespeople can't be deployed without current credentials. Update it now to avoid stop-work risk.</p>",
        },
        "hospitality": {
            "title": "{credential_label} expires in {days} days",
            "body":  "{worker_name}'s {credential_label} expires on {expires_on}. Council inspectors will flag this on the next visit — keep your venue audit-ready.",
            "cta_label": "Open staff certifications",
            "cta_path":  "/dashboard/team",
            "email_subject":   "[SafeBase] {credential_label} expiring soon — {worker_name}",
            "email_html_intro":"<p><strong>{worker_name}</strong>'s {credential_label} expires on <strong>{expires_on}</strong> (in {days} days).</p><p>An FSS lapse can fail your next council inspection. Renew today.</p>",
        },
        "transport": {
            "title": "{credential_label} expires in {days} days",
            "body":  "{worker_name}'s {credential_label} expires on {expires_on}. CoR duty: drivers must hold current credentials before every trip.",
            "cta_label": "Open driver register",
            "cta_path":  "/dashboard/team",
            "email_subject":   "[SafeBase] {credential_label} expiring soon — {worker_name}",
            "email_html_intro":"<p><strong>{worker_name}</strong>'s {credential_label} expires on <strong>{expires_on}</strong> (in {days} days).</p><p>Under HVNL S26C, scheduling a driver without a current credential is a CoR breach. Update before the next dispatch.</p>",
        },
        "healthcare": {
            "title": "{credential_label} renewal due in {days} days",
            "body":  "{worker_name}'s {credential_label} expires on {expires_on}. AHPRA / NDIS Commission audits check currency at every clinician contact.",
            "cta_label": "Open clinician register",
            "cta_path":  "/dashboard/team",
            "email_subject":   "[SafeBase] {credential_label} renewal due — {worker_name}",
            "email_html_intro":"<p><strong>{worker_name}</strong>'s {credential_label} expires on <strong>{expires_on}</strong> (in {days} days).</p><p>Lapsed registration is a Category 1 ACQSC / NDIS issue. Renew today.</p>",
        },
        "retail": {
            "title": "{credential_label} expires in {days} days",
            "body":  "{worker_name}'s {credential_label} expires on {expires_on}. Casual workers can't open or close without it being current.",
            "cta_label": "Open team page",
            "cta_path":  "/dashboard/team",
            "email_subject":   "[SafeBase] {credential_label} expiring soon — {worker_name}",
            "email_html_intro":"<p><strong>{worker_name}</strong>'s {credential_label} expires on <strong>{expires_on}</strong> (in {days} days).</p><p>Bottle-shop or grocery shift coverage depends on currency. Renew before the next roster.</p>",
        },
    },

    # ───────────────────────── A tracked document is overdue ─────
    "primary_document_overdue": {
        "trades": {
            "title": "SWMS overdue for review",
            "body":  "The SWMS for {asset_label} hasn't been reviewed in over {days} days. SWMS must be reviewed when the work scope or workforce changes.",
            "cta_label": "Open SWMS library",
            "cta_path":  "/dashboard/swms",
            "email_subject":   "[SafeBase] SWMS overdue for review — {asset_label}",
            "email_html_intro":"<p>The SWMS for <strong>{asset_label}</strong> hasn't been reviewed in <strong>{days}+ days</strong>. Reg 299 requires review on any change of work, worker, or hazard.</p>",
        },
        "hospitality": {
            "title": "HACCP plan overdue for review",
            "body":  "The HACCP plan for {asset_label} hasn't been reviewed in over {days} days. Council expects an annual review at minimum.",
            "cta_label": "Open Food Safety",
            "cta_path":  "/dashboard/food-safety",
            "email_subject":   "[SafeBase] HACCP plan overdue — {asset_label}",
            "email_html_intro":"<p>The HACCP plan for <strong>{asset_label}</strong> hasn't been reviewed in <strong>{days}+ days</strong>. Standard 3.2.1 expects an annual review at minimum.</p>",
        },
        "transport": {
            "title": "CoR Management Plan overdue for review",
            "body":  "The CoR Management Plan for {asset_label} hasn't been reviewed in over {days} days. NHVR expects periodic review and after every notifiable occurrence.",
            "cta_label": "Open Fleet & CoR",
            "cta_path":  "/dashboard/fleet",
            "email_subject":   "[SafeBase] CoR plan overdue — {asset_label}",
            "email_html_intro":"<p>The CoR Management Plan for <strong>{asset_label}</strong> hasn't been reviewed in <strong>{days}+ days</strong>. Review now to defend a notifiable-occurrence investigation.</p>",
        },
        "healthcare": {
            "title": "Care plan overdue for review",
            "body":  "The care plan for {asset_label} hasn't been reviewed in over {days} days. ACQSC expects regular review aligned to resident need.",
            "cta_label": "Open Care Quality",
            "cta_path":  "/dashboard/care",
            "email_subject":   "[SafeBase] Care plan overdue — {asset_label}",
            "email_html_intro":"<p>The care plan for <strong>{asset_label}</strong> hasn't been reviewed in <strong>{days}+ days</strong>. Strengthened Standards require active care planning.</p>",
        },
        "retail": {
            "title": "Casual induction record overdue",
            "body":  "Induction records for {asset_label} are missing or older than {days} days. Casuals can't work an unsupervised shift without one.",
            "cta_label": "Open Inductions",
            "cta_path":  "/dashboard/inductions",
            "email_subject":   "[SafeBase] Induction overdue — {asset_label}",
            "email_html_intro":"<p>Induction records for <strong>{asset_label}</strong> are missing or older than <strong>{days} days</strong>. Re-induct before the next shift.</p>",
        },
    },

    # ───────────────────────── New incident assigned to the user ─────
    "incident_assigned": {
        "trades": {
            "title": "Incident assigned: {incident_title}",
            "body":  "An incident at {site_name} has been assigned to you. SWMS review and corrective actions are due within 7 days.",
            "cta_label": "Open incident",
            "cta_path":  "/dashboard/incidents/{incident_id}",
            "email_subject":   "[SafeBase] Incident assigned — {incident_title}",
            "email_html_intro":"<p>You've been assigned an incident at <strong>{site_name}</strong>. Capture the 5-Whys and assign corrective actions within 7 days.</p>",
        },
        "hospitality": {
            "title": "Food safety event assigned: {incident_title}",
            "body":  "A food-safety event at {site_name} has been assigned to you. Capture root cause and notify council if it meets the threshold.",
            "cta_label": "Open event",
            "cta_path":  "/dashboard/incidents/{incident_id}",
            "email_subject":   "[SafeBase] Food safety event assigned — {incident_title}",
            "email_html_intro":"<p>You've been assigned a food-safety event at <strong>{site_name}</strong>. Allergen, choke and supply-chain events require council notification within 24 hours.</p>",
        },
        "transport": {
            "title": "Notifiable occurrence assigned: {incident_title}",
            "body":  "An occurrence on {site_name} has been assigned to you. NHVR notifiable events have a 24-hour reporting window.",
            "cta_label": "Open occurrence",
            "cta_path":  "/dashboard/incidents/{incident_id}",
            "email_subject":   "[SafeBase] Notifiable occurrence assigned — {incident_title}",
            "email_html_intro":"<p>An occurrence on <strong>{site_name}</strong> has been assigned to you. Lodge with NHVR within 24 hours if criteria are met.</p>",
        },
        "healthcare": {
            "title": "Clinical incident assigned: {incident_title}",
            "body":  "A clinical incident at {site_name} has been assigned to you. Check ACQSC SIRS or NDIS Commission reporting thresholds first.",
            "cta_label": "Open incident",
            "cta_path":  "/dashboard/incidents/{incident_id}",
            "email_subject":   "[SafeBase] Clinical incident assigned — {incident_title}",
            "email_html_intro":"<p>You've been assigned a clinical incident at <strong>{site_name}</strong>. SIRS Priority 1: 24-hour window. NDIS reportable: 5 days.</p>",
        },
        "retail": {
            "title": "Store incident assigned: {incident_title}",
            "body":  "An incident at {site_name} has been assigned to you. Review CCTV, cleaning log and customer details before responding.",
            "cta_label": "Open incident",
            "cta_path":  "/dashboard/incidents/{incident_id}",
            "email_subject":   "[SafeBase] Store incident assigned — {incident_title}",
            "email_html_intro":"<p>You've been assigned an incident at <strong>{site_name}</strong>. Capture cleaning + CCTV evidence for any customer slip-and-fall claim.</p>",
        },
    },
}


def get_variant(template_key: str, industry: Optional[str]) -> Optional[dict[str, str]]:
    """Return the raw template dict for a (key, industry). Falls back to trades
    if the industry isn't registered. Returns None if `template_key` is unknown.
    """
    bucket = TEMPLATES.get(template_key)
    if not bucket:
        return None
    return bucket.get((industry or "").lower()) or bucket.get(DEFAULT_VARIANT)


def render(template_key: str, industry: Optional[str], **ctx) -> dict[str, str]:
    """Render every string in the variant with ``.format(**ctx)``. Missing
    placeholders are tolerated (left as-is) so a partial context doesn't blow
    up the notification pipeline.
    """
    variant = get_variant(template_key, industry)
    if not variant:
        return {"title": template_key, "body": "", "cta_label": "Open SafeBase",
                "cta_path": "/dashboard", "email_subject": template_key, "email_html_intro": ""}

    class _SafeDict(dict):
        def __missing__(self, key):
            return "{" + key + "}"

    safe = _SafeDict(ctx)
    out = {}
    for k, raw in variant.items():
        try:
            out[k] = raw.format_map(safe)
        except Exception:
            out[k] = raw
    return out
