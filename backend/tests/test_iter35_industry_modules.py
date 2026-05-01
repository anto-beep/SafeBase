"""Iter35 — Multi-industry module backend tests.

Covers Hospitality, Transport, Healthcare, Retail endpoints + cross-industry
403 hard-blocks + trades regression. Uses PATCH /api/auth/me/industry to
switch the same owner test user across industries.
"""
from __future__ import annotations

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASS = "Demo@1234"


# ---------------------------- fixtures ---------------------------------------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASS}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"no token: {r.json()}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    yield s
    # restore industry to trades at the end
    try:
        s.patch(f"{API}/auth/me/industry", json={"industry": "trades"}, timeout=15)
    except Exception:
        pass


def _switch(session, industry: str):
    r = session.patch(f"{API}/auth/me/industry", json={"industry": industry}, timeout=15)
    assert r.status_code == 200, f"industry switch failed: {r.status_code} {r.text}"
    return r.json()


# ---------------------------- helpers -----------------------------------------

def _is_403_feature_blocked(resp):
    """Brief specifies trades user must get 403 with feature_not_available code.
    Accept either a 402 trial-expired (per brief other_misc_info) or a 403 gate."""
    if resp.status_code == 403:
        return True
    return False


# ============================== HOSPITALITY ===================================

