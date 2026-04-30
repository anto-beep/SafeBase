"""Iter18 — Toolbox Talk → Worker Competency Matrix regression suite.

Covers:
- POST /api/toolbox-talks/{id}/conduct (success, 404, 400, upsert idempotency, audit_log)
- GET /api/workers/competencies (list with status)
- GET /api/workers/competencies/matrix (workers × topics with cells + coverage)
- GET /api/workers/unbriefed?topic= (current-only excluded)
- GET /api/competency/dashboard (hazard scoring & ranking)
- Topic→hazard mapping
"""
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"

TEST_PREFIX = f"TEST_iter18_{uuid.uuid4().hex[:6]}_"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    tok = body.get("access_token") or body.get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def user_id(headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    return r.json().get("user_id") or r.json().get("id")


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def seeded(headers, user_id, db):
    """Seed 2 workers + 2 toolbox talks (Electrical + Working at Heights)."""
    workers = []
    for nm in (f"{TEST_PREFIX}Alice", f"{TEST_PREFIX}Bob"):
        r = requests.post(f"{BASE_URL}/api/workers", headers=headers,
                          json={"name": nm, "trade": "Electrician", "role": "Worker",
                                "email": f"{nm}@x.test", "phone": "0400000000"}, timeout=15)
        assert r.status_code in (200, 201), r.text
        workers.append(r.json())

    # Create toolbox talks via the safety endpoint
    tbts = []
    for topic in ("Electrical Safety", "Working at Heights"):
        r = requests.post(
            f"{BASE_URL}/api/safety/toolbox_talks",
            headers=headers,
            json={"topic": topic, "title": f"{TEST_PREFIX}{topic}",
                  "duration_mins": 15, "scheduled_at": datetime.now(timezone.utc).isoformat()},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text
        tbts.append(r.json())

    yield {"workers": workers, "tbts": tbts}

    # Cleanup
    db.workers.delete_many({"user_id": user_id, "name": {"$regex": f"^{TEST_PREFIX}"}})
    db.safety_toolbox_talks.delete_many({"user_id": user_id, "title": {"$regex": f"^{TEST_PREFIX}"}})
    db.worker_competencies.delete_many({"user_id": user_id, "worker_name": {"$regex": f"^{TEST_PREFIX}"}})
    db.notifications.delete_many({"user_id": user_id, "type": "toolbox_conducted"})


# -------------------- 1. CONDUCT --------------------
class TestConduct:
    def test_conduct_404_unknown(self, headers):
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/nope_xxx/conduct",
                          headers=headers, json={"attendees": [{"worker_id": "w1", "name": "x"}]}, timeout=15)
        assert r.status_code == 404

    def test_conduct_400_empty_attendees(self, headers, seeded):
        item = seeded["tbts"][0]["item_id"]
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/{item}/conduct",
                          headers=headers, json={"attendees": []}, timeout=15)
        assert r.status_code == 400

    def test_conduct_400_missing_attendees(self, headers, seeded):
        item = seeded["tbts"][0]["item_id"]
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/{item}/conduct",
                          headers=headers, json={}, timeout=15)
        assert r.status_code == 400

    def test_conduct_success_stamps_workers(self, headers, seeded, db, user_id):
        tbt = seeded["tbts"][0]  # Electrical Safety
        attendees = [{"worker_id": w["worker_id"], "name": w["name"]} for w in seeded["workers"]]
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/{tbt['item_id']}/conduct",
                          headers=headers,
                          json={"attendees": attendees, "signed_off_by": "Owner",
                                "notes": "All present"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["conducted"] is True
        assert body["stamped_count"] == 2
        assert body["topic"] == "Electrical Safety"
        assert body["hazard_category"] == "Electrical"
        assert "expires_at" in body
        # +365 days approx
        exp = datetime.fromisoformat(body["expires_at"].replace("Z", "+00:00"))
        days_ahead = (exp - datetime.now(timezone.utc)).days
        assert 360 <= days_ahead <= 366

        # tbt updated
        doc = db.safety_toolbox_talks.find_one({"item_id": tbt["item_id"], "user_id": user_id})
        assert doc["status"] == "conducted"
        assert doc["attendees_count"] == 2
        assert "conducted_at" in doc

        # competency rows inserted — scoped to test workers only
        test_wids = [w["worker_id"] for w in seeded["workers"]]
        comp_rows = list(db.worker_competencies.find(
            {"user_id": user_id, "topic": "Electrical Safety",
             "worker_id": {"$in": test_wids}}))
        assert len(comp_rows) == 2

        # notification emitted
        notif = db.notifications.find_one({"user_id": user_id, "type": "toolbox_conducted",
                                           "toolbox_talk_id": tbt["item_id"]})
        assert notif is not None

    def test_conduct_idempotent_upsert(self, headers, seeded, db, user_id):
        tbt = seeded["tbts"][0]
        attendees = [{"worker_id": w["worker_id"], "name": w["name"]} for w in seeded["workers"]]
        # Re-conduct same toolbox same workers
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/{tbt['item_id']}/conduct",
                          headers=headers,
                          json={"attendees": attendees, "signed_off_by": "Owner"}, timeout=15)
        assert r.status_code == 200
        # Still exactly 2 rows for this topic — upsert
        n = db.worker_competencies.count_documents(
            {"user_id": user_id, "topic": "Electrical Safety",
             "worker_id": {"$in": [w["worker_id"] for w in seeded["workers"]]}})
        assert n == 2

    def test_conduct_validity_days_override(self, headers, seeded, db, user_id):
        tbt = seeded["tbts"][1]  # Working at Heights
        attendees = [{"worker_id": seeded["workers"][0]["worker_id"], "name": seeded["workers"][0]["name"]}]
        r = requests.post(f"{BASE_URL}/api/toolbox-talks/{tbt['item_id']}/conduct",
                          headers=headers,
                          json={"attendees": attendees, "signed_off_by": "Owner",
                                "validity_days": 90}, timeout=15)
        assert r.status_code == 200
        exp = datetime.fromisoformat(r.json()["expires_at"].replace("Z", "+00:00"))
        days = (exp - datetime.now(timezone.utc)).days
        assert 85 <= days <= 92
        assert r.json()["hazard_category"] == "Height / Fall"


