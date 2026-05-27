"""
Backend test: People-Picker (cross-cutting) + CAPA Register
Iter 54 — Academy Stage 1 follow-up
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY = ("trades.demo@safebase.com.au", "Demo@1234")
SECONDARY = ("hospitality.demo@safebase.com.au", "Demo@1234")


# --------- fixtures ---------
@pytest.fixture(scope="session")
def primary_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": PRIMARY[0], "password": PRIMARY[1]})
    if r.status_code != 200:
        pytest.skip(f"primary login failed: {r.status_code} {r.text[:120]}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="session")
def secondary_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": SECONDARY[0], "password": SECONDARY[1]})
    if r.status_code != 200:
        return None
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture
def auth(primary_token):
    return {"Authorization": f"Bearer {primary_token}"}


@pytest.fixture
def auth2(secondary_token):
    if not secondary_token:
        pytest.skip("secondary user not available")
    return {"Authorization": f"Bearer {secondary_token}"}


# --------- People Picker ---------
class TestPeoplePicker:
    def test_picker_default_returns_me_first(self, auth):
        r = requests.get(f"{API}/users/picker", headers=auth)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert rows[0]["source_type"] == "me"
        # shape
        for k in ("user_id", "worker_id", "display_name", "email", "role", "source_type"):
            assert k in rows[0]
        # No _id leakage
        for r0 in rows:
            assert "_id" not in r0

    def test_picker_include_me_false_strips_me(self, auth):
        r = requests.get(f"{API}/users/picker?include_me=false", headers=auth)
        assert r.status_code == 200
        rows = r.json()
        assert all(row["source_type"] != "me" for row in rows)

    def test_picker_search_no_match(self, auth):
        r = requests.get(f"{API}/users/picker?q=nonsense_xyz_qq", headers=auth)
        assert r.status_code == 200
        rows = r.json()
        # Only Me may remain when include_me default = true
        non_me = [x for x in rows if x.get("source_type") != "me"]
        assert non_me == []

    def test_picker_limit_caps(self, auth):
        r = requests.get(f"{API}/users/picker?limit=2", headers=auth)
        assert r.status_code == 200
        assert len(r.json()) <= 2

    def test_picker_search_match(self, auth):
        r = requests.get(f"{API}/users/picker?q=demo", headers=auth)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # at least me remains
        assert len(rows) >= 1

    def test_picker_source_types_present(self, auth):
        # seed a worker so source_type='worker' appears
        wr = requests.post(f"{API}/workers", headers=auth, json={
            "name": "TEST_PickerWorker",
            "email": f"test_picker_{uuid.uuid4().hex[:6]}@example.com",
            "role": "carpenter",
        })
        if wr.status_code not in (200, 201):
            pytest.skip(f"workers POST not available: {wr.status_code}")
        r = requests.get(f"{API}/users/picker?include_me=false", headers=auth)
        assert r.status_code == 200
        rows = r.json()
        sources = {row["source_type"] for row in rows}
        assert "worker" in sources or "user" in sources


# --------- CAPA Register ---------
class TestCapaCRUD:
    def test_isolation_secondary_empty_of_primary_capas(self, auth, auth2):
        # primary creates a CAPA
        r1 = requests.post(f"{API}/capa", headers=auth,
                           json={"description": "TEST_isolation primary",
                                 "action_type": "corrective"})
        assert r1.status_code == 200
        cid = r1.json()["capa_id"]
        # secondary should NOT see it
        r2 = requests.get(f"{API}/capa", headers=auth2)
        assert r2.status_code == 200
        ids = [x.get("capa_id") for x in r2.json()]
        assert cid not in ids

    def test_create_minimal(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_minimal capa",
            "action_type": "preventive",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "open"
        assert d["action_type"] == "preventive"
        assert "capa_id" in d

    def test_create_empty_description_400(self, auth):
        r = requests.post(f"{API}/capa", headers=auth,
                          json={"description": "", "action_type": "corrective"})
        assert r.status_code == 400

    def test_create_with_picker_object(self, auth):
        picker = {
            "user_id": "u_123",
            "worker_id": "w_456",
            "display_name": "TEST_AssignedDave",
            "email": "dave@example.com",
            "role": "supervisor",
            "source_type": "user",
        }
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_assigned picker",
            "action_type": "corrective",
            "assigned_to": picker,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["assigned_to"]["user_id"] == "u_123"
        assert d["assigned_to"]["worker_id"] == "w_456"
        assert d["assigned_to"]["display_name"] == "TEST_AssignedDave"
        assert d["assigned_to"]["source_type"] == "user"

    def test_create_with_legacy_string_assignee(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_legacy str",
            "action_type": "corrective",
            "assigned_to": "Just A Name",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["assigned_to"]["display_name"] == "Just A Name"
        assert d["assigned_to"]["source_type"] == "legacy"
        assert d["assigned_to"]["user_id"] is None

    def test_get_single_and_404(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_getone", "action_type": "corrective"})
        cid = r.json()["capa_id"]
        g = requests.get(f"{API}/capa/{cid}", headers=auth)
        assert g.status_code == 200
        assert g.json()["capa_id"] == cid
        m = requests.get(f"{API}/capa/capa_doesnotexist", headers=auth)
        assert m.status_code == 404

    def test_filters_status_action_linked(self, auth):
        # create one with linked entity
        requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_filtered preventive",
            "action_type": "preventive",
            "linked_entity_type": "review",
            "linked_entity_id": "rev_TESTABC",
        })
        r = requests.get(f"{API}/capa?status=open", headers=auth)
        assert r.status_code == 200
        assert all(x["status"] == "open" for x in r.json())
        r = requests.get(f"{API}/capa?action_type=preventive", headers=auth)
        assert r.status_code == 200
        assert all(x["action_type"] == "preventive" for x in r.json())
        r = requests.get(f"{API}/capa?linked_entity_type=review&linked_entity_id=rev_TESTABC",
                         headers=auth)
        assert r.status_code == 200
        assert len(r.json()) >= 1
        assert all(x["linked_entity_id"] == "rev_TESTABC" for x in r.json())

    def test_patch_status(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_patch", "action_type": "corrective"})
        cid = r.json()["capa_id"]
        p = requests.patch(f"{API}/capa/{cid}", headers=auth,
                           json={"status": "in_progress"})
        assert p.status_code == 200
        assert p.json()["status"] == "in_progress"
        # invalid
        bad = requests.patch(f"{API}/capa/{cid}", headers=auth,
                             json={"status": "foobar"})
        assert bad.status_code == 400

    def test_close_capa(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_close", "action_type": "corrective"})
        cid = r.json()["capa_id"]
        c = requests.post(f"{API}/capa/{cid}/close", headers=auth,
                          json={"closure_notes": "done"})
        assert c.status_code == 200, c.text
        d = c.json()
        assert d["status"] == "closed"
        assert d["closed_at"]
        assert d["closed_by"]
        assert d["closure_notes"] == "done"
        # second close -> 400
        again = requests.post(f"{API}/capa/{cid}/close", headers=auth,
                              json={"closure_notes": "again"})
        assert again.status_code == 400

    def test_delete_soft(self, auth):
        r = requests.post(f"{API}/capa", headers=auth, json={
            "description": "TEST_del", "action_type": "corrective"})
        cid = r.json()["capa_id"]
        d = requests.delete(f"{API}/capa/{cid}", headers=auth)
        assert d.status_code == 200
        # fetch and confirm archived
        g = requests.get(f"{API}/capa/{cid}", headers=auth)
        assert g.status_code == 200
        assert g.json()["status"] == "archived"

    def test_summary(self, auth):
        r = requests.get(f"{API}/capa/summary", headers=auth)
        assert r.status_code == 200
        s = r.json()
        for k in ("open", "in_progress", "closed", "overdue", "total"):
            assert k in s
            assert isinstance(s[k], int)


# --------- Risk Review accept-remediation -> CAPA spawn ---------
class TestAcceptRemediationCapa:
    def _create_review(self, auth):
        # Need a risk first
        r = requests.post(f"{API}/risks", headers=auth, json={
            "title": "TEST_remed risk",
            "description": "for capa spawn test",
            "category": "operational",
            "likelihood": 3, "consequence": 3,
        })
        if r.status_code not in (200, 201):
            return None, None
        risk_id = r.json().get("risk_id") or r.json().get("id")
        # create a review
        rv = requests.post(f"{API}/risk-reviews", headers=auth, json={
            "risk_id": risk_id,
            "review_type": "scheduled",
            "controls_reviewed": [],
        })
        if rv.status_code not in (200, 201):
            return risk_id, None
        rid = rv.json().get("review_id") or rv.json().get("id")
        return risk_id, rid

    def test_accept_remediation_spawns_capa(self, auth):
        risk_id, review_id = self._create_review(auth)
        if not review_id:
            pytest.skip("risk-reviews flow not available")
        body = {
            "capa_items": [
                {
                    "description": "TEST_spawned1",
                    "action_type": "corrective",
                    "assigned_to": {
                        "display_name": "TEST_picker_obj",
                        "source_type": "user",
                    },
                    "priority": "high",
                }
            ]
        }
        r = requests.post(f"{API}/risk-reviews/{review_id}/accept-remediation",
                          headers=auth, json=body)
        assert r.status_code in (200, 201), r.text
        out = r.json()
        assert "capa_ids" in out and len(out["capa_ids"]) == 1
        cid = out["capa_ids"][0]
        # verify it appears in /api/capa with linked entity + source
        lst = requests.get(f"{API}/capa?linked_entity_type=review&linked_entity_id={review_id}",
                           headers=auth)
        assert lst.status_code == 200
        match = [x for x in lst.json() if x["capa_id"] == cid]
        assert len(match) == 1
        assert match[0]["source"] == "risk_review_remediation"

    def test_accept_remediation_empty_400(self, auth):
        risk_id, review_id = self._create_review(auth)
        if not review_id:
            pytest.skip("risk-reviews flow not available")
        r = requests.post(f"{API}/risk-reviews/{review_id}/accept-remediation",
                          headers=auth, json={})
        assert r.status_code == 400
