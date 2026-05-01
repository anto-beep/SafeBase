"""
Iter24 — SafeTradie refactor + polish backend tests.

Covers:
  - Regression: /api/docs/types still returns 31 types · 6 categories
  - Regression CRUD+PDF on jsa, whs_mgmt_plan, welding_procedure
  - NEW GET /api/docs/stats endpoint shape + auth + scoping
  - PATCH version bump 1->2->3
  - PATCH unknown-key allowlist (drops bogus_xxxxx silently)
  - POST unknown-key allowlist
  - Auth routes extraction: register / login / me / logout
"""
import os
import time
import requests
import pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(session):
    r = session.post(f"{BASE}/api/auth/login",
                     json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str)
    return data["token"]


@pytest.fixture(scope="module")
def auth(session, token):
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


# ---------- Auth routes extraction ----------

class TestAuthRoutesExtraction:
    """register/login/me/logout still work after extraction to routes/auth.py"""

    def test_login_owner(self, session):
        r = session.post(f"{BASE}/api/auth/login",
                         json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == EMAIL

    def test_register_new_user_returns_token(self, session):
        unique = f"TEST_iter24_{int(time.time()*1000)}@safetradie.demo"
        r = session.post(f"{BASE}/api/auth/register", json={
            "email": unique,
            "password": "Demo@1234",
            "name": "Iter24 Tester",
            "company_name": "TEST Iter24 Co",
        })
        assert r.status_code in (200, 201), f"register: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert data.get("user", {}).get("email", "").lower() == unique.lower()

    def test_me_with_token(self, auth):
        r = auth.get(f"{BASE}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data.get("email") == EMAIL

    def test_logout_returns_success(self, auth):
        r = auth.post(f"{BASE}/api/auth/logout")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True


# ---------- Regression: docs/types ----------

class TestDocsTypesRegression:

    def test_types_count_31_six_categories(self, auth):
        r = auth.get(f"{BASE}/api/docs/types")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        types = data.get("types", [])
        cats = data.get("categories", [])
        assert len(types) == 31, f"expected 31 doc types, got {len(types)}"
        assert len(cats) == 6, f"expected 6 categories metadata, got {len(cats)}"
        cat_ids = {c["id"] for c in cats}
        assert cat_ids == {"safety", "worker", "contractor",
                           "incident", "plant", "trade"}, cat_ids


# ---------- Regression CRUD + PDF ----------

@pytest.fixture
def jsa_doc(auth):
    r = auth.post(f"{BASE}/api/docs/jsa",
                  json={"task": "TEST_iter24_jsa task", "site": "Yard"})
    assert r.status_code in (200, 201), r.text
    doc = r.json()
    yield doc
    try:
        auth.delete(f"{BASE}/api/docs/{doc.get('id') or doc.get('_id') or doc.get('doc_id')}")
    except Exception:
        pass


class TestRegressionCRUDPDF:

    @pytest.mark.parametrize("doc_type,payload", [
        ("jsa", {"task": "TEST_iter24 jsa task", "site": "Yard"}),
        ("whs_mgmt_plan", {"project": "TEST_iter24 wmp", "principal_contractor": "Acme"}),
        ("welding_procedure", {"wps_number": "TEST_iter24-WPS",
                               "welding_process": "MIG"}),
    ])
    def test_create_get_pdf(self, auth, doc_type, payload):
        # CREATE
        r = auth.post(f"{BASE}/api/docs/{doc_type}", json=payload)
        assert r.status_code in (200, 201), f"create {doc_type}: {r.text}"
        doc = r.json()
        doc_id = doc.get("id") or doc.get("doc_id") or doc.get("_id")
        assert doc_id, f"no id in {doc}"
        # GET single
        rg = auth.get(f"{BASE}/api/docs/{doc_id}")
        assert rg.status_code == 200
        assert "_id" not in rg.json()
        # PDF
        t0 = time.time()
        rp = auth.get(f"{BASE}/api/docs/{doc_id}/pdf")
        elapsed = time.time() - t0
        assert rp.status_code == 200, f"pdf {doc_type}: {rp.status_code}"
        assert rp.headers.get("content-type", "").startswith("application/pdf")
        assert rp.content[:4] == b"%PDF"
        assert len(rp.content) > 5000
        assert elapsed < 30, f"PDF gen exceeded ceiling: {elapsed}s"
        # cleanup
        auth.delete(f"{BASE}/api/docs/{doc_id}")


# ---------- New /api/docs/stats ----------

class TestDocsStats:

    def test_stats_requires_auth(self, session):
        # bare session has no token (except module-level header set after auth fixture)
        bare = requests.Session()
        bare.headers.update({"Content-Type": "application/json"})
        r = bare.get(f"{BASE}/api/docs/stats")
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_stats_shape_and_recent(self, auth):
        r = auth.get(f"{BASE}/api/docs/stats")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "total" in data and isinstance(data["total"], int)
        assert "by_category" in data and isinstance(data["by_category"], dict)
        assert "by_doc_type" in data and isinstance(data["by_doc_type"], dict)
        assert "recent" in data and isinstance(data["recent"], list)
        assert len(data["recent"]) <= 5
        # recent entries should not leak _id
        for d in data["recent"]:
            assert "_id" not in d


# ---------- PATCH version bump + allowlist ----------

class TestPatchVersionAndAllowlist:

    def test_version_bumps_and_allowlist(self, auth):
        # CREATE jsa v=1
        r = auth.post(f"{BASE}/api/docs/jsa",
                      json={"task": "TEST_iter24_patch task"})
        assert r.status_code in (200, 201)
        doc = r.json()
        doc_id = doc.get("id") or doc.get("doc_id")
        assert doc_id
        v0 = doc.get("version", doc.get("v", 1))
        assert v0 == 1, f"expected v=1 on create, got {v0}"

        # PATCH 1: bump to 2 + allowlist filter
        body1 = {"bogus_xxxxx": "junk", "task": "ok", "status": "in_use"}
        r1 = auth.patch(f"{BASE}/api/docs/{doc_id}", json=body1)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        v1 = d1.get("version", d1.get("v"))
        assert v1 == 2, f"expected v=2 after first PATCH, got {v1}"
        # allowlist enforcement
        assert "bogus_xxxxx" not in d1, f"bogus_xxxxx leaked: {d1}"
        assert d1.get("task") == "ok"
        assert d1.get("status") == "in_use"

        # PATCH 2: bump to 3
        r2 = auth.patch(f"{BASE}/api/docs/{doc_id}", json={"task": "ok2"})
        assert r2.status_code == 200
        d2 = r2.json()
        v2 = d2.get("version", d2.get("v"))
        assert v2 == 3, f"expected v=3 after second PATCH, got {v2}"

        # GET to verify persistence + no bogus key
        rg = auth.get(f"{BASE}/api/docs/{doc_id}")
        assert rg.status_code == 200
        gj = rg.json()
        assert "bogus_xxxxx" not in gj
        assert gj.get("task") == "ok2"
        # cleanup
        auth.delete(f"{BASE}/api/docs/{doc_id}")

    def test_post_filters_unknown_keys(self, auth):
        body = {"task": "TEST_iter24_postfilter t", "bogus_xxxxx": "x"}
        r = auth.post(f"{BASE}/api/docs/jsa", json=body)
        assert r.status_code in (200, 201)
        doc = r.json()
        doc_id = doc.get("id") or doc.get("doc_id")
        assert "bogus_xxxxx" not in doc
        # double-confirm via GET
        rg = auth.get(f"{BASE}/api/docs/{doc_id}")
        assert rg.status_code == 200
        assert "bogus_xxxxx" not in rg.json()
        auth.delete(f"{BASE}/api/docs/{doc_id}")
