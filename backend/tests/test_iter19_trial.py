"""Iter19 — 14-day Free Trial regression suite.

Covers:
- POST /api/auth/register stamps trial_started_at + trial_ends_at(+14d) + subscription_status='trial'
- GET /api/billing/my-subscription lazy-backfill on legacy users; returns trial fields
- Day-10 reminder fires lazily when trial_days_left <= 4 (idempotent + creates notification)
- trial_gate middleware: expired trial + no active sub → 402 on writes, 200 on GET
- Active subscription bypasses gate
- Allow-listed paths /api/auth/, /api/billing/, /api/notifications never blocked
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://safe-systems.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

OWNER_EMAIL = "owner@safetradie.demo"
OWNER_PASSWORD = "Demo@1234"

TEST_PREFIX = f"TEST_iter19_{uuid.uuid4().hex[:6]}_"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def owner_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def owner_user_id(owner_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=owner_headers, timeout=10)
    assert r.status_code == 200
    return r.json().get("user_id") or r.json().get("id")


# -------------------- 1. REGISTER STAMPS TRIAL --------------------
class TestRegisterTrial:
    def test_register_stamps_trial_fields(self, db):
        email = f"{TEST_PREFIX}reg_{uuid.uuid4().hex[:5]}@example.com".lower()
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test@12345",
            "name": "TEST iter19 New",
            "role": "owner",
            "company_name": "TEST Co",
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        uid = data["user"]["user_id"]
        try:
            doc = db.users.find_one({"user_id": uid}, {"_id": 0})
            assert doc is not None
            assert doc["subscription_status"] == "trial"
            assert "trial_started_at" in doc
            assert "trial_ends_at" in doc
            start = datetime.fromisoformat(doc["trial_started_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(doc["trial_ends_at"].replace("Z", "+00:00"))
            assert 13 <= (end - start).days <= 14

            # my-subscription returns the fields
            tok = data["token"]
            ms = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                              headers={"Authorization": f"Bearer {tok}"}, timeout=15)
            assert ms.status_code == 200, ms.text
            mb = ms.json()
            assert mb["on_trial"] is True
            assert mb["trial_expired"] is False
            assert mb["read_only"] is False
            assert mb["trial_days_left"] in (13, 14)
            assert mb["trial_started_at"]
            assert mb["trial_ends_at"]
        finally:
            db.users.delete_one({"user_id": uid})


# -------------------- 2. LAZY BACKFILL (existing user) --------------------
class TestLazyBackfill:
    def test_owner_has_trial_fields_via_my_subscription(self, owner_headers, db, owner_user_id):
        # Force-clear trial fields, then call my-subscription, expect backfill.
        db.users.update_one(
            {"user_id": owner_user_id},
            {"$unset": {"trial_started_at": "", "trial_ends_at": "", "trial_reminder_sent_at": "",
                        "trial_reminder_status": ""}}
        )
        try:
            r = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                             headers=owner_headers, timeout=15)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("trial_started_at") is not None
            assert body.get("trial_ends_at") is not None
            # Either on_trial=True OR active subscription. Owner is on trial unless seeded as active.
            assert "on_trial" in body
            assert "trial_days_left" in body
            assert "trial_expired" in body
            assert "read_only" in body
            # DB persisted
            doc = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
            assert doc.get("trial_started_at")
            assert doc.get("trial_ends_at")
        finally:
            pass  # leave backfilled values; tests below need them


# -------------------- 3. ACTIVE SUBSCRIPTION RESPONSE --------------------
class TestActiveSubscriptionShape:
    def test_active_sub_overrides_trial_flags(self, owner_headers, db, owner_user_id):
        """Temporarily mark owner as active subscriber; my-subscription should
        return on_trial=false, read_only=false, trial_days_left=null."""
        original = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
        try:
            db.users.update_one(
                {"user_id": owner_user_id},
                {"$set": {"subscription_tier": "pro", "subscription_status": "active"}}
            )
            r = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                             headers=owner_headers, timeout=15)
            assert r.status_code == 200
            body = r.json()
            assert body["on_trial"] is False
            assert body["read_only"] is False
            assert body["trial_days_left"] is None
            assert body["trial_expired"] is False
        finally:
            # restore
            db.users.update_one(
                {"user_id": owner_user_id},
                {"$set": {
                    "subscription_tier": original.get("subscription_tier"),
                    "subscription_status": original.get("subscription_status", "trial"),
                }}
            )


# -------------------- 4. DAY-10 REMINDER (lazy + idempotent) --------------------
class TestTrialReminder:
    def test_day10_reminder_lazy_and_idempotent(self, owner_headers, db, owner_user_id):
        # Set ends_at 3 days from now → triggers reminder threshold (<= 4 days).
        future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        original = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
        db.users.update_one(
            {"user_id": owner_user_id},
            {"$set": {"trial_ends_at": future, "subscription_status": "trial"},
             "$unset": {"trial_reminder_sent_at": "", "trial_reminder_status": "",
                        "subscription_tier": ""}}
        )
        # Clear any stale reminder notifications
        db.notifications.delete_many({"user_id": owner_user_id, "type": "trial_ending_soon"})
        try:
            r = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                             headers=owner_headers, timeout=15)
            assert r.status_code == 200
            body = r.json()
            assert body["on_trial"] is True
            assert body["trial_days_left"] <= 4
            # Reminder should be stamped
            doc = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
            assert doc.get("trial_reminder_sent_at") is not None
            first_stamp = doc["trial_reminder_sent_at"]
            # Notification created
            n = db.notifications.find_one({"user_id": owner_user_id, "type": "trial_ending_soon"})
            assert n is not None
            assert "free trial ends" in (n.get("body") or "").lower()

            # Second call → idempotent (no new notification, same stamp)
            r2 = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                              headers=owner_headers, timeout=15)
            assert r2.status_code == 200
            doc2 = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
            assert doc2.get("trial_reminder_sent_at") == first_stamp
            count = db.notifications.count_documents(
                {"user_id": owner_user_id, "type": "trial_ending_soon"})
            assert count == 1
        finally:
            db.users.update_one(
                {"user_id": owner_user_id},
                {"$set": {
                    "trial_ends_at": original.get("trial_ends_at",
                        (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()),
                    "subscription_status": original.get("subscription_status", "trial"),
                },
                 "$unset": {"trial_reminder_sent_at": "", "trial_reminder_status": ""}}
            )
            db.notifications.delete_many({"user_id": owner_user_id, "type": "trial_ending_soon"})


# -------------------- 5. TRIAL GATE MIDDLEWARE --------------------
class TestTrialGateMiddleware:
    def test_expired_trial_blocks_writes_allows_reads(self, owner_headers, db, owner_user_id):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        original = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
        db.users.update_one(
            {"user_id": owner_user_id},
            {"$set": {"trial_ends_at": past, "subscription_status": "trial"},
             "$unset": {"subscription_tier": ""}}
        )
        try:
            # GET should still work
            rg = requests.get(f"{BASE_URL}/api/workers", headers=owner_headers, timeout=15)
            assert rg.status_code == 200, rg.text

            # POST (write) should be blocked with 402
            rp = requests.post(
                f"{BASE_URL}/api/workers",
                headers=owner_headers,
                json={"name": f"{TEST_PREFIX}Blocked", "trade": "Electrician",
                      "role": "Worker", "email": "block@x.test"},
                timeout=15,
            )
            assert rp.status_code == 402, f"expected 402 got {rp.status_code}: {rp.text}"
            body = rp.json()
            assert body.get("trial_expired") is True
            assert "detail" in body

            # my-subscription returns trial_expired/read_only true
            ms = requests.get(f"{BASE_URL}/api/billing/my-subscription",
                              headers=owner_headers, timeout=15)
            assert ms.status_code == 200
            mb = ms.json()
            assert mb["trial_expired"] is True
            assert mb["read_only"] is True
            assert mb["on_trial"] is True

            # Allow-listed path: /api/billing/ POST should NOT be blocked by gate
            # (it might 404/422 but not 402)
            rb = requests.post(
                f"{BASE_URL}/api/billing/preview",
                headers=owner_headers, json={"tier": "pro", "cycle": "monthly"},
                timeout=15,
            )
            assert rb.status_code != 402, f"billing path unexpectedly blocked: {rb.text}"
        finally:
            db.users.update_one(
                {"user_id": owner_user_id},
                {"$set": {
                    "trial_ends_at": original.get("trial_ends_at",
                        (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()),
                    "subscription_status": original.get("subscription_status", "trial"),
                }}
            )

    def test_active_subscription_bypasses_gate(self, owner_headers, db, owner_user_id):
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        original = db.users.find_one({"user_id": owner_user_id}, {"_id": 0})
        db.users.update_one(
            {"user_id": owner_user_id},
            {"$set": {"trial_ends_at": past, "subscription_tier": "pro",
                      "subscription_status": "active"}}
        )
        created_wid = None
        try:
            rp = requests.post(
                f"{BASE_URL}/api/workers", headers=owner_headers,
                json={"name": f"{TEST_PREFIX}ActiveSubAllowed", "trade": "Electrician",
                      "role": "Worker", "email": "active@x.test"},
                timeout=15,
            )
            assert rp.status_code in (200, 201), f"active sub blocked: {rp.text}"
            created_wid = rp.json().get("worker_id")
        finally:
            if created_wid:
                db.workers.delete_many({"worker_id": created_wid})
            db.users.update_one(
                {"user_id": owner_user_id},
                {"$set": {
                    "trial_ends_at": original.get("trial_ends_at",
                        (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()),
                    "subscription_tier": original.get("subscription_tier"),
                    "subscription_status": original.get("subscription_status", "trial"),
                }}
            )


# -------------------- 6. REGRESSION: login + GET basic --------------------
class TestRegression:
    def test_login_still_works(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=15)
        assert r.status_code == 200

    def test_get_workers_works(self, owner_headers):
        r = requests.get(f"{BASE_URL}/api/workers", headers=owner_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
