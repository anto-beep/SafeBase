"""
Seed script for Phase 2 — populate document_templates with AI-generated
fields_schema + ai_prompt_template for every row in doc_library_catalogue.py.

Strategy
--------
* Read the master catalogue (~250 rows).
* Skip any row already present in document_templates.
* Batch 6 rows per Claude call (to keep response <8K tokens).
* For each call, ask Claude to return a JSON ARRAY of templates with
  fields_schema + ai_prompt_template.
* Persist each result with status=system (account_id=null, is_custom=false).

Run with:
    cd /app/backend && python -m seed_doc_library
or in background:
    cd /app/backend && nohup python -m seed_doc_library > /tmp/seed_docs.log 2>&1 &

Resumable — re-runs are safe (idempotent on slug).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("seed_docs")


BATCH_SIZE = 6           # rows per Claude call
RETRIES_PER_BATCH = 2    # on parse failure / timeout
SLEEP_BETWEEN = 0.6      # seconds between Claude calls (gentle pacing)


SYSTEM_PROMPT = """You are a SafeBase Australian compliance documentation expert.

Given a small batch of document templates the user needs for an Australian
business, produce, for EACH template, a strict JSON object with these keys:
  slug                 (kebab-case ascii of the name; required)
  fields_schema        (array of {key, label, type: 'text'|'textarea'|'date'|'select'|'number'|'person', required: bool, options?: [str]})
  ai_prompt_template   (string — instructs another LLM to generate the
                         actual document body; MUST reference the regulation;
                         MUST prefer the hierarchy of controls when listing
                         controls; MUST use plain English at ~grade 8;
                         MUST end with a footer citing the regulation.
                         Use {field_values} placeholder verbatim)

fields_schema must capture the inputs the user must provide. Keep schemas
SHARP: 5-9 fields per template. Always include business_name (text, required),
site (text), prepared_by (person, required), prepared_date (date, required).
After those, add the fields that ARE SPECIFIC to this document type.

