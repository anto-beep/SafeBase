"""Iter36 — Compliance Inbox + IoT/EWD/AHPRA integration webhook tests.

Covers:
  * GET /api/compliance-inbox + summary
  * Severity & industry filters
  * Account isolation
  * IoT temperature webhook
  * EWD fatigue webhook
  * AHPRA poll (owner-only) + AHPRA webhook
  * Academy catalogue + AI doc types content expansion
  * Trades regression (still has SWMS, incidents, workers, /features/me)
  * Cross-industry 403 hard-block for trades user
"""
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASS = "Demo@1234"


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner_user(owner_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {owner_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def owner_account_id(owner_user):
    # try several common keys
    return (owner_user.get("account_id")
            or owner_user.get("company_id")
            or owner_user.get("user_id"))


def auth(t):
    return {"Authorization": f"Bearer {t}"}


# -------------------- Compliance Inbox --------------------
class TestComplianceInbox:
    def test_summary_shape(self, owner_token):
        r = requests.get(f"{API}/compliance-inbox/summary", headers=auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total", "critical", "high", "medium", "top_3", "generated_at"):
            assert k in d, f"missing {k}"
        assert isinstance(d["top_3"], list)
        assert len(d["top_3"]) <= 3
        assert d["total"] >= d["critical"] + d["high"] + d["medium"]
        # any top_3 item must have a severity field
        for it in d["top_3"]:
            assert it.get("severity") in ("critical", "high", "medium", "info")

    def test_inbox_full_list_sorted(self, owner_token):
        r = requests.get(f"{API}/compliance-inbox", headers=auth(owner_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total", "counts_by_severity", "items"):
            assert k in d
        sev_rank = {"critical": 0, "high": 1, "medium": 2, "info": 3}
        prev = -1
        for it in d["items"]:
            cur = sev_rank.get(it["severity"], 9)
            assert cur >= prev, f"severity not sorted: prev={prev} cur={cur}"
            prev = cur
        cb = d["counts_by_severity"]
        assert sum(cb.values()) == len(d["items"])

    def test_filter_severity_critical(self, owner_token):
        r = requests.get(f"{API}/compliance-inbox?severity=critical", headers=auth(owner_token), timeout=30)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["severity"] == "critical"

    def test_filter_industry_transport(self, owner_token):
        r = requests.get(f"{API}/compliance-inbox?industry=transport", headers=auth(owner_token), timeout=30)
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["industry"] == "transport"

    def test_unauth_blocked(self):
        r = requests.get(f"{API}/compliance-inbox/summary", timeout=20)
        assert r.status_code in (401, 403)


# -------------------- Fresh NHVR critical occurrence flow --------------------
class TestNHVRCriticalOccurrence:
    """Switch user to transport, post an NHVR occurrence with occurred_at=25h ago,
    confirm it surfaces as a critical inbox item, then restore industry to trades."""

    def test_create_past_due_nhvr_makes_critical_inbox_item(self, owner_token):
        # Switch industry to transport
        rs = requests.patch(f"{API}/auth/me/industry",
                            headers={**auth(owner_token), "Content-Type": "application/json"},
                            json={"industry": "transport"}, timeout=20)
        assert rs.status_code == 200, rs.text
        try:
            occurred_at = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
            payload = {
                "occurrence_type": "fatigue_breach",
                "occurred_at": occurred_at,
                "summary": f"TEST_iter36 critical past-due {uuid.uuid4().hex[:6]}",
                "vehicle_rego": "TST36",
            }
            rc = requests.post(f"{API}/transport/nhvr-occurrences",
                               headers={**auth(owner_token), "Content-Type": "application/json"},
                               json=payload, timeout=30)
            assert rc.status_code in (200, 201), rc.text
            occ = rc.json()
            occ_id = occ.get("occurrence_id") or occ.get("id")
            assert occ_id, occ

            # Inbox should classify it critical
            ri = requests.get(f"{API}/compliance-inbox?severity=critical",
                              headers=auth(owner_token), timeout=30)
            assert ri.status_code == 200
            ids = [i.get("source_id") for i in ri.json()["items"]]
            assert occ_id in ids, f"created NHVR occurrence not critical; got ids: {ids[:6]}"
        finally:
            requests.patch(f"{API}/auth/me/industry",
                           headers={**auth(owner_token), "Content-Type": "application/json"},
                           json={"industry": "trades"}, timeout=20)


# -------------------- IoT Temperature webhook --------------------
class TestIoTTemperatureWebhook:
    def test_iot_breach_creates_log(self, owner_token, owner_account_id):
        body = {
            "equipment": f"TEST_FRIDGE_{uuid.uuid4().hex[:6]}",
            "equipment_type": "fridge",
            "temp_c": 7.5,
            "sensor_id": "sens-001",
        }
        r = requests.post(f"{API}/integrations/iot/temperature",
                          headers={"x-safebase-account": owner_account_id, "Content-Type": "application/json"},
                          json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["in_range"] is False
        assert d["log_id"].startswith("TL-")

        # Switch industry to hospitality and verify it shows up via temperature_logs
        rs = requests.patch(f"{API}/auth/me/industry",
                            headers={**auth(owner_token), "Content-Type": "application/json"},
                            json={"industry": "hospitality"}, timeout=20)
        assert rs.status_code == 200
        try:
            rl = requests.get(f"{API}/hospitality/temperature-logs", headers=auth(owner_token), timeout=20)
            assert rl.status_code == 200
            body = rl.json()
            logs = body.get("rows") if isinstance(body, dict) else body
            found = next((l for l in logs if l.get("log_id") == d["log_id"]), None)
            assert found is not None, "iot log not visible via /temperature-logs"
            assert found["in_range"] is False
            assert "FSANZ Std 3.2.2" in (found.get("out_of_range_reason") or "")
        finally:
            requests.patch(f"{API}/auth/me/industry",
                           headers={**auth(owner_token), "Content-Type": "application/json"},
                           json={"industry": "trades"}, timeout=20)

    def test_iot_missing_token_401(self):
        r = requests.post(f"{API}/integrations/iot/temperature",
                          json={"equipment": "x", "temp_c": 3}, timeout=20)
        assert r.status_code == 401


# -------------------- EWD Fatigue webhook --------------------
class TestEWDFatigueWebhook:
    def test_ewd_breach(self, owner_account_id):
        body = {
            "driver_name": f"TEST_DriverEWD_{uuid.uuid4().hex[:4]}",
            "vehicle_rego": "EWD001",
            "work_hours": 13,
            "continuous_rest_hours": 6,
            "provider": "Teletrac",
        }
        r = requests.post(f"{API}/integrations/ewd/fatigue",
                          headers={"x-safebase-account": owner_account_id, "Content-Type": "application/json"},
                          json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["breach"] is True
        assert d["log_id"].startswith("FT-")


# -------------------- AHPRA poll & webhook --------------------
class TestAHPRAIntegrations:
    def test_poll_owner_only_and_stamps(self, owner_token):
        # Owner can call
        r = requests.post(f"{API}/integrations/ahpra/poll", headers=auth(owner_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert "polled" in d and "at" in d

    def test_webhook_updates_existing(self, owner_token, owner_account_id):
        # First create an AHPRA reg via the healthcare endpoint
        rs = requests.patch(f"{API}/auth/me/industry",
                            headers={**auth(owner_token), "Content-Type": "application/json"},
                            json={"industry": "healthcare"}, timeout=20)
        assert rs.status_code == 200
        try:
            reg_no = f"TEST{uuid.uuid4().hex[:8].upper()}"
            payload = {
                "worker_name": f"TEST_Reg_{uuid.uuid4().hex[:4]}",
                "profession": "nurse",
                "registration_number": reg_no,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=200)).isoformat(),
            }
            rc = requests.post(f"{API}/healthcare/ahpra-register",
                               headers={**auth(owner_token), "Content-Type": "application/json"},
                               json=payload, timeout=20)
            assert rc.status_code in (200, 201), rc.text

            # Now hit the webhook to flip status
            rh = requests.post(f"{API}/integrations/ahpra/webhook",
                               headers={"x-safebase-account": owner_account_id, "Content-Type": "application/json"},
                               json={"registration_number": reg_no, "status": "suspended"}, timeout=20)
            assert rh.status_code == 200, rh.text
            d = rh.json()
            assert d["ok"] is True
            assert d["matched"] >= 1
            assert d["modified"] >= 1
        finally:
            requests.patch(f"{API}/auth/me/industry",
                           headers={**auth(owner_token), "Content-Type": "application/json"},
                           json={"industry": "trades"}, timeout=20)


# -------------------- Content expansion (Academy + AI docs) --------------------
class TestContentExpansion:
    def test_academy_hospitality_has_peal(self, owner_token):
        r = requests.get(f"{API}/academy/catalogue?industry=hospitality",
                         headers=auth(owner_token), timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        items = body if isinstance(body, list) else (body.get("items") or body.get("microlearning") or [])
        # Could be nested under "microlearning"
        if not items and isinstance(body, dict):
            items = []
            for v in body.values():
                if isinstance(v, list):
                    items.extend(v)
        text = str(body).lower()
        assert "peal" in text or "anaphylaxis" in text, f"PEAL not found in hospitality catalogue: {str(body)[:400]}"

    def test_ai_doc_types_industry_extras(self, owner_token):
        # hospitality -> peal_anaphylaxis_plan
        r1 = requests.get(f"{API}/ai-docs/types?industry=hospitality",
                          headers=auth(owner_token), timeout=20)
        assert r1.status_code == 200
        assert "peal_anaphylaxis_plan" in str(r1.json()).lower()

        # transport -> nhvas_audit_pack + nhvr_notifiable_occurrence
        r2 = requests.get(f"{API}/ai-docs/types?industry=transport",
                          headers=auth(owner_token), timeout=20)
        assert r2.status_code == 200
        body2 = str(r2.json()).lower()
        assert "nhvas_audit_pack" in body2
        assert "nhvr_notifiable_occurrence" in body2

        # healthcare -> sirs_investigation_report
        r3 = requests.get(f"{API}/ai-docs/types?industry=healthcare",
                          headers=auth(owner_token), timeout=20)
        assert r3.status_code == 200
        assert "sirs_investigation_report" in str(r3.json()).lower()


# -------------------- Trades regression --------------------
class TestTradesRegression:
    def test_features_me(self, owner_token):
        r = requests.get(f"{API}/features/me", headers=auth(owner_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Must include some core SWMS/incidents/workers feature codes
        text = str(d).lower()
        assert "swms" in text
        assert "incident" in text

    def test_swms_library(self, owner_token):
        r = requests.get(f"{API}/swms", headers=auth(owner_token), timeout=20)
        assert r.status_code == 200

    def test_incidents_list(self, owner_token):
        r = requests.get(f"{API}/incidents", headers=auth(owner_token), timeout=20)
        assert r.status_code == 200

    def test_workers_list(self, owner_token):
        r = requests.get(f"{API}/workers", headers=auth(owner_token), timeout=20)
        assert r.status_code == 200

    def test_trades_blocked_on_hospitality(self, owner_token):
        r = requests.get(f"{API}/hospitality/temperature-logs", headers=auth(owner_token), timeout=20)
        # Trades user must be hard-blocked on hospitality endpoint
        assert r.status_code in (402, 403), f"expected block, got {r.status_code}: {r.text[:200]}"

    def test_trades_blocked_on_transport(self, owner_token):
        r = requests.get(f"{API}/transport/nhvr-occurrences", headers=auth(owner_token), timeout=20)
        assert r.status_code in (402, 403)

    def test_trades_blocked_on_healthcare(self, owner_token):
        r = requests.get(f"{API}/healthcare/sirs-incidents", headers=auth(owner_token), timeout=20)
        assert r.status_code in (402, 403)

    def test_trades_blocked_on_retail(self, owner_token):
        r = requests.get(f"{API}/retail/lone-worker/active", headers=auth(owner_token), timeout=20)
        assert r.status_code in (402, 403)
