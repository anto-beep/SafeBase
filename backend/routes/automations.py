"""
Native Automations routes — Slack / Resend email / generic webhook actions,
recipe gallery, analytics, and batch test.

Mount via register_automations_routes(api_router, db=db, User=User,
                                     get_current_user=..., logger=...,
                                     webhook_events=WEBHOOK_EVENTS).

Returns the `run_automations_for_event(user_id, event, payload)` coroutine so
the caller (server.py's `trigger_webhook_event`) can fan out to matching
automations alongside outbound webhook deliveries.
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta

import httpx
import resend
from fastapi import APIRouter, Depends, HTTPException


_AUTOMATION_ACTIONS = {"slack", "resend_email", "webhook_url"}

AUTOMATION_RECIPES = [
    {
        "recipe_id": "slack_critical_incident",
        "title": "Slack alert on critical incidents",
        "desc": "When a serious or critical incident is reported, post to your Slack #safety channel.",
        "event": "incident.created",
        "action": "slack",
        "config_schema": {"webhook_url": "https://hooks.slack.com/...", "severity_min": "serious"},
        "icon": "💬",
    },
    {
        "recipe_id": "resend_worker_welcome",
        "title": "Email welcome to new worker",
        "desc": "When a worker is added, send a welcome email with induction instructions.",
        "event": "worker.added",
        "action": "resend_email",
        "config_schema": {"api_key": "re_...", "from_email": "safety@example.com.au", "subject": "Welcome to the crew"},
        "icon": "📧",
    },
    {
        "recipe_id": "slack_licence_expiry",
        "title": "Slack alert on licence expiring",
        "desc": "When a worker's licence is within 30 days of expiry, ping #ops channel.",
        "event": "licence.expiring",
        "action": "slack",
        "config_schema": {"webhook_url": "https://hooks.slack.com/..."},
        "icon": "🎫",
    },
    {
        "recipe_id": "webhook_sheets_via_zapier",
        "title": "Log to Google Sheets via Zapier",
        "desc": "Configure a Zapier catch-hook URL to write any SafeBase event into a Google Sheet.",
        "event": "incident.created",
        "action": "webhook_url",
        "config_schema": {"webhook_url": "https://hooks.zapier.com/..."},
        "icon": "📊",
    },
    {
        "recipe_id": "resend_licence_reminder",
        "title": "Email reminder on licence expiry",
        "desc": "Email the worker when their licence is expiring.",
        "event": "licence.expiring",
        "action": "resend_email",
        "config_schema": {"api_key": "re_...", "from_email": "safety@example.com.au", "subject": "Your licence is expiring soon"},
        "icon": "⏰",
    },
    {
        "recipe_id": "slack_incident_closed",
        "title": "Slack celebration on incident closed",
        "desc": "Share incident close-outs and learnings back to the team channel.",
        "event": "incident.closed",
        "action": "slack",
        "config_schema": {"webhook_url": "https://hooks.slack.com/..."},
        "icon": "✅",
    },
]


def register_automations_routes(api_router: APIRouter, *, db, User,
                                get_current_user, logger,
                                webhook_events: set[str]):
    """Mount /automations/* routes onto the given api_router.

    Returns a dict with `run_automations_for_event` so server.py can fire
    matched rules alongside outbound webhook deliveries.
    """

    async def _record_run(rule: dict, status: dict) -> dict:
        """Stores a run record + updates automation counters."""
        run_id = f"run_{uuid.uuid4().hex[:10]}"
        run = {
            "run_id": run_id,
            "automation_id": rule["automation_id"],
            "user_id": rule["user_id"],
            "ran_at": datetime.now(timezone.utc).isoformat(),
            **status,
        }
        await db.automation_runs.insert_one({**run})
        updates = {"last_run_at": run["ran_at"]}
        if status["success"]:
            updates["last_error"] = None
        elif status["error"]:
            updates["last_error"] = status["error"]
        await db.automations.update_one(
            {"automation_id": rule["automation_id"]},
            {"$set": updates, "$inc": {"run_count": 1}},
        )
        run.pop("_id", None)
        return run

    async def _execute_automation(rule: dict, event: str, payload: dict) -> dict:
        """Executes a single automation. Never raises — records success/error."""
        action = rule.get("action")
        config = rule.get("config") or {}
        status = {"success": False, "error": None, "detail": None}
        start = datetime.now(timezone.utc)

        try:
            if action == "slack":
                url = config.get("webhook_url")
                if not url:
                    status["error"] = "Missing webhook_url"
                else:
                    sev_min = config.get("severity_min")
                    if sev_min and payload.get("severity"):
                        order = ["minor", "moderate", "serious", "critical"]
                        if order.index(payload.get("severity", "minor")) < order.index(sev_min):
                            status["detail"] = "Skipped (severity below threshold)"
                            status["success"] = True
                            return await _record_run(rule, status)
                    text = f"*SafeBase · {event}*\n```{json.dumps(payload, indent=2)[:1000]}```"
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        r = await client.post(url, json={"text": text})
                        status["success"] = 200 <= r.status_code < 300
                        status["detail"] = f"HTTP {r.status_code}"
                        if not status["success"]:
                            status["error"] = f"Slack returned {r.status_code}"

            elif action == "resend_email":
                api_key = config.get("api_key")
                from_email = config.get("from_email")
                to_email = payload.get("email") or config.get("to_email")
                if not api_key or not from_email or not to_email:
                    status["error"] = "Missing api_key, from_email, or to_email"
                else:
                    subject = config.get("subject", f"SafeBase · {event}")
                    pretty = {
                        "worker.added": "Welcome to the crew",
                        "licence.expiring": "Your licence is expiring soon",
                        "incident.closed": "Incident closed — thanks for your help",
                    }
                    heading = pretty.get(event, subject)
                    html = (
                        f"<div style=\"font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;\">"
                        f"<div style=\"background:#0A0A0A;color:#FFCC00;padding:16px;font-weight:900;letter-spacing:-.02em;font-size:20px;\">SafeBase</div>"
                        f"<h1 style=\"font-size:22px;margin:20px 0 12px;\">{heading}</h1>"
                        f"<p style=\"color:#444;line-height:1.6;font-size:14px;\">This notification was triggered by a SafeBase event: <code>{event}</code>.</p>"
                        f"<pre style=\"background:#F5F5F5;padding:12px;font-size:12px;white-space:pre-wrap;word-break:break-word;\">{json.dumps(payload, indent=2)[:1500]}</pre>"
                        f"<p style=\"color:#888;font-size:12px;margin-top:24px;\">You can manage these automations in your SafeBase dashboard.</p>"
                        f"</div>"
                    )
                    resend.api_key = api_key

                    def _send():
                        return resend.Emails.send({
                            "from": from_email,
                            "to": [to_email],
                            "subject": subject,
                            "html": html,
                        })

                    try:
                        result = await asyncio.wait_for(asyncio.to_thread(_send), timeout=15.0)
                        status["success"] = True
                        status["detail"] = f"email_id={result.get('id')}"
                    except Exception as e:
                        status["error"] = str(e)[:300]

            elif action == "webhook_url":
                url = config.get("webhook_url")
                if not url:
                    status["error"] = "Missing webhook_url"
                else:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        r = await client.post(url, json={"event": event, "payload": payload})
                        status["success"] = 200 <= r.status_code < 300
                        status["detail"] = f"HTTP {r.status_code}"
                        if not status["success"]:
                            status["error"] = f"Target returned {r.status_code}"
            else:
                status["error"] = f"Unknown action: {action}"
        except Exception as e:
            status["error"] = str(e)[:300]

        duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
        status["duration_ms"] = duration_ms
        return await _record_run(rule, status)

    async def run_automations_for_event(user_id: str, event: str, payload: dict):
        """Look up matching user automations and execute each as a separate task."""
        try:
            rules = await db.automations.find(
                {"user_id": user_id, "enabled": True, "event": event}, {"_id": 0}
            ).to_list(50)
        except Exception:
            logger.exception("run_automations_for_event: lookup failed")
            return
        for r in rules:
            asyncio.create_task(_execute_automation(r, event, payload))

    # --------- routes ---------
    @api_router.get("/automations/recipes")
    async def list_recipes(current_user: User = Depends(get_current_user)):
        return AUTOMATION_RECIPES

    @api_router.get("/automations")
    async def list_automations(current_user: User = Depends(get_current_user)):
        rows = await db.automations.find(
            {"user_id": current_user.user_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        return rows

    @api_router.post("/automations")
    async def create_automation(body: dict, current_user: User = Depends(get_current_user)):
        action = body.get("action")
        event = body.get("event")
        if action not in _AUTOMATION_ACTIONS:
            raise HTTPException(400, f"Unknown action: {action}")
        if event not in webhook_events:
            raise HTTPException(400, f"Unknown event: {event}")
        doc = {
            "automation_id": f"auto_{uuid.uuid4().hex[:10]}",
            "user_id": current_user.user_id,
            "recipe_id": body.get("recipe_id"),
            "label": body.get("label") or body.get("recipe_id") or "Automation",
            "event": event,
            "action": action,
            "config": body.get("config") or {},
            "enabled": True,
            "run_count": 0,
            "last_run_at": None,
            "last_error": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.automations.insert_one({**doc})
        return doc

    @api_router.patch("/automations/{automation_id}")
    async def update_automation(automation_id: str, body: dict,
                                current_user: User = Depends(get_current_user)):
        updates = {k: v for k, v in body.items()
                   if k in ("enabled", "label", "config", "event")}
        await db.automations.update_one(
            {"automation_id": automation_id, "user_id": current_user.user_id},
            {"$set": updates},
        )
        doc = await db.automations.find_one(
            {"automation_id": automation_id, "user_id": current_user.user_id},
            {"_id": 0},
        )
        if not doc:
            raise HTTPException(404, "Not found")
        return doc

    @api_router.delete("/automations/{automation_id}")
    async def delete_automation(automation_id: str,
                                current_user: User = Depends(get_current_user)):
        res = await db.automations.delete_one(
            {"automation_id": automation_id, "user_id": current_user.user_id}
        )
        return {"deleted": res.deleted_count}

    @api_router.post("/automations/{automation_id}/test")
    async def test_automation(automation_id: str,
                              current_user: User = Depends(get_current_user)):
        rule = await db.automations.find_one(
            {"automation_id": automation_id, "user_id": current_user.user_id},
            {"_id": 0},
        )
        if not rule:
            raise HTTPException(404, "Not found")
        test_payload = {"test": True, "message": "This is a SafeBase automation test.",
                        "preview": "Lorem ipsum"}
        result = await _execute_automation(rule, "test.ping", test_payload)
        return result

    @api_router.get("/automations/{automation_id}/runs")
    async def list_automation_runs(automation_id: str,
                                   current_user: User = Depends(get_current_user)):
        rows = await db.automation_runs.find(
            {"automation_id": automation_id, "user_id": current_user.user_id},
            {"_id": 0},
        ).sort("ran_at", -1).to_list(50)
        return rows

    @api_router.get("/automations/analytics/summary")
    async def automations_analytics(current_user: User = Depends(get_current_user)):
        """30-day analytics: daily run counts, success rate, top rules, slowest."""
        uid = current_user.user_id
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=30)
        since_iso = since.isoformat()

        runs = await db.automation_runs.find(
            {"user_id": uid, "ran_at": {"$gte": since_iso}}, {"_id": 0}
        ).to_list(10000)

        by_day = {}
        for i in range(30):
            d = (now - timedelta(days=29 - i)).strftime("%Y-%m-%d")
            by_day[d] = {"date": d, "success": 0, "fail": 0}
        for r in runs:
            day = (r.get("ran_at") or "")[:10]
            if day in by_day:
                key = "success" if r.get("success") else "fail"
                by_day[day][key] += 1

        total = len(runs)
        success = sum(1 for r in runs if r.get("success"))
        success_rate = round((success / total) * 100) if total else 0

        rules = await db.automations.find({"user_id": uid}, {"_id": 0}).to_list(200)
        rules_sorted = sorted(rules, key=lambda r: r.get("run_count", 0), reverse=True)
        top_rules = [
            {"automation_id": r["automation_id"], "label": r.get("label"),
             "action": r.get("action"), "event": r.get("event"),
             "run_count": r.get("run_count", 0), "last_error": r.get("last_error")}
            for r in rules_sorted[:5]
        ]

        slow_agg = {}
        for r in runs:
            rid = r.get("automation_id")
            d = r.get("duration_ms")
            if not rid or d is None:
                continue
            rec = slow_agg.setdefault(rid, {"total_ms": 0, "count": 0})
            rec["total_ms"] += d
            rec["count"] += 1
        slowest = None
        for rid, rec in slow_agg.items():
            avg = rec["total_ms"] / rec["count"]
            rule = next((r for r in rules if r["automation_id"] == rid), None)
            if not slowest or avg > slowest["avg_ms"]:
                slowest = {"automation_id": rid,
                           "label": rule.get("label") if rule else rid,
                           "avg_ms": round(avg), "runs": rec["count"]}

        return {
            "total_runs_30d": total,
            "success_count": success,
            "failure_count": total - success,
            "success_rate": success_rate,
            "active_rules": sum(1 for r in rules if r.get("enabled")),
            "total_rules": len(rules),
            "daily": list(by_day.values()),
            "top_rules": top_rules,
            "slowest": slowest,
        }

    @api_router.post("/automations/test-all")
    async def test_all_automations(current_user: User = Depends(get_current_user)):
        """Test every enabled automation in parallel. Returns per-rule result."""
        rules = await db.automations.find(
            {"user_id": current_user.user_id, "enabled": True}, {"_id": 0}
        ).to_list(100)
        if not rules:
            return {"total": 0, "success": 0, "failed": 0, "results": []}
        test_payload = {"test": True, "message": "SafeBase test-all batch",
                        "severity": "critical"}
        results = await asyncio.gather(
            *[_execute_automation(r, "test.ping", test_payload) for r in rules],
            return_exceptions=True,
        )
        normalised = []
        ok = 0
        for r, res in zip(rules, results):
            if isinstance(res, Exception):
                normalised.append({"automation_id": r["automation_id"],
                                   "label": r.get("label"),
                                   "success": False, "error": str(res)[:200]})
            else:
                normalised.append({"automation_id": r["automation_id"],
                                   "label": r.get("label"),
                                   "success": res.get("success"),
                                   "error": res.get("error"),
                                   "detail": res.get("detail"),
                                   "duration_ms": res.get("duration_ms")})
                if res.get("success"):
                    ok += 1
        return {"total": len(rules), "success": ok,
                "failed": len(rules) - ok, "results": normalised}

    return {"run_automations_for_event": run_automations_for_event}
