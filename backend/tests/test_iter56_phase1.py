"""Iter 56 — Phase 1: industry 403, account-wide visibility, server-side Me,
custom doc templates, library activity/task create-new.
"""
import os
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    return (url or "").rstrip("/")

BASE_URL = _load_base_url()

TRADES = ("trades.demo@safebase.com.au", "Demo@1234")
HOSPI = ("hospitality.demo@safebase.com.au", "Demo@1234")


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password},
                      timeout=20)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text[:200]}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def trades_token():
    return _login(*TRADES)


@pytest.fixture(scope="module")
def hospi_token():
    return _login(*HOSPI)


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ============ INDUSTRY 403 ============
class TestIndustry403:
    def test_library_process_cross_industry_403(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/library/process?industry=hospitality",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 403, r.text

    def test_library_process_same_industry_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/library/process?industry=trades",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_library_process_default_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/library/process",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_risks_cross_industry_403(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/risks?industry=transport",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 403

    def test_risks_same_industry_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/risks?industry=trades",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_risks_default_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/risks", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_academy_catalogue_cross_403(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/catalogue?industry=retail",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 403

    def test_academy_catalogue_default_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/catalogue",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("industry") == "trades"

    def test_ai_docs_types_cross_403(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/ai-docs/types?industry=healthcare",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 403

    def test_ai_docs_types_default_200(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/ai-docs/types",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("industry") == "trades"


# ============ ACCOUNT-WIDE LIBRARY CREATE (C5) ============
class TestLibraryCreateNew:
    def test_create_activity(self, trades_token):
        # need a parent process id
        procs = requests.get(f"{BASE_URL}/api/library/process",
                             headers=_h(trades_token), timeout=15).json()
        assert procs, "no seeded processes"
        pid = procs[0]["id"]
        body = {"name": "TEST_iter56_activity", "parent_process_id": pid,
                "parent_process_name": procs[0]["name"]}
        r = requests.post(f"{BASE_URL}/api/library/activity", json=body,
                          headers=_h(trades_token), timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == "TEST_iter56_activity"
        assert created["parent_process_id"] == pid
        assert created["id"].startswith("acti_")
        # Verify visible in GET
        lst = requests.get(f"{BASE_URL}/api/library/activity",
                           headers=_h(trades_token), timeout=15).json()
        assert any(a["id"] == created["id"] for a in lst)

    def test_create_task(self, trades_token):
        acts = requests.get(f"{BASE_URL}/api/library/activity",
                            headers=_h(trades_token), timeout=15).json()
        assert acts
        aid = acts[0]["id"]
        body = {"name": "TEST_iter56_task", "parent_activity_id": aid}
        r = requests.post(f"{BASE_URL}/api/library/task", json=body,
                          headers=_h(trades_token), timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == "TEST_iter56_task"
        assert created["parent_activity_id"] == aid
        lst = requests.get(f"{BASE_URL}/api/library/task",
                           headers=_h(trades_token), timeout=15).json()
        assert any(t["id"] == created["id"] for t in lst)


# ============ SERVER-SIDE ME RESOLUTION (D) ============
class TestServerSideMeResolution:
    def test_capa_me_override(self, trades_token):
        body = {
            "description": "TEST_iter56 me-resolution capa",
            "action_type": "corrective",
            "priority": "low",
            "assigned_to": {
                "source_type": "me",
                "user_id": "FAKE_USER_ID",
                "email": "hacker@evil.com",
                "role": "super_admin",
                "display_name": "Hacker McSpoof",
            },
        }
        r = requests.post(f"{BASE_URL}/api/capa", json=body,
                          headers=_h(trades_token), timeout=20)
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        a = doc.get("assigned_to") or {}
        assert a.get("user_id") != "FAKE_USER_ID", "spoofed user_id not overridden"
        assert a.get("email") != "hacker@evil.com", "spoofed email not overridden"
        assert a.get("role") != "super_admin" or a.get("email", "").endswith("safebase.com.au")
        # email should be the trades demo email
        assert a.get("email") == TRADES[0]

    def test_risk_me_override_owner_and_action(self, trades_token):
        body = {
            "title": "TEST_iter56 me-resolution risk",
            "primary_hazard": "Other",
            "risk_owner": {
                "source_type": "me",
                "user_id": "FAKE",
                "email": "hacker@evil.com",
                "role": "super_admin",
            },
            "additional_actions": [
                {
                    "description": "do thing",
                    "assigned_to": {
                        "source_type": "me",
                        "user_id": "FAKE2",
                        "email": "hacker2@evil.com",
                        "role": "super_admin",
                    },
                }
            ],
        }
        r = requests.post(f"{BASE_URL}/api/risks", json=body,
                          headers=_h(trades_token), timeout=20)
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        owner = doc.get("risk_owner") or {}
        assert owner.get("email") == TRADES[0]
        assert owner.get("user_id") != "FAKE"
        act = (doc.get("additional_actions") or [{}])[0].get("assigned_to") or {}
        assert act.get("email") == TRADES[0]
        assert act.get("user_id") != "FAKE2"


# ============ CUSTOM DOC TEMPLATES (B5) ============
class TestCustomDocs:
    template_id = None

    def test_propose_custom_doc(self, trades_token):
        body = {"description": "A simple ladder pre-use checklist a tradie completes before climbing — captures ladder ID, last inspection, condition checks, and worker sign-off."}
        r = requests.post(f"{BASE_URL}/api/documents/custom/propose",
                          json=body, headers=_h(trades_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        prop = data.get("proposal") or {}
        for k in ("suggested_name", "suggested_category", "suggested_regulation",
                  "fields_schema", "ai_prompt_template"):
            assert k in prop, f"missing key {k} in proposal: {list(prop.keys())}"

    def test_persist_custom_doc(self, trades_token):
        body = {
            "name": "TEST_iter56_ladder_checklist",
            "category": "Plant & Equipment",
            "regulation": "WHS Reg 2017 cl 78",
            "fields_schema": [
                {"key": "ladder_id", "label": "Ladder ID", "type": "text", "required": True}
            ],
            "ai_prompt_template": "Generate a ladder pre-use checklist using {ladder_id}.",
        }
        r = requests.post(f"{BASE_URL}/api/documents/custom",
                          json=body, headers=_h(trades_token), timeout=20)
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        assert doc["is_custom"] is True
        assert doc["industry"] == "trades"
        assert doc["template_id"].startswith("custom_")
        TestCustomDocs.template_id = doc["template_id"]

    def test_list_custom_docs(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/documents/custom/list",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        ids = [d["template_id"] for d in r.json()]
        assert TestCustomDocs.template_id in ids

    def test_hospi_does_not_see_trades_custom(self, hospi_token):
        r = requests.get(f"{BASE_URL}/api/documents/custom/list",
                         headers=_h(hospi_token), timeout=15)
        assert r.status_code == 200
        ids = [d["template_id"] for d in r.json()]
        assert TestCustomDocs.template_id not in ids

    def test_list_custom_empty_returns_200_not_404(self, hospi_token):
        # hospitality has no custom docs => endpoint must return 200 + array, not 404
        r = requests.get(f"{BASE_URL}/api/documents/custom/list",
                         headers=_h(hospi_token), timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_delete_custom_doc(self, trades_token):
        tid = TestCustomDocs.template_id
        r = requests.delete(f"{BASE_URL}/api/documents/custom/{tid}",
                            headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        # 404 for unknown id
        r2 = requests.delete(f"{BASE_URL}/api/documents/custom/custom_doesnotexist",
                             headers=_h(trades_token), timeout=15)
        assert r2.status_code == 404


# ============ BACKWARD COMPAT ============
class TestRegression:
    def test_users_picker(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/users/picker",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_capa_list(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/capa", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
