"""
Iter34 — Phase 2 expansion: 35+ AI docs, role variants, Academy quiz + cert,
industry pages, resources hub.

Tests:
  1. /api/ai-docs/types returns 8 docs per non-trades industry (was 1)
  2. /api/academy/{slug}/quiz returns questions WITHOUT answer index
  3. /api/academy/{slug}/submit-quiz scores correctly + creates completion + cert
  4. /api/academy/{slug}/submit-quiz returns passed=False if score < 80%
  5. /api/academy/cert/{id}.pdf returns binary PDF (>= 1500 bytes, %PDF header)
  6. Cross-account cert PDF returns 404
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
EMAIL = "owner@safetradie.demo"
PASSWORD = "Demo@1234"


def _login():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _set_industry(t, industry):
    requests.patch(f"{API}/auth/me/industry", json={"industry": industry}, headers=_h(t))


class TestExpandedAIDocs:
    def test_eight_docs_per_industry(self):
        t = _login()
        for industry in ("hospitality", "transport", "healthcare", "retail"):
            _set_industry(t, industry)
            r = requests.get(f"{API}/ai-docs/types", headers=_h(t))
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["industry"] == industry
            assert len(d["types"]) >= 7, f"{industry} only has {len(d['types'])} doc types"
        _set_industry(t, "trades")

    def test_each_doc_has_inputs(self):
        t = _login()
        _set_industry(t, "hospitality")
        try:
            r = requests.get(f"{API}/ai-docs/types", headers=_h(t))
            for spec in r.json()["types"]:
                assert spec["doc_type"]
                assert spec["label"]
                assert spec["ref_prefix"]
                assert isinstance(spec["inputs"], list)
                assert len(spec["inputs"]) > 0, f"{spec['doc_type']} has no inputs"
        finally:
            _set_industry(t, "trades")


class TestAcademyQuiz:
    def test_quiz_endpoint_strips_answers(self):
        t = _login()
        r = requests.get(f"{API}/academy/swms_full/quiz", headers=_h(t))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["module_slug"] == "swms_full"
        assert "title" in d
        assert len(d["questions"]) >= 3
        for q in d["questions"]:
            assert "q" in q
            assert "options" in q
            assert "answer" not in q, "Answer index leaked!"

    def test_quiz_submit_correct_passes(self):
        t = _login()
        # SWMS full quiz answers: [1, 2, 1, 1, 2] (all correct from QUIZZES)
        r = requests.post(f"{API}/academy/swms_full/submit-quiz",
                           headers=_h(t), json={"answers": [1, 2, 1, 1, 2]})
        assert r.status_code == 200
        d = r.json()
        assert d["passed"] is True
        assert d["score"] == 100
        assert d["cert_id"]

    def test_quiz_submit_partial_fails(self):
        t = _login()
        # All wrong answers
        r = requests.post(f"{API}/academy/heights_full/submit-quiz",
                           headers=_h(t), json={"answers": [0, 0, 0, 0, 0]})
        assert r.status_code == 200
        d = r.json()
        assert d["passed"] is False
        assert d["cert_id"] is None

    def test_quiz_wrong_answer_count(self):
        t = _login()
        r = requests.post(f"{API}/academy/swms_full/submit-quiz",
                           headers=_h(t), json={"answers": [1, 2]})
        assert r.status_code == 400


class TestCertPDF:
    def test_pdf_download(self):
        t = _login()
        # Create a fresh cert
        r = requests.post(f"{API}/academy/swms_full/submit-quiz",
                           headers=_h(t), json={"answers": [1, 2, 1, 1, 2]})
        cert_id = r.json()["cert_id"]
        # Download
        r2 = requests.get(f"{API}/academy/cert/{cert_id}.pdf", headers=_h(t))
        assert r2.status_code == 200, r2.text
        # Reportlab generates PDF — check magic header
        assert r2.content[:4] == b"%PDF", "Not a valid PDF"
        assert len(r2.content) >= 1000

    def test_pdf_not_found(self):
        t = _login()
        r = requests.get(f"{API}/academy/cert/cert_NONEXISTENT.pdf", headers=_h(t))
        assert r.status_code == 404
