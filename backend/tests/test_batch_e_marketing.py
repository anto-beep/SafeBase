"""Backend tests for Batch (e) Marketing — tradecheck/stats public endpoint + regression."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")


class TestTradecheckStats:
    def test_stats_public_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/tradecheck/stats", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("verified_count", "total_count", "trade_count", "state_count"):
            assert k in data, f"missing {k}"
            assert isinstance(data[k], int), f"{k} not int"
            assert data[k] >= 0

    def test_stats_logical_consistency(self):
        data = requests.get(f"{BASE_URL}/api/tradecheck/stats", timeout=15).json()
        assert data["verified_count"] <= data["total_count"]


class TestRegressionPublic:
    def test_api_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200

    def test_tradecheck_listings_public(self):
        r = requests.get(f"{BASE_URL}/api/tradecheck/listings", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestAuthRegression:
    def test_login_owner(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@safetradie.demo",
            "password": "Demo@1234",
        }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and body["user"]["email"] == "owner@safetradie.demo"

    def test_me_with_token(self):
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "owner@safetradie.demo", "password": "Demo@1234",
        }, timeout=15).json()
        token = login["token"]
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200