# -------------------- 2. LIST + MATRIX --------------------
class TestMatrix:
    def test_list_competencies(self, headers, seeded):
        r = requests.get(f"{BASE_URL}/api/workers/competencies", headers=headers, timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # Should have stamps from prior tests
        topics = {r["topic"] for r in rows if r.get("worker_name", "").startswith(TEST_PREFIX)}
        assert "Electrical Safety" in topics
        assert "Working at Heights" in topics
        for r_ in rows:
            assert r_["status"] in ("current", "expiring_soon", "expired")

    def test_matrix_shape(self, headers, seeded):
        r = requests.get(f"{BASE_URL}/api/workers/competencies/matrix", headers=headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "workers" in body and "topics" in body and "cells" in body and "coverage" in body
        topics_list = [t["topic"] for t in body["topics"]]
        assert "Electrical Safety" in topics_list
        assert "Working at Heights" in topics_list
        # hazard_category populated on topic objects
        for t in body["topics"]:
            assert "hazard_category" in t
        # Worker Alice should have at least Electrical Safety cell = current
        wid_alice = seeded["workers"][0]["worker_id"]
        assert wid_alice in body["cells"]
        assert body["cells"][wid_alice]["Electrical Safety"]["status"] == "current"
        # Coverage per worker
        cov = body["coverage"].get(wid_alice)
        assert cov is not None
        assert cov["total"] >= 2
        assert cov["current"] >= 2
        assert cov["pct"] >= 0


# -------------------- 3. UNBRIEFED --------------------
class TestUnbriefed:
    def test_unbriefed_excludes_current(self, headers, seeded):
        # Both workers are current on Electrical Safety
        r = requests.get(f"{BASE_URL}/api/workers/unbriefed",
                         params={"topic": "Electrical Safety"}, headers=headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["topic"] == "Electrical Safety"
        assert body["hazard_category"] == "Electrical"
        # Test workers should not be in unbriefed list (both current)
        unbriefed_ids = {w["worker_id"] for w in body["unbriefed"]}
        for w in seeded["workers"]:
            assert w["worker_id"] not in unbriefed_ids

    def test_unbriefed_for_unknown_topic(self, headers, seeded):
        r = requests.get(f"{BASE_URL}/api/workers/unbriefed",
                         params={"topic": "Confined Spaces"}, headers=headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["hazard_category"] == "Confined Space"
        unbriefed_ids = {w["worker_id"] for w in body["unbriefed"]}
        # Both test workers should appear (never briefed)
        for w in seeded["workers"]:
            assert w["worker_id"] in unbriefed_ids
        # status should be 'missing'
        for u in body["unbriefed"]:
            if u["worker_id"] in {w["worker_id"] for w in seeded["workers"]}:
                assert u["status"] == "missing"

    def test_unbriefed_partial_for_heights(self, headers, seeded):
        # Only Alice was conducted on Heights, Bob wasn't
        r = requests.get(f"{BASE_URL}/api/workers/unbriefed",
                         params={"topic": "Working at Heights"}, headers=headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        unbriefed_ids = {w["worker_id"] for w in body["unbriefed"]}
        bob_id = seeded["workers"][1]["worker_id"]
        alice_id = seeded["workers"][0]["worker_id"]
        assert bob_id in unbriefed_ids
        assert alice_id not in unbriefed_ids


# -------------------- 4. DASHBOARD --------------------
class TestDashboard:
    def test_dashboard_shape(self, headers, db, user_id):
        # Seed an open SWMS revision linked to a fresh risk so the widget has data
        risk_id = f"risk_{TEST_PREFIX}{uuid.uuid4().hex[:6]}"
        db.risks.insert_one({
            "risk_id": risk_id, "user_id": user_id,
            "title": f"{TEST_PREFIX}Heights Risk", "primary_hazard": "Height / Fall",
            "status": "open", "audit_log": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        swr_id = f"swr_{uuid.uuid4().hex[:8]}"
        db.swms_revision_tasks.insert_one({
            "swms_revision_id": swr_id, "user_id": user_id,
            "title": f"{TEST_PREFIX}Update Heights SWMS",
            "linked_risk_id": risk_id, "status": "open", "priority": "high",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        try:
            r = requests.get(f"{BASE_URL}/api/competency/dashboard", headers=headers, timeout=15)
            assert r.status_code == 200, r.text
            body = r.json()
            assert "active_hazards" in body
            assert "total_hazards" in body
            assert "total_workers" in body
            assert isinstance(body["active_hazards"], list)
            assert len(body["active_hazards"]) <= 5

            # Find our seeded hazard
            heights = [h for h in body["active_hazards"] if h["hazard"] == "Height / Fall"]
            assert len(heights) >= 1
            h = heights[0]
            assert h["score"] >= 3  # high priority swms revision
            assert "unbriefed_count" in h
            assert "total_workers" in h
            assert "briefed_count" in h
            assert "coverage_pct" in h
            assert "source_count" in h
            assert "sources" in h
            assert "risk_ids" in h
        finally:
            db.risks.delete_many({"risk_id": risk_id})
            db.swms_revision_tasks.delete_many({"swms_revision_id": swr_id})


# -------------------- 5. AUDIT LOG ON LINKED RISK --------------------
class TestAuditLog:
    def test_audit_log_appended_on_conduct(self, headers, db, user_id):
        # Create a risk + tbt with linked_risk_id directly
        risk_id = f"risk_{TEST_PREFIX}aud_{uuid.uuid4().hex[:4]}"
        db.risks.insert_one({
            "risk_id": risk_id, "user_id": user_id,
            "title": f"{TEST_PREFIX}Audit Risk",
            "primary_hazard": "Electrical", "status": "open",
            "audit_log": [], "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Create tbt via API then patch linked_risk_id directly
        r = requests.post(f"{BASE_URL}/api/safety/toolbox_talks", headers=headers,
                          json={"topic": "Electrical Safety", "title": f"{TEST_PREFIX}Linked TBT",
                                "duration_mins": 10}, timeout=15)
        assert r.status_code in (200, 201)
        item_id = r.json()["item_id"]
        db.safety_toolbox_talks.update_one({"item_id": item_id, "user_id": user_id},
                                           {"$set": {"linked_risk_id": risk_id}})
        # Make a worker
        rw = requests.post(f"{BASE_URL}/api/workers", headers=headers,
                           json={"name": f"{TEST_PREFIX}Audit Worker", "trade": "Electrician",
                                 "role": "Worker", "email": "aud@x.test"}, timeout=15)
        wid = rw.json()["worker_id"]

        try:
            rc = requests.post(f"{BASE_URL}/api/toolbox-talks/{item_id}/conduct",
                               headers=headers,
                               json={"attendees": [{"worker_id": wid, "name": "Audit Worker"}],
                                     "signed_off_by": "Owner"}, timeout=15)
            assert rc.status_code == 200
            risk = db.risks.find_one({"risk_id": risk_id})
            assert risk and risk.get("audit_log")
            entries = [e for e in risk["audit_log"] if e.get("field") == "toolbox_conducted"]
            assert len(entries) >= 1
            assert "1 workers briefed" in entries[-1]["new"]
        finally:
            db.risks.delete_many({"risk_id": risk_id})
            db.safety_toolbox_talks.delete_many({"item_id": item_id})
            db.worker_competencies.delete_many({"worker_id": wid})
            db.workers.delete_many({"worker_id": wid})


# -------------------- 6. TOPIC→HAZARD MAPPING --------------------
class TestHazardMapping:
    @pytest.mark.parametrize("topic,expected", [
        ("Electrical Safety", "Electrical"),
        ("Working at Heights", "Height / Fall"),
        ("Confined Spaces", "Confined Space"),
        ("Hazardous Substances", "Chemical / Hazardous Substance"),
        ("Random Unknown Topic XYZ", "Other"),
    ])
    def test_mapping(self, headers, topic, expected):
        r = requests.get(f"{BASE_URL}/api/workers/unbriefed",
                         params={"topic": topic}, headers=headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["hazard_category"] == expected
