"""Iter 11 — Automations Analytics + test-all batch endpoint."""
import os
import re
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def cleanup_ids():
    ids = []
    yield ids
    # teardown handled per-test where possible


# ---------- Analytics summary ----------
class TestAnalyticsSummary:
    def test_summary_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/automations/analytics/summary", headers=auth_headers, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ["total_runs_30d", "success_count", "failure_count", "success_rate",
                    "active_rules", "total_rules", "daily", "top_rules", "slowest"]:
            assert key in d, f"missing {key}"
        assert isinstance(d["daily"], list)
        assert isinstance(d["top_rules"], list)

    def test_daily_exactly_30(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/automations/analytics/summary", headers=auth_headers, timeout=10)
        d = r.json()
        assert len(d["daily"]) == 30, f"expected 30 buckets got {len(d['daily'])}"
        # Each item shape
        for item in d["daily"]:
            assert set(item.keys()) >= {"date", "success", "fail"}
            assert re.match(r"^\d{4}-\d{2}-\d{2}$", item["date"])
        # Last == today, first == 29 days ago
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        first_expected = (datetime.now(timezone.utc) - timedelta(days=29)).strftime("%Y-%m-%d")
        assert d["daily"][-1]["date"] == today
        assert d["daily"][0]["date"] == first_expected

    def test_success_rate_math(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/automations/analytics/summary", headers=auth_headers, timeout=10)
        d = r.json()
        total = d["total_runs_30d"]
        sc = d["success_count"]
        fc = d["failure_count"]
        assert sc + fc == total
        if total == 0:
            assert d["success_rate"] == 0
        else:
            assert d["success_rate"] == round((sc / total) * 100)

    def test_slowest_consistent(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/automations/analytics/summary", headers=auth_headers, timeout=10)
        d = r.json()
        s = d["slowest"]
        if s is None:
            return
        for k in ("automation_id", "label", "avg_ms", "runs"):
            assert k in s
        assert s["avg_ms"] >= 0
        assert s["runs"] >= 1


# ---------- duration_ms recorded on every run ----------
class TestDurationRecorded:
    def test_duration_ms_present_on_run(self, auth_headers):
        # Create a fresh slack automation pointed at httpbin
        body = {
            "label": "TEST_iter11_dur",
            "action": "slack",
            "event": "worker.added",
            "enabled": True,
            "config": {"webhook_url": "https://httpbin.org/post"},
        }
        cr = requests.post(f"{BASE_URL}/api/automations", json=body, headers=auth_headers, timeout=10)
        assert cr.status_code == 200, cr.text
        aid = cr.json()["automation_id"]
        try:
            tr = requests.post(f"{BASE_URL}/api/automations/{aid}/test", headers=auth_headers, timeout=20)
            assert tr.status_code == 200, tr.text
            d = tr.json()
            assert "duration_ms" in d
            assert isinstance(d["duration_ms"], int)
            assert d["duration_ms"] > 0
            # Verify persisted in runs collection
            time.sleep(0.5)
            runs = requests.get(f"{BASE_URL}/api/automations/{aid}/runs", headers=auth_headers, timeout=10).json()
            assert len(runs) >= 1
            assert all("duration_ms" in r for r in runs)
            assert runs[0]["duration_ms"] > 0
        finally:
            requests.delete(f"{BASE_URL}/api/automations/{aid}", headers=auth_headers, timeout=10)


# ---------- test-all endpoint ----------
class TestTestAll:
    def test_test_all_no_enabled_returns_empty_not_error(self, auth_headers):
        # First disable/delete any TEST_ automations to be safe (best-effort)
        existing = requests.get(f"{BASE_URL}/api/automations", headers=auth_headers, timeout=10).json()
        # Disable TEST_iter11 ones we may have left around
        for a in existing:
            if a.get("label", "").startswith("TEST_iter11") and a.get("enabled"):
                requests.patch(
                    f"{BASE_URL}/api/automations/{a['automation_id']}",
                    json={"enabled": False}, headers=auth_headers, timeout=10
                )
        # If user genuinely has no enabled rules at all, expect empty
        all_rules = requests.get(f"{BASE_URL}/api/automations", headers=auth_headers, timeout=10).json()
        if not any(r.get("enabled") for r in all_rules):
            r = requests.post(f"{BASE_URL}/api/automations/test-all", headers=auth_headers, timeout=20)
            assert r.status_code == 200
            d = r.json()
            assert d == {"total": 0, "success": 0, "failed": 0, "results": []}

    def test_test_all_mixed_success_and_failure(self, auth_headers):
        # Create 2 enabled slack automations: one good, one bad
        good = requests.post(f"{BASE_URL}/api/automations", json={
            "label": "TEST_iter11_ta_good", "action": "slack", "event": "worker.added",
            "enabled": True, "config": {"webhook_url": "https://httpbin.org/post"},
        }, headers=auth_headers, timeout=10).json()
        bad = requests.post(f"{BASE_URL}/api/automations", json={
            "label": "TEST_iter11_ta_bad", "action": "slack", "event": "worker.added",
            "enabled": True, "config": {"webhook_url": "https://this-domain-does-not-exist-zzz-iter11.invalid/x"},
        }, headers=auth_headers, timeout=10).json()
        gid, bid = good["automation_id"], bad["automation_id"]

        # Disable any other enabled rules to isolate results
        all_rules = requests.get(f"{BASE_URL}/api/automations", headers=auth_headers, timeout=10).json()
        toggled_off = []
        for a in all_rules:
            if a["automation_id"] in (gid, bid):
                continue
            if a.get("enabled"):
                requests.patch(f"{BASE_URL}/api/automations/{a['automation_id']}",
                               json={"enabled": False}, headers=auth_headers, timeout=10)
                toggled_off.append(a["automation_id"])

        try:
            r = requests.post(f"{BASE_URL}/api/automations/test-all", headers=auth_headers, timeout=60)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["total"] == 2, d
            assert d["success"] == 1, d
            assert d["failed"] == 1, d
            assert len(d["results"]) == 2

            # run_count incremented on both
            time.sleep(0.5)
            g_after = requests.get(f"{BASE_URL}/api/automations", headers=auth_headers, timeout=10).json()
            g_doc = next(x for x in g_after if x["automation_id"] == gid)
            b_doc = next(x for x in g_after if x["automation_id"] == bid)
            assert g_doc["run_count"] >= 1
            assert b_doc["run_count"] >= 1
        finally:
            requests.delete(f"{BASE_URL}/api/automations/{gid}", headers=auth_headers, timeout=10)
            requests.delete(f"{BASE_URL}/api/automations/{bid}", headers=auth_headers, timeout=10)
            for aid in toggled_off:
                requests.patch(f"{BASE_URL}/api/automations/{aid}",
                               json={"enabled": True}, headers=auth_headers, timeout=10)


# ---------- regression on iter 10 ----------
class TestRegression:
    def test_recipes_still_serve_six(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/automations/recipes", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert len(r.json()) == 6

    def test_webhooks_endpoint_unaffected(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/webhooks/subscriptions", headers=auth_headers, timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
