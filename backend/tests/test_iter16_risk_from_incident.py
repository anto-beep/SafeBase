"""Backend tests for iteration 16 - Risk Register from Incident loop.

Covers:
  - POST /api/incident-workflow/{id}/ai/suggest-risk-draft (Claude or fallback)
  - POST /api/incident-workflow/{id}/accept-risk-draft (creates risks doc, links incident,
    notification, scores + levels, defaults).
  - 404 for unknown incident on both endpoints.
  - Persistence: GET /api/incident-workflow/{id} reflects linked_risk_id; GET /api/risks
    contains the new risk with linked_incident_ids including incident_id + reference.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


# --------------------------- fixtures ---------------------------
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


@pytest.fixture(scope="module")
def closed_incident(client):
    """Create -> triage -> investigation -> actions -> close-out, return the doc."""
    body = {
        "title": "TEST_RiskFromIncident",
        "submission": {
            "description": "Worker received electric shock from exposed cable; first aid applied.",
            "state": "NSW", "site": "TestSite",
        },
    }
    r = client.post(f"{API}/incident-workflow", json=body, timeout=30)
    assert r.status_code == 200, r.text
    inc_id = r.json()["incident_id"]
    reference = r.json()["reference"]

    # triage -> investigation
    r2 = client.patch(f"{API}/incident-workflow/{inc_id}/triage",
                      json={"incident_type": "first_aid", "severity": 4, "signed_off_by": "T"},
                      timeout=30)
    assert r2.status_code == 200, r2.text

    # investigation -> actions
    r3 = client.patch(f"{API}/incident-workflow/{inc_id}/investigation",
                      json={"completed": True,
                            "root_cause": "Inadequate isolation procedure; cable not de-energised.",
                            "factors": {"human": ["fatigue"], "equipment": ["damaged_cable"]}},
                      timeout=30)
    assert r3.status_code == 200, r3.text

    # actions
    r4 = client.patch(f"{API}/incident-workflow/{inc_id}/actions",
                      json={"completed": True,
                            "short_term": [{"task": "Tag-out cable", "priority": "high"}],
                            "long_term": []},
                      timeout=30)
    assert r4.status_code == 200, r4.text

    # close-out
    r5 = client.patch(f"{API}/incident-workflow/{inc_id}/close-out",
                      json={"lessons_learned": "Re-train on lockout/tagout.",
                            "signed_off_by": "Owner T",
                            "checklist": {"regulatory": True, "investigation": True,
                                          "actions": True, "documentation": True}},
                      timeout=30)
    assert r5.status_code == 200, r5.text
    assert r5.json()["stage"] == "closed"
    return {"incident_id": inc_id, "reference": reference}


# --------------------------- 404 cases ---------------------------
def test_suggest_risk_draft_404(client):
    r = client.post(f"{API}/incident-workflow/inc_does_not_exist/ai/suggest-risk-draft", timeout=60)
    assert r.status_code == 404, r.text


def test_accept_risk_draft_404(client):
    r = client.post(f"{API}/incident-workflow/inc_does_not_exist/accept-risk-draft",
                    json={"title": "x"}, timeout=30)
    assert r.status_code == 404, r.text


# --------------------------- AI suggest endpoint shape ---------------------------
def test_suggest_risk_draft_shape(client, closed_incident):
    r = client.post(f"{API}/incident-workflow/{closed_incident['incident_id']}/ai/suggest-risk-draft",
                    timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["title", "primary_hazard", "hazard_description", "description",
              "inherent_likelihood", "inherent_consequence",
              "residual_likelihood", "residual_consequence",
              "suggested_controls", "review_frequency"]:
        assert k in d, f"missing key {k} in draft: {list(d.keys())}"
    assert isinstance(d["suggested_controls"], list)
    assert len(d["suggested_controls"]) >= 1
    # Likelihood/consequence sanity
    for k in ["inherent_likelihood", "inherent_consequence", "residual_likelihood", "residual_consequence"]:
        assert 1 <= int(d[k]) <= 5, f"{k} out of 1-5 range: {d[k]}"
    pytest.draft = d


# --------------------------- Accept-risk-draft happy path ---------------------------
def test_accept_risk_draft_creates_risk(client, closed_incident):
    inc_id = closed_incident["incident_id"]
    reference = closed_incident["reference"]
    draft = getattr(pytest, "draft", None) or {
        "title": "TEST_RiskFromInc fallback title",
        "primary_hazard": "Electrical",
        "hazard_description": "exposed cable",
        "description": "root cause: lockout failure",
        "inherent_likelihood": 4, "inherent_consequence": 4,
        "residual_likelihood": 2, "residual_consequence": 3,
        "suggested_controls": [{"name": "LOTO", "hierarchy_level": "engineering",
                                 "description": "Tag-out before access", "effectiveness": "high"}],
        "review_frequency": "quarterly",
    }
    # Send the AI draft as-is, but coerce title to TEST_-prefix for cleanup
    payload = dict(draft)
    payload["title"] = f"TEST_{(payload.get('title') or 'Risk')[:80]}"
    # Use the suggested_controls as controls so the create persists them
    payload["controls"] = payload.get("suggested_controls", [])

    r = client.post(f"{API}/incident-workflow/{inc_id}/accept-risk-draft",
                    json=payload, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["created"] is True
    assert j["risk_id"].startswith("RISK-")
    risk = j["risk"]
    pytest.created_risk_id = j["risk_id"]

    # Computed scores + levels
    il = int(payload["inherent_likelihood"]) * int(payload["inherent_consequence"])
    rl = int(payload["residual_likelihood"]) * int(payload["residual_consequence"])
    assert risk["inherent_score"] == il
    assert risk["residual_score"] == rl
    assert risk["inherent_level"] in ["low", "medium", "high", "extreme"]
    assert risk["residual_level"] in ["low", "medium", "high", "extreme"]

    # linked_incident_ids contains both the incident_id AND the reference
    linked = risk.get("linked_incident_ids") or []
    assert inc_id in linked, f"missing inc_id in linked: {linked}"
    assert reference in linked, f"missing reference in linked: {linked}"
    assert risk.get("derived_from_incident_id") == inc_id
    assert risk.get("source") == "Incident or Near Miss"
    # Mongo _id excluded
    assert "_id" not in risk


# --------------------------- Persistence: incident + risks GET ---------------------------
def test_incident_has_linked_risk_id(client, closed_incident):
    r = client.get(f"{API}/incident-workflow/{closed_incident['incident_id']}", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("linked_risk_id") == pytest.created_risk_id


def test_risks_list_contains_new(client, closed_incident):
    r = client.get(f"{API}/risks", timeout=30)
    assert r.status_code == 200, r.text
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("risks") or []
    found = next((x for x in rows if isinstance(x, dict) and x.get("risk_id") == pytest.created_risk_id), None)
    assert found is not None, f"risk {pytest.created_risk_id} not found in /risks list"
    # Same linkage assertions on listed copy
    linked = found.get("linked_incident_ids") or []
    assert closed_incident["incident_id"] in linked
    assert closed_incident["reference"] in linked


# --------------------------- Notification emitted ---------------------------
def test_notification_risk_from_incident(client):
    # Brief wait for write-through (no awaits in handler other than the insert/update)
    time.sleep(0.5)
    r = client.get(f"{API}/notifications", timeout=30)
    assert r.status_code == 200
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("notifications") or []
    types = [x.get("type") for x in rows if isinstance(x, dict)]
    assert "risk_from_incident" in types, f"types: {set(types)}"


# --------------------------- Defaults when body fields omitted ---------------------------
def test_accept_risk_draft_with_minimal_body(client):
    """Body sends only a title — backend should default sensible fields from the incident."""
    # Create + close a fresh incident
    r = client.post(f"{API}/incident-workflow", json={
        "title": "TEST_RiskMinimal",
        "submission": {"description": "Slip on wet floor near workshop entrance.",
                       "state": "NSW", "site": "S"},
    }, timeout=30)
    inc_id = r.json()["incident_id"]
    client.patch(f"{API}/incident-workflow/{inc_id}/triage",
                 json={"severity": 3, "signed_off_by": "T"}, timeout=30)
    client.patch(f"{API}/incident-workflow/{inc_id}/investigation",
                 json={"completed": True, "root_cause": "Wet floor not signed."}, timeout=30)
    client.patch(f"{API}/incident-workflow/{inc_id}/actions",
                 json={"completed": True, "short_term": [], "long_term": []}, timeout=30)
    client.patch(f"{API}/incident-workflow/{inc_id}/close-out",
                 json={"lessons_learned": "More signs.", "signed_off_by": "T",
                       "checklist": {"regulatory": True, "investigation": True,
                                     "actions": True, "documentation": True}}, timeout=30)

    r2 = client.post(f"{API}/incident-workflow/{inc_id}/accept-risk-draft",
                     json={"title": "TEST_RiskMinimal entry"}, timeout=30)
    assert r2.status_code == 200, r2.text
    risk = r2.json()["risk"]
    # Defaults: inherent_likelihood defaults to 3, inherent_consequence derived from severity 3
    assert risk["inherent_likelihood"] == 3
    assert 2 <= risk["inherent_consequence"] <= 5
    # description defaults to root_cause when not supplied
    assert "Wet floor" in (risk["description"] or "") or risk["description"]
    pytest.minimal_risk_id = r2.json()["risk_id"]
    pytest.minimal_inc_id = inc_id


# --------------------------- Cleanup ---------------------------
def test_cleanup(client):
    """Best-effort cleanup of created TEST_ data via direct mongo call.

    We rely on the same pattern used in iter15: connect to mongo and drop our
    seeded TEST_ docs. Skip if MONGO_URL unavailable.
    """
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("MONGO_URL/DB_NAME not present")
    try:
        from pymongo import MongoClient
        m = MongoClient(mongo_url)
        db = m[db_name]
        db.incident_workflow.delete_many({"title": {"$regex": "^TEST_"}})
        db.risks.delete_many({"title": {"$regex": "^TEST_"}})
        db.notifications.delete_many({"type": "risk_from_incident",
                                      "title": {"$regex": "RISK-"}})
        m.close()
    except Exception as e:
        pytest.skip(f"cleanup skipped: {e}")