Output ONLY a JSON array of objects matching the input rows in order. No prose.
"""


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()
    return s[:80] or f"tpl_{uuid.uuid4().hex[:6]}"


async def main():
    # Lazy imports so this file is importable standalone
    sys.path.insert(0, os.path.dirname(__file__))
    from doc_library_catalogue import flatten
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        log.error("EMERGENT_LLM_KEY not set — aborting")
        return

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    rows = flatten()
    log.info("Catalogue rows: %d", len(rows))

    # Skip already-seeded rows by slug + industry
    existing_slugs = set()
    async for d in db.document_templates.find(
        {"is_custom": {"$ne": True}, "account_id": None},
        {"slug": 1, "industry": 1},
    ):
        existing_slugs.add((d["industry"], d.get("slug") or ""))

    todo = []
    for r in rows:
        slug = slugify(r["name"])
        if (r["industry"], slug) in existing_slugs:
            continue
        r["slug"] = slug
        todo.append(r)
    log.info("Already seeded: %d. To do: %d.", len(rows) - len(todo), len(todo))

    if not todo:
        log.info("Nothing to do — exiting.")
        return

    inserted = 0
    failed_rows: list[dict] = []
    total_batches = (len(todo) + BATCH_SIZE - 1) // BATCH_SIZE

    for idx in range(0, len(todo), BATCH_SIZE):
        batch = todo[idx: idx + BATCH_SIZE]
        b_num = idx // BATCH_SIZE + 1
        log.info("Batch %d/%d — %d rows: %s",
                 b_num, total_batches, len(batch),
                 ", ".join(r["name"][:32] for r in batch))

        prompt_lines = ["Generate JSON for these document templates:", ""]
        for i, r in enumerate(batch):
            prompt_lines.append(
                f"{i+1}. industry={r['industry']} category={r['category']} "
                f"name=\"{r['name']}\" regulation=\"{r['regulation']}\" "
                f"status_requirement={r['status_requirement']}"
            )
        prompt = "\n".join(prompt_lines)

        parsed: list[dict] = []
        for attempt in range(1, RETRIES_PER_BATCH + 1):
            try:
                chat = LlmChat(
                    api_key=llm_key,
                    session_id=f"seed_{b_num}_{attempt}",
                    system_message=SYSTEM_PROMPT,
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
                resp = await asyncio.wait_for(
                    chat.send_message(UserMessage(text=prompt)),
                    timeout=90.0,
                )
                cleaned = re.sub(r"^```(?:json)?|```$", "",
                                  (resp or "").strip(), flags=re.MULTILINE).strip()
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    m = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
                    if not m:
                        raise ValueError("no JSON array")
                    parsed = json.loads(m.group(0))
                if not isinstance(parsed, list):
                    raise ValueError("expected JSON array")
                break
            except Exception as e:
                log.warning("Batch %d attempt %d failed: %s", b_num, attempt, str(e)[:200])
                parsed = []
                await asyncio.sleep(2.0 * attempt)

        if len(parsed) != len(batch):
            log.warning("Batch %d returned %d items but expected %d — saving what we can",
                         b_num, len(parsed), len(batch))

        for i, r in enumerate(batch):
            ai = parsed[i] if i < len(parsed) and isinstance(parsed[i], dict) else None
            if not ai or not ai.get("ai_prompt_template"):
                # Fallback: use the spec scaffold so the row still works.
                ai = {
                    "fields_schema": [
                        {"key": "business_name", "label": "Business name", "type": "text", "required": True},
                        {"key": "site", "label": "Site / address", "type": "text", "required": False},
                        {"key": "prepared_by", "label": "Prepared by", "type": "person", "required": True},
                        {"key": "prepared_date", "label": "Prepared date", "type": "date", "required": True},
                        {"key": "scope", "label": "Scope", "type": "textarea", "required": True},
                    ],
                    "ai_prompt_template": (
                        f"You are generating a {r['name']} for an Australian "
                        f"{r['industry']} business under {r['regulation']}. "
                        "Use the business details provided. Structure the "
                        "document with clear sections. Apply the hierarchy of "
                        "controls (elimination, substitution, engineering, "
                        "administrative, PPE — in that order) wherever "
                        "controls are listed. Write in plain English at "
                        "approximately grade 8 reading level. Include a "
                        f"footer citing {r['regulation']}. Business details: "
                        "{field_values}."
                    ),
                }
                failed_rows.append(r)

            now = datetime.now(timezone.utc).isoformat()
            doc = {
                "template_id": f"tpl_{r['slug']}_{uuid.uuid4().hex[:6]}",
                "slug": r["slug"],
                "industry": r["industry"],
                "category": r["category"],
                "name": r["name"],
                "status_requirement": r["status_requirement"],
                "regulation": r["regulation"],
                "fields_schema": ai.get("fields_schema") or [],
                "ai_prompt_template": ai.get("ai_prompt_template") or "",
                "is_custom": False,
                "account_id": None,           # system seed
                "created_by": None,
                "created_at": now,
                "updated_at": now,
            }
            await db.document_templates.update_one(
                {"slug": r["slug"], "industry": r["industry"], "account_id": None},
                {"$setOnInsert": doc},
                upsert=True,
            )
            inserted += 1

        # Gentle pacing to avoid throttling.
        await asyncio.sleep(SLEEP_BETWEEN)

        if b_num % 5 == 0:
            log.info("Progress: inserted=%d / failed_rows=%d", inserted, len(failed_rows))

    log.info("DONE. inserted=%d  fallback_rows=%d", inserted, len(failed_rows))
    if failed_rows:
        for fr in failed_rows[:10]:
            log.info("  fallback: %s (%s)", fr["name"], fr["industry"])


if __name__ == "__main__":
    t0 = time.time()
    asyncio.run(main())
    log.info("Elapsed: %.1fs", time.time() - t0)
