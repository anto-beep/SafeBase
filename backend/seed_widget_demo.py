"""Seed demo data for the per-industry dashboard widgets (Iter54).

Creates owner demo accounts (with known credentials), temp_units /
driver_work_diary / clinicians records so the new dashboard tiles render
with realistic content. Idempotent — safe to re-run.

Credentials seeded (all password = `Demo@1234`):
  • hospitality.demo@safebase.com.au
  • transport.demo@safebase.com.au
  • healthcare.demo@safebase.com.au
  • trades.demo@safebase.com.au
  • retail.demo@safebase.com.au
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
DEMO_PASSWORD = "Demo@1234"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


async def _ensure_owner(db, industry: str, email: str, name: str) -> str:
    """Upsert a known-password owner for the given industry. Returns user_id."""
    existing = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    pwd_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()
    base_fields = {
        "password_hash": pwd_hash,
        "role": "owner",
        "industry": industry,
        "primary_industry": industry,
        "name": name,
        "company_name": f"{name}'s Business",
        "subscription_status": "active",
        "onboarding_complete": True,   # skip the wizard for demo logins
    }
    if existing:
        await db.users.update_one({"email": email}, {"$set": base_fields})
        return existing["user_id"]
    uid = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": uid, "email": email,
        "role_title": "owner",
        "created_at": _iso(datetime.now(timezone.utc)),
        **base_fields,
    })
    return uid


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc)

    # Provision per-industry demo owners with known credentials
    owners = {
        "hospitality": await _ensure_owner(db, "hospitality", "hospitality.demo@safebase.com.au", "Hospitality Demo Owner"),
        "transport":   await _ensure_owner(db, "transport",   "transport.demo@safebase.com.au",   "Transport Demo Owner"),
        "healthcare":  await _ensure_owner(db, "healthcare",  "healthcare.demo@safebase.com.au",  "Healthcare Demo Owner"),
        "trades":      await _ensure_owner(db, "trades",      "trades.demo@safebase.com.au",      "Trades Demo Owner"),
        "retail":      await _ensure_owner(db, "retail",      "retail.demo@safebase.com.au",      "Retail Demo Owner"),
    }
    for ind, uid in owners.items():
        print(f"[OK] {ind} owner ready — user_id={uid}")

    # Mark onboarding as already completed in the onboarding collection too
    # (the OnboardingWizard reads from /api/onboarding regardless of the user
    # doc flag — so we need both flags set).
    for uid in owners.values():
        await db.onboarding.update_one(
            {"user_id": uid},
            {"$set": {"user_id": uid, "step": 6, "completed": True,
                       "data": {"seeded_by": "iter54_widget_demo"},
                       "updated_at": _iso(datetime.now(timezone.utc))}},
            upsert=True,
        )

    # ───────────── HOSPITALITY: temp_units ─────────────
    hosp_owner = owners["hospitality"]
    hosp_units = [
        {"id": "walkin_cold",     "name": "Walk-in cold",        "unit_type": "fridge",       "target_range": "0°C – 4°C",  "temp_target_min": 0,   "temp_target_max": 4,   "last_temp_c": 3.4,  "stale_hours": 1},
        {"id": "front_display",   "name": "Front-of-house display", "unit_type": "fridge",    "target_range": "1°C – 5°C",  "temp_target_min": 1,   "temp_target_max": 5,   "last_temp_c": 6.8,  "stale_hours": 2},   # out of range
        {"id": "walkin_freezer",  "name": "Walk-in freezer",     "unit_type": "freezer",      "target_range": "-22°C – -18°C","temp_target_min": -22, "temp_target_max": -18, "last_temp_c": -19.0,"stale_hours": 30},  # overdue today
        {"id": "bain_marie",      "name": "Bain-marie",          "unit_type": "hot_hold",     "target_range": "≥ 60°C",     "temp_target_min": 60,  "temp_target_max": 95,  "last_temp_c": 62.0, "stale_hours": 28},  # overdue
        {"id": "dishwasher",      "name": "Dishwasher final rinse","unit_type": "dishwasher", "target_range": "≥ 80°C",     "temp_target_min": 80,  "temp_target_max": 95,  "last_temp_c": 82.0, "stale_hours": 1},
    ]
    for u in hosp_units:
        last_reading_at = now - timedelta(hours=u.pop("stale_hours"))
        doc = {
            "owner_id": hosp_owner,
            "unit_id": u["id"],
            "name": u["name"],
            "unit_type": u["unit_type"],
            "target_range": u["target_range"],
            "temp_target_min": u["temp_target_min"],
            "temp_target_max": u["temp_target_max"],
            "last_temp_c": u["last_temp_c"],
            "last_reading_at": _iso(last_reading_at),
            "created_at": _iso(now),
        }
        await db.temp_units.update_one(
            {"owner_id": hosp_owner, "unit_id": u["id"]},
            {"$set": doc}, upsert=True)
    print(f"[OK] seeded {len(hosp_units)} temp_units for hospitality owner {hosp_owner}")

    # ───────────── TRANSPORT: driver_work_diary ─────────────
    transport_owner = owners["transport"]
    drivers = [
        {"driver_id": "drv_aiden",  "name": "Aiden O'Connor",  "scheme": "standard", "hours_today": 11.8},  # approaching (>85% of 12)
        {"driver_id": "drv_priya",  "name": "Priya Sharma",    "scheme": "bfm",      "hours_today": 14.2},  # exceeding
        {"driver_id": "drv_marcus", "name": "Marcus Wilson",   "scheme": "afm",      "hours_today": 13.5},  # approaching (90% of 15)
        {"driver_id": "drv_sam",    "name": "Sam Nguyen",      "scheme": "standard", "hours_today": 6.0},   # ok
    ]
    # Upsert the driver users (so the widget can join name)
    for d in drivers:
        await db.users.update_one(
            {"user_id": d["driver_id"]},
            {"$setOnInsert": {"user_id": d["driver_id"], "email": f"{d['driver_id']}@demo.local",
                              "name": d["name"], "role": "worker", "industry": "transport",
                              "created_at": _iso(now)},
             "$set": {"fatigue_scheme": d["scheme"]}},
            upsert=True,
        )
    # Wipe yesterday's seed rows for these drivers so re-runs don't double-count
    await db.driver_work_diary.delete_many({"owner_id": transport_owner, "seed_marker": "iter54_demo"})
    for d in drivers:
        started = now - timedelta(hours=d["hours_today"])
        await db.driver_work_diary.insert_one({
            "owner_id": transport_owner,
            "driver_id": d["driver_id"],
            "kind": "work",
            "hours_work": d["hours_today"],
            "started_at": _iso(started),
            "ended_at": _iso(now),
            "seed_marker": "iter54_demo",
        })
    print(f"[OK] seeded {len(drivers)} work-diary rows for transport owner {transport_owner}")

    # ───────────── HEALTHCARE: clinicians + AHPRA ─────────────
    hc_owner = owners["healthcare"]
    clinicians = [
        {"id": "clin_emma",  "name": "Emma Carter",     "prof": "Registered Nurse",      "reg": "NMW0012345678", "days_until_expiry":  -3},   # expired
        {"id": "clin_lucas", "name": "Lucas Patel",     "prof": "Enrolled Nurse",        "reg": "NMW0023456789", "days_until_expiry":  12},
        {"id": "clin_sofia", "name": "Sofia Russo",     "prof": "Physiotherapist",       "reg": "PHY0034567890", "days_until_expiry":  41},
        {"id": "clin_neha",  "name": "Neha Kapoor",     "prof": "Registered Nurse",      "reg": "NMW0045678901", "days_until_expiry":  58},
        {"id": "clin_jack",  "name": "Jack Williams",   "prof": "Occupational Therapist","reg": "OCC0056789012", "days_until_expiry": 120},   # outside window — should NOT appear
    ]
    for c in clinicians:
        exp_date = (now + timedelta(days=c["days_until_expiry"])).date().isoformat()
        await db.clinicians.update_one(
            {"owner_id": hc_owner, "clinician_id": c["id"]},
            {"$set": {
                "owner_id": hc_owner,
                "clinician_id": c["id"],
                "name": c["name"],
                "profession": c["prof"],
                "ahpra_registration": {"number": c["reg"], "expires_on": exp_date},
                "created_at": _iso(now),
            }},
            upsert=True,
        )
    print(f"[OK] seeded {len(clinicians)} clinicians for healthcare owner {hc_owner}")

    # ───────────── TRADES: workers + licences ─────────────
    tr_owner = owners["trades"]
    workers = [
        {"id": "wk_jack",  "name": "Jack Mitchell"},
        {"id": "wk_anna",  "name": "Anna Liu"},
        {"id": "wk_chris", "name": "Chris Murphy"},
        {"id": "wk_dave",  "name": "Dave Pham"},
    ]
    for w in workers:
        await db.workers.update_one(
            {"worker_id": w["id"]},
            {"$set": {"worker_id": w["id"], "user_id": tr_owner, "name": w["name"],
                       "trade": "general", "created_at": _iso(now)}},
            upsert=True,
        )
    licences = [
        {"id": "lic_jack_wc",  "worker": "wk_jack",  "type": "white_card",      "num": "WC-0012345",   "days": -7},   # expired
        {"id": "lic_jack_fa",  "worker": "wk_jack",  "type": "first_aid",       "num": "FA-0023456",   "days": 18},
        {"id": "lic_anna_el",  "worker": "wk_anna",  "type": "electrical",      "num": "EL-0034567",   "days": 42},
        {"id": "lic_chris_hr", "worker": "wk_chris", "type": "high_risk_LF",    "num": "HR-0045678",   "days": 12},
        {"id": "lic_dave_pl",  "worker": "wk_dave",  "type": "plumbing",        "num": "PL-0056789",   "days": 55},
        {"id": "lic_anna_wc",  "worker": "wk_anna",  "type": "white_card",      "num": "WC-0067890",   "days": 240},  # outside window
    ]
    for lic in licences:
        exp = (now + timedelta(days=lic["days"])).date().isoformat()
        await db.licences.update_one(
            {"licence_id": lic["id"]},
            {"$set": {"licence_id": lic["id"], "user_id": tr_owner,
                       "worker_id": lic["worker"],
                       "licence_type": lic["type"],
                       "licence_number": lic["num"],
                       "expiry_date": exp,
                       "created_at": _iso(now)}},
            upsert=True,
        )
    print(f"[OK] seeded {len(licences)} licences for trades owner {tr_owner}")

    # ───────────── RETAIL: lone-worker shifts ─────────────
    rt_owner = owners["retail"]
    # Clear any prior demo rows so re-runs don't accumulate stale shifts
    await db.lone_worker_shifts.delete_many({"owner_id": rt_owner, "seed_marker": "iter55_demo"})
    shifts = [
        {"shift_id": "shift_riley",  "worker_name": "Riley Hughes", "store_name": "Bondi Junction",  "started_mins_ago": 270, "interval": 60, "last_checkin_mins_ago": 85},  # missed
        {"shift_id": "shift_amber",  "worker_name": "Amber Chen",   "store_name": "Chatswood",       "started_mins_ago": 210, "interval": 60, "last_checkin_mins_ago": 25},
        {"shift_id": "shift_jose",   "worker_name": "Jose Romero",  "store_name": "Bondi Junction",  "started_mins_ago": 130, "interval": 90, "last_checkin_mins_ago": 110}, # missed (90+10 grace = 100)
        {"shift_id": "shift_lena",   "worker_name": "Lena Walker",  "store_name": "Parramatta",      "started_mins_ago": 60,  "interval": 60, "last_checkin_mins_ago": 5},
    ]
    for s in shifts:
        await db.lone_worker_shifts.insert_one({
            "shift_id": s["shift_id"],
            "owner_id": rt_owner,
            "worker_name": s["worker_name"],
            "store_name": s["store_name"],
            "started_at": _iso(now - timedelta(minutes=s["started_mins_ago"])),
            "expected_end_at": _iso(now + timedelta(minutes=120)),
            "status": "open",
            "check_in_interval_mins": s["interval"],
            "last_check_in_at": _iso(now - timedelta(minutes=s["last_checkin_mins_ago"])),
            "seed_marker": "iter55_demo",
        })
    print(f"[OK] seeded {len(shifts)} lone-worker shifts for retail owner {rt_owner}")

    client.close()
    print("\n[DONE] Dashboard widget demo data seeded.")


if __name__ == "__main__":
    asyncio.run(main())
