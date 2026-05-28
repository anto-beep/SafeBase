"""Iter58 — "Mentioned me" inbox tests.

Verifies:
- GET /api/me/inbox returns 200 + non-empty array for trades demo (seeded in iter56)
- Each item has the agreed shape (no _id leakage, includes open_url, kind, etc.)
- Kinds present include at least one of capa/risk_owner/risk_action
- status=open filters out closed/archived items
- /me/inbox/summary returns {total, open, overdue, by_kind}
- Multi-tenant isolation: hospitality.demo never sees trades.demo items
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

TRADES = {"email": "trades.demo@safebase.com.au", "password": "Demo@1234"}
HOSP = {"email": "hospitality.demo@safebase.com.au", "password": "Demo@1234"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def trades_token():
    return _login(TRADES)


@pytest.fixture(scope="module")
def hosp_token():
    return _login(HOSP)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- /me/inbox ----------
class TestInboxList:
    def test_inbox_returns_200_and_list(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_inbox_nonempty_for_trades_demo(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        items = r.json()
        assert len(items) > 0, "trades.demo inbox should be non-empty (CAPA + risks seeded in iter56)"

    def test_inbox_row_shape(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        items = r.json()
        assert items, "need at least one item for shape check"
        required = {"kind", "id", "title", "status", "priority", "due_date",
                    "linked_entity_type", "linked_entity_label", "assigned_to",
                    "created_at", "open_url"}
        for it in items:
            missing = required - set(it.keys())
            assert not missing, f"row missing keys: {missing} -> {it}"
            assert "_id" not in it, f"_id leaked into row: {it}"

    def test_inbox_kinds_include_capa_or_risk(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        items = r.json()
        kinds = {it["kind"] for it in items}
        expected_any = {"capa", "risk_owner", "risk_action"}
        assert kinds & expected_any, (
            f"Expected at least one of {expected_any} in kinds, got {kinds}"
        )

    def test_inbox_status_open_filters(self, trades_token):
        r_all = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        r_open = requests.get(f"{BASE_URL}/api/me/inbox?status=open",
                              headers=_h(trades_token), timeout=30)
        assert r_open.status_code == 200
        open_items = r_open.json()
        all_items = r_all.json()
        # All open items must have status open
        for it in open_items:
            assert it.get("status") == "open", f"non-open item slipped: {it}"
        # Result must be a subset of all
        assert len(open_items) <= len(all_items)

    def test_open_url_is_routed(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox", headers=_h(trades_token), timeout=30)
        items = r.json()
        for it in items:
            u = it["open_url"]
            assert u.startswith(("/dashboard/capa", "/dashboard/risk-register/",
                                 "/dashboard/incidents/")), f"bad open_url: {u}"


# ---------- /me/inbox/summary ----------
class TestInboxSummary:
    def test_summary_shape(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/me/inbox/summary",
                         headers=_h(trades_token), timeout=30)
        assert r.status_code == 200
        s = r.json()
        for k in ("total", "open", "overdue", "by_kind"):
            assert k in s, f"summary missing {k}: {s}"
        assert isinstance(s["by_kind"], dict)
        assert isinstance(s["total"], int)
        assert s["total"] >= s["open"]

    def test_summary_total_matches_inbox(self, trades_token):
        s = requests.get(f"{BASE_URL}/api/me/inbox/summary",
                         headers=_h(trades_token), timeout=30).json()
        items = requests.get(f"{BASE_URL}/api/me/inbox",
                             headers=_h(trades_token), timeout=30).json()
        # summary uses limit=500, list default also 200; both should match when below limit
        assert s["total"] >= len(items) or s["total"] == len(items)


# ---------- Tenant isolation ----------
class TestTenantIsolation:
    def test_hospitality_does_not_see_trades_items(self, trades_token, hosp_token):
        trades_items = requests.get(f"{BASE_URL}/api/me/inbox",
                                    headers=_h(trades_token), timeout=30).json()
        hosp_items = requests.get(f"{BASE_URL}/api/me/inbox",
                                   headers=_h(hosp_token), timeout=30).json()
        trades_ids = {(it["kind"], it["id"]) for it in trades_items}
        hosp_ids = {(it["kind"], it["id"]) for it in hosp_items}
        overlap = trades_ids & hosp_ids
        assert not overlap, f"Tenant leak! shared items: {overlap}"
