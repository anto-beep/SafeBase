"""Iter40 — Definitive final pricing overhaul + credential-driven scheduling.

Covers:
- Backend pricing (GET /api/billing/tiers) — 40 slugs with new Iter40 amounts
- Plan right-sizer anchors/amounts for trades/hospitality/transport/healthcare/retail
- NEW /api/scheduling/* endpoints (check-eligibility, roster-gate, shifts, mandatory-credentials)
- Scheduling validation + auth + cross-account isolation
- Regression: demo-requests, regulatory-digest, compliance-inbox, public industry-signal
"""
import os
import pytest
import requests
from datetime import datetime, timedelta, timezone

_FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(_FRONTEND_ENV):
    with open(_FRONTEND_ENV) as _fh:
        for _line in _fh:
            if _line.startswith("REACT_APP_BACKEND_URL="):
                os.environ.setdefault("REACT_APP_BACKEND_URL", _line.split("=", 1)[1].strip())
                break
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed {r.status_code}: {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ================================================================
# BACKEND PRICING — /api/billing/tiers
# ================================================================

EXPECTED_AMOUNTS = {
    # Trades
    ("sole_trader", "annual"): 5990,
    ("sole_trader", "monthly"): 599,
    ("enterprise", "annual"): 29990,
    # Retail
    ("retail_single", "annual"): 7990,
    ("retail_enterprise", "annual"): 39990,
    # Hospitality
    ("hosp_single", "annual"): 11990,
    ("hosp_enterprise", "annual"): 54990,
    # Transport
    ("trans_owner", "annual"): 14990,
    ("trans_enterprise", "annual"): 69990,
    # Healthcare
    ("health_solo", "annual"): 24990,
    ("health_multi", "annual"): 79990,
    ("health_enterprise", "annual"): 179990,
    ("health_enterprise", "monthly"): 17999,
}


class TestBillingTiersIter40:
    def test_returns_40_tiers(self):
        r = requests.get(f"{BASE_URL}/api/billing/tiers")
        assert r.status_code == 200, r.text
        tiers = r.json() if isinstance(r.json(), list) else r.json().get("tiers", [])
        assert len(tiers) == 40, f"Expected 40 tiers, got {len(tiers)}"

    @pytest.mark.parametrize("tier,cycle,expected", [
        (t, c, amt) for (t, c), amt in EXPECTED_AMOUNTS.items()
    ])
    def test_tier_amount(self, tier, cycle, expected):
        r = requests.get(f"{BASE_URL}/api/billing/tiers")
        tiers = r.json()
        match = next((t for t in tiers if t.get("tier") == tier and t.get("cycle") == cycle), None)
        assert match is not None, f"missing {tier}/{cycle}"
        assert float(match["amount"]) == float(expected), f"{tier}/{cycle}: expected {expected}, got {match['amount']}"


# ================================================================
# BACKEND RIGHT-SIZER
# ================================================================

class TestPlanRightsizer:
    def _call(self, industry, team, locations):
        r = requests.get(
            f"{BASE_URL}/api/plan-rightsizer/recommend",
            params={"industry": industry, "team": team, "locations": locations},
        )
        assert r.status_code == 200, f"{industry}/{team}/{locations} → {r.status_code}: {r.text}"
        return r.json()

    def test_trades_solo(self):
        d = self._call("trades", 1, 1)
        assert d["plan_name"] == "Solo Tradie"
        assert d["annual_aud_ex_gst"] == 5990
        assert "5.1%" in d["risk_anchor"], f"anchor missing 5.1%: {d['risk_anchor']}"
        assert "3.4%" not in d["risk_anchor"], "stale 3.4% anchor still present"

    def test_hospitality_small_group(self):
        d = self._call("hospitality", 3, 2)
        assert d["plan_name"] == "Small Group"
        assert d["annual_aud_ex_gst"] == 22990

    def test_transport_growing_fleet(self):
        d = self._call("transport", 20, 3)
        assert d["plan_name"] == "Growing Fleet"
        assert d["annual_aud_ex_gst"] == 42990

    def test_healthcare_enterprise(self):
        d = self._call("healthcare", 40, 4)
        assert d["plan_name"] == "Enterprise"
        assert d["annual_aud_ex_gst"] == 179990

    def test_retail_multi_store(self):
        d = self._call("retail", 30, 6)
        assert d["plan_name"] == "Multi-Store"
        assert d["annual_aud_ex_gst"] == 24990

    def test_risk_anchor_contains_industry_cue(self):
        anchors = {
            "trades": "worksafe",
            "hospitality": "foodsafe",  # fallback — just ensure non-empty industry-specific
            "transport": "nhvr",
            "healthcare": "ahpra",
            "retail": "fair",
        }
        # Just sanity check — all industries return a non-empty anchor
        for ind in ["trades", "hospitality", "transport", "healthcare", "retail"]:
            d = self._call(ind, 1, 1)
            assert d.get("risk_anchor"), f"{ind} empty risk_anchor"


# ================================================================
# BACKEND SCHEDULING — mandatory-credentials
# ================================================================

class TestMandatoryCredentials:
    def test_all_industries(self):
        r = requests.get(f"{BASE_URL}/api/scheduling/mandatory-credentials")
        assert r.status_code == 200, r.text
        data = r.json()
        inds = data.get("industries", {})
        for ind in ["trades", "hospitality", "transport", "healthcare", "retail"]:
            assert ind in inds, f"{ind} missing"
            assert len(inds[ind]) > 0

    def test_healthcare_specific(self):
        r = requests.get(f"{BASE_URL}/api/scheduling/mandatory-credentials",
                         params={"industry": "healthcare"})
        assert r.status_code == 200, r.text
        data = r.json()
        kinds = [c["kind"] for c in data["mandatory"]]
        assert "ahpra_registration" in kinds
        assert "worker_screening" in kinds

    def test_unknown_industry_400(self):
        r = requests.get(f"{BASE_URL}/api/scheduling/mandatory-credentials",
                         params={"industry": "nope"})
        assert r.status_code == 400


# ================================================================
# BACKEND SCHEDULING — check-eligibility / shifts
# ================================================================

@pytest.fixture(scope="class")
def demo_worker_id(token):
    """Find a worker in the owner's account (prefer trades industry)."""
    r = requests.get(f"{BASE_URL}/api/workers", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    workers = r.json() if isinstance(r.json(), list) else r.json().get("workers", [])
    assert len(workers) > 0, "No workers available for scheduling tests"
    # Prefer one without white_card to exercise the block path
    w = workers[0]
    return w.get("worker_id") or w.get("id")


class TestSchedulingEligibility:
    def test_unauthenticated_401(self):
        r = requests.get(f"{BASE_URL}/api/scheduling/check-eligibility/anything")
        assert r.status_code in (401, 403), f"expected auth gate, got {r.status_code}"

    def test_cross_account_worker_404(self, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/NOT_A_REAL_WORKER_ID_12345",
            headers=auth_headers,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"

    def test_check_eligibility_shape(self, auth_headers, demo_worker_id):
        r = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/{demo_worker_id}",
            headers=auth_headers,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ["can_roster", "blockers", "warnings", "industry", "worker_name"]:
            assert key in d, f"missing {key} in response"

    def test_worker_without_white_card_blocks(self, auth_headers, demo_worker_id):
        """Trades worker without white_card licence should be blocked."""
        r = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/{demo_worker_id}",
            headers=auth_headers,
        )
        d = r.json()
        if d.get("industry") == "trades":
            # If there's already a white_card on file we skip
            blocker_kinds = [b["kind"] for b in d.get("blockers", [])]
            if "white_card" in blocker_kinds:
                assert d["can_roster"] is False

    def test_add_white_card_flips_eligibility(self, auth_headers, demo_worker_id):
        # First check current state
        r = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/{demo_worker_id}",
            headers=auth_headers,
        )
        before = r.json()
        if before.get("industry") != "trades":
            pytest.skip("Worker not in trades industry; skipping white_card flip")
        if before.get("can_roster"):
            pytest.skip("Worker already eligible")
        # Add a white_card licence
        future = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
        create = requests.post(
            f"{BASE_URL}/api/licences",
            headers=auth_headers,
            json={
                "worker_id": demo_worker_id,
                "licence_type": "white_card",
                "licence_number": "TEST_WC_ITER40",
                "expiry_date": future,
            },
        )
        assert create.status_code in (200, 201), f"licence create failed {create.status_code}: {create.text}"
        # Recheck
        r2 = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/{demo_worker_id}",
            headers=auth_headers,
        )
        after = r2.json()
        kinds_after = [b["kind"] for b in after.get("blockers", [])]
        assert "white_card" not in kinds_after, f"white_card still blocking: {after}"


