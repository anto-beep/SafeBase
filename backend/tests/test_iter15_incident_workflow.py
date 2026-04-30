"""Backend tests for Incident Workflow module (iteration 15)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("token") or j.get("access_token")


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# -- Regulators meta --
def test_regulators_meta(client):
    r = client.get(f"{API}/incident-workflow/meta/regulators", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    for st in ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"]:
        assert st in data, f"missing state {st}"
        assert data[st].get("name") and data[st].get("phone")


# -- Stats --
def test_stats_shape(client):
    r = client.get(f"{API}/incident-workflow/stats", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["total_ytd", "notifiable", "lost_time", "medical_treatment",
              "near_miss", "first_aid", "avg_close_days", "open_over_30", "total_open"]:
        assert k in d, f"missing stats key {k}"


# -- Create & urgent keyword detection --
def test_create_incident_basic(client):
    body = {
        "title": "TEST_IncidentBasic",
        "submission": {"description": "Minor near miss with dropped tool — no injury.",
                       "state": "NSW", "site": "Main Site"},
    }
    r = client.post(f"{API}/incident-workflow", json=body, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["reference"].startswith("INC-")
    assert d["stage"] == "reported"
    assert d["urgent"] is False
    assert d["lifecycle"]["nodes"] and len(d["lifecycle"]["nodes"]) == 5
    pytest.basic_id = d["incident_id"]


def test_create_incident_urgent_hospital(client):
    body = {
        "title": "TEST_IncidentUrgent",
        "submission": {"description": "Worker suffered electric shock and was taken to hospital after fell from scaffold.",
                       "state": "NSW", "site": "Main Site"},
    }
    r = client.post(f"{API}/incident-workflow", json=body, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["urgent"] is True
    assert len(d["urgent_keywords"]) >= 1
    pytest.urgent_id = d["incident_id"]


def test_create_incident_non_urgent(client):
    body = {
        "title": "TEST_NonUrgent",
        "submission": {"description": "Routine tool inspection - nothing found",
                       "state": "VIC", "site": "Site 2"},
    }
    r = client.post(f"{API}/incident-workflow", json=body, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["urgent"] is False
    assert d["urgent_keywords"] == []


# -- List & single --
def test_list_includes_lifecycle(client):
    r = client.get(f"{API}/incident-workflow", timeout=30)
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list) and len(rows) >= 1
    assert "lifecycle" in rows[0]


def test_get_single_has_lifecycle(client):
    r = client.get(f"{API}/incident-workflow/{pytest.basic_id}", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["lifecycle"]["current"] == "reported"
    assert "overdue" in d["lifecycle"]


# -- Triage (notifiable via death) --
def test_triage_death_notifiable_advances(client):
    body = {
        "title": "TEST_Triage_Death",
        "submission": {"description": "Serious event.", "state": "NSW", "site": "S1"},
    }
    r = client.post(f"{API}/incident-workflow", json=body, timeout=30)
    inc_id = r.json()["incident_id"]

    tri = {
        "resulted_in_death": True,
        "incident_type": "fatality",
        "severity": 6,
        "signed_off_by": "Test Name",
    }
    r2 = client.patch(f"{API}/incident-workflow/{inc_id}/triage", json=tri, timeout=30)
    assert r2.status_code == 200, r2.text
    d = r2.json()
    assert d["stage"] == "investigation"
    assert d["notifiable"] is True
    assert d["notifiable_category"] == "death"
    assert "reported" in d["stages_done"] and "triage" in d["stages_done"]
    pytest.triage_id = inc_id


def test_triage_serious_injury_category(client):
    r = client.post(f"{API}/incident-workflow",
                    json={"title": "TEST_SI", "submission": {"description": "x", "state": "NSW", "site": "s"}},
                    timeout=30)
    inc_id = r.json()["incident_id"]
    r2 = client.patch(f"{API}/incident-workflow/{inc_id}/triage",
                      json={"serious_injury_items": ["Amputation of any body part"],
                            "severity": 5, "signed_off_by": "Tester"}, timeout=30)
    assert r2.status_code == 200
    d = r2.json()
    assert d["notifiable"] is True
    assert d["notifiable_category"] == "serious_injury"


def test_triage_dangerous_occurrence_category(client):
    r = client.post(f"{API}/incident-workflow",
                    json={"title": "TEST_DO", "submission": {"description": "x", "state": "NSW", "site": "s"}},
                    timeout=30)
    inc_id = r.json()["incident_id"]
    r2 = client.patch(f"{API}/incident-workflow/{inc_id}/triage",
                      json={"dangerous_occurrence_items": ["Collapse of structure"],
                            "severity": 4, "signed_off_by": "Tester"}, timeout=30)
    assert r2.status_code == 200
    d = r2.json()
    assert d["notifiable"] is True
    assert d["notifiable_category"] == "dangerous_incident"


def test_triage_none_not_notifiable(client):
    r = client.post(f"{API}/incident-workflow",
                    json={"title": "TEST_NotNotif", "submission": {"description": "x", "state": "NSW", "site": "s"}},
                    timeout=30)
    inc_id = r.json()["incident_id"]
    r2 = client.patch(f"{API}/incident-workflow/{inc_id}/triage",
                      json={"severity": 2, "signed_off_by": "Tester"}, timeout=30)
    assert r2.status_code == 200
    d = r2.json()
    assert d["notifiable"] is False


# -- Investigation --
def test_investigation_advances(client):
    r2 = client.patch(f"{API}/incident-workflow/{pytest.triage_id}/investigation",
                      json={"completed": True, "root_cause": "Insufficient hazard ID."}, timeout=30)
    assert r2.status_code == 200, r2.text
    d = r2.json()
    assert d["stage"] == "actions"


# -- Actions --
def test_actions_saves_keeps_stage(client):
    r2 = client.patch(f"{API}/incident-workflow/{pytest.triage_id}/actions",
                      json={"completed": True,
                            "short_term": [{"task": "Stop work", "priority": "high"}],
                            "long_term": [{"task": "Rewrite SWMS", "priority": "medium"}]},
                      timeout=30)
    assert r2.status_code == 200, r2.text
    d = r2.json()
    assert d["stage"] == "actions"
    assert "actions" in d["stages_done"]


# -- Close-out validation & success --
def test_close_out_requires_fields(client):
    r = client.patch(f"{API}/incident-workflow/{pytest.triage_id}/close-out",
                     json={"checklist": {}}, timeout=30)
    assert r.status_code == 400


def test_close_out_success(client):
    r = client.patch(f"{API}/incident-workflow/{pytest.triage_id}/close-out",
                     json={"lessons_learned": "Better pre-start briefings.",
                           "signed_off_by": "Owner Test",
                           "checklist": {"regulatory": True, "investigation": True,
                                         "actions": True, "documentation": True}},
                     timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["stage"] == "closed"
    assert "closed" in d["stages_done"]
    assert d["close_out"]["signed_at"]


# -- Reopen --
def test_reopen_empty_reason_400(client):
    r = client.post(f"{API}/incident-workflow/{pytest.triage_id}/reopen",
                    json={"reason": ""}, timeout=30)
    assert r.status_code == 400


def test_reopen_success(client):
    r = client.post(f"{API}/incident-workflow/{pytest.triage_id}/reopen",
                    json={"reason": "new information from regulator"}, timeout=30)
    assert r.status_code == 200
    # Verify
    r2 = client.get(f"{API}/incident-workflow/{pytest.triage_id}", timeout=30)
    d = r2.json()
    assert d["stage"] == "actions"
    assert d["reopened"] is True


# -- AI endpoints (accept real or fallback) --
def test_ai_categorise(client):
    r = client.post(f"{API}/incident-workflow/ai/categorise",
                    json={"description": "Worker twisted ankle on uneven ground, first aid applied."},
                    timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "category" in d and "severity" in d and "rationale" in d


def test_ai_root_cause(client):
    r = client.post(f"{API}/incident-workflow/ai/root-cause",
                    json={"factors": {"human": ["fatigue"], "equipment": []}}, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "primary" in d and "systemic" in d and "pattern" in d


def test_ai_summary(client):
    r = client.post(f"{API}/incident-workflow/ai/summary",
                    json={"incident_id": pytest.basic_id}, timeout=60)
    assert r.status_code == 200, r.text
    assert "summary" in r.json()


def test_ai_lessons_learned(client):
    r = client.post(f"{API}/incident-workflow/ai/lessons-learned",
                    json={"title": "x", "root_cause": "y"}, timeout=60)
    assert r.status_code == 200, r.text
    assert "lessons_learned" in r.json()


# -- Notifications collection written --
def test_notifications_written(client):
    r = client.get(f"{API}/notifications", timeout=30)
    assert r.status_code == 200
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("notifications") or []
    types = {x.get("type") for x in rows if isinstance(x, dict)}
    # We expect at minimum incident_reported. Others may or may not appear
    assert "incident_reported" in types, f"types found: {types}"
    # urgent + triaged + closed were all triggered above; at least two extras expected
    assert any(t in types for t in ["incident_urgent", "incident_triaged", "incident_closed"]), types


# -- Regression smoke --
def test_regression_risks(client):
    r = client.get(f"{API}/risks", timeout=30)
    assert r.status_code == 200


def test_regression_library_processes(client):
    r = client.get(f"{API}/library/process", timeout=30)
    assert r.status_code == 200


def test_regression_billing_tiers(client):
    r = client.get(f"{API}/billing/tiers", timeout=30)
    assert r.status_code == 200


def test_regression_partner_branding(client):
    r = client.get(f"{API}/partner/branding", timeout=30)
    assert r.status_code in (200, 404)


def test_regression_legacy_incidents(client):
    r = client.get(f"{API}/incidents", timeout=30)
    assert r.status_code == 200
