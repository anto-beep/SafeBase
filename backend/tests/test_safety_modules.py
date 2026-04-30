"""Backend tests for Batch (b) Core Safety Modules + regression on auth/dashboard.

Covers:
  - GET /api/safety/summary returns 7 module keys (route-ordering bug fix verification)
  - CRUD on all 6 sidebar modules (toolbox_talks, plant, substances, inspections, risks, first_aid) + ppe
  - Risk register inherent_score/inherent_level auto-compute
  - Plant *_days auto-compute
  - 404 on unknown module
  - 401/403 without bearer token
  - Regression: /api/auth/login, /api/business/profile, /api/notifications, /api/onboarding
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "owner@safetradie.demo"
DEMO_PASSWORD = "Demo@1234"

ALL_MODULES = ["toolbox_talks", "plant", "substances", "inspections", "risks", "first_aid", "ppe"]


# ---------- fixtures ----------

@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    # Try login with demo
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if r.status_code == 200 and r.json().get("token"):
        return r.json()["token"]
    # Fallback: register a fresh user
    email = f"safety_test_{uuid.uuid4().hex[:8]}@safetradie.demo"
    body = {
        "email": email, "password": "Demo@1234", "name": "Safety Test",
        "business_name": "Safety Co", "trade": "Carpenter", "state": "NSW", "workers": 5,
    }
    r2 = session.post(f"{API}/auth/register", json=body)
    assert r2.status_code in (200, 201), f"register failed: {r2.status_code} {r2.text}"
    return r2.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------- Auth guard ----------

class TestAuthGuard:
    """All /api/safety/* must require auth."""

    @pytest.mark.parametrize("path", [
        "/safety/summary", "/safety/toolbox_talks", "/safety/plant",
        "/safety/substances", "/safety/inspections", "/safety/risks",
        "/safety/first_aid", "/safety/ppe",
    ])
    def test_no_token_rejected(self, session, path):
        r = requests.get(f"{API}{path}")
        assert r.status_code in (401, 403), f"{path} returned {r.status_code}, expected 401/403"


# ---------- Summary endpoint (route-ordering fix) ----------

class TestSafetySummary:
    def test_summary_returns_all_7_keys(self, session, auth_headers):
        r = session.get(f"{API}/safety/summary", headers=auth_headers)
        assert r.status_code == 200, f"summary failed: {r.status_code} {r.text}"
        data = r.json()
        for m in ALL_MODULES:
            assert m in data, f"missing module key '{m}' in summary response: {data}"
            assert isinstance(data[m], int), f"summary[{m}] must be int, got {type(data[m])}"

    def test_unknown_module_returns_404(self, session, auth_headers):
        r = session.get(f"{API}/safety/badmodulename", headers=auth_headers)
        assert r.status_code == 404
        body = r.json()
        # Detail string should mention "Unknown safety module"
        assert "Unknown safety module" in str(body), f"unexpected error body: {body}"


# ---------- CRUD across all modules ----------

MODULE_PAYLOADS = {
    "toolbox_talks": {"title": "TEST_Toolbox 1", "topic": "Working at heights", "presenter": "John"},
    "plant": {
        "name": "TEST_Excavator A", "asset_id": "EX-01", "category": "Earthmoving",
        "next_inspection": (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat(),
        "next_service": (datetime.now(timezone.utc) + timedelta(days=60)).date().isoformat(),
        "rego_expiry": (datetime.now(timezone.utc) + timedelta(days=90)).date().isoformat(),
    },
    "substances": {"name": "TEST_Acetone", "manufacturer": "ACME", "ghs_class": "Flammable"},
    "inspections": {"title": "TEST_Site Walk", "site": "Site A", "frequency": "weekly"},
    "risks": {
        "title": "TEST_Working at heights", "category": "Height",
        "likelihood": 4, "consequence": 5,  # score 20 -> extreme
        "residual_likelihood": 2, "residual_consequence": 2,  # score 4 -> low
    },
    "first_aid": {"name": "TEST_First Aid Kit A", "location": "Workshop", "kit_type": "B"},
    "ppe": {"name": "TEST_Safety Boots", "category": "Footwear", "stock": 12},
}


@pytest.fixture(scope="class")
def created_ids():
    return {}


class TestSafetyCRUD:
    """Full CRUD lifecycle against each module."""

    @pytest.mark.parametrize("module", ALL_MODULES)
    def test_create(self, session, auth_headers, module, created_ids):
        payload = MODULE_PAYLOADS[module]
        r = session.post(f"{API}/safety/{module}", headers=auth_headers, json=payload)
        assert r.status_code in (200, 201), f"[{module}] create failed: {r.status_code} {r.text}"
        data = r.json()
        assert "item_id" in data, f"[{module}] no item_id in response"
        for k, v in payload.items():
            assert data.get(k) == v, f"[{module}] field {k}: expected {v}, got {data.get(k)}"
        created_ids[module] = data["item_id"]

    def test_risks_inherent_compute(self, session, auth_headers, created_ids):
        # likelihood 4 * consequence 5 = 20 -> extreme
        rid = created_ids.get("risks")
        assert rid, "risks create must run before this"
        r = session.get(f"{API}/safety/risks", headers=auth_headers)
        assert r.status_code == 200
        rows = [x for x in r.json() if x["item_id"] == rid]
        assert rows, "created risk not found in GET"
        risk = rows[0]
        assert risk.get("inherent_score") == 20
        assert risk.get("inherent_level") == "extreme"
        # residual 2*2=4 -> low
        assert risk.get("residual_score") == 4
        assert risk.get("residual_level") == "low"

    @pytest.mark.parametrize("score,expected", [
        (1 * 1, "low"), (2 * 2, "low"), (3 * 3, "medium"), (3 * 5, "high"), (4 * 5, "extreme"),
    ])
    def test_risks_level_thresholds(self, session, auth_headers, score, expected, created_ids):
        # craft likelihood/consequence to reach `score`
        # use likelihood=score, consequence=1 when possible, else split
        if score <= 5:
            l, c = score, 1
        elif score == 9:
            l, c = 3, 3
        elif score == 15:
            l, c = 3, 5
        else:
            l, c = 4, 5
        body = {"title": f"TEST_Threshold_{score}", "category": "Other", "likelihood": l, "consequence": c}
        r = session.post(f"{API}/safety/risks", headers=auth_headers, json=body)
        assert r.status_code in (200, 201)
        data = r.json()
        assert data.get("inherent_score") == l * c
        assert data.get("inherent_level") == expected
        # cleanup
        session.delete(f"{API}/safety/risks/{data['item_id']}", headers=auth_headers)

    def test_plant_days_compute(self, session, auth_headers, created_ids):
        pid = created_ids.get("plant")
        assert pid
        r = session.get(f"{API}/safety/plant", headers=auth_headers)
        assert r.status_code == 200
        rows = [x for x in r.json() if x["item_id"] == pid]
        assert rows, "created plant not found"
        plant = rows[0]
        # date fields converted to *_days, allow ±2 days slop
        for key, expected in [("next_inspection_days", 30), ("next_service_days", 60), ("rego_expiry_days", 90)]:
            assert key in plant, f"missing {key}: {plant}"
            assert abs(plant[key] - expected) <= 2, f"{key}: {plant[key]} not near {expected}"

    @pytest.mark.parametrize("module", ALL_MODULES)
    def test_list_contains_created(self, session, auth_headers, module, created_ids):
        r = session.get(f"{API}/safety/{module}", headers=auth_headers)
        assert r.status_code == 200
        ids = [x["item_id"] for x in r.json()]
        assert created_ids[module] in ids, f"[{module}] created item not in list"
        # _id (mongo) must NOT leak
        for row in r.json():
            assert "_id" not in row, f"[{module}] mongo _id leaked"

    @pytest.mark.parametrize("module", ALL_MODULES)
    def test_patch(self, session, auth_headers, module, created_ids):
        iid = created_ids[module]
        r = session.patch(f"{API}/safety/{module}/{iid}", headers=auth_headers,
                          json={"notes": "TEST_updated"})
        assert r.status_code in (200, 204), f"[{module}] patch: {r.status_code} {r.text}"
        if r.status_code == 200:
            assert r.json().get("notes") == "TEST_updated"

    def test_summary_reflects_creates(self, session, auth_headers, created_ids):
        r = session.get(f"{API}/safety/summary", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        for m in ALL_MODULES:
            # at least 1 since we just created one
            assert data[m] >= 1, f"summary[{m}]={data[m]} expected >=1"

    @pytest.mark.parametrize("module", ALL_MODULES)
    def test_delete(self, session, auth_headers, module, created_ids):
        iid = created_ids[module]
        r = session.delete(f"{API}/safety/{module}/{iid}", headers=auth_headers)
        assert r.status_code in (200, 204), f"[{module}] delete: {r.status_code} {r.text}"
        # verify removed
        r2 = session.get(f"{API}/safety/{module}", headers=auth_headers)
        ids = [x["item_id"] for x in r2.json()]
        assert iid not in ids, f"[{module}] deleted item still present"


# ---------- Regression on previously completed flows ----------

class TestRegression:
    def test_auth_me(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("email")

    def test_business_profile(self, session, auth_headers):
        r = session.get(f"{API}/business/profile", headers=auth_headers)
        assert r.status_code in (200, 404)  # 404 ok if not yet saved

    def test_notifications(self, session, auth_headers):
        r = session.get(f"{API}/notifications", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_onboarding_state(self, session, auth_headers):
        r = session.get(f"{API}/onboarding", headers=auth_headers)
        assert r.status_code == 200

    def test_documents_list(self, session, auth_headers):
        r = session.get(f"{API}/documents", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_workers_list(self, session, auth_headers):
        r = session.get(f"{API}/workers", headers=auth_headers)
        assert r.status_code == 200

    def test_incidents_list(self, session, auth_headers):
        r = session.get(f"{API}/incidents", headers=auth_headers)
        assert r.status_code == 200

    def test_licences_list(self, session, auth_headers):
        r = session.get(f"{API}/licences", headers=auth_headers)
        assert r.status_code == 200
