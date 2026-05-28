"""
Phase 3 — Academy content expansion.

For every module in academy_module.MODULES (88 total), seed:
  * learning_objectives: 3-5 bullets
  * sections: 4-6 {heading, body_html (incl. inline <svg> diagrams), visual_caption}
  * quiz_questions: 6-10 {q, options, answer_index, explanation}

Skip modules that already have a hand-authored quiz in academy_module.QUIZZES.
Persist into a new collection `academy_module_content` keyed by (industry, slug).

Run with:
    cd /app/backend && nohup python -m seed_academy_content > /tmp/seed_academy.log 2>&1 &
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
log = logging.getLogger("seed_academy")


SYSTEM_PROMPT = """You are an Australian WHS / industry compliance training author.

Given ONE Academy module spec, produce a strict JSON object with keys:
  learning_objectives  (array of 3-5 strings — outcomes a learner achieves)
  sections             (array of 4-6 {heading, body_html, visual_svg, visual_caption})
  quiz_questions       (array of 6-10 {q, options, answer_index, explanation})

Requirements:
* body_html must be valid plain HTML (no <script>, no external CSS). Use <p>,
  <ul>, <li>, <strong>, <em>, <table>, <h3>, <h4>. No <h1>/<h2>.
* visual_svg must be self-contained inline <svg viewBox=\"0 0 600 360\"> ... </svg>
  with concise labelled elements (use <rect>, <text>, <line>, <polygon>,
  <circle>, <path>). Stick to muted neutrals + the colour #f59e0b (warning amber)
  or #1e293b (slate). NO external images.
* visuals must be SPECIFIC to the section — e.g., a hierarchy-of-controls
  pyramid, a Working-at-Heights anchor-point diagram, a HACCP flowchart,
  a SIRS decision-tree, a Chain-of-Responsibility responsibility-grid.
* quiz_questions options must have exactly 4 entries, answer_index 0..3,
  explanation in plain English citing the relevant Australian regulation.
* All content reflects current Australian law as of 2026.

Output ONLY the JSON object. No prose. No markdown fences."""


async def main():
    sys.path.insert(0, os.path.dirname(__file__))
    from academy_module import MODULES
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        log.error("EMERGENT_LLM_KEY not set — aborting")
        return

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # Build flat list
    all_modules: list[dict] = []
    for industry, mods in MODULES.items():
        for m in mods:
            all_modules.append({**m, "industry": industry})

    log.info("Total modules in catalogue: %d", len(all_modules))

    # Skip already-seeded
    seeded_keys: set[tuple[str, str]] = set()
    async for d in db.academy_module_content.find({}, {"industry": 1, "slug": 1}):
        seeded_keys.add((d.get("industry"), d.get("slug")))

    todo = [m for m in all_modules if (m["industry"], m["slug"]) not in seeded_keys]
    log.info("Already seeded: %d. To do: %d.", len(all_modules) - len(todo), len(todo))

    if not todo:
        log.info("Nothing to do.")
        return

    inserted = 0
    fallbacks = 0

    for idx, m in enumerate(todo, 1):
        log.info("[%d/%d] %s :: %s", idx, len(todo), m["industry"], m["slug"])

        prompt = json.dumps({
            "industry": m["industry"],
            "slug": m["slug"],
            "title": m["title"],
            "regulatory_anchor": m.get("regulatory_anchor"),
            "duration_minutes": m["duration_minutes"],
            "rto_boundary": bool(m.get("rto_boundary")),
        })

        parsed = None
        for attempt in range(1, 3):
            try:
                chat = LlmChat(
                    api_key=llm_key,
                    session_id=f"academy_{idx}_{attempt}",
                    system_message=SYSTEM_PROMPT,
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
                resp = await asyncio.wait_for(
                    chat.send_message(UserMessage(text=prompt)),
                    timeout=120.0,
                )
                cleaned = re.sub(r"^```(?:json)?|```$", "",
                                  (resp or "").strip(), flags=re.MULTILINE).strip()
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    mt = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
                    if not mt:
                        raise ValueError("no JSON")
                    parsed = json.loads(mt.group(0))
                break
            except Exception as e:
                log.warning("attempt %d failed: %s", attempt, str(e)[:200])
                await asyncio.sleep(3.0 * attempt)

        if not parsed or not isinstance(parsed, dict):
            log.warning("[%s] LLM failed — saving stub", m["slug"])
            parsed = {
                "learning_objectives": [
                    f"Understand the requirements of {m['title']}",
                    f"Apply {m.get('regulatory_anchor', 'the relevant regulation')} in your day-to-day work",
                    "Identify hazards and apply the hierarchy of controls",
                ],
                "sections": [
                    {
                        "heading": "Introduction",
                        "body_html": f"<p>This module covers {m['title']} under <strong>{m.get('regulatory_anchor', '')}</strong>. Allow ~{m['duration_minutes']} minutes.</p>",
                        "visual_svg": "<svg viewBox=\"0 0 600 360\"><rect x=\"50\" y=\"50\" width=\"500\" height=\"260\" fill=\"#fef3c7\" stroke=\"#1e293b\"/><text x=\"300\" y=\"180\" text-anchor=\"middle\" font-size=\"22\" fill=\"#1e293b\">Module overview</text></svg>",
                        "visual_caption": "Module overview placeholder",
                    },
                ],
                "quiz_questions": [],
            }
            fallbacks += 1

        doc = {
            "content_id": f"acmc_{uuid.uuid4().hex[:10]}",
            "industry": m["industry"],
            "slug": m["slug"],
            "title": m["title"],
            "regulatory_anchor": m.get("regulatory_anchor"),
            "duration_minutes": m["duration_minutes"],
            "learning_objectives": parsed.get("learning_objectives") or [],
            "sections": parsed.get("sections") or [],
            "quiz_questions": parsed.get("quiz_questions") or [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.academy_module_content.update_one(
            {"industry": m["industry"], "slug": m["slug"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
        inserted += 1
        await asyncio.sleep(0.7)

        if idx % 5 == 0:
            log.info("Progress: %d inserted, %d fallbacks", inserted, fallbacks)

    log.info("DONE. inserted=%d  fallbacks=%d", inserted, fallbacks)


if __name__ == "__main__":
    t0 = time.time()
    asyncio.run(main())
    log.info("Elapsed: %.1fs", time.time() - t0)
