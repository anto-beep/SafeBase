"""Iteration 9 — Stripe Billing, Outbound Webhooks, PWA (backend slice).

Covers:
- Stripe billing: GET /api/billing/tiers, POST /api/billing/checkout, GET status/<sid>,
  GET my-subscription, invalid tier/missing origin 400.
- Webhooks: GET events, POST subscriptions (+ validation), test delivery, PATCH toggle,
  DELETE, GET deliveries, and end-to-end integration via POST /api/workers firing
  'worker.added' which should record a delivery.
- PWA: /manifest.json served & valid JSON with required fields.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


# ---------------------- Fixtures ----------------------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_session(session, auth_token):
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return session


# ---------------------- STRIPE BILLING ----------------------
class TestBillingTiers:
    def test_tiers_public(self, session):
        r = requests.get(f"{BASE_URL}/api/billing/tiers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # 4 industries: trades+retail share 8 slugs, hospitality has 8, transport has 8, healthcare has 8 = 32
        assert len(data) == 32
        slugs = {t["slug"] for t in data}
        expected = {
            "sole_trader_monthly", "small_business_monthly", "growing_business_monthly", "enterprise_monthly",
            "sole_trader_annual", "small_business_annual", "growing_business_annual", "enterprise_annual",
        }
        assert expected.issubset(slugs)  # trades+retail share these 8 — hospitality/transport/healthcare add 24 more
        for t in data:
            assert "amount" in t and "currency" in t and "cycle" in t
            assert t["currency"] == "aud"
            assert t["cycle"] in ("monthly", "annual")
            assert isinstance(t["amount"], (int, float))


class TestBillingCheckout:
    def test_checkout_invalid_tier(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/billing/checkout", json={"tier_slug": "bogus", "origin_url": BASE_URL})
        assert r.status_code == 400

    def test_checkout_missing_origin(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/billing/checkout", json={"tier_slug": "small_business_monthly"})
        assert r.status_code == 400

    def test_checkout_success(self, auth_session):
        r = auth_session.post(
            f"{BASE_URL}/api/billing/checkout",
            json={"tier_slug": "small_business_monthly", "origin_url": BASE_URL},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        pytest.session_id = data["session_id"]

    def test_status_for_created_session(self, auth_session):
        sid = getattr(pytest, "session_id", None)
        if not sid:
            pytest.skip("checkout did not create a session id")
        r = auth_session.get(f"{BASE_URL}/api/billing/status/{sid}")
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == sid
        assert data["payment_status"] in ("unpaid", "no_payment_required", "paid", "initiated")

    def test_my_subscription_shape(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/billing/my-subscription")
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "recent_transactions" in data
        assert isinstance(data["recent_transactions"], list)


# ---------------------- WEBHOOKS ----------------------
class TestWebhooks:
    def test_events_catalog(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/webhooks/events")
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        assert len(events) == 11, f"expected 11 events got {len(events)}: {events}"
        for must in ("document.generated", "incident.closed", "worker.added"):
            assert must in events

    def test_create_sub_invalid_url(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/webhooks/subscriptions", json={
            "target_url": "not-a-url", "events": ["worker.added"], "label": "bad"
        })
        assert r.status_code == 400

    def test_create_sub_invalid_event(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/webhooks/subscriptions", json={
            "target_url": "https://httpbin.org/post", "events": ["not.real"], "label": "x"
        })
        assert r.status_code == 400

    def test_full_sub_lifecycle_and_test_delivery(self, auth_session):
        # Create
        r = auth_session.post(f"{BASE_URL}/api/webhooks/subscriptions", json={
            "target_url": "https://httpbin.org/post",
            "label": "TEST_iter9",
            "events": ["worker.added", "incident.closed"],
        })
        assert r.status_code == 200, r.text
        sub = r.json()
        assert "subscription_id" in sub and "secret" in sub
        sid = sub["subscription_id"]
        pytest.sub_id = sid

        # Test POST
        r = auth_session.post(f"{BASE_URL}/api/webhooks/test/{sid}")
        assert r.status_code == 200, r.text
        delivery = r.json()
        assert delivery["status_code"] == 200
        assert delivery["success"] is True

        # PATCH toggle
        r = auth_session.patch(f"{BASE_URL}/api/webhooks/subscriptions/{sid}", json={"enabled": False})
        assert r.status_code == 200
        assert r.json()["enabled"] is False
        # re-enable for integration test
        r = auth_session.patch(f"{BASE_URL}/api/webhooks/subscriptions/{sid}", json={"enabled": True})
        assert r.status_code == 200 and r.json()["enabled"] is True

        # Deliveries list contains our test delivery
        r = auth_session.get(f"{BASE_URL}/api/webhooks/deliveries")
        assert r.status_code == 200
        rows = r.json()
        assert any(d.get("subscription_id") == sid for d in rows)

    def test_integration_worker_added_triggers_delivery(self, auth_session):
        sid = getattr(pytest, "sub_id", None)
        if not sid:
            pytest.skip("no sub id")
        # Create a worker -> should fire 'worker.added'
        payload = {
            "name": "TEST_Iter9 Worker",
            "email": f"test_iter9_{int(time.time())}@example.com",
            "role": "Labourer",
            "phone": "0400000000",
        }
        r = auth_session.post(f"{BASE_URL}/api/workers", json=payload)
        assert r.status_code in (200, 201), r.text
        worker = r.json()
        worker_id = worker.get("worker_id") or worker.get("id")

        # Wait a moment for async delivery
        found = False
        for _ in range(6):
            time.sleep(1)
            r = auth_session.get(f"{BASE_URL}/api/webhooks/deliveries")
            rows = r.json()
            for d in rows:
                if d.get("event") == "worker.added" and d.get("subscription_id") == sid:
                    found = True
                    assert d.get("success") is True, d
                    break
            if found:
                break
        assert found, "worker.added delivery was never recorded"

        # cleanup: delete worker if we got its id
        if worker_id:
            auth_session.delete(f"{BASE_URL}/api/workers/{worker_id}")

    def test_delete_subscription(self, auth_session):
        sid = getattr(pytest, "sub_id", None)
        if not sid:
            pytest.skip("no sub id")
        r = auth_session.delete(f"{BASE_URL}/api/webhooks/subscriptions/{sid}")
        assert r.status_code == 200
        assert r.json().get("deleted", 0) == 1


# ---------------------- PWA ----------------------
class TestPWA:
    def test_manifest_served(self):
        r = requests.get(f"{BASE_URL}/manifest.json")
        assert r.status_code == 200
        data = r.json()
        for key in ("name", "short_name", "icons", "start_url"):
            assert key in data
        assert data["start_url"] == "/worker"
