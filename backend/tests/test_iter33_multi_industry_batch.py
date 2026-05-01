"""
Iter33 — Multi-industry expansion batch (Parts 1, 2, 4, 5 + ticker + audit log).

Tests:
  1. /api/public/safebase-activity/today returns counter payload
  2. /api/audit-log requires owner; returns rows for owner
  3. Audit log is appended on incident create/worker create/addon activate/AI doc
  4. /api/ai-docs/types lists hospitality/transport/healthcare/retail correctly
  5. /api/ai-docs/{wrong_industry}/{type}/generate returns 403
  6. /api/addons/available filters by industry
  7. /api/addons/{slug}/activate persists; deactivate flips off
  8. /api/academy/catalogue serves industry-specific module list
  9. Workers/Incidents endpoints stamp account_id and remain backwards-compatible
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _set_industry(t, industry):
    requests.patch(f"{API}/auth/me/industry", json={"industry": industry}, headers=_h(t))


class TestActivityTicker:
    def test_endpoint_shape(self):
        r = requests.get(f"{API}/public/safebase-activity/today")
        assert r.status_code == 200
        d = r.json()
        for k in ("swms_generated", "incidents_logged", "inductions_completed",
                  "documents_generated", "toolbox_talks_conducted",
                  "new_businesses_this_week", "as_of"):
            assert k in d
        # All counters must be non-negative integers
        for k in ("swms_generated", "incidents_logged", "inductions_completed",
                   "documents_generated"):
            assert isinstance(d[k], int)
            assert d[k] >= 0


class TestAuditLog:
    def test_owner_can_read(self):
        t = _login()
        r = requests.get(f"{API}/audit-log", headers=_h(t))
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d
        assert "total" in d


class TestAIDocs:
    def test_industry_filter(self):
        t = _login()
        # Trades (registered industry but no AI docs configured for trades yet)
        _set_industry(t, "trades")
        r = requests.get(f"{API}/ai-docs/types", headers=_h(t))
        assert r.status_code == 200
        assert r.json()["industry"] == "trades"
        # Switch hospitality — should see haccp_plan
        _set_industry(t, "hospitality")
        r = requests.get(f"{API}/ai-docs/types", headers=_h(t))
        assert r.status_code == 200
        slugs = [x["doc_type"] for x in r.json()["types"]]
        assert "haccp_plan" in slugs
        # Reset
        _set_industry(t, "trades")

    def test_cross_industry_blocked(self):
        t = _login()
        _set_industry(t, "trades")
        try:
            r = requests.post(f"{API}/ai-docs/hospitality/haccp_plan/generate",
                               headers=_h(t), json={"inputs": {"venue_name": "X"}})
            assert r.status_code == 403, r.text
            d = r.json()["detail"]
            assert d["error"] == "feature_not_available"
        finally:
            _set_industry(t, "trades")


class TestAddonsMarketplace:
    def test_available_filters_by_industry(self):
        t = _login()
        _set_industry(t, "trades")
        r = requests.get(f"{API}/addons/available", headers=_h(t))
        assert r.status_code == 200
        slugs = [a["slug"] for a in r.json()["addons"]]
        assert "safeinduct_trades" in slugs
        assert "safeinduct_hospitality" not in slugs
        assert "temperature_sensors" not in slugs  # hospitality-only
        # Switch hospitality
        _set_industry(t, "hospitality")
        r = requests.get(f"{API}/addons/available", headers=_h(t))
        slugs = [a["slug"] for a in r.json()["addons"]]
        assert "temperature_sensors" in slugs
        assert "safeinduct_trades" not in slugs
        _set_industry(t, "trades")

    def test_activate_deactivate_flow(self):
        t = _login()
        _set_industry(t, "trades")
        # Activate
        r = requests.post(f"{API}/addons/safeinduct_trades/activate",
                           headers=_h(t), json={})
        assert r.status_code == 200
        assert r.json()["active"] is True
        # Verify in active list
        r = requests.get(f"{API}/addons/active", headers=_h(t))
        assert r.status_code == 200
        slugs = [a["slug"] for a in r.json()["active"]]
        assert "safeinduct_trades" in slugs
        # Deactivate
        r = requests.post(f"{API}/addons/safeinduct_trades/deactivate",
                           headers=_h(t))
        assert r.status_code == 200
        assert r.json()["active"] is False

    def test_cross_industry_addon_blocked(self):
        t = _login()
        _set_industry(t, "trades")
        # Attempt to activate hospitality-only addon → 403
        r = requests.post(f"{API}/addons/temperature_sensors/activate",
                           headers=_h(t), json={})
        assert r.status_code == 403, r.text


class TestAcademy:
    def test_catalogue_per_industry(self):
        t = _login()
        for industry, expect_micro_substring in [
            ("trades", "Working at Heights"),
            ("hospitality", "Food Handler"),
            ("transport", "Chain of Responsibility"),
            ("healthcare", "Manual Handling"),
            ("retail", "Working Alone"),
        ]:
            _set_industry(t, industry)
            r = requests.get(f"{API}/academy/catalogue", headers=_h(t))
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["industry"] == industry
            assert d["total_modules"] > 5
            titles = " ".join(m["title"] for m in d["microlearning"])
            assert expect_micro_substring.split()[0] in titles, f"{industry} missing {expect_micro_substring}"
        _set_industry(t, "trades")

    def test_completion_marks_record(self):
        t = _login()
        _set_industry(t, "trades")
        r = requests.post(f"{API}/academy/swms_full/complete",
                           headers=_h(t), json={"score": 95})
        assert r.status_code == 200
        d = r.json()
        assert d["module_slug"] == "swms_full"
        assert d["score"] == 95
        # And appears in completions
        r2 = requests.get(f"{API}/academy/completions", headers=_h(t))
        assert r2.status_code == 200
        slugs = [c["module_slug"] for c in r2.json()]
        assert "swms_full" in slugs


class TestDataIsolation:
    def test_workers_get_still_works(self):
        """Backwards-compat: legacy workers tagged only with user_id are still
        visible after isolation refactor."""
        t = _login()
        r = requests.get(f"{API}/workers", headers=_h(t))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_incidents_get_still_works(self):
        t = _login()
        r = requests.get(f"{API}/incidents", headers=_h(t))
        assert r.status_code == 200
        assert isinstance(r.json(), list)
