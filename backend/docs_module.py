"""
Document Library — routes + CRUD for SafeTradie.

PDF renderers live in docs_pdf.py; doc-type registry + field schemas live in
docs_registry.py. This module holds only the FastAPI router and business logic.
"""
from __future__ import annotations

import uuid
import asyncio
import re
import json as _json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from docs_pdf import STATE_REGULATORS  # noqa: F401 (re-exported for back-compat)
from docs_registry import DOC_TYPES, CATEGORIES, register_doc_type  # noqa: F401

docs_router = APIRouter()



async def _call_claude(system: str, user_prompt: str, fallback: Any,
                       llm_chat_cls, user_message_cls, llm_key: str,
                       timeout: float = 55.0) -> Any:
    try:
        chat = llm_chat_cls(
            api_key=llm_key, session_id=f"doc_{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        def _run():
            return asyncio.run(chat.send_message(user_message_cls(text=user_prompt)))

        raw = await asyncio.wait_for(asyncio.to_thread(_run), timeout=timeout)
        txt = raw if isinstance(raw, str) else str(raw)
        m = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", txt)
        if m:
            return _json.loads(m.group(0))
        return fallback
    except Exception:
        return fallback


def register_docs_routes(app_db, get_current_user, llm_chat_cls, user_message_cls, llm_key):

    @docs_router.get("/docs/types")
    async def list_doc_types(industry: str | None = None, current_user=Depends(get_current_user)):
        """Returns lightweight catalog for the hub UI, filtered by industry.
        Universal types (no `industries` key) show to everyone. Industry-gated
        types only show if the requested industry is in the list.

        If `industry` query param is provided, it overrides the user's saved
        industry — used by the Document Library tab switcher (Part 7) to let
        users preview docs for other industries before switching their account.
        """
        user_doc = await app_db.users.find_one(
            {"user_id": current_user.user_id}, {"_id": 0, "industry": 1}) or {}
        target_industry = industry or user_doc.get("industry") or "trades"
        out = []
        for t in DOC_TYPES.values():
            gate = t.get("industries")
            if gate and target_industry not in gate:
                continue
            out.append({k: v for k, v in t.items() if k != "pdf"})
        return {
            "categories": CATEGORIES,
            "types": out,
            "states": list(STATE_REGULATORS.keys()),
            "user_industry": user_doc.get("industry") or "trades",
            "viewing_industry": target_industry,
        }

    async def _next_ref(user_id: str, prefix: str) -> str:
        year = datetime.now(timezone.utc).year
        res = await app_db.docs_counters.find_one_and_update(
            {"user_id": user_id, "year": year, "prefix": prefix},
            {"$inc": {"count": 1}},
            upsert=True, return_document=True,
        )
        n = (res or {}).get("count") or 1
        return f"{prefix}-{year}-{n:04d}"

    @docs_router.post("/docs/{doc_type}")
    async def create_doc(doc_type: str, body: dict, current_user=Depends(get_current_user)):
        spec = DOC_TYPES.get(doc_type)
        if not spec:
            raise HTTPException(404, f"Unknown doc type: {doc_type}")
        allowed_keys = {f["key"] for f in spec.get("fields", [])}
        allowed_keys |= {"status", "signatures"}
        clean_body = {k: v for k, v in body.items() if k in allowed_keys}
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        ref = await _next_ref(current_user.user_id, spec["counter_prefix"])
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "doc_id": doc_id,
            "reference": ref,
            "user_id": current_user.user_id,
            "doc_type": doc_type,
            "category": spec["category"],
            "label": spec["label"],
            "status": "draft",
            "version": 1,
            "created_at": now,
            "updated_at": now,
            "retention_until": (datetime.now(timezone.utc) + timedelta(days=5*365)).isoformat(),
            **clean_body,
        }
        await app_db.compliance_docs.insert_one({**doc})
        return {k: v for k, v in doc.items() if k != "_id"}

    @docs_router.get("/docs/stats")
    async def docs_stats(current_user=Depends(get_current_user)):
        """Aggregated per-category + per-doc-type + per-status counts + recent (<=5) docs.
        Single query beats the legacy Hub pattern of fetching the full doc list."""
        pipeline = [
            {"$match": {"user_id": current_user.user_id,
                        "status": {"$ne": "archived"}}},
            {"$group": {"_id": {"category": "$category", "doc_type": "$doc_type",
                                 "status": "$status"},
                        "count": {"$sum": 1}}},
        ]
        agg = await app_db.compliance_docs.aggregate(pipeline).to_list(500)
        by_cat: dict[str, int] = {}
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for row in agg:
            key = row.get("_id") or {}
            cat = key.get("category") or "_unknown"
            dt = key.get("doc_type") or "_unknown"
            st = key.get("status") or "draft"
            n = row.get("count", 0)
            by_cat[cat] = by_cat.get(cat, 0) + n
            by_type[dt] = by_type.get(dt, 0) + n
            by_status[st] = by_status.get(st, 0) + n
        recent = await app_db.compliance_docs.find(
            {"user_id": current_user.user_id},
            {"_id": 0, "doc_id": 1, "reference": 1, "doc_type": 1,
             "label": 1, "category": 1, "status": 1, "updated_at": 1}
        ).sort("updated_at", -1).to_list(5)
        total = sum(by_cat.values())
        return {"total": total, "by_category": by_cat,
                "by_doc_type": by_type, "by_status": by_status, "recent": recent}

    @docs_router.get("/docs")
    async def list_docs(doc_type: Optional[str] = None,
                         category: Optional[str] = None,
                         current_user=Depends(get_current_user)):
        q = {"user_id": current_user.user_id}
        if doc_type:
            q["doc_type"] = doc_type
        if category:
            q["category"] = category
        rows = await app_db.compliance_docs.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
        return rows

    @docs_router.get("/docs/{doc_id}")
    async def get_doc(doc_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Document not found")
        return doc

    @docs_router.patch("/docs/{doc_id}")
    async def update_doc(doc_id: str, body: dict, current_user=Depends(get_current_user)):
        spec_check = await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id}, {"_id": 0, "doc_type": 1})
        if not spec_check:
            raise HTTPException(404, "Document not found")
        spec = DOC_TYPES.get(spec_check.get("doc_type"))
        allowed_keys = set()
        if spec:
            allowed_keys = {f["key"] for f in spec.get("fields", [])}
            allowed_keys |= {"status", "signatures", "archived_at"}
        reserved = {"_id", "doc_id", "user_id", "reference", "created_at",
                    "doc_type", "category", "version"}
        for k in list(body.keys()):
            if k in reserved:
                body.pop(k, None)
            elif allowed_keys and k not in allowed_keys and k != "updated_at":
                # Silently drop unknown field keys (prevents typos from persisting)
                body.pop(k, None)
        body["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = await app_db.compliance_docs.update_one(
            {"doc_id": doc_id, "user_id": current_user.user_id},
            {"$set": body, "$inc": {"version": 1}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Document not found")
        return await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id}, {"_id": 0}
        )

    @docs_router.delete("/docs/{doc_id}")
    async def delete_doc(doc_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id})
        if not doc:
            raise HTTPException(404, "Document not found")
        if doc.get("status") != "archived":
            await app_db.compliance_docs.update_one(
                {"doc_id": doc_id, "user_id": current_user.user_id},
                {"$set": {"status": "archived",
                          "archived_at": datetime.now(timezone.utc).isoformat()}})
            return {"archived": True}
        await app_db.compliance_docs.delete_one(
            {"doc_id": doc_id, "user_id": current_user.user_id})
        return {"deleted": True}

    @docs_router.post("/docs/{doc_id}/ai-draft")
    async def ai_draft(doc_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Document not found")
        spec = DOC_TYPES.get(doc.get("doc_type"))
        if not spec or not spec.get("ai_prompt"):
            raise HTTPException(400, "AI draft not available for this doc type")
        system = ("You are a senior Australian WHS consultant. Output ONLY valid JSON "
                  "matching the requested schema, no prose.")
        # Context from existing doc fields
        ctx = {k: v for k, v in doc.items() if k in
               ("task", "activity", "site", "site_name", "topic", "trade", "worker_role", "company_name")}
        user_prompt = f"Context: {_json.dumps(ctx)}\n\nSchema: {spec['ai_prompt']}"
        res = await _call_claude(system, user_prompt, {}, llm_chat_cls, user_message_cls, llm_key)
        return res or {}

    @docs_router.get("/docs/{doc_id}/pdf")
    async def get_pdf(doc_id: str, current_user=Depends(get_current_user)):
        doc = await app_db.compliance_docs.find_one(
            {"doc_id": doc_id, "user_id": current_user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Document not found")
        spec = DOC_TYPES.get(doc.get("doc_type"))
        if not spec:
            raise HTTPException(400, "Unknown doc type")
        try:
            from weasyprint import HTML
        except Exception:
            raise HTTPException(503, "PDF engine unavailable")
        html = spec["pdf"](doc)
        try:
            pdf_bytes = await asyncio.wait_for(
                asyncio.to_thread(lambda: HTML(string=html).write_pdf()),
                timeout=30.0,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, "PDF generation timed out")
        return Response(
            content=pdf_bytes, media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{doc.get("reference")}.pdf"'})

    return docs_router
