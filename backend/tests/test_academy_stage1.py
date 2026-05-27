"""Stage 1 MVP — SafeBase Academy backend tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for local
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

DEMOS = {
    "trades": ("trades.demo@safebase.com.au", "Demo@1234", 18, 5),
    "hospitality": ("hospitality.demo@safebase.com.au", "Demo@1234", 16, 4),
    "transport": ("transport.demo@safebase.com.au", "Demo@1234", 16, 3),
    "healthcare": ("healthcare.demo@safebase.com.au", "Demo@1234", 22, 2),
    "retail": ("retail.demo@safebase.com.au", "Demo@1234", 16, 3),
}

MVP_SLUGS = [
    "trades_general_induction_refresher", "heights_full", "confined_space_full",
    "swms_full", "trades_manual_handling",
    "food_handler_cert", "hosp_haccp_implementation", "hosp_personal_hygiene",
    "hosp_allergen_management",
    "cor_full", "transport_hv_driver_awareness", "fatigue_full",
    "acqsc_full", "health_sirs_reporting",
    "retail_whs_team_members", "retail_manual_handling", "retail_lone_worker",
]

RTO_SLUGS = [
    "trades_general_induction_refresher", "food_handler_cert",
    "rsa_foundation", "retail_age_restricted_alcohol",
]


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    j = r.json()
    return j.get("access_token") or j["token"]


@pytest.fixture(scope="module")
def trades_token():
    return _login(*DEMOS["trades"][:2])


@pytest.fixture(scope="module")
def all_tokens():
    return {ind: _login(em, pw) for ind, (em, pw, *_) in DEMOS.items()}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- catalogue ----------
class TestCatalogue:
    def test_catalogue_no_industry_infers_from_user(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/catalogue", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("industry", "modules", "microlearning", "standard", "full_courses",
                 "stage1_mvp", "total_modules", "rto_boundary_notice"):
            assert k in d, f"missing key: {k}"
        assert d["industry"] == "trades"
        assert d["total_modules"] == 18
        assert len(d["stage1_mvp"]) == 5

    @pytest.mark.parametrize("industry", list(DEMOS.keys()))
    def test_catalogue_counts(self, trades_token, industry):
        r = requests.get(
            f"{BASE_URL}/api/academy/catalogue", params={"industry": industry},
            headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        _, _, total, mvp = DEMOS[industry]
        assert d["total_modules"] == total, f"{industry}: expected {total}, got {d['total_modules']}"
        assert len(d["stage1_mvp"]) == mvp, f"{industry}: expected {mvp} MVP, got {len(d['stage1_mvp'])}"
        # bucket sum == total
        assert (len(d["microlearning"]) + len(d["standard"]) + len(d["full_courses"])) == total

    def test_mvp_modules_have_required_fields(self, trades_token):
        for industry in DEMOS:
            r = requests.get(f"{BASE_URL}/api/academy/catalogue",
                             params={"industry": industry}, headers=_h(trades_token), timeout=15)
            for m in r.json()["stage1_mvp"]:
                for k in ("slug", "title", "type", "duration_minutes", "regulatory_anchor"):
                    assert k in m and m[k] is not None, f"{m.get('slug')}: missing {k}"
                assert m.get("mvp_stage1") is True
                assert m.get("authoring_standard") == "SCORM 1.2 + xAPI"
                assert m.get("scorm_package_url") is None

    def test_rto_modules_have_disclaimer(self, trades_token):
        slugs_found = set()
        for industry in DEMOS:
            r = requests.get(f"{BASE_URL}/api/academy/catalogue",
                             params={"industry": industry}, headers=_h(trades_token), timeout=15)
            for m in r.json()["modules"]:
                if m["slug"] in RTO_SLUGS:
                    slugs_found.add(m["slug"])
                    assert m.get("rto_boundary") is True, f"{m['slug']} should be rto_boundary"
                    assert isinstance(m.get("rto_disclaimer"), str) and m["rto_disclaimer"]
        assert slugs_found == set(RTO_SLUGS), f"missing: {set(RTO_SLUGS) - slugs_found}"


# ---------- module record ----------
class TestModule:
    @pytest.mark.parametrize("slug", ["cor_full", "swms_full", "food_handler_cert",
                                       "retail_lone_worker", "health_sirs_reporting"])
    def test_module_known(self, trades_token, slug):
        r = requests.get(f"{BASE_URL}/api/academy/modules/{slug}", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["slug"] == slug

    def test_module_404(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/modules/no_such_module",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 404


# ---------- quizzes ----------
class TestQuizzes:
    @pytest.mark.parametrize("slug", MVP_SLUGS)
    def test_mvp_quiz_has_5_questions(self, trades_token, slug):
        r = requests.get(f"{BASE_URL}/api/academy/{slug}/quiz", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert len(d["questions"]) == 5, f"{slug}: got {len(d['questions'])} questions"
        assert d.get("regulatory_anchor"), f"{slug}: missing regulatory_anchor"
        # answers stripped
        for q in d["questions"]:
            assert "answer" not in q
            assert "q" in q and "options" in q

    def test_non_mvp_quiz_falls_back_to_3q(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/electrical_full/quiz",
                         headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
        assert len(r.json()["questions"]) == 3

    def test_rto_quiz_has_disclaimer_passthrough(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/trades_general_induction_refresher/quiz",
                         headers=_h(trades_token), timeout=15)
        d = r.json()
        assert d["rto_boundary"] is True
        assert isinstance(d.get("rto_disclaimer"), str) and d["rto_disclaimer"]


# ---------- submit + cert ----------
class TestSubmit:
    def test_submit_correct_passes_and_creates_cert(self, trades_token):
        # swms_full real answers (from QUIZZES): [1,2,1,1,2]
        r = requests.post(f"{BASE_URL}/api/academy/swms_full/submit-quiz",
                          headers=_h(trades_token), json={"answers": [1, 2, 1, 1, 2]}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["passed"] is True, d
        assert d["score"] >= 80
        assert d["cert_id"], d
        # verify completion appears
        comps = requests.get(f"{BASE_URL}/api/academy/completions",
                             headers=_h(trades_token), timeout=15).json()
        assert any(c["completion_id"] == d["cert_id"] for c in comps)
        for c in comps:
            assert "_id" not in c

    def test_submit_wrong_returns_no_cert(self, trades_token):
        r = requests.post(f"{BASE_URL}/api/academy/heights_full/submit-quiz",
                          headers=_h(trades_token), json={"answers": [0, 0, 0, 0, 0]}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["passed"] is False
        assert d["cert_id"] is None

    def test_submit_wrong_count_400(self, trades_token):
        r = requests.post(f"{BASE_URL}/api/academy/swms_full/submit-quiz",
                          headers=_h(trades_token), json={"answers": [1, 2]}, timeout=15)
        assert r.status_code == 400


# ---------- cert PDF ----------
class TestCert:
    def test_own_cert_pdf(self, trades_token):
        # create one
        r = requests.post(f"{BASE_URL}/api/academy/swms_full/submit-quiz",
                          headers=_h(trades_token), json={"answers": [1, 2, 1, 1, 2]}, timeout=20)
        cid = r.json()["cert_id"]
        assert cid
        rp = requests.get(f"{BASE_URL}/api/academy/cert/{cid}.pdf",
                          headers=_h(trades_token), timeout=20)
        assert rp.status_code == 200
        # accept pdf or txt fallback
        ct = rp.headers.get("content-type", "")
        assert "pdf" in ct or "text" in ct

    def test_stranger_cert_404(self, trades_token, all_tokens):
        # create a cert with trades
        r = requests.post(f"{BASE_URL}/api/academy/swms_full/submit-quiz",
                          headers=_h(trades_token), json={"answers": [1, 2, 1, 1, 2]}, timeout=20)
        cid = r.json()["cert_id"]
        # try to fetch with retail user
        rp = requests.get(f"{BASE_URL}/api/academy/cert/{cid}.pdf",
                          headers=_h(all_tokens["retail"]), timeout=15)
        assert rp.status_code == 404


# ---------- legacy regression ----------
class TestLegacy:
    def test_legacy_courses_still_works(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/courses", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200

    def test_legacy_enrolments_still_works(self, trades_token):
        r = requests.get(f"{BASE_URL}/api/academy/enrolments", headers=_h(trades_token), timeout=15)
        assert r.status_code == 200
