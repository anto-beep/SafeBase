"""Backend tests for iteration 17 — Risk Review → Toolbox Talk + SWMS Revision reverse loop.

Covers:
- POST /api/risk-reviews/{id}/ai/draft-remediation (Claude JSON / fallback schema)
- 404 when review doesn't exist
- Zero failing controls → no_failing:true
- POST /api/risk-reviews/{id}/accept-remediation (toolbox only, swms only, both, empty=400)
- Creates safety_toolbox_talks + swms_revision_tasks with defaults (+7d / +14d)
- Links remediation onto review, appends audit_log on risk, emits notification
- GET /api/swms-revisions list + PATCH status=completed sets completed_at + 404 bad id
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
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


@pytest.fixture(scope="module")
def seeded(client):
    """Create a risk + review with 2 failing controls, and a 2nd review with zero failing."""
    # risk
    risk_body = {
        "title": "TEST_remediation risk",
        "primary_hazard": "Electrical",
        "hazard_description": "exposed live parts",
        "activity_name": "Cable pulling and termination",
        "inherent_likelihood": 4, "inherent_consequence": 5,
        "residual_likelihood": 2, "residual_consequence": 3,
        "controls": [
            {"name": "LOTO before work", "hierarchy_level": "elimination", "effectiveness": "high"},
            {"name": "Insulated gloves", "hierarchy_level": "ppe", "effectiveness": "medium"},
        ],
        "review_frequency": "quarterly",
    }
    r = client.post(f"{API}/risks", json=risk_body, timeout=30)
    assert r.status_code == 200, r.text
    risk_id = r.json()["risk_id"]

    # review with failing controls
    review_body = {"risk_id": risk_id, "title": "TEST_remediation review",
                   "control_reviews": [
                       {"name": "LOTO before work", "hierarchy_level": "elimination",
                        "effectiveness": "not", "still_in_place": "partial",
                        "recommended_change": "improve", "evidence_text": "Observed work without LOTO."},
                       {"name": "Insulated gloves", "hierarchy_level": "ppe",
                        "effectiveness": "partial", "still_in_place": "yes",
                        "recommended_change": "replace", "evidence_text": "Gloves worn but not tested."},
                       {"name": "RCD protection", "hierarchy_level": "engineering",
                        "effectiveness": "effective", "still_in_place": "yes",
                        "recommended_change": "keep", "evidence_text": ""},
                   ]}
    r2 = client.post(f"{API}/risk-reviews", json=review_body, timeout=30)
    assert r2.status_code == 200, r2.text
    rv = r2.json()["review_id"]

    # review with NO failing controls
    ok_review = {"risk_id": risk_id, "title": "TEST_remediation ok review",
                 "control_reviews": [
                     {"name": "LOTO before work", "effectiveness": "effective",
                      "still_in_place": "yes", "recommended_change": "keep"},
                 ]}
    r3 = client.post(f"{API}/risk-reviews", json=ok_review, timeout=30)
    assert r3.status_code == 200, r3.text
    rv_ok = r3.json()["review_id"]

    return {"risk_id": risk_id, "review_id": rv, "review_id_ok": rv_ok}


# ---------- AI draft-remediation ----------
def test_draft_remediation_404(client):
    r = client.post(f"{API}/risk-reviews/RR-DOESNOTEX/ai/draft-remediation", timeout=30)
    assert r.status_code == 404


def test_draft_remediation_zero_failing(client, seeded):
    r = client.post(f"{API}/risk-reviews/{seeded['review_id_ok']}/ai/draft-remediation", timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("no_failing") is True
    assert "toolbox_talk" in d and "swms_revision" in d


def test_draft_remediation_shape(client, seeded):
    r = client.post(f"{API}/risk-reviews/{seeded['review_id']}/ai/draft-remediation", timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    tbt = d.get("toolbox_talk") or {}
    swr = d.get("swms_revision") or {}
    for k in ["topic", "objective", "key_points", "worker_questions", "sign_off_prompt"]:
        assert k in tbt, f"toolbox_talk missing {k}: {list(tbt.keys())}"
    for k in ["title", "summary", "changes", "priority"]:
        assert k in swr, f"swms_revision missing {k}: {list(swr.keys())}"
    failing = d.get("failing_controls") or []
    # server-side must detect 2 failing rows (effectiveness in not/partial, etc.)
    assert len(failing) == 2, f"expected 2 failing, got {len(failing)}"
    pytest.rem_draft = {"toolbox_talk": tbt, "swms_revision": swr}


# ---------- accept-remediation ----------
def test_accept_remediation_empty_400(client, seeded):
    r = client.post(f"{API}/risk-reviews/{seeded['review_id']}/accept-remediation",
                    json={}, timeout=30)
    assert r.status_code == 400, r.text


def test_accept_remediation_both(client, seeded):
    draft = getattr(pytest, "rem_draft", None) or {
        "toolbox_talk": {"topic": "TEST_TBT topic", "objective": "obj",
                          "key_points": ["k1", "k2"], "worker_questions": ["q1"],
                          "sign_off_prompt": "sign"},
        "swms_revision": {"title": "TEST_SWR title", "summary": "sum",
                          "changes": ["c1", "c2"], "priority": "high"},
    }
    # Prefix for cleanup
    draft["toolbox_talk"]["topic"] = "TEST_" + str(draft["toolbox_talk"].get("topic") or "tbt")[:70]
    draft["swms_revision"]["title"] = "TEST_" + str(draft["swms_revision"].get("title") or "swr")[:70]

    r = client.post(f"{API}/risk-reviews/{seeded['review_id']}/accept-remediation",
                    json=draft, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["created"] is True
    assert j["toolbox_talk_id"].startswith("tbt_")
    assert j["swms_revision_id"].startswith("swr_")
    assert "remediation" in j
    rem = j["remediation"]
    assert rem.get("accepted_at")
    assert rem.get("toolbox_talk_id") == j["toolbox_talk_id"]
    assert rem.get("swms_revision_id") == j["swms_revision_id"]
    pytest.tbt_id = j["toolbox_talk_id"]
    pytest.swr_id = j["swms_revision_id"]


def test_review_has_remediation(client, seeded):
    r = client.get(f"{API}/risk-reviews/{seeded['review_id']}", timeout=30)
    assert r.status_code == 200
    rem = (r.json() or {}).get("remediation") or {}
    assert rem.get("toolbox_talk_id") == pytest.tbt_id
    assert rem.get("swms_revision_id") == pytest.swr_id
    assert rem.get("toolbox_talk_topic")
    assert rem.get("swms_revision_title")


def test_risk_has_audit_entry(client, seeded):
    r = client.get(f"{API}/risks/{seeded['risk_id']}", timeout=30)
    assert r.status_code == 200
    audit = (r.json() or {}).get("audit_log") or []
    fields = [a.get("field") for a in audit]
    assert "remediation_created" in fields, f"audit fields: {fields}"


def test_notification_emitted(client):
    time.sleep(0.5)
    r = client.get(f"{API}/notifications", timeout=30)
    assert r.status_code == 200
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("notifications") or []
    types = [x.get("type") for x in rows if isinstance(x, dict)]
    assert "risk_remediation_created" in types, f"types: {set(types)}"


# ---------- swms-revisions list + PATCH ----------
def test_swms_revisions_list_contains_new(client):
    r = client.get(f"{API}/swms-revisions", timeout=30)
    assert r.status_code == 200
    rows = r.json()
    ids = [x.get("swms_revision_id") for x in rows]
    assert pytest.swr_id in ids
    doc = next(x for x in rows if x.get("swms_revision_id") == pytest.swr_id)
    assert doc.get("status") == "open"
    assert doc.get("due_date")  # defaulted +14d
    assert doc.get("linked_review_id")
    assert doc.get("linked_risk_id")


def test_patch_swms_revision_complete(client):
    r = client.patch(f"{API}/swms-revisions/{pytest.swr_id}",
                     json={"status": "completed"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("status") == "completed"
    assert d.get("completed_at")


def test_patch_swms_revision_404(client):
    r = client.patch(f"{API}/swms-revisions/swr_does_not_exist",
                     json={"status": "cancelled"}, timeout=30)
    assert r.status_code == 404


# ---------- toolbox only / swms only ----------
def test_accept_remediation_toolbox_only(client, seeded):
    # Create a fresh failing review
    body = {"risk_id": seeded["risk_id"], "title": "TEST_remediation tbt-only",
            "control_reviews": [{"name": "X", "effectiveness": "not",
                                  "still_in_place": "partial", "recommended_change": "replace"}]}
    r = client.post(f"{API}/risk-reviews", json=body, timeout=30)
    rv = r.json()["review_id"]
    r2 = client.post(f"{API}/risk-reviews/{rv}/accept-remediation",
                     json={"toolbox_talk": {"topic": "TEST_toolboxonly topic",
                                             "objective": "o",
                                             "key_points": ["k"], "worker_questions": ["q"],
                                             "sign_off_prompt": "s"}},
                     timeout=30)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert "toolbox_talk_id" in j
    assert "swms_revision_id" not in j


def test_accept_remediation_swms_only(client, seeded):
    body = {"risk_id": seeded["risk_id"], "title": "TEST_remediation swms-only",
            "control_reviews": [{"name": "Y", "effectiveness": "partial"}]}
    r = client.post(f"{API}/risk-reviews", json=body, timeout=30)
    rv = r.json()["review_id"]
    r2 = client.post(f"{API}/risk-reviews/{rv}/accept-remediation",
                     json={"swms_revision": {"title": "TEST_swmsonly title",
                                               "summary": "s",
                                               "changes": ["c1"], "priority": "medium"}},
                     timeout=30)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert "swms_revision_id" in j
    assert "toolbox_talk_id" not in j


# ---------- cleanup ----------
def test_cleanup(client):
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("MONGO_URL/DB_NAME not present")
    try:
        from pymongo import MongoClient
        m = MongoClient(mongo_url)
        db = m[db_name]
        db.risks.delete_many({"title": {"$regex": "^TEST_"}})
        db.risk_reviews.delete_many({"title": {"$regex": "^TEST_"}})
        db.safety_toolbox_talks.delete_many({"topic": {"$regex": "^TEST_"}})
        db.swms_revision_tasks.delete_many({"title": {"$regex": "^TEST_"}})
        db.notifications.delete_many({"type": "risk_remediation_created"})
        m.close()
    except Exception as e:
        pytest.skip(f"cleanup skipped: {e}")