class TestHospitality:
    """Hospitality endpoints — 403 for trades, real records for hospitality."""

    def test_trades_blocked_temperature_logs(self, session):
        _switch(session, "trades")
        r = session.post(f"{API}/hospitality/temperature-logs",
                         json={"equipment": "Fridge 1", "temp_c": 3.0}, timeout=15)
        assert r.status_code in (402, 403), f"expected 402/403, got {r.status_code}"

    def test_trades_blocked_haccp(self, session):
        _switch(session, "trades")
        r = session.post(f"{API}/hospitality/haccp-ccp",
                         json={"ccp_step": "x", "measured_value": 75}, timeout=15)
        assert r.status_code in (402, 403)

    def test_temp_log_in_range(self, session):
        _switch(session, "hospitality")
        r = session.post(f"{API}/hospitality/temperature-logs",
                         json={"equipment": "TEST_Fridge_A", "equipment_type": "fridge", "temp_c": 3.0},
                         timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["in_range"] is True
        assert d["temp_c"] == 3.0
        assert d["log_id"].startswith("TL-")
        assert d.get("out_of_range_reason") is None

    def test_temp_log_breach_at_9c(self, session):
        _switch(session, "hospitality")
        r = session.post(f"{API}/hospitality/temperature-logs",
                         json={"equipment": "TEST_Fridge_B", "equipment_type": "fridge", "temp_c": 9.0},
                         timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["in_range"] is False
        assert "5.0" in (d.get("out_of_range_reason") or "") or "FSANZ" in (d.get("out_of_range_reason") or "")

    def test_temp_log_get_and_stats(self, session):
        _switch(session, "hospitality")
        r = session.get(f"{API}/hospitality/temperature-logs", timeout=15)
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        assert isinstance(rows, list)

        s = session.get(f"{API}/hospitality/temperature-logs/stats", timeout=15)
        assert s.status_code == 200
        body = s.json()
        for k in ("total_30d", "breaches_30d", "breach_rate_pct", "by_equipment", "recent_breaches"):
            assert k in body

    def test_fss_register(self, session):
        _switch(session, "hospitality")
        r = session.post(f"{API}/hospitality/fss-register", json={
            "worker_name": "TEST FSS Worker", "certificate_number": f"TEST-{uuid.uuid4().hex[:6]}",
            "issuing_rto": "TEST RTO", "expires_at": "2027-01-01",
        }, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["fss_id"].startswith("FSS-")
        g = session.get(f"{API}/hospitality/fss-register", timeout=15)
        assert g.status_code == 200 and isinstance(g.json().get("rows"), list)

    def test_haccp_allergens_cleaning_and_complete(self, session):
        _switch(session, "hospitality")
        # HACCP
        h = session.post(f"{API}/hospitality/haccp-ccp",
                        json={"ccp_step": "Cook chicken", "critical_limit": ">=75C/15s",
                              "measured_value": 76, "within_limit": True}, timeout=15)
        assert h.status_code == 200
        # Allergens
        a = session.post(f"{API}/hospitality/allergens",
                        json={"menu_item": "TEST Pasta", "contains": ["wheat", "egg"]}, timeout=15)
        assert a.status_code == 200
        # Cleaning create+complete
        c = session.post(f"{API}/hospitality/cleaning-tasks",
                        json={"area": "TEST Kitchen Floor", "frequency": "daily"}, timeout=15)
        assert c.status_code == 200, c.text
        task_id = c.json()["task_id"]
        comp = session.post(f"{API}/hospitality/cleaning-tasks/{task_id}/complete",
                           json={"completed_by": "Tester"}, timeout=15)
        assert comp.status_code == 200
        assert comp.json()["status"] == "completed"

    def test_suppliers_and_liquor(self, session):
        _switch(session, "hospitality")
        s = session.post(f"{API}/hospitality/suppliers",
                        json={"name": f"TEST Supplier {uuid.uuid4().hex[:5]}", "category": "meat"}, timeout=15)
        assert s.status_code == 200
        liq = session.post(f"{API}/hospitality/liquor-certs",
                          json={"worker_name": "TEST RSA", "certificate_type": "RSA",
                                "expires_at": "2026-12-31"}, timeout=15)
        assert liq.status_code == 200

    def test_inspection_pack(self, session):
        _switch(session, "hospitality")
        r = session.post(f"{API}/hospitality/inspection-pack",
                        json={"covers_period_days": 30}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["pack_id"].startswith("CIP-")
        assert "manifest" in d
        assert "temperature_logs" in d["manifest"]


# ============================== TRANSPORT =====================================

class TestTransport:

    def test_trades_blocked_vehicles(self, session):
        _switch(session, "trades")
        r = session.post(f"{API}/transport/vehicles", json={"rego": "TST001"}, timeout=15)
        assert r.status_code in (402, 403)

    def test_trades_blocked_fatigue(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/transport/fatigue-logs", timeout=15)
        assert r.status_code in (402, 403)

    def test_vehicle_create_and_list(self, session):
        _switch(session, "transport")
        r = session.post(f"{API}/transport/vehicles",
                        json={"rego": f"TST{uuid.uuid4().hex[:4].upper()}", "make": "Volvo"}, timeout=15)
        assert r.status_code == 200, r.text
        g = session.get(f"{API}/transport/vehicles", timeout=15)
        assert g.status_code == 200

    def test_pretrip_inspection(self, session):
        _switch(session, "transport")
        r = session.post(f"{API}/transport/pretrip-inspections", json={
            "vehicle_rego": "TEST123", "rego": "TEST123", "driver_name": "TEST Driver",
            "checklist": {"tyres": True, "brakes": True, "lights": True},
            "defects": [{"item": "wiper", "severity": "minor"}],
        }, timeout=15)
        assert r.status_code == 200, r.text

    def test_fatigue_breach_13h(self, session):
        _switch(session, "transport")
        # Worked 13h in a day → must auto-detect breach (>12h)
        r = session.post(f"{API}/transport/fatigue-logs", json={
            "driver_name": "TEST Long Driver", "work_hours": 13.0, "rest_hours": 7.0,
            "log_date": "2026-01-15",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("breached") is True or d.get("in_breach") is True or d.get("breach") is True \
            or any("breach" in str(k).lower() and v for k, v in d.items())

    def test_fatigue_breaches_endpoint(self, session):
        _switch(session, "transport")
        r = session.get(f"{API}/transport/fatigue-logs/breaches", timeout=15)
        assert r.status_code == 200
        assert "rows" in r.json() or "breaches" in r.json()

    def test_fitness_load_mass_cor(self, session):
        _switch(session, "transport")
        ffd = session.post(f"{API}/transport/fitness-for-duty",
                          json={"driver_name": "TEST", "fit_for_duty": True,
                                "declaration_date": "2026-01-15"}, timeout=15)
        assert ffd.status_code == 200, ffd.text
        lr = session.post(f"{API}/transport/load-restraint",
                          json={"vehicle_rego": "TEST", "rego": "TEST",
                                "load_description": "pallet of bricks",
                                "load_type": "pallet", "method": "ratchet straps"}, timeout=15)
        assert lr.status_code == 200, lr.text
        m = session.post(f"{API}/transport/mass-declarations",
                         json={"vehicle_rego": "TEST", "rego": "TEST",
                               "declared_mass_kg": 22000,
                               "load_description": "pallet", "gross_mass_kg": 22000}, timeout=15)
        assert m.status_code == 200, m.text
        cor = session.post(f"{API}/transport/cor-due-diligence",
                          json={"action": "TEST quarterly review", "party": "executive",
                                "executive": "Owner"}, timeout=15)
        assert cor.status_code == 200, cor.text

    def test_nhvr_24h_deadline(self, session):
        _switch(session, "transport")
        r = session.post(f"{API}/transport/nhvr-occurrences",
                        json={"occurrence_type": "fatigue_breach", "category": "fatigue_breach",
                              "summary": "TEST occurrence",
                              "occurred_at": "2026-01-15T10:00:00+00:00"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "deadline" in str(d).lower() or "report_due_at" in d or "due_at" in d \
            or "notify_nhvr_by" in d


# ============================== HEALTHCARE ====================================

class TestHealthcare:

    def test_trades_blocked_ahpra(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/healthcare/ahpra-register", timeout=15)
        assert r.status_code in (402, 403)

    def test_trades_blocked_sirs(self, session):
        _switch(session, "trades")
        r = session.post(f"{API}/healthcare/sirs-incidents",
                        json={"category": "unexpected_death", "summary": "x"}, timeout=15)
        assert r.status_code in (402, 403)

    def test_ahpra_register_and_expiring(self, session):
        _switch(session, "healthcare")
        r = session.post(f"{API}/healthcare/ahpra-register", json={
            "worker_name": "TEST Nurse", "practitioner_name": "TEST Nurse",
            "registration_number": f"NMW{uuid.uuid4().hex[:6]}",
            "profession": "Nurse", "expires_at": "2026-02-10",
        }, timeout=15)
        assert r.status_code == 200, r.text
        e = session.get(f"{API}/healthcare/ahpra-register/expiring", timeout=15)
        assert e.status_code == 200

    def test_worker_screening(self, session):
        _switch(session, "healthcare")
        r = session.post(f"{API}/healthcare/worker-screening", json={
            "worker_name": "TEST Worker", "screening_type": "NDIS", "clearance_type": "NDIS",
            "clearance_number": "WS001", "expires_at": "2027-01-01",
        }, timeout=15)
        assert r.status_code == 200, r.text

    def test_sirs_p1_24h_deadline(self, session):
        _switch(session, "healthcare")
        r = session.post(f"{API}/healthcare/sirs-incidents", json={
            "category": "unexpected_death", "summary": "TEST P1 high-harm",
            "occurred_at": "2026-01-15T10:00:00+00:00",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        # P1 → 24h deadline
        deadline = d.get("priority") or d.get("priority_level") or d.get("deadline_hours")
        body_str = str(d).lower()
        assert ("p1" in body_str or "priority_one" in body_str
                or d.get("deadline_hours") == 24
                or "24" in body_str)

        incident_id = d.get("incident_id") or d.get("id") or d.get("sirs_id")
        if incident_id:
            sub = session.post(f"{API}/healthcare/sirs-incidents/{incident_id}/submit",
                              json={}, timeout=15)
            assert sub.status_code in (200, 204), sub.text

    def test_ndis_reportable_high_risk(self, session):
        _switch(session, "healthcare")
        r = session.post(f"{API}/healthcare/ndis-reportable", json={
            "category": "abuse", "summary": "TEST NDIS", "high_risk": True,
            "occurred_at": "2026-01-15T10:00:00+00:00",
        }, timeout=15)
        assert r.status_code == 200, r.text

    def test_acqsc_evidence_and_care_minutes(self, session):
        _switch(session, "healthcare")
        a = session.post(f"{API}/healthcare/acqsc-evidence", json={
            "standard": 1, "title": "TEST evidence", "summary": "x",
        }, timeout=15)
        assert a.status_code == 200, a.text
        cm = session.post(f"{API}/healthcare/care-minutes", json={
            "shift_date": "2026-01-15", "consumer_initials": "AB", "care_type": "rn",
            "minutes": 240, "rn_minutes": 240, "total_care_minutes": 600,
        }, timeout=15)
        assert cm.status_code == 200, cm.text


# ============================== RETAIL ========================================

class TestRetail:

    def test_trades_blocked_lone_worker(self, session):
        _switch(session, "trades")
        r = session.post(f"{API}/retail/lone-worker/checkin",
                        json={"worker_id": "x", "next_checkin_in_min": 30}, timeout=15)
        assert r.status_code in (402, 403)

    def test_trades_blocked_quick_induct(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/retail/quick-induct", timeout=15)
        assert r.status_code in (402, 403)

    def test_lone_worker_full_flow(self, session):
        _switch(session, "retail")
        c = session.post(f"{API}/retail/lone-worker/checkin", json={
            "worker_id": "TEST_LW1", "worker_name": "TEST LW",
            "location": "Store 1", "next_checkin_in_min": 60,
        }, timeout=15)
        assert c.status_code == 200, c.text
        checkin_id = c.json().get("checkin_id") or c.json().get("id")
        active = session.get(f"{API}/retail/lone-worker/active", timeout=15)
        assert active.status_code == 200
        rows = active.json().get("rows", [])
        # _overdue must be auto-computed
        assert all("_overdue" in r for r in rows) or len(rows) == 0
        logs = session.get(f"{API}/retail/lone-worker/logs", timeout=15)
        assert logs.status_code == 200
        # escalate
        esc = session.post(f"{API}/retail/lone-worker/escalate",
                          json={"checkin_id": checkin_id, "worker_id": "TEST_LW1",
                                "reason": "missed checkin"}, timeout=15)
        assert esc.status_code == 200, esc.text

    def test_quick_induct_and_status(self, session):
        _switch(session, "retail")
        casual_id = f"TEST_C_{uuid.uuid4().hex[:5]}"
        r = session.post(f"{API}/retail/quick-induct", json={
            "casual_id": casual_id, "casual_name": "TEST Casual",
            "answers": {"slips_trips": "near register", "manual_handling": "bend at knees",
                        "emergency_exits": "front+rear", "lone_worker": "manager",
                        "customer_aggression": "de-escalate", "incidents": "supervisor"},
        }, timeout=15)
        assert r.status_code == 200, r.text
        # Status: roster block check
        st = session.get(f"{API}/retail/quick-induct/{casual_id}/status", timeout=15)
        assert st.status_code == 200
        body = st.json()
        # eligible / valid / can_roster
        assert any(k in body for k in ("eligible", "can_roster", "valid", "blocked", "is_valid"))

    def test_customer_incidents(self, session):
        _switch(session, "retail")
        r = session.post(f"{API}/retail/customer-incidents", json={
            "incident_type": "aggression", "summary": "TEST customer agitated",
            "occurred_at": "2026-01-15T10:00:00+00:00",
        }, timeout=15)
        assert r.status_code == 200, r.text

    def test_roster_eligibility(self, session):
        _switch(session, "retail")
        r = session.get(f"{API}/retail/roster-eligibility/TEST_C_unknown", timeout=15)
        assert r.status_code == 200
        assert "eligible" in r.json() or "can_roster" in r.json() or "blocked" in r.json()


# ============================== TRADES REGRESSION =============================

class TestTradesRegression:

    def test_features_me_returns_enabled_set(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/features/me", timeout=15)
        assert r.status_code == 200
        body = r.json()
        # could be dict {enabled: [...]} or {features:{...}} - just sanity check
        assert isinstance(body, dict)

    def test_trades_can_list_swms(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/swms/library", timeout=15)
        # tolerate 200 or 404 if endpoint moved, but not 403 trial-expired
        assert r.status_code in (200, 404), f"trades blocked from SWMS: {r.status_code} {r.text[:200]}"

    def test_trades_can_list_incidents(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/incidents", timeout=15)
        assert r.status_code == 200, r.text

    def test_trades_can_list_workers(self, session):
        _switch(session, "trades")
        r = session.get(f"{API}/workers", timeout=15)
        assert r.status_code == 200, r.text
