"""
Iter 55 backend tests:
  - Idempotency on POST /api/incidents and /api/retail/lone-worker/checkin
  - implementation_guidance on library controls + inline risk controls
  - Multi-tenant isolation of idempotency_keys
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")

RETAIL_CRED = {"email": "retail.demo@safebase.com.au", "password": "Demo@1234"}
TRADES_CRED = {"email": "trades.demo@safebase.com.au", "password": "Demo@1234"}
HOSP_CRED = {"email": "hospitality.demo@safebase.com.au", "password": "Demo@1234"}


def _login(cred):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=cred, timeout=15)
    assert r.status_code == 200, f"login failed for {cred['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def retail_headers():
    return {"Authorization": f"Bearer {_login(RETAIL_CRED)}"}


@pytest.fixture(scope="module")
def trades_headers():
    return {"Authorization": f"Bearer {_login(TRADES_CRED)}"}


@pytest.fixture(scope="module")
def hosp_headers():
    return {"Authorization": f"Bearer {_login(HOSP_CRED)}"}


# ============= Lone-worker check-in idempotency ===============

class TestLoneWorkerIdempotency:
    def test_same_client_event_id_returns_same_checkin(self, retail_headers):
        cid = f"TEST-{uuid.uuid4()}"
        body = {
            "worker_name": "TEST_Idempotent Worker",
            "location": "Store A",
            "client_event_id": cid,
            "next_checkin_min": 30,
        }
        r1 = requests.post(f"{BASE_URL}/api/retail/lone-worker/checkin", json=body, headers=retail_headers, timeout=15)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert "checkin_id" in d1

        r2 = requests.post(f"{BASE_URL}/api/retail/lone-worker/checkin", json=body, headers=retail_headers, timeout=15)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["checkin_id"] == d1["checkin_id"], "idempotent replay must return same checkin_id"

    def test_no_client_event_id_creates_distinct_records(self, retail_headers):
        body = {
            "worker_name": "TEST_Legacy Worker",
            "location": "Store B",
            "next_checkin_min": 30,
        }
        r1 = requests.post(f"{BASE_URL}/api/retail/lone-worker/checkin", json=body, headers=retail_headers, timeout=15)
        r2 = requests.post(f"{BASE_URL}/api/retail/lone-worker/checkin", json=body, headers=retail_headers, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["checkin_id"] != r2.json()["checkin_id"], "legacy callers must NOT be deduped"


# ============= Incident idempotency ===============

class TestIncidentIdempotency:
    def _payload(self, cid=None):
        p = {
            "title": "TEST_Idem incident",
            "description": "test",
            "severity": "minor",
            "incident_type": "near_miss",
            "location": "Site Z",
        }
        if cid:
            p["client_event_id"] = cid
        return p

    def test_same_client_event_id_returns_same_incident(self, trades_headers):
        cid = f"TEST-{uuid.uuid4()}"
        body = self._payload(cid)
        r1 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        r2 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["incident_id"] == d1["incident_id"]
        # client_event_id must NOT be persisted
        assert "client_event_id" not in d1, f"client_event_id leaked into stored doc: {d1}"
        assert "client_event_id" not in d2

    def test_persisted_incident_does_not_contain_client_event_id(self, trades_headers):
        cid = f"TEST-{uuid.uuid4()}"
        body = self._payload(cid)
        r = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        assert r.status_code == 200
        inc_id = r.json()["incident_id"]
        # GET list and verify the row doesn't carry client_event_id
        lst = requests.get(f"{BASE_URL}/api/incidents", headers=trades_headers, timeout=15)
        assert lst.status_code == 200
        rows = lst.json()
        match = [x for x in rows if x.get("incident_id") == inc_id]
        assert match, f"created incident {inc_id} not present in list"
        assert "client_event_id" not in match[0]

    def test_no_client_event_id_creates_distinct_incidents(self, trades_headers):
        body = self._payload()
        r1 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        r2 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["incident_id"] != r2.json()["incident_id"]


# ============= Multi-tenant idempotency isolation ===============

class TestIdempotencyTenantIsolation:
    def test_same_client_event_id_across_tenants_yields_separate_records(self, trades_headers, hosp_headers):
        cid = f"TEST-X-TENANT-{uuid.uuid4()}"
        body = {
            "title": "TEST_Cross-tenant",
            "description": "iso",
            "severity": "minor",
            "incident_type": "near_miss",
            "client_event_id": cid,
        }
        r1 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=trades_headers, timeout=15)
        r2 = requests.post(f"{BASE_URL}/api/incidents", json=body, headers=hosp_headers, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200, (r1.text, r2.text)
        assert r1.json()["incident_id"] != r2.json()["incident_id"], "tenants must NOT share idempotency space"


# ============= Library control implementation_guidance ===============

class TestLibraryControlGuidance:
    def test_create_control_with_guidance_persists(self, trades_headers):
        payload = {
            "name": f"TEST_Ctrl_{uuid.uuid4().hex[:6]}",
            "description": "test control",
            "hierarchy_level": "engineering",
            "effectiveness": "high",
            "implementation_guidance": "Inspect machine guarding weekly; document in log.",
        }
        r = requests.post(f"{BASE_URL}/api/library/control", json=payload, headers=trades_headers, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["implementation_guidance"] == payload["implementation_guidance"]
        ctrl_id = created["id"]

        # GET list and verify
        lst = requests.get(f"{BASE_URL}/api/library/control", headers=trades_headers, timeout=15)
        assert lst.status_code == 200
        match = [c for c in lst.json() if c.get("id") == ctrl_id]
        assert match
        assert match[0]["implementation_guidance"] == payload["implementation_guidance"]

    def test_create_control_without_guidance_defaults_to_empty(self, trades_headers):
        payload = {"name": f"TEST_NoGuide_{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{BASE_URL}/api/library/control", json=payload, headers=trades_headers, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "implementation_guidance" in d
        assert d["implementation_guidance"] == ""

    def test_patch_control_updates_guidance(self, trades_headers):
        # Create
        payload = {"name": f"TEST_PatchGuide_{uuid.uuid4().hex[:6]}"}
        c = requests.post(f"{BASE_URL}/api/library/control", json=payload, headers=trades_headers, timeout=15).json()
        cid = c["id"]
        # Patch
        new_guidance = "Updated: weekly checks, log to /var/log/safety."
        pr = requests.patch(f"{BASE_URL}/api/library/control/{cid}",
                             json={"implementation_guidance": new_guidance},
                             headers=trades_headers, timeout=15)
        assert pr.status_code == 200, pr.text
        assert pr.json()["implementation_guidance"] == new_guidance
        # Verify via GET list
        lst = requests.get(f"{BASE_URL}/api/library/control", headers=trades_headers, timeout=15).json()
        match = [x for x in lst if x.get("id") == cid]
        assert match and match[0]["implementation_guidance"] == new_guidance


# ============= Inline risk controls implementation_guidance ===============

class TestRiskInlineControlGuidance:
    def test_risk_with_inline_control_guidance_persists(self, trades_headers):
        payload = {
            "title": f"TEST_RiskGuide_{uuid.uuid4().hex[:6]}",
            "category": "physical",
            "primary_hazard": "slip",
            "hazard_description": "wet floor",
            "inherent_likelihood": 3,
            "inherent_consequence": 3,
            "controls": [
                {
                    "name": "Mop and signage",
                    "hierarchy_level": "administrative",
                    "effectiveness": "medium",
                    "implementation_guidance": "Mop spills within 5 min; place A-frame sign immediately.",
                },
                {
                    "name": "Anti-slip mat",
                    "hierarchy_level": "engineering",
                    "effectiveness": "high",
                    "implementation_guidance": "Replace mats quarterly.",
                },
            ],
            "residual_likelihood": 2,
            "residual_consequence": 2,
        }
        r = requests.post(f"{BASE_URL}/api/risks", json=payload, headers=trades_headers, timeout=15)
        assert r.status_code == 200, r.text
        risk = r.json()
        rid = risk["risk_id"]

        g = requests.get(f"{BASE_URL}/api/risks/{rid}", headers=trades_headers, timeout=15)
        assert g.status_code == 200, g.text
        doc = g.json()
        ctrls = doc.get("controls") or []
        assert len(ctrls) == 2
        guidances = [c.get("implementation_guidance") for c in ctrls]
        assert "Mop spills within 5 min; place A-frame sign immediately." in guidances
        assert "Replace mats quarterly." in guidances
