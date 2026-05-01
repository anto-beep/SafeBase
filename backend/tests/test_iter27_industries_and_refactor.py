"""
iter27 backend tests:
- /api/industries + /api/public/industry-signal/{slug}
- Auth registration with industry, /auth/me surfaces it, PATCH /auth/me/industry
- /api/docs/types industry filtering
- Creating + PDF for new 12 industry-gated doc types
- /api/docs/stats by_status
- Webhook routes still working after refactor
- Service banner says SafeBase
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"

TS = int(time.time())


# --- Fixtures ---------------------------------------------------------------
@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _make_industry_user(industry: str):
    email = f"iter27_{industry}_{TS}@test.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email,
        "password": "Test@1234",
        "name": f"Iter27 {industry}",
        "company_name": f"Co {industry}",
        "industry": industry,
    })
    assert r.status_code in (200, 201), f"register {industry}: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "token": data.get("token"), "user": data.get("user")}


@pytest.fixture(scope="session")
def hosp_user():
    return _make_industry_user("hospitality")


@pytest.fixture(scope="session")
def transport_user():
    return _make_industry_user("transport")


@pytest.fixture(scope="session")
def healthcare_user():
    return _make_industry_user("healthcare")


@pytest.fixture(scope="session")
def retail_user():
    return _make_industry_user("retail")


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# --- /api/ banner -----------------------------------------------------------
class TestServiceBanner:
    def test_root_says_safebase(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        body = r.text + " " + str(r.json() if r.headers.get("content-type", "").startswith("application/json") else "")
        assert "SafeBase" in body, body[:300]


# --- Industries public endpoints --------------------------------------------
class TestIndustriesPublic:
    def test_list_industries(self):
        r = requests.get(f"{API}/industries")
        assert r.status_code == 200
        data = r.json()
        items = data.get("industries", [])
        slugs = {it["slug"] for it in items}
        assert slugs == {"trades", "hospitality", "transport", "healthcare", "retail"}, slugs
        for it in items:
            assert {"slug", "name", "nav", "icon"} <= set(it.keys())

    def test_industry_signal_hospitality(self):
        r = requests.get(f"{API}/public/industry-signal/hospitality")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "hospitality"
        assert "pulse" in d and "featured" in d
        assert "live" in d and isinstance(d["live"], bool)
        assert "counts" in d
        for k in ("last_7d", "last_30d", "total"):
            assert k in d["counts"]

    def test_industry_signal_unknown_404(self):
        r = requests.get(f"{API}/public/industry-signal/madeup")
        assert r.status_code == 404


# --- Auth + industry --------------------------------------------------------
class TestAuthIndustry:
    def test_register_persists_industry(self, hosp_user):
        token = hosp_user["token"]
        r = requests.get(f"{API}/auth/me", headers=_h(token))
        assert r.status_code == 200
        me = r.json()
        assert me.get("industry") == "hospitality", me

    def test_login_includes_industry(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert "industry" in user, f"login response missing industry: {data}"

    def test_patch_me_industry_valid(self, retail_user):
        token = retail_user["token"]
        r = requests.patch(f"{API}/auth/me/industry",
                           headers=_h(token),
                           json={"industry": "retail"})
        assert r.status_code == 200, r.text
        # Confirm change
        me = requests.get(f"{API}/auth/me", headers=_h(token)).json()
        assert me["industry"] == "retail"
        # Set back
        requests.patch(f"{API}/auth/me/industry",
                       headers=_h(token), json={"industry": "retail"})

    def test_patch_me_industry_invalid(self, hosp_user):
        token = hosp_user["token"]
        r = requests.patch(f"{API}/auth/me/industry",
                           headers=_h(token),
                           json={"industry": "garbage"})
        assert r.status_code == 400


# --- Doc types filtering ----------------------------------------------------
class TestDocTypesFiltering:
    def test_owner_trades_31(self, owner_token):
        r = requests.get(f"{API}/docs/types", headers=_h(owner_token))
        assert r.status_code == 200, r.text
        d = r.json()
        types = d.get("types", d if isinstance(d, list) else [])
        # owner could be 'trades' default
        assert d.get("user_industry") in ("trades", None) or "user_industry" in d
        assert len(types) == 31, f"trades user expected 31, got {len(types)}"

    def test_hospitality_34(self, hosp_user):
        r = requests.get(f"{API}/docs/types", headers=_h(hosp_user["token"]))
        assert r.status_code == 200
        d = r.json()
        types = d.get("types", [])
        assert d.get("user_industry") == "hospitality"
        ids = {t.get("doc_type") or t.get("id") or t.get("type") for t in types}
        assert len(types) == 34, f"hospitality expected 34, got {len(types)}: extras unknown"
        assert {"haccp_plan", "temperature_log", "allergen_register"} <= ids

    def test_transport_34(self, transport_user):
        r = requests.get(f"{API}/docs/types", headers=_h(transport_user["token"]))
        assert r.status_code == 200
        d = r.json()
        types = d.get("types", [])
        ids = {t.get("doc_type") or t.get("id") or t.get("type") for t in types}
        assert len(types) == 34
        assert {"cor_mgmt_plan", "driver_fitness_for_duty", "load_restraint_record"} <= ids

    def test_healthcare_34(self, healthcare_user):
        r = requests.get(f"{API}/docs/types", headers=_h(healthcare_user["token"]))
        assert r.status_code == 200
        d = r.json()
        types = d.get("types", [])
        ids = {t.get("doc_type") or t.get("id") or t.get("type") for t in types}
        assert len(types) == 34
        assert {"ahpra_register", "worker_screening_record", "clinical_event_report"} <= ids

    def test_retail_34(self, retail_user):
        r = requests.get(f"{API}/docs/types", headers=_h(retail_user["token"]))
        assert r.status_code == 200
        d = r.json()
        types = d.get("types", [])
        ids = {t.get("doc_type") or t.get("id") or t.get("type") for t in types}
        assert len(types) == 34
        assert {"quick_induct_record", "lone_worker_log", "customer_incident"} <= ids


# --- New industry-gated doc creation + PDF ---------------------------------
def _create_and_pdf(token, doc_type, payload, ref_prefix):
    r = requests.post(f"{API}/docs/{doc_type}", headers=_h(token), json=payload)
    assert r.status_code in (200, 201), f"{doc_type} create: {r.status_code} {r.text}"
    d = r.json()
    doc_id = d.get("id") or d.get("doc_id") or d.get("_id")
    ref = d.get("reference") or d.get("ref") or d.get("doc_ref") or ""
    assert doc_id, f"no id in create response: {d}"
    assert ref.startswith(ref_prefix), f"ref {ref!r} should start with {ref_prefix}"
    p = requests.get(f"{API}/docs/{doc_id}/pdf", headers=_h(token))
    assert p.status_code == 200, f"{doc_type} pdf: {p.status_code}"
    assert p.content[:5] == b"%PDF-", "not a PDF"
    assert len(p.content) > 5000, f"pdf too small: {len(p.content)}"


class TestIndustryDocCreation:
    def test_hospitality_haccp(self, hosp_user):
        _create_and_pdf(hosp_user["token"], "haccp_plan",
                        {"venue_name": "Test Cafe"}, "HACCP-")

    def test_transport_cor(self, transport_user):
        _create_and_pdf(transport_user["token"], "cor_mgmt_plan",
                        {"operator_name": "Test Freight"}, "COR-")

    def test_healthcare_ahpra(self, healthcare_user):
        _create_and_pdf(healthcare_user["token"], "ahpra_register",
                        {"organisation": "Test Clinic"}, "AHPRA-")

    def test_retail_lone_worker(self, retail_user):
        _create_and_pdf(retail_user["token"], "lone_worker_log",
                        {"store_name": "Test Store"}, "LW-")


# --- /api/docs/stats by_status ---------------------------------------------
class TestDocsStats:
    def test_stats_has_by_status(self, owner_token):
        r = requests.get(f"{API}/docs/stats", headers=_h(owner_token))
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("by_status", "by_category", "by_doc_type", "recent", "total"):
            assert k in d, f"missing {k} in stats: {list(d.keys())}"


# --- Webhooks regression ----------------------------------------------------
class TestWebhooksRefactor:
    def test_events_list(self, owner_token):
        r = requests.get(f"{API}/webhooks/events", headers=_h(owner_token))
        assert r.status_code == 200
        evts = r.json()
        assert isinstance(evts, list) and len(evts) >= 7

    def test_subscription_lifecycle(self, owner_token):
        # list initial
        r = requests.get(f"{API}/webhooks/subscriptions", headers=_h(owner_token))
        assert r.status_code == 200
        # create
        evts = requests.get(f"{API}/webhooks/events", headers=_h(owner_token)).json()
        body = {"target_url": "https://example.com/hook",
                "events": evts[:2], "label": "iter27"}
        c = requests.post(f"{API}/webhooks/subscriptions", headers=_h(owner_token), json=body)
        assert c.status_code in (200, 201), c.text
        sid = c.json()["subscription_id"]
        # patch
        p = requests.patch(f"{API}/webhooks/subscriptions/{sid}",
                          headers=_h(owner_token), json={"enabled": False})
        assert p.status_code == 200
        assert p.json()["enabled"] is False
        # deliveries list
        d = requests.get(f"{API}/webhooks/deliveries", headers=_h(owner_token))
        assert d.status_code == 200
        # test ping
        t = requests.post(f"{API}/webhooks/test/{sid}", headers=_h(owner_token))
        assert t.status_code == 200, t.text
        # delete
        de = requests.delete(f"{API}/webhooks/subscriptions/{sid}", headers=_h(owner_token))
        assert de.status_code == 200
