"""SafeBase — pre-warm article bodies.

Runs the resources Article generator for every (industry, slug) stub so that
the first user visit is instant rather than waiting for Claude generation.

Usage:
    cd /app/backend && python -m seed_articles                     # warm all
    cd /app/backend && python -m seed_articles --force             # regenerate even if cached
    cd /app/backend && python -m seed_articles --industry trades   # subset

Designed to be re-run safely. Skips articles that already have body_md unless
`--force` is passed.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Re-use the same constants the API uses, so the prompts and stubs stay in
# sync without duplication.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from routes.resources import ARTICLE_STUBS, SYSTEM_PROMPT_BY_INDUSTRY  # noqa: E402

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

if not (MONGO_URL and DB_NAME and EMERGENT_LLM_KEY):
    print("[FATAL] Missing MONGO_URL / DB_NAME / EMERGENT_LLM_KEY in env.")
    sys.exit(1)


async def generate_body(industry: str, title: str) -> str:
    prompt = (
        f"Write a 400–500 word compliance article titled exactly: '{title}'.\n\n"
        f"Audience: Australian {industry} business owners and managers.\n"
        f"Style: Plain English, Australian spelling (organisation, programme, colour, recognise), "
        f"practical, actionable, no hedging, no bullet-list exhaustion, real legislation citations.\n"
        f"Structure: 2–3 short subheadings (use markdown ## level headings), 2–3 sentences per paragraph.\n"
        f"Voice: Confident, expert, friendly, no marketing puff. End with one practical recommended next step.\n"
        f"Do NOT include the title at the top — start directly with content.\n"
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"seed_{industry}_{int(time.time())}",
        system_message=SYSTEM_PROMPT_BY_INDUSTRY.get(industry, SYSTEM_PROMPT_BY_INDUSTRY["trades"]),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    return await chat.send_message(UserMessage(text=prompt))


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Regenerate even if body_md exists.")
    parser.add_argument("--industry", default=None, help="Restrict to one industry slug.")
    parser.add_argument("--max", type=int, default=None, help="Stop after N successful generations (smoke test).")
    args = parser.parse_args()

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    industries = [args.industry] if args.industry else list(ARTICLE_STUBS.keys())
    total_done = 0
    total_skipped = 0
    total_fail = 0
    overall_start = time.time()

    for ind in industries:
        for slug, title, tags, excerpt, read_mins in ARTICLE_STUBS.get(ind, []):
            if args.max is not None and total_done >= args.max:
                print(f"[STOP] Reached --max={args.max}")
                break
            existing = await db.resources_articles.find_one({"industry": ind, "slug": slug})
            if existing and existing.get("body_md") and not args.force:
                total_skipped += 1
                print(f"[SKIP] {ind}/{slug} — already warmed")
                continue
            t0 = time.time()
            try:
                body = await generate_body(ind, title)
            except Exception as e:
                total_fail += 1
                print(f"[FAIL] {ind}/{slug} — {e}")
                continue

            doc_fields = {
                "industry": ind, "slug": slug, "title": title, "tags": tags,
                "excerpt": excerpt, "read_mins": read_mins,
                "body_md": body,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
            if existing:
                await db.resources_articles.update_one(
                    {"industry": ind, "slug": slug}, {"$set": doc_fields})
            else:
                doc_fields["created_at"] = datetime.now(timezone.utc).isoformat()
                doc_fields["view_count"] = 0
                await db.resources_articles.insert_one(doc_fields)
            total_done += 1
            dt = time.time() - t0
            print(f"[OK]   {ind}/{slug} — {len(body)} chars in {dt:.1f}s")

        if args.max is not None and total_done >= args.max:
            break

    elapsed = time.time() - overall_start
    print("─" * 60)
    print(f"Generated: {total_done}  ·  Skipped: {total_skipped}  ·  Failed: {total_fail}")
    print(f"Total runtime: {elapsed:.1f}s")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