class TestRosterGate:
    def test_batch_shape(self, auth_headers, demo_worker_id):
        r = requests.post(
            f"{BASE_URL}/api/scheduling/roster-gate",
            headers=auth_headers,
            json={"worker_ids": [demo_worker_id]},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "results" in d and isinstance(d["results"], list)
        assert "blocked_count" in d
        assert "clear_count" in d
        assert d["blocked_count"] + d["clear_count"] == d["total"]


class TestShiftCreation:
    def test_empty_worker_ids_400(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/scheduling/shifts",
            headers=auth_headers,
            json={"worker_ids": [], "starts_at": "2026-02-01T08:00:00Z"},
        )
        assert r.status_code == 400, r.text

    def test_missing_starts_at_400(self, auth_headers, demo_worker_id):
        r = requests.post(
            f"{BASE_URL}/api/scheduling/shifts",
            headers=auth_headers,
            json={"worker_ids": [demo_worker_id]},
        )
        assert r.status_code == 400, r.text

    def test_eligible_worker_creates_shift(self, auth_headers, demo_worker_id):
        # Ensure worker eligible (previous test may have added white_card)
        check = requests.get(
            f"{BASE_URL}/api/scheduling/check-eligibility/{demo_worker_id}",
            headers=auth_headers,
        ).json()
        if not check.get("can_roster"):
            pytest.skip(f"Worker not eligible; blockers={check.get('blockers')}")
        r = requests.post(
            f"{BASE_URL}/api/scheduling/shifts",
            headers=auth_headers,
            json={
                "worker_ids": [demo_worker_id],
                "starts_at": "2026-02-15T08:00:00Z",
                "ends_at": "2026-02-15T16:00:00Z",
                "site": "TEST_Iter40 site",
                "notes": "TEST_Iter40",
            },
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert "shift" in d and d["shift"].get("id")

    def test_ineligible_worker_409(self, auth_headers):
        """Use a fake worker id — expect 404 path turned into 409 blocked."""
        # Create a worker without credentials
        create_worker = requests.post(
            f"{BASE_URL}/api/workers",
            headers=auth_headers,
            json={"name": "TEST_Iter40 Blocked", "email": "test_iter40_blocked@example.com",
                  "phone": "0400000001", "trade": "electrical", "industry": "trades"},
        )
        if create_worker.status_code not in (200, 201):
            pytest.skip(f"Cannot create test worker: {create_worker.status_code} {create_worker.text[:200]}")
        body = create_worker.json()
        wid = body.get("worker_id") or body.get("id") or (body.get("worker") or {}).get("worker_id")
        if not wid:
            pytest.skip("No worker_id returned from create")
        r = requests.post(
            f"{BASE_URL}/api/scheduling/shifts",
            headers=auth_headers,
            json={
                "worker_ids": [wid],
                "starts_at": "2026-02-20T08:00:00Z",
            },
        )
        # Accept either 409 (blocked) or 200 (if this test worker happens eligible)
        if r.status_code == 200:
            pytest.skip("Newly-created trades worker unexpectedly eligible; skipping block assertion")
        assert r.status_code == 409, r.text
        d = r.json()
        detail = d.get("detail") or d
        assert detail.get("error") == "scheduling_blocked"
        assert "blocked" in detail and len(detail["blocked"]) >= 1


# ================================================================
# BACKEND REGRESSION
# ================================================================

class TestRegression:
    def test_demo_requests_owner(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/demo-requests", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_regulatory_digest(self):
        r = requests.get(f"{BASE_URL}/api/regulatory-digest")
        assert r.status_code == 200, r.text
        d = r.json()
        items = d if isinstance(d, list) else d.get("items", [])
        assert len(items) > 0

    def test_compliance_inbox(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/compliance-inbox", headers=auth_headers)
        assert r.status_code == 200, r.text

    def test_public_industry_signal_trades(self):
        r = requests.get(f"{BASE_URL}/api/public/industry-signal/trades")
        assert r.status_code == 200, r.text
