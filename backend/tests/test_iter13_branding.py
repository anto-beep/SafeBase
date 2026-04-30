"""Iter13 - Partner Branding + regression of billing tiers (Enterprise).

Covers:
- POST /api/auth/login (owner@safetradie.demo)
- GET /api/partner/branding -> defaults
- PUT /api/partner/branding -> persists + forces show_powered_by=true for Level 1
- POST /api/partner/branding/verify-dns -> pending state
- POST /api/partner/branding/test-email -> queued dry-run
- GET /api/billing/tiers -> 8 entries (4 tiers x 2 cycles)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    t = r.json().get("access_token") or r.json().get("token")
    assert t, f"no token in response: {r.json()}"
    return t


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- GET branding ----------------
class TestGetBranding:
    def test_get_branding_returns_shape(self, auth_headers):
        r = requests.get(f"{API}/partner/branding", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # required defaults — partnership_level defaults to 1 when absent
        pl = d.get("partnership_level", 1)
        assert pl == 1, f"expected partnership_level 1, got {pl}"
        # primary_colour may be customised if partner has saved branding before
        assert d.get("primary_colour"), "primary_colour missing"
        # Level 1 must always have show_powered_by True
        if pl == 1:
            # show_powered_by may be missing in doc; default True
            spb = d.get("show_powered_by", True)
            assert spb is True
        # shape keys present
        for k in ["secondary_colour", "welcome_message", "subdomain", "custom_domain_status",
                  "support_contact_email", "email_signature"]:
            assert k in d, f"missing key {k}"


# ---------------- PUT branding ----------------
class TestPutBranding:
    def test_put_persists_and_forces_powered_by(self, auth_headers):
        payload = {
            "partner_name": "TEST_Iter13 Consulting",
            "primary_colour": "#123456",
            "secondary_colour": "#abcdef",
            "welcome_message": "TEST_Iter13 hello client",
            "support_contact_name": "TEST_Iter13 Support",
            "support_contact_email": "support@test-iter13.example",
            "support_contact_phone": "+61 400 000 000",
            "email_signature": "TEST_Iter13 sig",
            "subdomain": "iter13",
            "show_powered_by": False,   # level 1 should force back to True
        }
        r = requests.put(f"{API}/partner/branding", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        saved = r.json()
        assert saved.get("partner_name") == "TEST_Iter13 Consulting"
        assert saved.get("primary_colour") == "#123456"
        assert saved.get("show_powered_by") is True, "Level 1 must not hide Powered by"
        assert saved.get("welcome_message") == "TEST_Iter13 hello client"

        # GET to verify persistence
        g = requests.get(f"{API}/partner/branding", headers=auth_headers, timeout=30)
        assert g.status_code == 200
        gd = g.json()
        assert gd.get("partner_name") == "TEST_Iter13 Consulting"
        assert gd.get("primary_colour") == "#123456"
        assert gd.get("show_powered_by") is True


# ---------------- verify-dns ----------------
class TestVerifyDns:
    def test_verify_dns_returns_pending(self, auth_headers):
        r = requests.post(f"{API}/partner/branding/verify-dns",
                          json={"subdomain": "clients"},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("status") == "pending"
        assert d.get("target") == "partners.safetradie.com.au"

        # Persisted on branding doc
        g = requests.get(f"{API}/partner/branding", headers=auth_headers, timeout=30)
        assert g.status_code == 200
        gd = g.json()
        assert gd.get("custom_domain_status") == "pending"
        assert gd.get("subdomain") == "clients"

    def test_verify_dns_requires_subdomain(self, auth_headers):
        r = requests.post(f"{API}/partner/branding/verify-dns",
                          json={"subdomain": ""},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 400


# ---------------- test-email ----------------
class TestTestEmail:
    def test_test_email_queued(self, auth_headers):
        r = requests.post(f"{API}/partner/branding/test-email",
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("queued") is True
        assert d.get("to") == EMAIL
        assert "subject" in d and d["subject"]
        assert "preview_line_1" in d
        assert "preview_line_2" in d
        assert "signature" in d


# ---------------- Regression: billing tiers ----------------
class TestBillingTiersRegression:
    def test_tiers_has_8_entries(self):
        r = requests.get(f"{API}/billing/tiers", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # May be dict or list
        if isinstance(d, dict):
            # maybe { "tiers": [...] }
            if "tiers" in d:
                items = d["tiers"]
            else:
                items = list(d.values())
        else:
            items = d
        assert len(items) == 8, f"expected 8 tiers, got {len(items)}: {items}"
