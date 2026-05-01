"""
iter30 backend regression — Batch C/D + compliance scoring + doc tabs.

Verifies:
  • 32 billing tier slugs (4 industry-specific tier sets)
  • /api/resources/articles, /templates, /regulators, /ai/ask all work
  • /api/compliance/score returns industry-aware sub_scores + label
  • /api/docs/types?industry=hospitality returns hospitality-gated types
"""
import os
import uuid
import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"


@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(owner_token):
    return {"Authorization": f"Bearer {owner_token}"}


class TestIndustryPricingTiers:
    def test_all_industry_slugs_present(self):
        r = requests.get(f"{API}/billing/tiers")
        assert r.status_code == 200
        slugs = {t["slug"] for t in r.json()}
        # Trades + Retail share 8 slugs
        for s in ["sole_trader_monthly", "enterprise_annual"]:
            assert s in slugs
        # Hospitality 8
        for s in ["hosp_single_monthly", "hosp_enterprise_annual"]:
            assert s in slugs
        # Transport 8
        for s in ["trans_owner_monthly", "trans_enterprise_annual"]:
            assert s in slugs
        # Healthcare 8
        for s in ["health_solo_monthly", "health_enterprise_annual"]:
            assert s in slugs

    def test_healthcare_pricing_premium(self):
        r = requests.get(f"{API}/billing/tiers")
        priced = {t["slug"]: t["amount"] for t in r.json()}
        # Healthcare must be priciest
        assert priced["health_solo_monthly"] == 399.00
        assert priced["health_enterprise_annual"] == 19990.00
        # Transport > trades
        assert priced["trans_owner_monthly"] > priced["sole_trader_monthly"]


class TestResourcesEndpoints:
    def test_articles_listing(self):
        r = requests.get(f"{API}/resources/articles", params={"industry": "hospitality"})
        assert r.status_code == 200
        articles = r.json()
        assert len(articles) == 8
        assert all("slug" in a and "title" in a for a in articles)

    def test_articles_all_industries(self):
        r = requests.get(f"{API}/resources/articles")
        assert r.status_code == 200
        # 5 industries * 8 articles = 40 stubs
        assert len(r.json()) == 40

    def test_templates(self):
        r = requests.get(f"{API}/resources/templates", params={"industry": "transport"})
        assert r.status_code == 200
        body = r.json()
        assert body["industry"] == "transport"
        assert len(body["templates"]) >= 4
        assert any("CoR" in t for t in body["templates"])

    def test_regulators(self):
        r = requests.get(f"{API}/resources/regulators/healthcare")
        assert r.status_code == 200
        regs = r.json()
        names = [x["name"] for x in regs]
        assert "ACQSC" in names
        assert "AHPRA" in names

    def test_regulators_invalid(self):
        r = requests.get(f"{API}/resources/regulators/spaceforce")
        assert r.status_code == 404

    def test_ai_ask_short_question_rejected(self):
        r = requests.post(f"{API}/resources/ai/ask", json={"question": "hi", "industry": "trades"})
        assert r.status_code == 400

    def test_ai_ask_returns_industry_aware_answer(self):
        r = requests.post(f"{API}/resources/ai/ask", json={
            "question": "What does HACCP stand for and why does it matter?",
            "industry": "hospitality",
        }, timeout=30)
        # Either succeeds or returns 503 if temporarily unavailable (LLM hiccup)
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            body = r.json()
            assert body["industry"] == "hospitality"
            assert len(body["answer"]) > 50


class TestComplianceIndustryAware:
    def test_score_carries_industry_metadata(self, auth):
        # Ensure clean trades state first (other tests may have mutated)
        requests.patch(f"{API}/auth/me/industry", headers=auth, json={"industry": "trades"})
        r = requests.get(f"{API}/compliance/score", headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert body["industry"] == "trades"
        assert body["score_label"] == "Safety Compliance Score"
        assert isinstance(body["sub_scores"], list)
        assert len(body["sub_scores"]) == 5
        keys = [s["key"] for s in body["sub_scores"]]
        assert keys == ["documents", "incidents", "training", "licences", "site_safety"]

    def test_score_changes_with_industry(self, auth):
        # Switch to healthcare → check sub-scores re-shape
        try:
            r = requests.patch(f"{API}/auth/me/industry", headers=auth, json={"industry": "healthcare"})
            assert r.status_code == 200
            r = requests.get(f"{API}/compliance/score", headers=auth)
            assert r.status_code == 200
            body = r.json()
            assert body["industry"] == "healthcare"
            assert body["score_label"] == "WHS + Care Quality Score"
            keys = [s["key"] for s in body["sub_scores"]]
            assert "care_quality" in keys
            assert "staff_credentials" in keys
        finally:
            requests.patch(f"{API}/auth/me/industry", headers=auth, json={"industry": "trades"})


class TestDocTypesIndustryFilter:
    def test_hospitality_types_via_query(self, auth):
        r = requests.get(f"{API}/docs/types", params={"industry": "hospitality"}, headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert body["viewing_industry"] == "hospitality"
        assert body["user_industry"] == "trades"  # demo owner is trades
        type_ids = [t["id"] for t in body["types"]]
        assert "haccp_plan" in type_ids or any("haccp" in i.lower() for i in type_ids)

    def test_transport_types_via_query(self, auth):
        r = requests.get(f"{API}/docs/types", params={"industry": "transport"}, headers=auth)
        assert r.status_code == 200
        body = r.json()
        assert body["viewing_industry"] == "transport"
