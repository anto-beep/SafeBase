"""
Iter59 — Hazard Library API tests
Covers ITEM VIII backend requirements:
  - GET /api/hazard-library returns industry-locked 200 with categories grouped
  - 12+ hazards for trades
  - Cross-industry ?industry=hospitality returns 403 for trades user
  - GET /api/hazard-library/{code} returns the hazard detail
  - Regression: login + /api/me + /api/me/inbox still work
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TRADES = ("trades.demo@safebase.com.au", "Demo@1234")
HOSP = ("hospitality.demo@safebase.com.au", "Demo@1234")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"no token in login: {data}"
    return token


@pytest.fixture(scope="module")
def trades_token():
    return _login(*TRADES)


@pytest.fixture(scope="module")
def hosp_token():
    return _login(*HOSP)


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- HAZARD LIBRARY ----------

class TestHazardLibraryList:
    def test_industry_locked_trades(self, trades_token):
        r = requests.get(f"{API}/hazard-library", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["industry"] == "trades"
        assert data["total"] >= 12, f"Expected 12+ hazards for trades, got {data['total']}"
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        for cat in data["categories"]:
            assert "category" in cat and "hazards" in cat
            assert isinstance(cat["hazards"], list) and len(cat["hazards"]) >= 1

    def test_response_hazard_shape(self, trades_token):
        r = requests.get(f"{API}/hazard-library", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200
        haz = r.json()["hazards"][0]
        for k in ["code", "name", "category", "description", "typical_consequences", "typical_controls", "regulation"]:
            assert k in haz, f"Missing field {k} in hazard {haz}"

    def test_cross_industry_403(self, trades_token):
        r = requests.get(f"{API}/hazard-library?industry=hospitality", headers=_h(trades_token), timeout=20)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_same_industry_explicit_ok(self, trades_token):
        r = requests.get(f"{API}/hazard-library?industry=trades", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_hospitality_user_gets_hospitality(self, hosp_token):
        r = requests.get(f"{API}/hazard-library", headers=_h(hosp_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["industry"] == "hospitality"
        assert data["total"] >= 5

    def test_category_filter(self, trades_token):
        r = requests.get(f"{API}/hazard-library?category=Physical", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        for h in data["hazards"]:
            assert h["category"].lower() == "physical"


class TestHazardDetail:
    def test_get_known_hazard(self, trades_token):
        r = requests.get(f"{API}/hazard-library/fall_height", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["code"] == "fall_height"
        assert data["name"] == "Fall from height"
        assert "typical_controls" in data

    def test_get_unknown_hazard_404(self, trades_token):
        r = requests.get(f"{API}/hazard-library/this_does_not_exist", headers=_h(trades_token), timeout=20)
        assert r.status_code == 404

    def test_get_cross_industry_hazard_404(self, trades_token):
        # burns_steam is hospitality, trades user must NOT see it
        r = requests.get(f"{API}/hazard-library/burns_steam", headers=_h(trades_token), timeout=20)
        assert r.status_code == 404


# ---------- REGRESSION: core endpoints from iter56-58 ----------

class TestRegression:
    def test_me_endpoint(self, trades_token):
        r = requests.get(f"{API}/auth/me", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "email" in data or "user" in data or "id" in data

    def test_inbox_endpoint(self, trades_token):
        r = requests.get(f"{API}/me/inbox", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        # Could be dict with items or a list — both acceptable
        assert isinstance(data, (dict, list))

    def test_inbox_summary(self, trades_token):
        r = requests.get(f"{API}/me/inbox/summary", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_risks_list(self, trades_token):
        r = requests.get(f"{API}/risks", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_incidents_list(self, trades_token):
        r = requests.get(f"{API}/incidents", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_capa_list(self, trades_token):
        r = requests.get(f"{API}/capa", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_workers_list(self, trades_token):
        r = requests.get(f"{API}/workers", headers=_h(trades_token), timeout=20)
        assert r.status_code == 200

    def test_unauthorized_no_token(self):
        r = requests.get(f"{API}/hazard-library", timeout=20)
        assert r.status_code in (401, 403)
