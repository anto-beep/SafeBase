"""
iter29 backend regression — role_title + role_variant on user model.

Verifies:
  • POST /auth/register accepts role_title + role_variant and persists them
  • GET /auth/me returns role_title + role_variant
  • PATCH /auth/me/role updates them and rejects invalid variant
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


class TestRoleRegistrationRoundTrip:
    def test_register_with_role_persists(self):
        email = f"iter29+{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "Iter29 Tester",
            "company_name": "Acme", "industry": "transport",
            "role_title": "fleet_manager", "role_variant": "owner",
        })
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["industry"] == "transport"
        assert u["role_title"] == "fleet_manager"
        assert u["role_variant"] == "owner"

        # /auth/me should also surface them
        token = r.json()["token"]
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        body = me.json()
        assert body["industry"] == "transport"
        assert body["role_title"] == "fleet_manager"
        assert body["role_variant"] == "owner"

    def test_register_defaults(self):
        email = f"iter29def+{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "Default Tester",
        })
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["industry"] == "trades"
        assert u["role_title"] == "owner"
        assert u["role_variant"] == "owner"


class TestRolePatch:
    def test_patch_round_trip(self, auth):
        for rt, rv in [("food_safety_supervisor", "safety_lead"),
                       ("head_chef", "supervisor"),
                       ("casual", "worker"),
                       ("owner", "owner")]:
            r = requests.patch(f"{API}/auth/me/role", headers=auth,
                               json={"role_title": rt, "role_variant": rv})
            assert r.status_code == 200, r.text
            assert r.json() == {"role_title": rt, "role_variant": rv}
            me = requests.get(f"{API}/auth/me", headers=auth)
            assert me.status_code == 200
            assert me.json()["role_title"] == rt
            assert me.json()["role_variant"] == rv

    def test_patch_invalid_variant(self, auth):
        r = requests.patch(f"{API}/auth/me/role", headers=auth,
                           json={"role_title": "x", "role_variant": "god"})
        assert r.status_code == 400

    def test_patch_missing_fields(self, auth):
        r = requests.patch(f"{API}/auth/me/role", headers=auth, json={})
        assert r.status_code == 400
