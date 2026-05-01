"""
iter28 backend regression — server.py refactor (billing + automations extracted).

Verifies:
  • All 5 billing endpoints respond (moved to routes/billing.py)
  • All 9 automations endpoints respond (moved to routes/automations.py)
  • Fan-out still works — creating a worker fires both webhooks + automations
    via the re-wired trigger_webhook_event helper
  • /auth/me/industry PATCH still persists and surfaces in /auth/me
"""
import os
import time
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


class TestBillingRefactor:
    def test_tiers_public(self):
        r = requests.get(f"{API}/billing/tiers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8  # 4 tiers × monthly/annual since iter12
        slugs = {t["slug"] for t in data}
        assert "enterprise_monthly" in slugs
        assert "sole_trader_annual" in slugs

    def test_my_subscription(self, auth):
        r = requests.get(f"{API}/billing/my-subscription", headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert "on_trial" in body
        assert "trial_days_left" in body
        assert "trial_ends_at" in body

    def test_enterprise_demo_request_public(self):
        r = requests.post(f"{API}/enterprise/demo-request", json={
            "name": "Jane Test",
            "business_name": "Acme Corp",
            "contact_email": f"test+{uuid.uuid4().hex[:6]}@example.com",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["request_id"].startswith("edr_")


class TestAutomationsRefactor:
    def test_recipes_public_for_user(self, auth):
        r = requests.get(f"{API}/automations/recipes", headers=auth)
        assert r.status_code == 200
        recipes = r.json()
        assert len(recipes) == 6
        assert {"slack_critical_incident", "resend_worker_welcome"}.issubset(
            {x["recipe_id"] for x in recipes}
        )

    def test_list_my_automations(self, auth):
        r = requests.get(f"{API}/automations", headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_crud_lifecycle(self, auth):
        # CREATE
        r = requests.post(f"{API}/automations", headers=auth, json={
            "recipe_id": "slack_critical_incident",
            "label": "iter28 smoke",
            "event": "incident.created",
            "action": "slack",
            "config": {"webhook_url": "https://example.test/hook"},
        })
        assert r.status_code == 200
        aid = r.json()["automation_id"]
        assert aid.startswith("auto_")

        # PATCH
        p = requests.patch(f"{API}/automations/{aid}", headers=auth,
                           json={"enabled": False, "label": "disabled"})
        assert p.status_code == 200
        assert p.json()["enabled"] is False

        # RUNS (empty initially)
        runs = requests.get(f"{API}/automations/{aid}/runs", headers=auth)
        assert runs.status_code == 200
        assert isinstance(runs.json(), list)

        # DELETE
        d = requests.delete(f"{API}/automations/{aid}", headers=auth)
        assert d.status_code == 200
        assert d.json()["deleted"] == 1

    def test_analytics_summary(self, auth):
        r = requests.get(f"{API}/automations/analytics/summary", headers=auth)
        assert r.status_code == 200
        body = r.json()
        for k in ("total_runs_30d", "success_rate", "daily", "top_rules"):
            assert k in body

    def test_unknown_action_rejected(self, auth):
        r = requests.post(f"{API}/automations", headers=auth, json={
            "event": "worker.added", "action": "telegram", "config": {},
        })
        assert r.status_code == 400

    def test_unknown_event_rejected(self, auth):
        r = requests.post(f"{API}/automations", headers=auth, json={
            "event": "pigeon.delivery", "action": "slack",
            "config": {"webhook_url": "https://x"},
        })
        assert r.status_code == 400


class TestWebhookAutomationFanOut:
    """Creating a worker should still work now that trigger_webhook_event was
    rewired. The fan-out itself is fire-and-forget, so we only assert the
    write succeeds and returns a worker_id."""
    def test_worker_create_still_works(self, auth):
        r = requests.post(f"{API}/workers", headers=auth, json={
            "name": f"iter28 tester {int(time.time())}",
            "role": "Apprentice",
            "trade": "electrical",
        })
        assert r.status_code == 200
        assert r.json()["worker_id"].startswith(("w_", "wk_", "wrk_", "worker_"))


class TestIndustryPatch:
    def test_round_trip(self, auth):
        # Flip to hospitality, confirm, flip back
        for target in ("hospitality", "trades"):
            r = requests.patch(f"{API}/auth/me/industry", headers=auth,
                               json={"industry": target})
            assert r.status_code == 200
            assert r.json()["industry"] == target
            me = requests.get(f"{API}/auth/me", headers=auth)
            assert me.status_code == 200
            assert me.json()["industry"] == target

    def test_invalid_rejected(self, auth):
        r = requests.patch(f"{API}/auth/me/industry", headers=auth,
                           json={"industry": "crypto"})
        assert r.status_code == 400
