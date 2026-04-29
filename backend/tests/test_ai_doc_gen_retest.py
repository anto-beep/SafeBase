"""Iteration 2 retest: AI Document Generation event-loop fix.

Verifies:
 1. POST /api/documents/generate returns 200 with markdown content OR 503 (clean) - never 500/502/504.
 2. Backend event loop is NOT blocked while an AI gen call is in flight:
    a parallel GET /api/auth/me must return < 5s even while gen is still running.
"""
import os
import uuid
import time
import threading
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def user_token():
    suffix = uuid.uuid4().hex[:8]
    email = f"test_aigen_{suffix}@safetradie.demo"
    r = requests.post(
        f"{API}/auth/register",
        json={
            "email": email,
            "password": "Demo@1234",
            "name": "AIGen Tester",
            "company_name": "AICo",
            "role": "owner",
        },
        timeout=20,
    )
    assert r.status_code == 200, f"register failed {r.status_code} {r.text}"
    return r.json()["token"]


def test_generate_endpoint_returns_clean_status(user_token):
    """Endpoint must return 200 with content OR 503 cleanly within ~95s."""
    h = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
    payload = {
        "document_type": "SWMS",
        "trade": "electrical",
        "job_description": "Install new switchboard in commercial kitchen",
        "site_location": "123 Test St, Sydney",
        "hazards": ["electric shock", "working at heights"],
        "extra_notes": "Two workers, one supervisor.",
    }
    t0 = time.time()
    r = requests.post(f"{API}/documents/generate", headers=h, json=payload, timeout=120)
    elapsed = time.time() - t0
    print(f"\n[gen] status={r.status_code} elapsed={elapsed:.1f}s")

    # Must NOT be a server crash or gateway error
    assert r.status_code in (200, 503), (
        f"Expected 200 or 503, got {r.status_code}. Body: {r.text[:300]}"
    )
    # Must finish before the 90s timeout buffer + small overhead
    assert elapsed < 110, f"Endpoint took {elapsed:.1f}s - timeout protection failed"

    if r.status_code == 200:
        d = r.json()
        assert "document_id" in d
        assert isinstance(d["content"], str) and len(d["content"]) > 100
        # cleanup
        requests.delete(f"{API}/documents/{d['document_id']}", headers=h, timeout=10)
    else:
        # 503: must have meaningful detail, not be a crash
        body = r.json()
        assert "detail" in body
        print(f"[gen] 503 detail: {body['detail'][:120]}")


def test_event_loop_not_blocked_during_generation(user_token):
    """While a slow gen call is in flight, GET /api/auth/me must return quickly (<5s).

    This proves the FastAPI event loop is not blocked by the synchronous LLM call.
    """
    h = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}

    gen_result = {}

    def fire_gen():
        try:
            t0 = time.time()
            r = requests.post(
                f"{API}/documents/generate",
                headers=h,
                json={
                    "document_type": "SWMS",
                    "trade": "plumbing",
                    "job_description": "Replace hot water unit on commercial site",
                    "site_location": "Parallel Test Site",
                    "hazards": ["scalding", "manual handling"],
                    "extra_notes": "Parallel test request",
                },
                timeout=120,
            )
            gen_result["status"] = r.status_code
            gen_result["elapsed"] = time.time() - t0
            gen_result["body"] = r.text[:200]
        except Exception as e:
            gen_result["error"] = str(e)

    t = threading.Thread(target=fire_gen)
    t.start()

    # Give the gen request ~2s to actually start hitting the LLM
    time.sleep(2)

    # Probe: /api/auth/me must respond fast even while gen is mid-flight
    me_times = []
    for i in range(3):
        t0 = time.time()
        r = requests.get(f"{API}/auth/me", headers=h, timeout=10)
        e = time.time() - t0
        me_times.append(e)
        print(f"[probe {i+1}] /auth/me status={r.status_code} elapsed={e:.2f}s")
        assert r.status_code == 200, f"auth/me failed during gen: {r.status_code}"
        time.sleep(1)

    # All probes must be fast - event loop is not blocked
    max_probe = max(me_times)
    assert max_probe < 5.0, (
        f"Event loop appears BLOCKED: /auth/me took up to {max_probe:.2f}s "
        f"during AI generation (probes: {me_times})"
    )

    # Wait for gen to finish so we can clean up if it succeeded
    t.join(timeout=130)
    print(f"[gen-bg] result: {gen_result}")
    if gen_result.get("status") == 200:
        try:
            import json as _json
            doc = _json.loads(gen_result.get("body", "{}"))
            if doc.get("document_id"):
                requests.delete(
                    f"{API}/documents/{doc['document_id']}", headers=h, timeout=10
                )
        except Exception:
            pass
    # Background gen should also have ended in 200 or 503 (not 500/timeout)
    assert gen_result.get("status") in (200, 503), (
        f"Background gen returned unexpected: {gen_result}"
    )
